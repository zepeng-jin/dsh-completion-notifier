/**
 * dsh-completion-notifier client bundle
 * Features:
 * 1. Dedicated Settings Sidebar Section ('settings.section') with pixel-perfect SVG Bell icon
 * 2. Native macOS Notification via Web Notification API (100% DSH Whale Icon, zero Script Editor)
 * 3. Click notification to focus window & jump to session (no Finder popup)
 * 4. Refined macOS-style Toggle Switches in Settings UI (Apple blue, no neon cyan, no ugly square checkboxes)
 * 5. Approval & Plan Mode Alerts: notify when waiting for permission ('allow'), plan review, or user questions
 * 6. Smart Session Titler: automatically summarizes clean titles after 1st turn, replacing dumb 'task ready'
 * 7. Understated typography & minimalist dark-mode palette
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
       * 原生 macOS 风格 Toggle Switch 开关组件（克制雅致的 Apple 蓝，告别刺眼荧光青）
       */
      function Switch(props) {
        const { checked, onChange, disabled } = props;
        return React.createElement('div', {
          onClick: () => {
            if (!disabled && onChange) onChange(!checked);
          },
          style: {
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
            transform: checked ? 'translateX(16px)' : 'translateX(0)',
            transition: 'transform 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
            boxShadow: '0 1px 3px rgba(0, 0, 0, 0.25)',
          }
        }));
      }

      /**
       * 在当前窗口弹出具备 DSH 原生白鲸图标的 macOS 系统横幅，并绑定点击跳转
       */
      function sendNativeNotification(ctx, eventData) {
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

          // 点击通知事件：唤醒置顶 DSH 窗口，并跳转到对应会话框
          notification.onclick = () => {
            try {
              window.focus();

              const sessionId = eventData.sessionId;
              if (!sessionId || sessionId === 'current') return;

              // 1. 优先调用 uiWorkspace 服务跳转
              if (ctx && ctx.uiWorkspace && typeof ctx.uiWorkspace.openSession === 'function') {
                ctx.uiWorkspace.openSession(sessionId);
                return;
              }

              // 2. 降级：DOM 智能选择侧边栏会话项
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

      /**
       * 极简、克制、原生质感的设置视图组件
       */
      function NotifierSettingsView(props) {
        const { ctx } = props;
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

        return React.createElement('div', {
          style: {
            padding: '0 4px 24px 4px',
            fontFamily: 'inherit',
            color: 'var(--dsw-alias-label-primary, inherit)',
            maxWidth: '720px',
          }
        }, [
          // 顶部标题栏：克制雅致、单行不换行、无彩色干扰
          React.createElement('div', {
            key: 'header',
            style: {
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              paddingBottom: '14px',
              borderBottom: '1px solid var(--dsw-alias-border-l1, rgba(255, 255, 255, 0.08))',
              gap: '16px'
            }
          }, [
            React.createElement('div', { key: 'title-box', style: { minWidth: 0 } }, [
              React.createElement('div', {
                key: 'title-row',
                style: { display: 'flex', alignItems: 'center', gap: '8px' }
              }, [
                React.createElement('span', {
                  key: 'h3',
                  style: { fontSize: '15px', fontWeight: '500', whiteSpace: 'nowrap' }
                }, '通知与标题'),
                tip && React.createElement('span', {
                  key: 'tip',
                  style: {
                    padding: '1px 6px',
                    borderRadius: '4px',
                    backgroundColor: 'rgba(255, 255, 255, 0.08)',
                    color: 'var(--dsw-alias-label-secondary, #999)',
                    fontSize: '11px',
                  }
                }, tip)
              ]),
              React.createElement('div', {
                key: 'p',
                style: {
                  fontSize: '12.5px',
                  color: 'var(--dsw-alias-label-caption, #8a8f98)',
                  marginTop: '3px',
                  lineHeight: '1.4'
                }
              }, '管理 macOS 原生通知横幅、提示音效与会话智能命名。')
            ]),

            // 沉稳低调的灰色微框测试按钮，拒绝大色块
            React.createElement('button', {
              key: 'btn-test',
              type: 'button',
              onClick: handleTest,
              disabled: testing || !settings.enabled,
              style: {
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
              }
            }, testing ? '测试中...' : '测试通知与声音')
          ]),

          // Row 1: 启用完成通知
          React.createElement('div', {
            key: 'row-enable',
            style: {
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '12px 0',
              borderBottom: '1px solid var(--dsw-alias-border-l1, rgba(255, 255, 255, 0.06))'
            }
          }, [
            React.createElement('div', { key: 'l1' }, [
              React.createElement('div', { style: { fontSize: '13.5px', fontWeight: '450' } }, '启用完成通知'),
              React.createElement('div', { style: { fontSize: '12px', color: 'var(--dsw-alias-label-caption, #8a8f98)', marginTop: '2px' } }, '总开关：对话完成时进行通知提醒')
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
              padding: '12px 0',
              borderBottom: '1px solid var(--dsw-alias-border-l1, rgba(255, 255, 255, 0.06))',
              opacity: settings.enabled ? 1 : 0.45
            }
          }, [
            React.createElement('div', { key: 'l2' }, [
              React.createElement('div', { style: { fontSize: '13.5px', fontWeight: '450' } }, 'macOS 系统通知横幅'),
              React.createElement('div', { style: { fontSize: '12px', color: 'var(--dsw-alias-label-caption, #8a8f98)', marginTop: '2px' } }, '通知中心弹出横幅提醒（附带 DSH 官方白鲸图标与对话摘要，点击直达会话）')
            ]),
            React.createElement(Switch, {
              key: 'sw2',
              disabled: !settings.enabled,
              checked: !!settings.enableBanner,
              onChange: (val) => updateSetting('enableBanner', val)
            })
          ]),

          // Row 3: 完成提示音
          React.createElement('div', {
            key: 'row-sound',
            style: {
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '12px 0',
              borderBottom: '1px solid var(--dsw-alias-border-l1, rgba(255, 255, 255, 0.06))',
              opacity: settings.enabled ? 1 : 0.45
            }
          }, [
            React.createElement('div', { key: 'l3' }, [
              React.createElement('div', { style: { fontSize: '13.5px', fontWeight: '450' } }, '完成提示音'),
              React.createElement('div', { style: { fontSize: '12px', color: 'var(--dsw-alias-label-caption, #8a8f98)', marginTop: '2px' } }, '任务结算时播放的系统高保真音效')
            ]),
            React.createElement('div', { key: 'r3', style: { display: 'flex', alignItems: 'center', gap: '10px' } }, [
              React.createElement('select', {
                key: 'sel',
                disabled: !settings.enabled || !settings.enableSound,
                value: settings.soundName || 'Glass',
                onChange: (e) => updateSetting('soundName', e.target.value),
                style: {
                  height: '26px',
                  padding: '0 8px',
                  borderRadius: '6px',
                  border: '1px solid var(--dsw-alias-border-l2, rgba(255, 255, 255, 0.12))',
                  backgroundColor: 'var(--dsw-alias-bg-module-platform, rgba(255, 255, 255, 0.05))',
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

          // Row 4: 等待权限审批与 Plan 提交通知
          React.createElement('div', {
            key: 'row-approval',
            style: {
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '12px 0',
              borderBottom: '1px solid var(--dsw-alias-border-l1, rgba(255, 255, 255, 0.06))',
              opacity: settings.enabled ? 1 : 0.45
            }
          }, [
            React.createElement('div', { key: 'l-appr' }, [
              React.createElement('div', { style: { fontSize: '13.5px', fontWeight: '450' } }, '等待权限审批与 Plan 提交通知'),
              React.createElement('div', { style: { fontSize: '12px', color: 'var(--dsw-alias-label-caption, #8a8f98)', marginTop: '2px' } }, '当 AI 等待权限授权（允许按钮）、Plan 计划审核或选择题时，发出横幅与音效提醒')
            ]),
            React.createElement(Switch, {
              key: 'sw-appr',
              disabled: !settings.enabled,
              checked: settings.notifyOnApproval !== false,
              onChange: (val) => updateSetting('notifyOnApproval', val)
            })
          ]),

          // Row 5: 最小提醒耗时阈值 (已彻底移除幽灵开关，仅保留微调输入框)
          React.createElement('div', {
            key: 'row-duration',
            style: {
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '12px 0',
              borderBottom: '1px solid var(--dsw-alias-border-l1, rgba(255, 255, 255, 0.06))',
              opacity: settings.enabled ? 1 : 0.45
            }
          }, [
            React.createElement('div', { key: 'l4' }, [
              React.createElement('div', { style: { fontSize: '13.5px', fontWeight: '450' } }, '最小提醒耗时阈值'),
              React.createElement('div', { style: { fontSize: '12px', color: 'var(--dsw-alias-label-caption, #8a8f98)', marginTop: '2px' } }, '仅对单轮耗时超过该时长的任务提醒（设为 0 秒提醒全部，避免日常短句打扰）')
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
                }
              }),
              React.createElement('span', { key: 'unit', style: { fontSize: '12px', color: 'var(--dsw-alias-label-caption, #8a8f98)' } }, '秒')
            ])
          ]),

          // Row 6: 首轮对话智能提炼标题
          React.createElement('div', {
            key: 'row-autotitle',
            style: {
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '12px 0'
            }
          }, [
            React.createElement('div', { key: 'l5' }, [
              React.createElement('div', { style: { fontSize: '13.5px', fontWeight: '450' } }, '首轮对话智能提炼标题'),
              React.createElement('div', { style: { fontSize: '12px', color: 'var(--dsw-alias-label-caption, #8a8f98)', marginTop: '2px' } }, '首轮对话完成后，根据实际意图自动生成清晰中文标题（彻底替换 task ready）')
            ]),
            React.createElement(Switch, {
              key: 'sw5',
              checked: settings.autoTitle !== false,
              onChange: (val) => updateSetting('autoTitle', val)
            })
          ])
        ]);
      }

      /**
       * 监听系统通知事件并由前端弹出带原生白鲸图标与跳转能力的 Notification
       */
      function setupNotificationListener(ctx) {
        if (typeof window === 'undefined') return;

        if (window.Notification && window.Notification.permission === 'default') {
          try {
            window.Notification.requestPermission();
          } catch (_) {}
        }

        try {
          const eventSource = new EventSource('/api/notifier/events');

          eventSource.onmessage = (e) => {
            if (!e.data) return;
            try {
              const eventData = JSON.parse(e.data);
              sendNativeNotification(ctx, eventData);
            } catch (err) {
              console.warn('[dsh-completion-notifier] parse event error:', err);
            }
          };

          eventSource.onerror = () => {
            // 保持重连
          };

          ctx.effect(() => () => {
            eventSource.close();
          }, 'dsh-completion-notifier: close event source');
        } catch (err) {
          console.warn('[dsh-completion-notifier] SSE setup failed:', err);
        }
      }

      /**
       * 注入设置面板左侧导航图标 (使用纯矢量 SVG mask 替换通用小齿轮，像素级 1:1 对齐)
       */
      function installSidebarNavIcon(ctx) {
        if (typeof document === 'undefined') return;

        ctx.effect(() => {
          const bellSvg16 = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="none" stroke="#000" stroke-width="1.35" stroke-linecap="round" stroke-linejoin="round"><path d="M4 5.5a4 4 0 0 1 8 0c0 4.5 1.8 6 1.8 6H2.2s1.8-1.5 1.8-6"/><path d="M6.8 13.8a1.3 1.3 0 0 0 2.4 0"/></svg>';
          const maskUrl = 'data:image/svg+xml,' + encodeURIComponent(bellSvg16);

          const tag = document.createElement('style');
          tag.dataset.plugin = 'dsh-completion-notifier';
          tag.textContent = [
            '[data-dsh-notifier-nav] > svg {',
            '  width: 16px !important;',
            '  height: 16px !important;',
            '  flex: none !important;',
            '  box-sizing: border-box !important;',
            '  background-color: currentColor !important;',
            `  -webkit-mask: url("${maskUrl}") no-repeat center !important;`,
            `  mask: url("${maskUrl}") no-repeat center !important;`,
            '  -webkit-mask-size: 16px 16px !important;',
            '  mask-size: 16px 16px !important;',
            '}',
            '[data-dsh-notifier-nav] > svg * {',
            '  display: none !important;',
            '}',
          ].join('\n');
          document.head.appendChild(tag);

          let disposed = false;
          let scheduled = false;
          const sync = () => {
            scheduled = false;
            if (disposed) return;
            const buttons = document.querySelectorAll('[role="dialog"] nav button');
            for (const btn of buttons) {
              const text = (btn.textContent || '').trim();
              if (text.includes('通知与标题') || (text.includes('通知') && (text.includes('提醒') || text.includes('设置')))) {
                btn.setAttribute('data-dsh-notifier-nav', '');
              } else {
                btn.removeAttribute('data-dsh-notifier-nav');
              }
            }
          };

          const schedule = () => {
            if (scheduled || disposed) return;
            scheduled = true;
            queueMicrotask(sync);
          };

          sync();
          const observer = new MutationObserver(schedule);
          observer.observe(document.body, { childList: true, subtree: true, characterData: true });

          return () => {
            disposed = true;
            observer.disconnect();
            for (const el of document.querySelectorAll('[data-dsh-notifier-nav]')) {
              el.removeAttribute('data-dsh-notifier-nav');
            }
            tag.remove();
          };
        }, 'dsh-completion-notifier: sidebar nav icon');
      }

      function apply(ctx) {
        setupNotificationListener(ctx);
        installSidebarNavIcon(ctx);

        if (ctx.slots) {
          ctx.slots.inject('settings.section', () =>
            ctx.slots.register({
              name: 'settings.section',
              id: 'notifier',
              order: 35,
              label: () => '通知与标题',
            }, (ownerProps = {}) => React.createElement(NotifierSettingsView, { ctx, ...ownerProps }))
          );
        }
      }

      exports.apply = apply;
      exports.inject = ['slots', 'uiWorkspace'];
      return module.exports;
    }
  });
}
