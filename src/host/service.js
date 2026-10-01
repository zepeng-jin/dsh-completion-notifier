import { loadSettings, saveSettings } from './persist.js';
import { triggerNotification, playSound, showBanner, speakText } from './notifier.js';

export class NotifierService {
  constructor(ctx, initialConfig = {}) {
    this.ctx = ctx;
    this.settings = { ...initialConfig };
    this.turnStartTimes = new Map();
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
      showBanner('DSH 通知测试', `测试成功！声音: ${s.soundName}`, s.soundName);
    }
    if (s.enableSpeech && s.speechText) {
      speakText(s.speechText);
    }
  }

  bindSessionEvents() {
    this.ctx.on('session/event', (session, event) => {
      const sessionId = String(session.id || 'default');

      // 记录开始时间
      if (event.type === 'turn/start') {
        this.turnStartTimes.set(sessionId, Date.now());
      }

      // 轮次完成
      if (event.type === 'turn/end') {
        const startTime = this.turnStartTimes.get(sessionId) || Date.now();
        const durationSec = Math.round(((Date.now() - startTime) / 1000) * 10) / 10;
        this.turnStartTimes.delete(sessionId);

        const reason = event.data?.reason?.kind;

        if (reason === 'completed') {
          triggerNotification('completed', { durationSec }, this.settings);
        } else if (reason === 'error') {
          triggerNotification('error', { durationSec }, this.settings);
        }
      }
    });
  }
}
