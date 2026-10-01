import React, { useState, useEffect } from 'react';
import { zh, en } from './locales.js';

/**
 * 原生 macOS 风格 Toggle Switch 开关组件（告别生硬方框复选框）
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

export function NotifierSettingsCard() {
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
  const [tip, setTip] = useState('');

  // 加载设置
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

  if (!settings) return null;

  return (
    <div
      style={{
        padding: '8px 0 16px 0',
        fontFamily: 'inherit',
        color: 'var(--dsw-alias-label-primary, inherit)',
      }}
    >
      {/* 模块顶部标题与测试操作栏 */}
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
            <span style={{ fontSize: '16px' }}>🔔</span>
            <span style={{ fontSize: '15px', fontWeight: '600' }}>{t.title || '完成通知与音效'}</span>
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
            {t.description || '在 AI 任务执行完成时，通过 macOS 系统通知横幅、原生应用图标、对话摘要与清脆提示音提醒你。'}
          </div>
        </div>

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
            flexShrink: 0,
            transition: 'opacity 0.15s, transform 0.1s',
            boxShadow: settings.enabled ? '0 1px 3px rgba(0, 122, 255, 0.25)' : 'none',
          }}
        >
          {testing ? (t.testing || '测试中...') : (t.testBtn || '🔔 测试通知与声音')}
        </button>
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
          <div style={{ fontSize: '13.5px', fontWeight: '500' }}>{t.enabled || '启用完成通知'}</div>
          <div style={{ fontSize: '12px', color: 'var(--dsw-alias-label-caption, #888)', marginTop: '2px' }}>
            {t.enabledHint || '总开关：对话完成时进行通知提醒'}
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
          <div style={{ fontSize: '13.5px', fontWeight: '500' }}>{t.banner || 'macOS 系统通知横幅'}</div>
          <div style={{ fontSize: '12px', color: 'var(--dsw-alias-label-caption, #888)', marginTop: '2px' }}>
            {t.bannerHint || '通知中心弹出横幅提醒 (附带 DSH 原生图标、单轮耗时与对话精炼摘要)'}
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
          <div style={{ fontSize: '13.5px', fontWeight: '500' }}>{t.sound || '完成提示音'}</div>
          <div style={{ fontSize: '12px', color: 'var(--dsw-alias-label-caption, #888)', marginTop: '2px' }}>
            {t.soundHint || '任务结算时播放的系统高保真音效'}
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

      {/* Row 4: 最小提醒耗时阈值 */}
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
          <div style={{ fontSize: '13.5px', fontWeight: '500' }}>{t.minDuration || '最小提醒耗时阈值 (秒)'}</div>
          <div style={{ fontSize: '12px', color: 'var(--dsw-alias-label-caption, #888)', marginTop: '2px' }}>
            {t.minDurationHint || '仅对单轮耗时超过该时长的任务提醒 (设为 0 秒提醒全部，避免日常短句快问快答频繁打扰)'}
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
    </div>
  );
}
