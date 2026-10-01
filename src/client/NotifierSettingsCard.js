import React, { useState, useEffect } from 'react';
import { zh, en } from './locales.js';

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
  const [loading, setLoading] = useState(true);
  const [testing, setTesting] = useState(false);
  const [tip, setTip] = useState('');

  // 加载当前设置
  useEffect(() => {
    fetch('/api/notifier/settings')
      .then(res => res.json())
      .then(data => {
        if (data.ok) {
          setSettings(data.settings);
          if (data.availableSounds) setSounds(data.availableSounds);
        }
      })
      .catch(err => {
        console.error('[dsh-completion-notifier] load error:', err);
      })
      .finally(() => setLoading(false));
  }, []);

  // 保存设置并更新状态
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
      setTip(t.saveSuccess);
      setTimeout(() => setTip(''), 2000);
    } catch (err) {
      console.error('[dsh-completion-notifier] save error:', err);
      setTip(t.error);
    }
  };

  // 测试触发通知
  const handleTest = async () => {
    if (!settings || testing) return;
    setTesting(true);
    setTip('');
    try {
      await fetch('/api/notifier/test', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(settings),
      });
      setTip(t.testSuccess);
    } catch (err) {
      setTip(t.error);
    } finally {
      setTesting(false);
      setTimeout(() => setTip(''), 3000);
    }
  };

  if (loading) {
    return <div style={{ padding: '16px', color: 'var(--dsw-alias-label-caption, #888)' }}>加载设置中...</div>;
  }

  if (!settings) {
    return null;
  }

  const containerStyle = {
    padding: '20px',
    margin: '12px 0',
    borderRadius: '12px',
    backgroundColor: 'var(--dsw-alias-bg-module-platform, rgba(128,128,128,0.06))',
    border: '1px solid var(--dsw-alias-border-l2, rgba(128,128,128,0.2))',
    fontFamily: 'inherit',
    color: 'var(--dsw-alias-label-primary, inherit)',
  };

  const rowStyle = {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '10px 0',
    borderBottom: '1px solid var(--dsw-alias-border-l1, rgba(128,128,128,0.1))',
  };

  const labelBoxStyle = {
    display: 'flex',
    flexDirection: 'column',
    gap: '3px',
  };

  const labelStyle = {
    fontSize: '14px',
    fontWeight: '500',
  };

  const hintStyle = {
    fontSize: '12px',
    color: 'var(--dsw-alias-label-caption, #888)',
  };

  const selectStyle = {
    height: '32px',
    padding: '0 10px',
    borderRadius: '8px',
    border: '1px solid var(--dsw-alias-border-l2, #ccc)',
    backgroundColor: 'var(--dsw-alias-bg-base, #fff)',
    color: 'inherit',
    fontSize: '13px',
    outline: 'none',
  };

  const inputNumberStyle = {
    width: '70px',
    height: '30px',
    padding: '0 8px',
    borderRadius: '6px',
    border: '1px solid var(--dsw-alias-border-l2, #ccc)',
    backgroundColor: 'var(--dsw-alias-bg-base, #fff)',
    color: 'inherit',
    textAlign: 'center',
    fontSize: '13px',
  };

  const switchStyle = {
    width: '40px',
    height: '22px',
    cursor: 'pointer',
    accentColor: 'var(--dsw-alias-state-business-primary, #007aff)',
  };

  return (
    <div style={containerStyle}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px' }}>
        <div>
          <h3 style={{ margin: '0 0 4px 0', fontSize: '16px', fontWeight: '600' }}>{t.title}</h3>
          <p style={{ margin: 0, fontSize: '13px', color: 'var(--dsw-alias-label-caption, #888)' }}>{t.description}</p>
        </div>
        <button
          type="button"
          onClick={handleTest}
          disabled={testing || !settings.enabled}
          style={{
            padding: '6px 14px',
            borderRadius: '8px',
            backgroundColor: settings.enabled ? 'var(--dsw-alias-state-business-primary, #007aff)' : '#ccc',
            color: '#fff',
            border: 'none',
            fontSize: '13px',
            fontWeight: '500',
            cursor: settings.enabled ? 'pointer' : 'not-allowed',
            transition: 'opacity 0.2s',
          }}
        >
          {testing ? t.testing : t.testBtn}
        </button>
      </div>

      {tip && (
        <div style={{
          padding: '6px 12px',
          marginBottom: '10px',
          borderRadius: '6px',
          backgroundColor: 'rgba(52, 199, 89, 0.15)',
          color: '#34c759',
          fontSize: '12px',
          display: 'inline-block'
        }}>
          {tip}
        </div>
      )}

      {/* 1. 总开关 */}
      <div style={rowStyle}>
        <div style={labelBoxStyle}>
          <span style={labelStyle}>{t.enabled}</span>
          <span style={hintStyle}>{t.enabledHint}</span>
        </div>
        <input
          type="checkbox"
          style={switchStyle}
          checked={!!settings.enabled}
          onChange={e => updateSetting('enabled', e.target.checked)}
        />
      </div>

      {/* 2. 系统通知横幅 */}
      <div style={rowStyle}>
        <div style={labelBoxStyle}>
          <span style={labelStyle}>{t.banner}</span>
          <span style={hintStyle}>{t.bannerHint}</span>
        </div>
        <input
          type="checkbox"
          style={switchStyle}
          disabled={!settings.enabled}
          checked={!!settings.enableBanner}
          onChange={e => updateSetting('enableBanner', e.target.checked)}
        />
      </div>

      {/* 3. 提示音开关与声音选择 */}
      <div style={rowStyle}>
        <div style={labelBoxStyle}>
          <span style={labelStyle}>{t.sound}</span>
          <span style={hintStyle}>{t.soundHint}</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <select
            style={selectStyle}
            disabled={!settings.enabled || !settings.enableSound}
            value={settings.soundName || 'Glass'}
            onChange={e => updateSetting('soundName', e.target.value)}
          >
            {sounds.map(s => (
              <option key={s.id} value={s.id}>{s.name}</option>
            ))}
          </select>
          <input
            type="checkbox"
            style={switchStyle}
            disabled={!settings.enabled}
            checked={!!settings.enableSound}
            onChange={e => updateSetting('enableSound', e.target.checked)}
          />
        </div>
      </div>

      {/* 4. 最小耗时阈值 */}
      <div style={rowStyle}>
        <div style={labelBoxStyle}>
          <span style={labelStyle}>{t.minDuration}</span>
          <span style={hintStyle}>{t.minDurationHint}</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <input
            type="number"
            min="0"
            max="300"
            style={inputNumberStyle}
            disabled={!settings.enabled}
            value={settings.minDurationSec ?? 3}
            onChange={e => updateSetting('minDurationSec', Math.max(0, parseInt(e.target.value, 10) || 0))}
          />
          <span style={{ fontSize: '13px', color: 'var(--dsw-alias-label-caption, #888)' }}>秒</span>
        </div>
      </div>

      {/* 5. 语音播报开关 */}
      <div style={{ ...rowStyle, borderBottom: 'none' }}>
        <div style={labelBoxStyle}>
          <span style={labelStyle}>{t.speech}</span>
          <span style={hintStyle}>{t.speechHint}</span>
        </div>
        <input
          type="checkbox"
          style={switchStyle}
          disabled={!settings.enabled}
          checked={!!settings.enableSpeech}
          onChange={e => updateSetting('enableSpeech', e.target.checked)}
        />
      </div>
    </div>
  );
}
