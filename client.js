/**
 * dsh-completion-notifier client bundle
 * Mounts the NotifierSettingsCard into DSH Settings slots:
 * 1. 'settings.general.item' (Vanilla DSH General Settings)
 * 2. 'web-ui.plugin.item' (DSH Web UI Plugin Center)
 */

if (typeof window !== 'undefined' && window.__ModuleLoader__) {
  window.__ModuleLoader__.load({
    id: 'dsh-completion-notifier',
    factory: (require) => {
      const module = { exports: {} };
      const exports = module.exports;
      Object.defineProperty(exports, '__esModule', { value: true });

      const React = require('react');

      function NotifierSettingsCard() {
        const [settings, setSettings] = React.useState(null);
        const [sounds, setSounds] = React.useState([
          { id: 'Glass', name: 'Glass (玻璃清脆声 - 推荐)' },
          { id: 'Ping', name: 'Ping (清爽叮咚声)' },
          { id: 'Hero', name: 'Hero (凯旋号角声)' },
          { id: 'Pop', name: 'Pop (轻柔气泡声)' },
          { id: 'Submarine', name: 'Submarine (潜艇声纳)' },
          { id: 'Purr', name: 'Purr (柔和呼噜声)' },
          { id: 'Funk', name: 'Funk (活力弹拨声)' },
        ]);
        const [testing, setTesting] = React.useState(false);
        const [tip, setTip] = React.useState('');

        React.useEffect(() => {
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
            setTip('配置已自动保存');
            setTimeout(() => setTip(''), 2000);
          } catch {
            setTip('保存失败');
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
            setTip('测试通知已发出！');
          } catch {
            setTip('测试请求失败');
          } finally {
            setTesting(false);
            setTimeout(() => setTip(''), 3000);
          }
        };

        if (!settings) return null;

        return React.createElement('div', {
          style: {
            padding: '16px 20px',
            margin: '12px 0',
            borderRadius: '12px',
            backgroundColor: 'var(--dsw-alias-bg-module-platform, rgba(128,128,128,0.06))',
            border: '1px solid var(--dsw-alias-border-l2, rgba(128,128,128,0.2))',
            fontFamily: 'inherit',
            color: 'var(--dsw-alias-label-primary, inherit)',
          }
        }, [
          // Header
          React.createElement('div', {
            key: 'header',
            style: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px' }
          }, [
            React.createElement('div', { key: 'title-box' }, [
              React.createElement('h3', {
                key: 'h3',
                style: { margin: '0 0 4px 0', fontSize: '15px', fontWeight: '600' }
              }, '通知'),
              React.createElement('p', {
                key: 'p',
                style: { margin: 0, fontSize: '12px', color: 'var(--dsw-alias-label-caption, #888)' }
              }, '在 AI 任务执行完成时，通过 macOS 系统通知横幅与提示音提醒你。')
            ]),
            React.createElement('button', {
              key: 'btn',
              type: 'button',
              onClick: handleTest,
              disabled: testing || !settings.enabled,
              style: {
                padding: '6px 14px',
                borderRadius: '8px',
                backgroundColor: settings.enabled ? 'var(--dsw-alias-state-business-primary, #007aff)' : '#ccc',
                color: '#fff',
                border: 'none',
                fontSize: '12px',
                fontWeight: '500',
                cursor: settings.enabled ? 'pointer' : 'not-allowed',
              }
            }, testing ? '测试中...' : '🔔 测试通知与声音')
          ]),

          tip && React.createElement('div', {
            key: 'tip',
            style: {
              padding: '4px 10px',
              marginBottom: '10px',
              borderRadius: '6px',
              backgroundColor: 'rgba(52, 199, 89, 0.15)',
              color: '#34c759',
              fontSize: '12px',
              display: 'inline-block'
            }
          }, tip),

          // Row 1: 总开关
          React.createElement('div', {
            key: 'row-enable',
            style: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 0', borderBottom: '1px solid var(--dsw-alias-border-l1, rgba(128,128,128,0.1))' }
          }, [
            React.createElement('div', { key: 'l1' }, [
              React.createElement('div', { style: { fontSize: '14px', fontWeight: '500' } }, '启用完成通知'),
              React.createElement('div', { style: { fontSize: '12px', color: 'var(--dsw-alias-label-caption, #888)' } }, '总开关：对话完成时进行通知')
            ]),
            React.createElement('input', {
              key: 'cb1',
              type: 'checkbox',
              style: { width: '38px', height: '20px', cursor: 'pointer' },
              checked: !!settings.enabled,
              onChange: (e) => updateSetting('enabled', e.target.checked)
            })
          ]),

          // Row 2: 系统横幅
          React.createElement('div', {
            key: 'row-banner',
            style: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 0', borderBottom: '1px solid var(--dsw-alias-border-l1, rgba(128,128,128,0.1))' }
          }, [
            React.createElement('div', { key: 'l2' }, [
              React.createElement('div', { style: { fontSize: '14px', fontWeight: '500' } }, 'macOS 系统横幅'),
              React.createElement('div', { style: { fontSize: '12px', color: 'var(--dsw-alias-label-caption, #888)' } }, '通知中心弹出任务完成横幅 (含耗时统计)')
            ]),
            React.createElement('input', {
              key: 'cb2',
              type: 'checkbox',
              disabled: !settings.enabled,
              style: { width: '38px', height: '20px', cursor: 'pointer' },
              checked: !!settings.enableBanner,
              onChange: (e) => updateSetting('enableBanner', e.target.checked)
            })
          ]),

          // Row 3: 声音选择
          React.createElement('div', {
            key: 'row-sound',
            style: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 0', borderBottom: '1px solid var(--dsw-alias-border-l1, rgba(128,128,128,0.1))' }
          }, [
            React.createElement('div', { key: 'l3' }, [
              React.createElement('div', { style: { fontSize: '14px', fontWeight: '500' } }, '完成提示音'),
              React.createElement('div', { style: { fontSize: '12px', color: 'var(--dsw-alias-label-caption, #888)' } }, '结算时播放的系统音效')
            ]),
            React.createElement('div', { key: 'r3', style: { display: 'flex', alignItems: 'center', gap: '10px' } }, [
              React.createElement('select', {
                key: 'sel',
                disabled: !settings.enabled || !settings.enableSound,
                value: settings.soundName || 'Glass',
                onChange: (e) => updateSetting('soundName', e.target.value),
                style: {
                  height: '30px',
                  padding: '0 8px',
                  borderRadius: '6px',
                  border: '1px solid var(--dsw-alias-border-l2, #ccc)',
                  backgroundColor: 'var(--dsw-alias-bg-base, #fff)',
                  color: 'inherit',
                  fontSize: '12px',
                }
              }, sounds.map(s => React.createElement('option', { key: s.id, value: s.id }, s.name))),
              React.createElement('input', {
                key: 'cb3',
                type: 'checkbox',
                disabled: !settings.enabled,
                style: { width: '38px', height: '20px', cursor: 'pointer' },
                checked: !!settings.enableSound,
                onChange: (e) => updateSetting('enableSound', e.target.checked)
              })
            ])
          ]),

          // Row 4: 耗时阈值
          React.createElement('div', {
            key: 'row-duration',
            style: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 0' }
          }, [
            React.createElement('div', { key: 'l4' }, [
              React.createElement('div', { style: { fontSize: '14px', fontWeight: '500' } }, '最小提醒阈值 (秒)'),
              React.createElement('div', { style: { fontSize: '12px', color: 'var(--dsw-alias-label-caption, #888)' } }, '任务耗时超过该值才提醒 (默认 3 秒，设为 0 提醒所有)')
            ]),
            React.createElement('div', { key: 'r4', style: { display: 'flex', alignItems: 'center', gap: '6px' } }, [
              React.createElement('input', {
                key: 'num',
                type: 'number',
                min: 0,
                max: 300,
                disabled: !settings.enabled,
                value: settings.minDurationSec ?? 3,
                onChange: (e) => updateSetting('minDurationSec', Math.max(0, parseInt(e.target.value, 10) || 0)),
                style: {
                  width: '60px',
                  height: '28px',
                  padding: '0 6px',
                  borderRadius: '6px',
                  border: '1px solid var(--dsw-alias-border-l2, #ccc)',
                  backgroundColor: 'var(--dsw-alias-bg-base, #fff)',
                  color: 'inherit',
                  textAlign: 'center',
                  fontSize: '12px',
                }
              }),
              React.createElement('span', { key: 'unit', style: { fontSize: '12px', color: 'var(--dsw-alias-label-caption, #888)' } }, '秒')
            ])
          ])
        ]);
      }

      function apply(ctx) {
        // 注册到 DSH 设置通用分区 (settings.general.item)
        if (ctx.slots) {
          ctx.slots.inject('settings.general.item', () =>
            ctx.slots.register({
              name: 'settings.general.item',
              id: 'dsh-completion-notifier-settings',
              order: 250,
            }, NotifierSettingsCard)
          );

          // 同时注册到插件中心卡片插槽 (web-ui.plugin.item) 确保兼容
          ctx.slots.inject('web-ui.plugin.item', () =>
            ctx.slots.register({
              name: 'web-ui.plugin.item',
              id: 'dsh-completion-notifier-plugin-card',
              order: 150,
            }, NotifierSettingsCard)
          );
        }
      }

      exports.apply = apply;
      exports.inject = ['slots'];
      return module.exports;
    }
  });
}
