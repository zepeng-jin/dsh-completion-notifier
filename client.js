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

      /**
       * 原生 macOS 风格 Toggle Switch 开关（告别生硬方框复选框）
       */
      function Switch(props) {
        const { checked, onChange, disabled } = props;
        return React.createElement('div', {
          onClick: () => {
            if (!disabled && onChange) onChange(!checked);
          },
          style: {
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
          }
        }, React.createElement('div', {
          style: {
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
          }
        }));
      }

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
            setTip('配置已保存');
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
            padding: '8px 0 16px 0',
            fontFamily: 'inherit',
            color: 'var(--dsw-alias-label-primary, inherit)',
          }
        }, [
          // 顶部标题与测试按钮栏
          React.createElement('div', {
            key: 'header',
            style: {
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              paddingBottom: '14px',
              borderBottom: '1px solid var(--dsw-alias-border-l1, rgba(128,128,128,0.12))',
              gap: '12px'
            }
          }, [
            React.createElement('div', { key: 'title-box' }, [
              React.createElement('div', {
                key: 'title-row',
                style: { display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }
              }, [
                React.createElement('span', { key: 'icon', style: { fontSize: '16px' } }, '🔔'),
                React.createElement('span', {
                  key: 'h3',
                  style: { fontSize: '15px', fontWeight: '600' }
                }, '完成通知与音效'),
                tip && React.createElement('span', {
                  key: 'tip',
                  style: {
                    padding: '2px 8px',
                    borderRadius: '999px',
                    backgroundColor: 'rgba(52, 199, 89, 0.15)',
                    color: '#34c759',
                    fontSize: '11px',
                    fontWeight: '500',
                  }
                }, tip)
              ]),
              React.createElement('div', {
                key: 'p',
                style: { fontSize: '12px', color: 'var(--dsw-alias-label-caption, #888)', lineHeight: '1.4' }
              }, '在 AI 任务执行完成时，通过 macOS 系统通知横幅、原生应用图标、对话摘要与清脆提示音提醒你。')
            ]),
            React.createElement('button', {
              key: 'btn',
              type: 'button',
              onClick: handleTest,
              disabled: testing || !settings.enabled,
              style: {
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
              }
            }, testing ? '测试中...' : '🔔 测试通知与声音')
          ]),

          // Row 1: 启用完成通知总开关
          React.createElement('div', {
            key: 'row-enable',
            style: {
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '13px 0',
              borderBottom: '1px solid var(--dsw-alias-border-l1, rgba(128,128,128,0.1))'
            }
          }, [
            React.createElement('div', { key: 'l1' }, [
              React.createElement('div', { style: { fontSize: '13.5px', fontWeight: '500' } }, '启用完成通知'),
              React.createElement('div', { style: { fontSize: '12px', color: 'var(--dsw-alias-label-caption, #888)', marginTop: '2px' } }, '总开关：对话完成时进行通知提醒')
            ]),
            React.createElement(Switch, {
              key: 'sw1',
              checked: !!settings.enabled,
              onChange: (val) => updateSetting('enabled', val)
            })
          ]),

          // Row 2: macOS 系统通知横幅
          React.createElement('div', {
            key: 'row-banner',
            style: {
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '13px 0',
              borderBottom: '1px solid var(--dsw-alias-border-l1, rgba(128,128,128,0.1))',
              opacity: settings.enabled ? 1 : 0.5
            }
          }, [
            React.createElement('div', { key: 'l2' }, [
              React.createElement('div', { style: { fontSize: '13.5px', fontWeight: '500' } }, 'macOS 系统通知横幅'),
              React.createElement('div', { style: { fontSize: '12px', color: 'var(--dsw-alias-label-caption, #888)', marginTop: '2px' } }, '通知中心弹出横幅提醒 (附带 DSH 原生图标、单轮耗时与对话精炼摘要)')
            ]),
            React.createElement(Switch, {
              key: 'sw2',
              disabled: !settings.enabled,
              checked: !!settings.enableBanner,
              onChange: (val) => updateSetting('enableBanner', val)
            })
          ]),

          // Row 3: 完成提示音与声音选择
          React.createElement('div', {
            key: 'row-sound',
            style: {
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '13px 0',
              borderBottom: '1px solid var(--dsw-alias-border-l1, rgba(128,128,128,0.1))',
              opacity: settings.enabled ? 1 : 0.5
            }
          }, [
            React.createElement('div', { key: 'l3' }, [
              React.createElement('div', { style: { fontSize: '13.5px', fontWeight: '500' } }, '完成提示音'),
              React.createElement('div', { style: { fontSize: '12px', color: 'var(--dsw-alias-label-caption, #888)', marginTop: '2px' } }, '任务结算时播放的系统高保真音效')
            ]),
            React.createElement('div', { key: 'r3', style: { display: 'flex', alignItems: 'center', gap: '10px' } }, [
              React.createElement('select', {
                key: 'sel',
                disabled: !settings.enabled || !settings.enableSound,
                value: settings.soundName || 'Glass',
                onChange: (e) => updateSetting('soundName', e.target.value),
                style: {
                  height: '28px',
                  padding: '0 10px',
                  borderRadius: '8px',
                  border: '1px solid var(--dsw-alias-border-l2, rgba(128,128,128,0.25))',
                  backgroundColor: 'var(--dsw-alias-bg-module-platform, rgba(128,128,128,0.08))',
                  color: 'inherit',
                  fontSize: '12px',
                  cursor: (!settings.enabled || !settings.enableSound) ? 'not-allowed' : 'pointer',
                  outline: 'none',
                }
              }, sounds.map(s => React.createElement('option', { key: s.id, value: s.id }, s.name))),
              React.createElement(Switch, {
                key: 'sw3',
                disabled: !settings.enabled,
                checked: !!settings.enableSound,
                onChange: (val) => updateSetting('enableSound', val)
              })
            ])
          ]),

          // Row 4: 最小提醒耗时阈值
          React.createElement('div', {
            key: 'row-duration',
            style: {
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '13px 0',
              borderBottom: '1px solid var(--dsw-alias-border-l1, rgba(128,128,128,0.1))',
              opacity: settings.enabled ? 1 : 0.5
            }
          }, [
            React.createElement('div', { key: 'l4' }, [
              React.createElement('div', { style: { fontSize: '13.5px', fontWeight: '500' } }, '最小提醒耗时阈值 (秒)'),
              React.createElement('div', { style: { fontSize: '12px', color: 'var(--dsw-alias-label-caption, #888)', marginTop: '2px' } }, '仅对单轮耗时超过该时长的任务提醒 (设为 0 秒提醒全部，避免日常短句快问快答频繁打扰)')
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
