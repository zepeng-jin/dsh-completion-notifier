import React, { useState, useEffect } from 'react';
import { zh, en } from './locales.js';

/**
 * 纯矢量 SVG 图标集 (极简克制，随文本颜色自然变换，零彩色 Emoji)
 */
function BellIcon({ size = 15, style = {} }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.75"
      strokeLinecap="round"
      strokeLinejoin="round"
      style={{ verticalAlign: '-2px', flexShrink: 0, ...style }}
    >
      <path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9" />
      <path d="M10.3 21a1.94 1.94 0 0 0 3.4 0" />
    </svg>
  );
}

function WandIcon({ size = 13, style = {} }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.75"
      strokeLinecap="round"
      strokeLinejoin="round"
      style={{ verticalAlign: '-1px', flexShrink: 0, ...style }}
    >
      <path d="m15 4-2 4 4-2-4 2 2 4" />
      <path d="M2 20h4l12-12-4-4L2 16v4Z" />
    </svg>
  );
}

function PlayIcon({ size = 11, style = {} }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="currentColor"
      style={{ verticalAlign: '-1px', flexShrink: 0, ...style }}
    >
      <polygon points="6 4 20 12 6 20 6 4" />
    </svg>
  );
}

/**
 * 原生 macOS 风格 Toggle Switch 开关组件 (无生硬方框，纯平滑胶囊)
 */
function Switch({ checked, onChange, disabled }) {
  return (
    <div
      onClick={() => {
        if (!disabled && onChange) onChange(!checked);
      }}
      style={{
        width: '40px',
        height: '22px',
        borderRadius: '999px',
        backgroundColor: checked
          ? 'var(--dsw-alias-state-business-primary, #007aff)'
          : 'var(--dsw-alias-border-l2, rgba(128, 128, 128, 0.25))',
        position: 'relative',
        cursor: disabled ? 'not-allowed' : 'pointer',
        transition: 'background-color 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
        flexShrink: 0,
        opacity: disabled ? 0.45 : 1,
        userSelect: 'none',
      }}
    >
      <div
        style={{
          width: '18px',
          height: '18px',
          borderRadius: '50%',
          backgroundColor: '#ffffff',
          position: 'absolute',
          top: '2px',
          left: '2px',
          transform: checked ? 'translateX(18px)' : 'translateX(0)',
          transition: 'transform 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
          boxShadow: '0 1px 3px rgba(0, 0, 0, 0.2)',
        }}
      />
    </div>
  );
}

/**
 * 弹出 DSH 原生白鲸图标系统横幅
 */
export function sendNativeNotification(ctx, eventData) {
  if (typeof window === 'undefined' || typeof window.Notification === 'undefined') return;

  if (window.Notification.permission === 'default') {
    try {
      window.Notification.requestPermission();
    } catch (_) {}
  }

  const title = eventData.title || 'DSH 任务完成';
  const body = eventData.subtitle
    ? `${eventData.subtitle} · ${eventData.summary || '请查看会话详情'}`
    : (eventData.summary || '请查看会话详情');

  try {
    const notification = new window.Notification(title, {
      body,
      tag: eventData.sessionId || 'dsh-notify',
      renotify: true,
    });

    notification.onclick = () => {
      try {
        window.focus();

        const sessionId = eventData.sessionId;
        if (!sessionId || sessionId === 'current') return;

        if (ctx && ctx.uiWorkspace && typeof ctx.uiWorkspace.openSession === 'function') {
          ctx.uiWorkspace.openSession(sessionId);
          return;
        }

        const selector = `[data-session-id="${sessionId}"], [data-id="${sessionId}"], a[href*="${sessionId}"]`;
        const target = document.querySelector(selector);
        if (target) target.click();
      } catch (clickErr) {
        console.warn('[dsh-completion-notifier] click navigate error:', clickErr);
      }
    };
  } catch (err) {
    console.warn('[dsh-completion-notifier] show notification error:', err);
  }
}

export function NotifierSettingsCard({ ctx }) {
  const isZh = typeof document !== 'undefined' && (document.documentElement.lang || '').toLowerCase().startsWith('zh');
  const t = isZh ? zh : en;

  const [settings, setSettings] = useState(null);
  const [sounds, setSounds] = useState([
    { id: 'Glass', name: 'Glass (玻璃清脆声 - 推荐)' },
    { id: 'Ping', name: 'Ping (清爽叮咚声)' },
    { id: 'Hero', name: 'Hero (凯旋号角声)' },
    { id: 'Pop', name: 'Pop (轻柔气泡声)' },
    { id: 'Submarine', name: 'Submarine (潜艇声纳)' },
    { id: 'Purr', name: 'Purr (柔和呼噜声)' },
    { id: 'Funk', name: 'Funk (活力弹拨声)' },
  ]);
  const [testing, setTesting] = useState(false);
  const [cleaning, setCleaning] = useState(false);
  const [tip, setTip] = useState('');

  useEffect(() => {
    fetch('/api/notifier/settings')
      .then(res => res.json())
      .then(data => {
        if (data.ok) {
          setSettings(data.settings);
          if (data.availableSounds) setSounds(data.availableSounds);
        }
      })
      .catch(() => {});
  }, []);

  const updateSetting = async (key, val) => {
    if (!settings) return;
    const next = { ...settings, [key]: val };
    setSettings(next);
    try {
      await fetch('/api/notifier/settings', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ [key]: val }),
      });
      setTip(t.saveSuccess || '配置已保存');
      setTimeout(() => setTip(''), 2000);
    } catch {
      setTip(t.error || '保存失败');
    }
  };

  const handleTest = async () => {
    if (!settings || testing) return;
    setTesting(true);

    if (settings.enableBanner) {
      sendNativeNotification(ctx, {
        title: 'DSH 任务完成',
        subtitle: '耗时 3.5s (测试)',
        summary: '已为你完成代码分析与重构，点击本横幅可直接跳转回此会话。',
        sessionId: 'current',
      });
    }

    try {
      await fetch('/api/notifier/test', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(settings),
      });
      setTip(t.testSuccess || '测试通知已发出！');
    } catch {
      setTip(t.error || '测试请求失败');
    } finally {
      setTesting(false);
      setTimeout(() => setTip(''), 3000);
    }
  };

  const handleCleanTitles = async () => {
    if (cleaning) return;
    setCleaning(true);
    try {
      const res = await fetch('/api/notifier/clean-titles', { method: 'POST' });
      const data = await res.json();
      if (data.ok) {
        setTip(`已智能重命名 ${data.count} 个无脑会话！`);
      } else {
        setTip('暂无可智能重命名的会话');
      }
    } catch {
      setTip('一键重命名请求失败');
    } finally {
      setCleaning(false);
      setTimeout(() => setTip(''), 3500);
    }
  };

  if (!settings) return null;

  return (
    <div
      style={{
        padding: '8px 0 16px 0',
        fontFamily: 'inherit',
        color: 'var(--dsw-alias-label-primary, inherit)',
      }}
    >
      {/* 模块顶部标题与操作栏 */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          paddingBottom: '14px',
          borderBottom: '1px solid var(--dsw-alias-border-l1, rgba(128,128,128,0.12))',
          gap: '12px',
        }}
      >
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
            <BellIcon size={16} />
            <span style={{ fontSize: '15px', fontWeight: '600' }}>完成通知、审批提醒与智能标题</span>
            {tip && (
              <span
                style={{
                  padding: '2px 8px',
                  borderRadius: '999px',
                  backgroundColor: 'rgba(52, 199, 89, 0.15)',
                  color: '#34c759',
                  fontSize: '11px',
                  fontWeight: '500',
                  transition: 'opacity 0.2s',
                }}
              >
                {tip}
              </span>
            )}
          </div>
          <div style={{ fontSize: '12px', color: 'var(--dsw-alias-label-caption, #888)', lineHeight: '1.4' }}>
            在 AI 对话完成或等待权限审批、Plan 审核与决策时，通过 macOS 系统通知横幅、原生白鲸图标与提示音提醒你；首轮对话后自动提炼清晰中文标题。
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexShrink: 0 }}>
          <button
            type="button"
            onClick={handleCleanTitles}
            disabled={cleaning}
            title="扫描侧边栏所有名字叫 task ready 或命令行开头的无脑会话，智能提炼为准确主题"
            style={{
              height: '32px',
              padding: '0 12px',
              borderRadius: '16px',
              backgroundColor: 'var(--dsw-alias-bg-module-platform, rgba(128, 128, 128, 0.1))',
              color: 'var(--dsw-alias-label-primary, inherit)',
              border: '1px solid var(--dsw-alias-border-l2, rgba(128, 128, 128, 0.25))',
              fontSize: '12px',
              fontWeight: '500',
              cursor: cleaning ? 'not-allowed' : 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              transition: 'all 0.15s',
            }}
          >
            <WandIcon size={13} />
            <span>{cleaning ? '正在提炼...' : '修复历史标题'}</span>
          </button>

          <button
            type="button"
            onClick={handleTest}
            disabled={testing || !settings.enabled}
            style={{
              height: '32px',
              padding: '0 14px',
              borderRadius: '16px',
              backgroundColor: settings.enabled
                ? 'var(--dsw-alias-state-business-primary, #007aff)'
                : 'var(--dsw-alias-border-l2, #ccc)',
              color: '#ffffff',
              border: 'none',
              fontSize: '12px',
              fontWeight: '500',
              cursor: settings.enabled ? 'pointer' : 'not-allowed',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              transition: 'opacity 0.15s, transform 0.1s',
              boxShadow: settings.enabled ? '0 1px 3px rgba(0, 122, 255, 0.25)' : 'none',
            }}
          >
            <PlayIcon size={11} />
            <span>{testing ? '测试中...' : '测试通知与声音'}</span>
          </button>
        </div>
      </div>

      {/* Row 1: 启用完成通知总开关 */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '13px 0',
          borderBottom: '1px solid var(--dsw-alias-border-l1, rgba(128,128,128,0.1))',
        }}
      >
        <div>
          <div style={{ fontSize: '13.5px', fontWeight: '500' }}>启用完成通知</div>
          <div style={{ fontSize: '12px', color: 'var(--dsw-alias-label-caption, #888)', marginTop: '2px' }}>
            总开关：对话完成时进行通知提醒
          </div>
        </div>
        <Switch
          checked={!!settings.enabled}
          onChange={(val) => updateSetting('enabled', val)}
        />
      </div>

      {/* Row 2: macOS 系统横幅 */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '13px 0',
          borderBottom: '1px solid var(--dsw-alias-border-l1, rgba(128,128,128,0.1))',
          opacity: settings.enabled ? 1 : 0.5,
        }}
      >
        <div>
          <div style={{ fontSize: '13.5px', fontWeight: '500' }}>macOS 系统通知横幅</div>
          <div style={{ fontSize: '12px', color: 'var(--dsw-alias-label-caption, #888)', marginTop: '2px' }}>
            通知中心弹出横幅提醒 (附带 DSH 官方白鲸图标、单轮耗时与对话精炼摘要，点击跳转对应会话)
          </div>
        </div>
        <Switch
          disabled={!settings.enabled}
          checked={!!settings.enableBanner}
          onChange={(val) => updateSetting('enableBanner', val)}
        />
      </div>

      {/* Row 3: 完成提示音与音效选择 */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '13px 0',
          borderBottom: '1px solid var(--dsw-alias-border-l1, rgba(128,128,128,0.1))',
          opacity: settings.enabled ? 1 : 0.5,
        }}
      >
        <div>
          <div style={{ fontSize: '13.5px', fontWeight: '500' }}>完成提示音</div>
          <div style={{ fontSize: '12px', color: 'var(--dsw-alias-label-caption, #888)', marginTop: '2px' }}>
            任务结算时播放的系统高保真音效
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <select
            disabled={!settings.enabled || !settings.enableSound}
            value={settings.soundName || 'Glass'}
            onChange={(e) => updateSetting('soundName', e.target.value)}
            style={{
              height: '28px',
              padding: '0 10px',
              borderRadius: '8px',
              border: '1px solid var(--dsw-alias-border-l2, rgba(128,128,128,0.25))',
              backgroundColor: 'var(--dsw-alias-bg-module-platform, rgba(128,128,128,0.08))',
              color: 'inherit',
              fontSize: '12px',
              cursor: (!settings.enabled || !settings.enableSound) ? 'not-allowed' : 'pointer',
              outline: 'none',
            }}
          >
            {sounds.map(s => (
              <option key={s.id} value={s.id}>{s.name}</option>
            ))}
          </select>
          <Switch
            disabled={!settings.enabled}
            checked={!!settings.enableSound}
            onChange={(val) => updateSetting('enableSound', val)}
          />
        </div>
      </div>

      {/* Row 4: 等待权限审批 (允许) 与 Plan 审核提醒 */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '13px 0',
          borderBottom: '1px solid var(--dsw-alias-border-l1, rgba(128,128,128,0.1))',
        }}
      >
        <div>
          <div style={{ fontSize: '13.5px', fontWeight: '500' }}>等待权限审批与 Plan 提交通知</div>
          <div style={{ fontSize: '12px', color: 'var(--dsw-alias-label-caption, #888)', marginTop: '2px' }}>
            当 AI 等待权限授权（允许按钮）、Plan 计划审核或选择题时，发出系统通知与音效提醒，点击可直接进入会话决策
          </div>
        </div>
        <Switch
          checked={settings.notifyOnApproval !== false}
          onChange={(val) => updateSetting('notifyOnApproval', val)}
        />
      </div>

      {/* Row 5: 最小提醒耗时阈值 */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '13px 0',
          borderBottom: '1px solid var(--dsw-alias-border-l1, rgba(128,128,128,0.1))',
          opacity: settings.enabled ? 1 : 0.5,
        }}
      >
        <div>
          <div style={{ fontSize: '13.5px', fontWeight: '500' }}>最小提醒耗时阈值 (秒)</div>
          <div style={{ fontSize: '12px', color: 'var(--dsw-alias-label-caption, #888)', marginTop: '2px' }}>
            仅对单轮耗时超过该时长的任务提醒 (设为 0 秒提醒全部，避免日常短句快问快答频繁打扰)
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <input
            type="number"
            min={0}
            max={300}
            disabled={!settings.enabled}
            value={settings.minDurationSec ?? 3}
            onChange={(e) => updateSetting('minDurationSec', Math.max(0, parseInt(e.target.value, 10) || 0))}
            style={{
              width: '54px',
              height: '28px',
              padding: '0 6px',
              borderRadius: '8px',
              border: '1px solid var(--dsw-alias-border-l2, rgba(128,128,128,0.25))',
              backgroundColor: 'var(--dsw-alias-bg-module-platform, rgba(128,128,128,0.08))',
              color: 'inherit',
              textAlign: 'center',
              fontSize: '12px',
              outline: 'none',
            }}
          />
          <span style={{ fontSize: '12px', color: 'var(--dsw-alias-label-caption, #888)' }}>秒</span>
        </div>
      </div>

      {/* Row 6: 自动智能提炼会话标题 */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '13px 0',
        }}
      >
        <div>
          <div style={{ fontSize: '13.5px', fontWeight: '500' }}>首轮对话智能提炼标题</div>
          <div style={{ fontSize: '12px', color: 'var(--dsw-alias-label-caption, #888)', marginTop: '2px' }}>
            首轮对话完成后，根据实际意图自动生成 6~10 字清晰中文标题（彻底解决 task ready 机械命名）
          </div>
        </div>
        <Switch
          checked={settings.autoTitle !== false}
          onChange={(val) => updateSetting('autoTitle', val)}
        />
      </div>
    </div>
  );
}
