import { execFile } from 'node:child_process';
import { loadSettings, saveSettings } from './persist.js';
import { playSound, speakText } from './notifier.js';

/**
 * 仅在浏览器前端断连或无客户端时的 Host 兜底通知
 */
function showSystemBannerFallback(title, message, subtitle = '') {
  if (process.platform !== 'darwin') return;
  const safeTitle = (title || 'DSH 任务完成').replace(/[\\"]/g, '\\$&').replace(/[\r\n]+/g, ' ');
  const safeMessage = (message || '对话已完成').replace(/[\\"]/g, '\\$&').replace(/[\r\n]+/g, ' ');
  const safeSubtitle = (subtitle || '').replace(/[\\"]/g, '\\$&').replace(/[\r\n]+/g, ' ');

  const subPart = safeSubtitle ? `subtitle "${safeSubtitle}"` : '';
  const script = `display notification "${safeMessage}" with title "${safeTitle}" ${subPart}`;

  execFile('osascript', ['-e', script], () => {});
}

/**
 * 将模型原始回复文本清理为适合通知展示的精炼对话摘要
 */
export function cleanSummary(rawText) {
  if (!rawText || typeof rawText !== 'string') return '对话已完成，点击查看回复详情';

  let text = rawText.replace(/<think>[\s\S]*?<\/think>/gi, '').trim();
  text = text.replace(/```[\s\S]*?```/g, '[代码块]');
  text = text.replace(/^#+\s+/gm, '');
  text = text.replace(/\*\*([^\*]+)\*\*/g, '$1');
  text = text.replace(/\*([^\*]+)\*/g, '$1');
  text = text.replace(/`([^`]+)`/g, '$1');
  text = text.replace(/\[([^\]]+)\]\([^)]+\)/g, '$1');
  text = text.replace(/[\r\n\t]+/g, ' ').replace(/\s{2,}/g, ' ').trim();

  if (!text) return '对话已完成，点击查看回复详情';

  if (text.length > 70) {
    return text.slice(0, 68) + '...';
  }
  return text;
}

export class NotifierService {
  constructor(ctx, initialConfig = {}) {
    this.ctx = ctx;
    this.settings = { notifyOnApproval: true, ...initialConfig };
    this.turnStartTimes = new Map();
    this.lastAssistantTexts = new Map();
    this.notifiedTurns = new Map();
    this.broadcastToClients = null;
    this.sessionDisposer = null;
    this.disposed = false;
    this.init();
  }

  async init() {
    const loaded = await loadSettings();
    if (this.disposed) return;
    this.settings = { notifyOnApproval: true, ...loaded, ...this.settings };
    this.bindSessionEvents();
  }

  getSettings() {
    return { ...this.settings };
  }

  async updateSettings(patch) {
    this.settings = { ...this.settings, ...patch };
    await saveSettings(this.settings);
    return this.getSettings();
  }

  /**
   * 统一派发通知事件（优先推给客户端智能分流，无客户端时由 Host 兜底）
   */
  dispatchNotification(eventData) {
    let clientCount = 0;
    if (typeof this.broadcastToClients === 'function') {
      try {
        clientCount = this.broadcastToClients(eventData);
      } catch (_) {}
    }
    if (clientCount === 0 && this.settings.enableBanner !== false) {
      try {
        showSystemBannerFallback(eventData.title, eventData.summary, eventData.subtitle);
      } catch (_) {}
    }
  }

  async testNotify(customSettings) {
    const s = { ...this.settings, ...(customSettings || {}) };

    if (s.enableSound) {
      playSound(s.soundName || 'Glass');
    }

    if (s.enableSpeech && s.speechText) {
      speakText(s.speechText);
    }

    if (s.enableBanner) {
      const sampleSummary = '已为你完成代码分析与重构，点击本横幅可直接跳转回此会话。';
      const eventData = {
        type: 'test',
        title: 'DSH 任务完成',
        subtitle: '耗时 3.5s (测试)',
        summary: sampleSummary,
        sessionId: 'current',
      };

      this.dispatchNotification(eventData);
    }
  }

  bindSessionEvents() {
    if (this.disposed) return;
    if (typeof this.sessionDisposer === 'function') {
      this.sessionDisposer();
      this.sessionDisposer = null;
    }

    this.sessionDisposer = this.ctx.on('session/event', (session, event) => {
      if (this.disposed) return;
      const sessionId = String(session.id || 'default');

      // 1. 记录开始时间与重置缓存
      if (event.type === 'turn/start') {
        this.turnStartTimes.set(sessionId, Date.now());
        this.lastAssistantTexts.set(sessionId, '');
      }

      // 2. 实时收集本轮 Assistant 文本，并在文本输出完毕时【立即触发通知，零秒延迟】
      if (event.type === 'assistant/message') {
        const turn = event.data?.turn;
        const content = event.data?.message?.content || [];
        const textPieces = [];
        const toolCalls = [];

        for (const block of content) {
          if (block.type === 'text' && typeof block.text === 'string') {
            textPieces.push(block.text);
          } else if (block.type === 'tool-call') {
            toolCalls.push(block);
          }
        }

        if (textPieces.length > 0) {
          this.lastAssistantTexts.set(sessionId, textPieces.join('\n'));
        }

        // 如果本回复没有 tool-call，说明模型已打字输出完毕，立即触发通知
        if (toolCalls.length === 0 && textPieces.length > 0 && turn !== undefined) {
          const startTime = this.turnStartTimes.get(sessionId) || Date.now();
          const durationSec = Math.round(((Date.now() - startTime) / 1000) * 10) / 10;
          const summary = cleanSummary(textPieces.join('\n'));

          this.notifiedTurns.set(sessionId, turn);

          if (durationSec >= (this.settings.minDurationSec || 0)) {
            if (this.settings.enableSound) {
              playSound(this.settings.soundName || 'Glass');
            }

            if (this.settings.enableSpeech && this.settings.speechText) {
              speakText(this.settings.speechText);
            }

            if (this.settings.enableBanner) {
              const eventData = {
                type: 'completed',
                title: 'DSH 任务完成',
                subtitle: `耗时 ${durationSec}s`,
                summary,
                sessionId,
                durationSec,
              };

              this.dispatchNotification(eventData);
            }
          }
        }
      }

      // 3. 权限审批等待（User Approval / 允许按钮）
      if (event.type === 'approval/asked' && this.settings.notifyOnApproval) {
        playSound('Ping');
        const toolName = event.data?.toolName || '工具调用';
        const reason = event.data?.reason || '执行操作需要你的权限确认';
        const eventData = {
          type: 'approval',
          title: 'DSH 权限审批确认',
          subtitle: '等待授权执行',
          summary: `AI 正在请求执行「${toolName}」，${reason}`,
          sessionId,
        };
        this.dispatchNotification(eventData);
      }

      // 4. 工具调用中的人类交互 (Plan 模式审核 & 用户提问选择题)
      if (event.type === 'tool/call' && this.settings.notifyOnApproval) {
        const toolName = event.data?.name;
        if (toolName === 'exit_plan_mode') {
          playSound('Hero');
          const planText = event.data?.arguments?.plan || '';
          const planTitle = (planText.split('\n')[0] || '').replace(/^#+\s*/, '').trim() || '执行方案已制定';
          const eventData = {
            type: 'plan-review',
            title: 'DSH 计划待审批',
            subtitle: '方案已制定',
            summary: `AI 已提交计划「${planTitle}」，等待你确认批准以继续推进任务`,
            sessionId,
          };
          this.dispatchNotification(eventData);
        } else if (toolName === 'ask_user_question') {
          playSound('Ping');
          const questions = event.data?.arguments?.questions || [];
          const firstQ = questions[0]?.question || 'AI 遇到了需要你确认的技术决策';
          const eventData = {
            type: 'question',
            title: 'DSH 决策确认',
            subtitle: '等待回复',
            summary: cleanSummary(firstQ),
            sessionId,
          };
          this.dispatchNotification(eventData);
        }
      }

      // 5. 轮次结算 (转圈结束/后置兜底)
      if (event.type === 'turn/end') {
        const turn = event.data?.turn;
        const startTime = this.turnStartTimes.get(sessionId) || Date.now();
        const durationSec = Math.round(((Date.now() - startTime) / 1000) * 10) / 10;
        this.turnStartTimes.delete(sessionId);

        const rawText = this.lastAssistantTexts.get(sessionId) || '';
        this.lastAssistantTexts.delete(sessionId);
        const summary = cleanSummary(rawText);

        const reason = event.data?.reason?.kind;

        if (reason === 'completed') {
          // 如果在 assistant/message 阶段已经即时提醒过了，直接跳过
          if (turn !== undefined && this.notifiedTurns.get(sessionId) === turn) {
            this.notifiedTurns.delete(sessionId);
            return;
          }

          if (durationSec < (this.settings.minDurationSec || 0)) {
            return;
          }

          if (this.settings.enableSound) {
            playSound(this.settings.soundName || 'Glass');
          }

          if (this.settings.enableSpeech && this.settings.speechText) {
            speakText(this.settings.speechText);
          }

          if (this.settings.enableBanner) {
            const eventData = {
              type: 'completed',
              title: 'DSH 任务完成',
              subtitle: `耗时 ${durationSec}s`,
              summary,
              sessionId,
              durationSec,
            };

            this.dispatchNotification(eventData);
          }
        } else if (reason === 'error' && this.settings.notifyOnError) {
          playSound('Basso');
          const errMsg = event.data?.reason?.error?.message || '任务或工具调用遇到异常';
          if (this.settings.enableBanner) {
            const eventData = {
              type: 'error',
              title: 'DSH 执行异常',
              subtitle: `耗时 ${durationSec}s`,
              summary: errMsg,
              sessionId,
              durationSec,
            };

            this.dispatchNotification(eventData);
          }
        }
      }
    });
  }

  dispose() {
    this.disposed = true;
    if (typeof this.sessionDisposer === 'function') {
      this.sessionDisposer();
      this.sessionDisposer = null;
    }
    this.turnStartTimes.clear();
    this.lastAssistantTexts.clear();
    this.notifiedTurns.clear();
  }
}
