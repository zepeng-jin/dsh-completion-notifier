import { loadSettings, saveSettings } from './persist.js';
import { playSound, speakText } from './notifier.js';

/**
 * 判断标题是否为无脑的默认标题或机械指令
 */
export function isDumbTitle(title) {
  if (!title || typeof title !== 'string') return true;
  const lower = title.toLowerCase().trim();
  return (
    lower.startsWith('task ready') ||
    lower.includes('task ready') ||
    lower.startsWith('untitled') ||
    lower.startsWith('新会话') ||
    lower.startsWith('/') ||
    lower.startsWith('~') ||
    lower.startsWith('./') ||
    lower.startsWith('../') ||
    lower.startsWith('[系统背景') ||
    lower.startsWith('[system') ||
    lower.startsWith('cd ') ||
    lower.startsWith('pnpm ') ||
    lower.startsWith('npm ') ||
    lower.startsWith('git ') ||
    lower.startsWith('ls ') ||
    lower.startsWith('cat ') ||
    lower.startsWith('node ') ||
    lower.startsWith('python ') ||
    lower === 'hello' ||
    lower === 'hi' ||
    lower === 'test'
  );
}

export function extractSmartTitle(userPrompt, assistantSummary) {
  let cleanUser = (userPrompt || '')
    .replace(/<think>[\s\S]*?<\/think>/gi, '')
    .replace(/^task ready.*$/gim, '')
    .trim();

  // 若用户提问包含路径（如 /Users/.../modern-web-guidance-plugin 是什么）
  const pathMatch = /([A-Za-z0-9_.-]+(?:plugin|sdk|api|tool|cli|[A-Za-z0-9_-]+))[\s\S]*?(是什么|怎么用|如何|干嘛|做什么)/i.exec(cleanUser);
  if (pathMatch) {
    const pkgName = pathMatch[1].replace(/\.js$|\.ts$/i, '');
    return `${pkgName} 介绍`;
  }

  // 剥离长路径前缀，只保留提问核心
  cleanUser = cleanUser.replace(/\/[A-Za-z0-9_.-]+\//g, '').replace(/^[#\s\-\*`]+/gm, '').trim();

  if (cleanUser && cleanUser.length > 2) {
    cleanUser = cleanUser
      .replace(/^(请问|帮我|如何|怎么|为什么|能不能|可以|我想|请解释|请实现|请编写|介绍一下)/g, '')
      .replace(/[？?\!！。，,]+$/g, '')
      .trim();

    if (cleanUser.length > 1) {
      if (cleanUser.length > 14) {
        return cleanUser.slice(0, 13) + '…';
      }
      return cleanUser;
    }
  }

  // 若用户提问全被过滤，结合 AI 答复提炼
  let cleanAssistant = (assistantSummary || '')
    .replace(/^(已为你|我已经|好的|没问题|通过|这是)/g, '')
    .replace(/[。，！!？?]+$/g, '')
    .trim();

  if (cleanAssistant && cleanAssistant.length > 2) {
    if (cleanAssistant.length > 14) {
      return cleanAssistant.slice(0, 13) + '…';
    }
    return cleanAssistant;
  }

  return '新对话任务';
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
    this.settings = { autoTitle: true, notifyOnApproval: true, ...initialConfig };
    this.turnStartTimes = new Map();
    this.lastAssistantTexts = new Map();
    this.lastUserTexts = new Map();
    this.notifiedTurns = new Map();
    this.broadcastToClients = null;
    this.sessionDisposer = null;
    this.disposed = false;
    this.init();
  }

  async init() {
    const loaded = await loadSettings();
    if (this.disposed) return;
    this.settings = { autoTitle: true, notifyOnApproval: true, ...loaded, ...this.settings };
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

      if (typeof this.broadcastToClients === 'function') {
        this.broadcastToClients(eventData);
      }
    }
  }

  /**
   * 智能更新指定会话的标题
   */
  smartRenameSession(session, userPrompt, assistantSummary) {
    try {
      const smartTitle = extractSmartTitle(userPrompt, assistantSummary);
      if (!smartTitle) return;

      session.append('session/title', {
        title: smartTitle,
        messageSeqs: [],
        source: { kind: 'user' },
      });

      console.log(`[dsh-completion-notifier] 会话 "${session.id}" 已智能重命名为: 「${smartTitle}」`);
      return smartTitle;
    } catch (err) {
      console.warn('[dsh-completion-notifier] smartRenameSession error:', err.message);
    }
  }

  /**
   * 一键清洗扫描所有包含 task ready 等无脑标题的历史会话
   */
  cleanDumbTitles() {
    const renamed = [];
    try {
      if (!this.ctx.sessions) return renamed;

      for (const [id, session] of this.ctx.sessions.entries()) {
        const events = session.snapshotEvents ? session.snapshotEvents() : [];
        const titleEvent = events.findLast(e => e.type === 'session/title');
        const currentTitle = titleEvent?.data?.title || '';

        if (isDumbTitle(currentTitle)) {
          const userMsg = events.find(e => e.type === 'user/message');
          const asstMsg = events.findLast(e => e.type === 'assistant/message');

          const userText = userMsg?.data?.message?.content?.find(b => b.type === 'text')?.text || '';
          const asstText = asstMsg?.data?.message?.content?.find(b => b.type === 'text')?.text || '';

          const newTitle = this.smartRenameSession(session, userText, cleanSummary(asstText));
          if (newTitle) {
            renamed.push({ id, oldTitle: currentTitle, newTitle });
          }
        }
      }
    } catch (err) {
      console.warn('[dsh-completion-notifier] cleanDumbTitles error:', err);
    }
    return renamed;
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

      // 🌟 核心拦截：一旦任何底层组件或模型将标题写为 task ready 或路径，立刻阻断并强制修正！
      if (event.type === 'session/title' && this.settings.autoTitle) {
        const title = event.data?.title;
        const sourceKind = event.data?.source?.kind;
        if (sourceKind !== 'user' && isDumbTitle(title)) {
          const userPrompt = this.lastUserTexts.get(sessionId) || '';
          const asstText = this.lastAssistantTexts.get(sessionId) || '';
          this.smartRenameSession(session, userPrompt, cleanSummary(asstText));
        }
      }

      // 1. 记录开始时间与重置缓存
      if (event.type === 'turn/start') {
        this.turnStartTimes.set(sessionId, Date.now());
        this.lastAssistantTexts.set(sessionId, '');
      }

      // 2. 捕获用户第一条真实输入
      if (event.type === 'user/message') {
        const content = event.data?.message?.content || [];
        const textPieces = [];
        for (const block of content) {
          if (block.type === 'text' && typeof block.text === 'string') {
            textPieces.push(block.text);
          }
        }
        if (textPieces.length > 0 && !this.lastUserTexts.get(sessionId)) {
          this.lastUserTexts.set(sessionId, textPieces.join('\n'));
        }
      }

      // 3. 实时收集本轮 Assistant 文本，并在文本输出完毕时【立即触发通知，零秒延迟】
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

        // 🌟 核心突破：如果本回复没有 tool-call，说明模型已完整打字输出完毕！
        // 立即触发声音、浮窗与系统通知！绝对不等底层 workspace-changes 漫长 30 秒的 git 超时！
        if (toolCalls.length === 0 && textPieces.length > 0 && turn !== undefined) {
          const startTime = this.turnStartTimes.get(sessionId) || Date.now();
          const durationSec = Math.round(((Date.now() - startTime) / 1000) * 10) / 10;
          const summary = cleanSummary(textPieces.join('\n'));

          this.notifiedTurns.set(sessionId, turn);

          // 自动重命名会话
          if (this.settings.autoTitle) {
            try {
              const events = session.snapshotEvents ? session.snapshotEvents() : [];
              const titleEvent = events.findLast(e => e.type === 'session/title');
              const currentTitle = titleEvent?.data?.title || '';
              if (isDumbTitle(currentTitle)) {
                const userPrompt = this.lastUserTexts.get(sessionId) || '';
                this.smartRenameSession(session, userPrompt, summary);
              }
            } catch (_) {}
          }

          // 阈值过滤通知
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

              if (typeof this.broadcastToClients === 'function') {
                this.broadcastToClients(eventData);
              }
            }
          }
        }
      }

      // 4. 权限审批等待（User Approval / 允许按钮）
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
        if (typeof this.broadcastToClients === 'function') {
          this.broadcastToClients(eventData);
        }
      }

      // 5. 工具调用中的人类交互 (Plan 模式审核 & 用户提问选择题)
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
          if (typeof this.broadcastToClients === 'function') {
            this.broadcastToClients(eventData);
          }
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
          if (typeof this.broadcastToClients === 'function') {
            this.broadcastToClients(eventData);
          }
        }
      }

      // 6. 轮次结算 (转圈结束/后置兜底)
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
          // 如果在 assistant/message 阶段已经即时提醒过了，直接跳过，避免重复通知！
          if (turn !== undefined && this.notifiedTurns.get(sessionId) === turn) {
            this.notifiedTurns.delete(sessionId);
            return;
          }

          // 智能总结会话标题兜底
          if (this.settings.autoTitle) {
            try {
              const events = session.snapshotEvents ? session.snapshotEvents() : [];
              const titleEvent = events.findLast(e => e.type === 'session/title');
              const currentTitle = titleEvent?.data?.title || '';

              if (isDumbTitle(currentTitle)) {
                const userPrompt = this.lastUserTexts.get(sessionId) || '';
                this.smartRenameSession(session, userPrompt, summary);
              }
            } catch (_) {}
          }

          // 阈值过滤通知
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

            if (typeof this.broadcastToClients === 'function') {
              this.broadcastToClients(eventData);
            }
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

            if (typeof this.broadcastToClients === 'function') {
              this.broadcastToClients(eventData);
            }
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
    this.lastUserTexts.clear();
    this.notifiedTurns.clear();
  }
}
