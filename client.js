/**
 * dsh-completion-notifier client bundle
 * Features:
 * 1. Dedicated Settings Sidebar Section ('settings.section') with native Bell icon
 * 2. Native macOS Notification via Web Notification API (100% DSH Whale Icon, zero Script Editor)
 * 3. Click notification to focus window & jump to session (no Finder popup)
 * 4. Modern macOS-style Toggle Switches in Settings UI (no ugly square checkboxes)
 * 5. Approval & Plan Mode Alerts: notify when waiting for permission ('allow'), plan review, or user questions
 * 6. Smart Session Titler: automatically summarizes clean titles after 1st turn, replacing dumb 'task ready'
 * 7. One-click batch fix for historic 'task ready' session titles
 * 8. Clean SVG vector icons, zero emoji noise
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
       * 纯矢量 SVG 图标集 (极简克制，随文字颜色自然变换)
       */
      function BellIcon(props) {
        const { size = 15, style = {} } = props;
        return React.createElement('svg', {
          width: size,
          height: size,
          viewBox: '0 0 24 24',
          fill: 'none',
          stroke: 'currentColor',
          strokeWidth: '1.75',
          strokeLinecap: 'round',
          strokeLinejoin: 'round',
          style: { verticalAlign: '-2px', flexShrink: 0, ...style }
        }, [
          React.createElement('path', { key: 'p1', d: 'M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9' }),
          React.createElement('path', { key: 'p2', d: 'M10.3 21a1.94 1.94 0 0 0 3.4 0' })
        ]);
      }

      function WandIcon(props) {
        const { size = 13, style = {} } = props;
        return React.createElement('svg', {
          width: size,
          height: size,
          viewBox: '0 0 24 24',
          fill: 'none',
          stroke: 'currentColor',
          strokeWidth: '1.75',
          strokeLinecap: 'round',
          strokeLinejoin: 'round',
          style: { verticalAlign: '-1px', flexShrink: 0, ...style }
        }, [
          React.createElement('path', { key: 'p1', d: 'm15 4-2 4 4-2-4 2 2 4' }),
          React.createElement('path', { key: 'p2', d: 'M2 20h4l12-12-4-4L2 16v4Z' })
        ]);
      }

      function PlayIcon(props) {
        const { size = 11, style = {} } = props;
        return React.createElement('svg', {
          width: size,
          height: size,
          viewBox: '0 0 24 24',
          fill: 'currentColor',
          style: { verticalAlign: '-1px', flexShrink: 0, ...style }
        }, [
          React.createElement('polygon', { key: 'poly', points: '6 4 20 12 6 20 6 4' })
        ]);
      }

      /**
       * 原生 macOS 风格 Toggle Switch 开关组件（告别生硬方框复选框）
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
       * 设置内容组件（既可用作独立侧边栏大面板，也可用作通用设置子卡片）
       */
      function NotifierSettingsView(props) {
        const { ctx, isStandalonePage = false } = props;
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
        const [cleaning, setCleaning] = React.useState(false);
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
            setTip('测试通知已发出！');
          } catch {
            setTip('测试请求失败');
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

        return React.createElement('div', {
          style: {
            padding: isStandalonePage ? '0 8px 32px 8px' : '8px 0 16px 0',
            fontFamily: 'inherit',
            color: 'var(--dsw-alias-label-primary, inherit)',
            maxWidth: '860px',
          }
        }, [
          // 顶部标题与操作栏
          React.createElement('div', {
            key: 'header',
            style: {
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              paddingBottom: '16px',
              borderBottom: '1px solid var(--dsw-alias-border-l1, rgba(128,128,128,0.12))',
              gap: '12px'
            }
          }, [
            React.createElement('div', { key: 'title-box' }, [
              React.createElement('div', {
                key: 'title-row',
                style: { display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }
              }, [
                React.createElement(BellIcon, { key: 'icon', size: isStandalonePage ? 18 : 16 }),
                React.createElement('span', {
                  key: 'h3',
                  style: { fontSize: isStandalonePage ? '17px' : '15px', fontWeight: '600' }
                }, '通知与智能标题'),
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
                style: { fontSize: '13px', color: 'var(--dsw-alias-label-caption, #888)', lineHeight: '1.45' }
              }, '在 AI 任务结算或等待审批决策时进行原生系统通知与声音提醒；首轮对话后自动提炼清晰中文标题。')
            ]),
            React.createElement('div', {
              key: 'btn-group',
              style: { display: 'flex', alignItems: 'center', gap: '8px', flexShrink: 0 }
            }, [
              React.createElement('button', {
                key: 'btn-clean',
                type: 'button',
                onClick: handleCleanTitles,
                disabled: cleaning,
                title: '扫描侧边栏所有名字叫 task ready 或命令行开头的无脑会话，智能提炼为准确主题',
                style: {
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
                }
              }, [
                React.createElement(WandIcon, { key: 'wand', size: 13 }),
                React.createElement('span', { key: 'text' }, cleaning ? '正在提炼...' : '修复历史标题')
              ]),
              React.createElement('button', {
                key: 'btn-test',
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
                  transition: 'opacity 0.15s, transform 0.1s',
                  boxShadow: settings.enabled ? '0 1px 3px rgba(0, 122, 255, 0.25)' : 'none',
                }
              }, [
                React.createElement(PlayIcon, { key: 'play', size: 11 }),
                React.createElement('span', { key: 'text' }, testing ? '测试中...' : '测试通知与声音')
              ])
            ])
          ]),

          // Row 1: 启用完成通知总开关
          React.createElement('div', {
            key: 'row-enable',
            style: {
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '14px 0',
              borderBottom: '1px solid var(--dsw-alias-border-l1, rgba(128,128,128,0.1))'
            }
          }, [
            React.createElement('div', { key: 'l1' }, [
              React.createElement('div', { style: { fontSize: '14px', fontWeight: '500' } }, '启用完成通知'),
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
              padding: '14px 0',
              borderBottom: '1px solid var(--dsw-alias-border-l1, rgba(128,128,128,0.1))',
              opacity: settings.enabled ? 1 : 0.5
            }
          }, [
            React.createElement('div', { key: 'l2' }, [
              React.createElement('div', { style: { fontSize: '14px', fontWeight: '500' } }, 'macOS 系统通知横幅'),
              React.createElement('div', { style: { fontSize: '12px', color: 'var(--dsw-alias-label-caption, #888)', marginTop: '2px' } }, '通知中心弹出横幅提醒 (附带 DSH 官方白鲸图标、单轮耗时与对话精炼摘要，点击跳转对应会话)')
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
              padding: '14px 0',
              borderBottom: '1px solid var(--dsw-alias-border-l1, rgba(128,128,128,0.1))',
              opacity: settings.enabled ? 1 : 0.5
            }
          }, [
            React.createElement('div', { key: 'l3' }, [
              React.createElement('div', { style: { fontSize: '14px', fontWeight: '500' } }, '完成提示音'),
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

          // Row 4: 等待权限审批 (允许) 与 Plan 审核提醒
          React.createElement('div', {
            key: 'row-approval',
            style: {
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '14px 0',
              borderBottom: '1px solid var(--dsw-alias-border-l1, rgba(128,128,128,0.1))',
            }
          }, [
            React.createElement('div', { key: 'l-appr' }, [
              React.createElement('div', { style: { fontSize: '14px', fontWeight: '500' } }, '等待权限审批与 Plan 提交通知'),
              React.createElement('div', { style: { fontSize: '12px', color: 'var(--dsw-alias-label-caption, #888)', marginTop: '2px' } }, '当 AI 等待权限授权（允许按钮）、Plan 计划审核或选择题时，发出系统通知与音效提醒，点击可直接进入会话决策')
            ]),
            React.createElement(Switch, {
              key: 'sw-appr',
              checked: settings.notifyOnApproval !== false,
              onChange: (val) => updateSetting('notifyOnApproval', val)
            })
          ]),

          // Row 5: 最小提醒耗时阈值
          React.createElement('div', {
            key: 'row-duration',
            style: {
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '14px 0',
              borderBottom: '1px solid var(--dsw-alias-border-l1, rgba(128,128,128,0.1))',
              opacity: settings.enabled ? 1 : 0.5
            }
          }, [
            React.createElement('div', { key: 'l4' }, [
              React.createElement('div', { style: { fontSize: '14px', fontWeight: '500' } }, '最小提醒耗时阈值 (秒)'),
              React.createElement('div', { style: { fontSize: '12px', color: 'var(--dsw-alias-label-caption, #888)', marginTop: '2px' } }, '仅对单轮耗时超过该时长的任务提醒 (设为 0 秒提醒全部，避免日常短句快问快答频繁打扰)')
            ]),
            React.createElement(Switch, {
              key: 'sw4',
              disabled: !settings.enabled,
              checked: true,
              onChange: () => {}
            }),
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
          ]),

          // Row 6: 自动智能提炼会话标题
          React.createElement('div', {
            key: 'row-autotitle',
            style: {
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '14px 0'
            }
          }, [
            React.createElement('div', { key: 'l5' }, [
              React.createElement('div', { style: { fontSize: '14px', fontWeight: '500' } }, '首轮对话智能提炼标题'),
              React.createElement('div', { style: { fontSize: '12px', color: 'var(--dsw-alias-label-caption, #888)', marginTop: '2px' } }, '首轮对话完成后，根据实际意图自动生成 6~10 字清晰中文标题（彻底解决 task ready 机械命名）')
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
       * 注入设置面板左侧导航图标 (使用纯矢量 SVG mask 替换通用小齿轮)
       */
      function installSidebarNavIcon(ctx) {
        if (typeof document === 'undefined') return;

        ctx.effect(() => {
          const bellSvg = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="#000" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9"/><path d="M10.3 21a1.94 1.94 0 0 0 3.4 0"/></svg>';
          const maskUrl = 'data:image/svg+xml,' + encodeURIComponent(bellSvg);

          const tag = document.createElement('style');
          tag.dataset.plugin = 'dsh-completion-notifier';
          tag.textContent = [
            '[data-dsh-notifier-nav] > svg { display: none !important; }',
            '[data-dsh-notifier-nav]::before {',
            '  content: "";',
            '  display: inline-block;',
            '  width: 16px;',
            '  height: 16px;',
            '  margin-right: 8px;',
            '  background-color: currentColor;',
            `  -webkit-mask: url("${maskUrl}") no-repeat center;`,
            `  mask: url("${maskUrl}") no-repeat center;`,
            '  -webkit-mask-size: contain;',
            '  mask-size: contain;',
            '  flex-shrink: 0;',
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
          // 🌟 核心升级：正式注册为 DSH 设置左侧边栏专属一级 Section！
          ctx.slots.inject('settings.section', () =>
            ctx.slots.register({
              name: 'settings.section',
              id: 'notifier',
              order: 35, // 优雅排列在左侧边栏中
              label: () => '通知与标题',
            }, (ownerProps = {}) => React.createElement(NotifierSettingsView, { ctx, isStandalonePage: true, ...ownerProps }))
          );

          // 同时保留通用设置分区作为子卡片入口（双入口自由访问）
          
        }
      }

      exports.apply = apply;
      exports.inject = ['slots', 'uiWorkspace'];
      return module.exports;
    }
  });
}
