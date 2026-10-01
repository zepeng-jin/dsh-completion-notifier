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

export function showBanner(title, message, soundName) {
  if (process.platform === 'darwin') {
    // 安全转义双引号与反斜杠
    const safeTitle = title.replace(/[\\"]/g, '\\$&');
    const safeMessage = message.replace(/[\\"]/g, '\\$&');
    const script = soundName
      ? `display notification "${safeMessage}" with title "${safeTitle}" sound name "${soundName}"`
      : `display notification "${safeMessage}" with title "${safeTitle}"`;

    execFile('osascript', ['-e', script], (err) => {
      if (err) console.warn('[dsh-completion-notifier] osascript banner error:', err.message);
    });
  }
}

export function speakText(text) {
  if (process.platform !== 'darwin' || !text) return;
  const safeText = text.replace(/[\\"]/g, '\\$&');
  execFile('say', [safeText], (err) => {
    if (err) console.warn('[dsh-completion-notifier] say error:', err.message);
  });
}

export function triggerNotification(type, options, settings) {
  if (!settings.enabled) return;

  const { durationSec = 0 } = options;

  if (type === 'completed') {
    // 检查耗时阈值
    if (durationSec < settings.minDurationSec) {
      return;
    }

    if (settings.enableSound) {
      playSound(settings.soundName);
    }

    if (settings.enableBanner) {
      const msg = `AI 对话已完成 (耗时 ${durationSec}s)`;
      showBanner('DSH 任务完成', msg);
    }

    if (settings.enableSpeech && settings.speechText) {
      speakText(settings.speechText);
    }
  } else if (type === 'error' && settings.notifyOnError) {
    playSound('Basso');
    showBanner('DSH 执行异常', '任务或工具调用遇到错误，请查看会话详情');
  }
}
