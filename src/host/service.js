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
      playSound(s.soundName);
    }
    if (s.enableBanner) {
      const sampleSummary = '已为你完成代码分析与重构，并成功通过所有测试用例。';
      showBanner('DSH 任务完成', sampleSummary, '⚡️ 耗时 3.5 秒 (测试)', s.soundName);
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

      // 2. 收集本轮 Assistant 文本
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

      // 3. 轮次结算
      if (event.type === 'turn/end') {
        const startTime = this.turnStartTimes.get(sessionId) || Date.now();
        const durationSec = Math.round(((Date.now() - startTime) / 1000) * 10) / 10;
        this.turnStartTimes.delete(sessionId);

        const rawText = this.lastAssistantTexts.get(sessionId) || '';
        this.lastAssistantTexts.delete(sessionId);
        const summary = cleanSummary(rawText);

        const reason = event.data?.reason?.kind;

        if (reason === 'completed') {
          triggerNotification('completed', { durationSec, summary }, this.settings);
        } else if (reason === 'error') {
          const errMsg = event.data?.reason?.error?.message || '任务或工具调用遇到异常';
          triggerNotification('error', { durationSec, summary: errMsg }, this.settings);
        }
      }
    });
  }
}
