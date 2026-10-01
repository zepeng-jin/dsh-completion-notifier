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

/**
 * 仅在浏览器前端断连或无客户端时的 Host 兜底通知
 */
export function showSystemBannerFallback(title, message, subtitle = '') {
  if (process.platform !== 'darwin') return;
  const safeTitle = (title || 'DSH 任务完成').replace(/[\\"]/g, '\\$&').replace(/[\r\n]+/g, ' ');
  const safeMessage = (message || '对话已完成').replace(/[\\"]/g, '\\$&').replace(/[\r\n]+/g, ' ');
  const safeSubtitle = (subtitle || '').replace(/[\\"]/g, '\\$&').replace(/[\r\n]+/g, ' ');

  const subPart = safeSubtitle ? `subtitle "${safeSubtitle}"` : '';
  const script = `display notification "${safeMessage}" with title "${safeTitle}" ${subPart}`;

  execFile('osascript', ['-e', script], () => {});
}
