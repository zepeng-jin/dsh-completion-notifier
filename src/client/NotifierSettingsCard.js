import React, { useState, useEffect } from 'react';

const DEFAULT_UI_SETTINGS = {
  enabled: true,
  enableSound: true,
  soundName: 'Glass',
  enableBanner: true,
  enableSpeech: false,
  speechText: '任务已完成',
  minDurationSec: 3,
  notifyOnError: true,
  notifyOnApproval: true,
  alertTiming: 'always',
  autoJumpSession: false,
  enableInAppToast: true,
};

/**
 * 原生 macOS 风格 Toggle Switch 开关（克制雅致的 Apple 蓝）
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
  const [settings, setSettings] = useState(DEFAULT_UI_SETTINGS);
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
    fetch('/dsh-notifier/api/settings')
      .then(res => res.json())
      .then(data => {
        if (data.ok && data.settings) {
          setSettings(data.settings);
          if (data.availableSounds) setSounds(data.availableSounds);
        }
      })
      .catch(() => {});
  }, []);

  const updateSetting = async (key, val) => {
    const next = { ...settings, [key]: val };
    setSettings(next);
    try {
      await fetch('/dsh-notifier/api/settings', {
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
    if (testing) return;
    setTesting(true);

    try {
      await fetch('/dsh-notifier/api/test', {
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

  return (
    <div
      style={{
        padding: '0 4px 24px 4px',
        fontFamily: 'inherit',
        color: 'var(--dsw-alias-label-primary, inherit)',
        maxWidth: '720px',
      }}
    >
      {/* 顶部标题栏 */}
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
              完成通知与审批提醒
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
            管理系统通知、应用内浮窗、等待审批决策提醒与声音效果。
          </div>
        </div>

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
            总开关：对话完成或需要决策时进行通知提醒
          </div>
        </div>
        <Switch
          checked={!!settings.enabled}
          onChange={(val) => updateSetting('enabled', val)}
        />
      </div>

      {/* Row 2: 提醒时机模式 */}
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
          <div style={{ fontSize: '13.5px', fontWeight: '450' }}>提醒时机</div>
          <div style={{ fontSize: '12px', color: 'var(--dsw-alias-label-caption, #8a8f98)', marginTop: '2px' }}>
            全量提醒：无论当前是否在看 DSH 均提醒；仅未聚焦：在 DSH 内操作时静默，最小化或切走时才提醒
          </div>
        </div>
        <select
          disabled={!settings.enabled}
          value={settings.alertTiming || 'always'}
          onChange={(e) => updateSetting('alertTiming', e.target.value)}
          style={{
            height: '26px',
            padding: '0 8px',
            borderRadius: '6px',
            border: '1px solid var(--dsw-alias-border-l2, rgba(255, 255, 255, 0.12))',
            backgroundColor: 'var(--dsw-alias-bg-module-platform, rgba(255, 255, 255, 0.05))',
            color: 'inherit',
            fontSize: '12px',
            cursor: !settings.enabled ? 'not-allowed' : 'pointer',
            outline: 'none',
          }}
        >
          <option value="always">全量提醒（始终提醒 - 推荐）</option>
          <option value="unfocused">仅在未聚焦 / 后台时提醒</option>
        </select>
      </div>

      {/* Row 3: 自动跳转到对应会话 */}
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
          <div style={{ fontSize: '13.5px', fontWeight: '450' }}>自动跳转到对应会话</div>
          <div style={{ fontSize: '12px', color: 'var(--dsw-alias-label-caption, #8a8f98)', marginTop: '2px' }}>
            开启后，后台任务完成或停下来等待审批时，无需手动点击通知，DSH 自动将视图切入该会话
          </div>
        </div>
        <Switch
          disabled={!settings.enabled}
          checked={!!settings.autoJumpSession}
          onChange={(val) => updateSetting('autoJumpSession', val)}
        />
      </div>

      {/* Row 4: 前后台通知形式说明（智能分流） */}
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
          <div style={{ fontSize: '13.5px', fontWeight: '450' }}>前后台智能分流通知</div>
          <div style={{ fontSize: '12px', color: 'var(--dsw-alias-label-caption, #8a8f98)', marginTop: '2px' }}>
            在 DSH 窗口内只弹轻量应用内浮窗；窗口最小化或切走时只弹系统横幅，二者互斥，绝不重复弹窗
          </div>
        </div>
        <Switch
          disabled={!settings.enabled}
          checked={settings.enableInAppToast !== false}
          onChange={(val) => updateSetting('enableInAppToast', val)}
        />
      </div>

      {/* Row 5: 完成提示音 */}
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
            任务结算时播放的系统音效
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

      {/* Row 6: 等待权限审批与 Plan 提交通知 */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '12px 0',
          borderBottom: '1px solid var(--dsw-alias-border-l1, rgba(255, 255, 255, 0.06))',
          opacity: settings.enabled ? 1 : 0.45
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

      {/* Row 7: 最小提醒耗时阈值 */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '12px 0',
          opacity: settings.enabled ? 1 : 0.45
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
    </div>
  );
}
