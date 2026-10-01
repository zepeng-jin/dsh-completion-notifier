import { execFile } from 'node:child_process';
import { existsSync } from 'node:fs';

export function playSound(soundName = 'Glass') {
  if (process.platform !== 'darwin') return;
  const soundPath = `/System/Library/Sounds/${soundName}.aiff`;
  if (existsSync(soundPath)) {
    execFile('afplay', [soundPath], (err) => {
      if (err) console.warn('[dsh-completion-notifier] afplay error:', err.message);
    });
  } else {
    // 降级使用系统蜂鸣
    execFile('osascript', ['-e', 'beep 1']);
  }
}

export function showBanner(title, message, subtitle = '', soundName = '') {
  if (process.platform === 'darwin') {
    // 安全转义双引号与反斜杠，单行化
    const safeTitle = (title || 'DSH 任务完成').replace(/[\\"]/g, '\\$&').replace(/[\r\n]+/g, ' ');
    const safeMessage = (message || '对话已完成').replace(/[\\"]/g, '\\$&').replace(/[\r\n]+/g, ' ');
    const safeSubtitle = (subtitle || '').replace(/[\\"]/g, '\\$&').replace(/[\r\n]+/g, ' ');

    const subtitlePart = safeSubtitle ? `subtitle "${safeSubtitle}"` : '';
    const soundPart = soundName ? `sound name "${soundName}"` : '';

    // 优先通过 DSH Desktop 应用身份发送通知，使通知中心显示 DSH 原生应用图标
    const script = `
      try
        tell application id "io.dsh.desktop" to display notification "${safeMessage}" with title "${safeTitle}" ${subtitlePart} ${soundPart}
      on error
        display notification "${safeMessage}" with title "${safeTitle}" ${subtitlePart} ${soundPart}
      end try
    `.trim();

    execFile('osascript', ['-e', script], (err) => {
      if (err) console.warn('[dsh-completion-notifier] osascript banner error:', err.message);
    });
  }
}

export function speakText(text) {
  if (process.platform !== 'darwin' || !text) return;
  const safeText = text.replace(/[\\"]/g, '\\$&').replace(/[\r\n]+/g, ' ');
  execFile('say', [safeText], (err) => {
    if (err) console.warn('[dsh-completion-notifier] say error:', err.message);
  });
}

export function triggerNotification(type, options = {}, settings = {}) {
  if (!settings.enabled) return;

  const { durationSec = 0, summary = '' } = options;

  if (type === 'completed') {
    // 检查耗时阈值
    if (durationSec < (settings.minDurationSec || 0)) {
      return;
    }

    if (settings.enableSound) {
      playSound(settings.soundName || 'Glass');
    }

    if (settings.enableBanner) {
      const title = 'DSH 任务完成';
      const subtitle = `⚡️ 耗时 ${durationSec} 秒`;
      const message = summary || 'AI 对话已完成，请查看回复详情';
      showBanner(title, message, subtitle, settings.soundName);
    }

    if (settings.enableSpeech && settings.speechText) {
      speakText(settings.speechText);
    }
  } else if (type === 'error' && settings.notifyOnError) {
    playSound('Basso');
    const title = 'DSH 执行异常';
    const subtitle = `耗时 ${durationSec} 秒`;
    const message = summary || '任务或工具调用遇到错误，请查看会话详情';
    showBanner(title, message, subtitle, 'Basso');
  }
}
