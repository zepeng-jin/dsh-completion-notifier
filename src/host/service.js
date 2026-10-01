import { loadSettings, saveSettings } from './persist.js';
import { triggerNotification, playSound, showBanner, speakText } from './notifier.js';

/**
 * 将模型原始回复文本清理为适合通知展示的精炼对话摘要
 */
export function cleanSummary(rawText) {
  if (!rawText || typeof rawText !== 'string') return '对话已完成，点击查看回复详情';

  // 1. 去除 <think>...</think> 思考过程
  let text = rawText.replace(/<think>[\s\S]*?<\/think>/gi, '').trim();

  // 2. 将代码块替换为简洁提示
  text = text.replace(/```[\s\S]*?```/g, '[代码块]');

  // 3. 去除 Markdown 格式标记（标题、加粗、行内代码、链接）
  text = text.replace(/^#+\s+/gm, '');
  text = text.replace(/\*\*([^\*]+)\*\*/g, '$1');
  text = text.replace(/\*([^\*]+)\*/g, '$1');
  text = text.replace(/`([^`]+)`/g, '$1');
  text = text.replace(/\[([^\]]+)\]\([^)]+\)/g, '$1');

  // 4. 规范化空白字符与换行
  text = text.replace(/[\r\n\t]+/g, ' ').replace(/\s{2,}/g, ' ').trim();

  if (!text) return '对话已完成，点击查看回复详情';

  // 5. 限制长度为 60~75 字左右，末尾加省略号
  if (text.length > 70) {
    return text.slice(0, 68) + '...';
  }
  return text;
}

export class NotifierService {
  constructor(ctx, initialConfig = {}) {
    this.ctx = ctx;
    this.settings = { ...initialConfig };
    this.turnStartTimes = new Map();
    this.lastAssistantTexts = new Map();
    this.broadcastToClients = null;
    this.init();
  }

  async init() {
    const loaded = await loadSettings();
    this.settings = { ...loaded, ...this.settings };
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

    if (s.enableBanner) {
      const sampleSummary = '已为你完成代码分析与重构，并成功通过所有测试用例。';
      const eventData = {
        type: 'test',
        title: 'DSH 通知测试',
        subtitle: '⚡️ 耗时 3.5s (测试)',
        summary: sampleSummary,
        sessionId: 'current',
      };

      // 优先通过 SSE 发送给前端渲染进程弹出（具备 DSH 原生图标与点击跳转）
      let clientCount = 0;
      if (typeof this.broadcastToClients === 'function') {
        clientCount = this.broadcastToClients(eventData);
      }

      // 若无前端连接，走 osascript 兜底
      if (clientCount === 0) {
        showBanner('DSH 通知测试', sampleSummary, '⚡️ 耗时 3.5s (测试)', s.soundName);
      }
    }

    if (s.enableSpeech && s.speechText) {
      speakText(s.speechText);
    }
  }

  bindSessionEvents() {
    this.ctx.on('session/event', (session, event) => {
      const sessionId = String(session.id || 'default');

      // 1. 记录开始时间与重置缓存
      if (event.type === 'turn/start') {
        this.turnStartTimes.set(sessionId, Date.now());
        this.lastAssistantTexts.set(sessionId, '');
      }

      // 2. 实时收集本轮 Assistant 文本
      if (event.type === 'assistant/message') {
        const content = event.data?.message?.content || [];
        const textPieces = [];
        for (const block of content) {
          if (block.type === 'text' && typeof block.text === 'string') {
            textPieces.push(block.text);
          }
        }
        if (textPieces.length > 0) {
          this.lastAssistantTexts.set(sessionId, textPieces.join('\n'));
        }
      }

      // 3. 轮次完成
      if (event.type === 'turn/end') {
        const startTime = this.turnStartTimes.get(sessionId) || Date.now();
        const durationSec = Math.round(((Date.now() - startTime) / 1000) * 10) / 10;
        this.turnStartTimes.delete(sessionId);

        const rawText = this.lastAssistantTexts.get(sessionId) || '';
        this.lastAssistantTexts.delete(sessionId);
        const summary = cleanSummary(rawText);

        const reason = event.data?.reason?.kind;

        if (reason === 'completed') {
          // 阈值过滤
          if (durationSec < (this.settings.minDurationSec || 0)) {
            return;
          }

          if (this.settings.enableSound) {
            playSound(this.settings.soundName || 'Glass');
          }

          if (this.settings.enableBanner) {
            const eventData = {
              type: 'completed',
              title: 'DSH 任务完成',
              subtitle: `⚡️ 耗时 ${durationSec}s`,
              summary,
              sessionId,
              durationSec,
            };

            let clientCount = 0;
            if (typeof this.broadcastToClients === 'function') {
              clientCount = this.broadcastToClients(eventData);
            }

            if (clientCount === 0) {
              triggerNotification('completed', { durationSec, summary }, this.settings);
            }
          }

          if (this.settings.enableSpeech && this.settings.speechText) {
            speakText(this.settings.speechText);
          }
        } else if (reason === 'error') {
          if (this.settings.notifyOnError) {
            playSound('Basso');
            const errMsg = event.data?.reason?.error?.message || '任务或工具调用遇到异常';
            const eventData = {
              type: 'error',
              title: 'DSH 执行异常',
              subtitle: `耗时 ${durationSec}s`,
              summary: errMsg,
              sessionId,
              durationSec,
            };

            let clientCount = 0;
            if (typeof this.broadcastToClients === 'function') {
              clientCount = this.broadcastToClients(eventData);
            }

            if (clientCount === 0) {
              triggerNotification('error', { durationSec, summary: errMsg }, this.settings);
            }
          }
        }
      }
    });
  }
}
