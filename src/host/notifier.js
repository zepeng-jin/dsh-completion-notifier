import { execFile } from 'node:child_process';
import { existsSync } from 'node:fs';

/**
 * 播放 macOS 系统高保真音效 (基于 afplay，不依赖浏览器，无后台节流)
 */
export function playSound(soundName = 'Glass') {
  if (process.platform !== 'darwin') return;
  const soundPath = `/System/Library/Sounds/${soundName}.aiff`;
  if (existsSync(soundPath)) {
    execFile('afplay', [soundPath], (err) => {
      if (err) console.warn('[dsh-completion-notifier] afplay error:', err.message);
    });
  }
}

/**
 * 语音播报文本
 */
export function speakText(text) {
  if (process.platform !== 'darwin' || !text) return;
  const safeText = text.replace(/[\\"]/g, '\\$&').replace(/[\r\n]+/g, ' ');
  execFile('say', [safeText], (err) => {
    if (err) console.warn('[dsh-completion-notifier] say error:', err.message);
  });
}
