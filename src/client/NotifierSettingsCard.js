import React, { useState, useEffect } from 'react';

/**
 * 原生 macOS 风格 Toggle Switch 开关（克制雅致的 Apple 蓝，告别刺眼荧光青）
 */
function Switch({ checked, onChange, disabled }) {
  return (
    <div
      onClick={() => {
        if (!disabled && onChange) onChange(!checked);
      }}
      style={{
        width: '38px',
        height: '22px',
        borderRadius: '999px',
        backgroundColor: checked
          ? '#0a84ff'
          : 'var(--dsw-alias-border-l2, rgba(255, 255, 255, 0.14))',
        position: 'relative',
        cursor: disabled ? 'not-allowed' : 'pointer',
        transition: 'background-color 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
        flexShrink: 0,
        opacity: disabled ? 0.4 : 1,
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
          transform: checked ? 'translateX(16px)' : 'translateX(0)',
          transition: 'transform 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
          boxShadow: '0 1px 3px rgba(0, 0, 0, 0.25)',
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
      setTip('已保存');
      setTimeout(() => setTip(''), 1500);
    } catch {
      setTip('保存失败');
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
      setTip('已发出测试');
    } catch {
      setTip('请求失败');
    } finally {
      setTesting(false);
      setTimeout(() => setTip(''), 2500);
    }
  };

  if (!settings) return null;

  return (
    <div
      style={{
        padding: '0 4px 24px 4px',
        fontFamily: 'inherit',
        color: 'var(--dsw-alias-label-primary, inherit)',
        maxWidth: '720px',
      }}
    >
      {/* 顶部标题栏：克制雅致、单行绝对不换行、去彩色大图与干扰徽标 */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          paddingBottom: '14px',
          borderBottom: '1px solid var(--dsw-alias-border-l1, rgba(255, 255, 255, 0.08))',
          gap: '16px',
        }}
      >
        <div style={{ minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ fontSize: '15px', fontWeight: '500', whiteSpace: 'nowrap' }}>
              通知与标题
            </span>
            {tip && (
              <span
                style={{
                  padding: '1px 6px',
                  borderRadius: '4px',
                  backgroundColor: 'rgba(255, 255, 255, 0.08)',
                  color: 'var(--dsw-alias-label-secondary, #999)',
                  fontSize: '11px',
                }}
              >
                {tip}
              </span>
            )}
          </div>
          <div
            style={{
              fontSize: '12.5px',
              color: 'var(--dsw-alias-label-caption, #8a8f98)',
              marginTop: '3px',
              lineHeight: '1.4',
            }}
          >
            管理 macOS 原生通知横幅、提示音效与会话智能命名。
          </div>
        </div>

        {/* 沉稳低调的灰色微框测试按钮，彻底摒弃刺眼荧光青大色块 */}
        <button
          type="button"
          onClick={handleTest}
          disabled={testing || !settings.enabled}
          style={{
            height: '28px',
            padding: '0 12px',
            borderRadius: '6px',
            backgroundColor: 'var(--dsw-alias-bg-module-platform, rgba(255, 255, 255, 0.06))',
            color: 'var(--dsw-alias-label-primary, inherit)',
            border: '1px solid var(--dsw-alias-border-l2, rgba(255, 255, 255, 0.12))',
            fontSize: '12px',
            fontWeight: '400',
            cursor: settings.enabled ? 'pointer' : 'not-allowed',
            opacity: settings.enabled ? 1 : 0.45,
            whiteSpace: 'nowrap',
            flexShrink: 0,
            transition: 'background-color 0.15s',
          }}
        >
          {testing ? '测试中...' : '测试通知与声音'}
        </button>
      </div>

      {/* Row 1: 启用完成通知 */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '12px 0',
          borderBottom: '1px solid var(--dsw-alias-border-l1, rgba(255, 255, 255, 0.06))',
        }}
      >
        <div>
          <div style={{ fontSize: '13.5px', fontWeight: '450' }}>启用完成通知</div>
          <div style={{ fontSize: '12px', color: 'var(--dsw-alias-label-caption, #8a8f98)', marginTop: '2px' }}>
            总开关：对话完成时进行通知提醒
          </div>
        </div>
        <Switch
          checked={!!settings.enabled}
          onChange={(val) => updateSetting('enabled', val)}
        />
      </div>

      {/* Row 2: macOS 系统通知横幅 */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '12px 0',
          borderBottom: '1px solid var(--dsw-alias-border-l1, rgba(255, 255, 255, 0.06))',
          opacity: settings.enabled ? 1 : 0.45,
        }}
      >
        <div>
          <div style={{ fontSize: '13.5px', fontWeight: '450' }}>macOS 系统通知横幅</div>
          <div style={{ fontSize: '12px', color: 'var(--dsw-alias-label-caption, #8a8f98)', marginTop: '2px' }}>
            通知中心弹出横幅提醒（附带 DSH 官方白鲸图标与对话摘要，点击直达会话）
          </div>
        </div>
        <Switch
          disabled={!settings.enabled}
          checked={!!settings.enableBanner}
          onChange={(val) => updateSetting('enableBanner', val)}
        />
      </div>

      {/* Row 3: 完成提示音 */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '12px 0',
          borderBottom: '1px solid var(--dsw-alias-border-l1, rgba(255, 255, 255, 0.06))',
          opacity: settings.enabled ? 1 : 0.45,
        }}
      >
        <div>
          <div style={{ fontSize: '13.5px', fontWeight: '450' }}>完成提示音</div>
          <div style={{ fontSize: '12px', color: 'var(--dsw-alias-label-caption, #8a8f98)', marginTop: '2px' }}>
            任务结算时播放的系统高保真音效
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <select
            disabled={!settings.enabled || !settings.enableSound}
            value={settings.soundName || 'Glass'}
            onChange={(e) => updateSetting('soundName', e.target.value)}
            style={{
              height: '26px',
              padding: '0 8px',
              borderRadius: '6px',
              border: '1px solid var(--dsw-alias-border-l2, rgba(255, 255, 255, 0.12))',
              backgroundColor: 'var(--dsw-alias-bg-module-platform, rgba(255, 255, 255, 0.05))',
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

      {/* Row 4: 等待权限审批与 Plan 提交通知 */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '12px 0',
          borderBottom: '1px solid var(--dsw-alias-border-l1, rgba(255, 255, 255, 0.06))',
          opacity: settings.enabled ? 1 : 0.45,
        }}
      >
        <div>
          <div style={{ fontSize: '13.5px', fontWeight: '450' }}>等待权限审批与 Plan 提交通知</div>
          <div style={{ fontSize: '12px', color: 'var(--dsw-alias-label-caption, #8a8f98)', marginTop: '2px' }}>
            当 AI 等待权限授权（允许按钮）、Plan 计划审核或选择题时，发出横幅与音效提醒
          </div>
        </div>
        <Switch
          disabled={!settings.enabled}
          checked={settings.notifyOnApproval !== false}
          onChange={(val) => updateSetting('notifyOnApproval', val)}
        />
      </div>

      {/* Row 5: 最小提醒耗时阈值 (彻底移除幽灵开关，保留干净的微调输入框) */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '12px 0',
          borderBottom: '1px solid var(--dsw-alias-border-l1, rgba(255, 255, 255, 0.06))',
          opacity: settings.enabled ? 1 : 0.45,
        }}
      >
        <div>
          <div style={{ fontSize: '13.5px', fontWeight: '450' }}>最小提醒耗时阈值</div>
          <div style={{ fontSize: '12px', color: 'var(--dsw-alias-label-caption, #8a8f98)', marginTop: '2px' }}>
            仅对单轮耗时超过该时长的任务提醒（设为 0 秒提醒全部，避免日常短句打扰）
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
              width: '48px',
              height: '26px',
              padding: '0 4px',
              borderRadius: '6px',
              border: '1px solid var(--dsw-alias-border-l2, rgba(255, 255, 255, 0.12))',
              backgroundColor: 'var(--dsw-alias-bg-module-platform, rgba(255, 255, 255, 0.05))',
              color: 'inherit',
              textAlign: 'center',
              fontSize: '12px',
              outline: 'none',
            }}
          />
          <span style={{ fontSize: '12px', color: 'var(--dsw-alias-label-caption, #8a8f98)' }}>秒</span>
        </div>
      </div>

      {/* Row 6: 首轮对话智能提炼标题 */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '12px 0',
        }}
      >
        <div>
          <div style={{ fontSize: '13.5px', fontWeight: '450' }}>首轮对话智能提炼标题</div>
          <div style={{ fontSize: '12px', color: 'var(--dsw-alias-label-caption, #8a8f98)', marginTop: '2px' }}>
            首轮对话完成后，根据实际意图自动生成清晰中文标题（彻底替换 task ready）
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
