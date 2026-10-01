import { existsSync } from 'node:fs';
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { join } from 'node:path';
import { homedir } from 'node:os';

export const DEFAULT_SETTINGS = {
  enabled: true,
  enableSound: true,
  soundName: 'Glass', // Glass, Ping, Hero, Pop, Submarine, Purr, Funk
  enableBanner: true,
  enableSpeech: false,
  speechText: '任务已完成',
  minDurationSec: 3, // 默认仅提醒耗时超过 3 秒的任务
  notifyOnError: true,
};

export const AVAILABLE_SOUNDS = [
  { id: 'Glass', name: 'Glass (玻璃清脆声 - 推荐)' },
  { id: 'Ping', name: 'Ping (清爽叮咚声)' },
  { id: 'Hero', name: 'Hero (凯旋号角声)' },
  { id: 'Pop', name: 'Pop (轻柔气泡声)' },
  { id: 'Submarine', name: 'Submarine (潜艇声纳)' },
  { id: 'Purr', name: 'Purr (柔和呼噜声)' },
  { id: 'Funk', name: 'Funk (活力弹拨声)' },
];

export function getPersistFilePath() {
  const dshDir = process.env.DSH_HOME || join(homedir(), '.dsh');
  return join(dshDir, 'notifier.json');
}

export async function loadSettings() {
  const filePath = getPersistFilePath();
  try {
    if (existsSync(filePath)) {
      const raw = await readFile(filePath, 'utf8');
      const data = JSON.parse(raw);
      return { ...DEFAULT_SETTINGS, ...data };
    }
  } catch (err) {
    console.warn('[dsh-completion-notifier] Failed to read notifier.json, using defaults:', err.message);
  }
  return { ...DEFAULT_SETTINGS };
}

export async function saveSettings(settings) {
  const filePath = getPersistFilePath();
  try {
    const dir = join(filePath, '..');
    await mkdir(dir, { recursive: true });
    await writeFile(filePath, JSON.stringify(settings, null, 2), 'utf8');
    return true;
  } catch (err) {
    console.error('[dsh-completion-notifier] Failed to save settings to notifier.json:', err.message);
    return false;
  }
}
