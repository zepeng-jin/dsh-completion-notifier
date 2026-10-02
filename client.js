/**
 * dsh-completion-notifier client bundle
 * Features:
 * 1. Dedicated Settings Sidebar Section ('settings.section') with pixel-perfect SVG Bell icon
 * 2. Instant-render settings view (zero blank screen, default state fallback)
 * 3. Dedicated /dsh-notifier/api namespace (bypasses DSH /api 401 gate)
 * 4. In-App Floating Toast Notification: 100% visible inside DSH
 * 5. Smart Mutual Exclusivity: In-App Toast when focused inside DSH; macOS System Banner when in background. Never duplicate!
 * 6. Auto-Jump Session: automatically switches DSH to the session upon completion or approval request
 * 7. Alert Timing Mode: All-time alert (always) vs Unfocused/background only (unfocused)
 * 8. Refined Apple-style Toggle Switches & dark-mode styling
 * 9. Approval & Plan Mode Alerts (Human-in-the-loop notifications)
 */

if (typeof window !== 'undefined' && window.__ModuleLoader__) {
  window.__ModuleLoader__.load({
    id: 'dsh-completion-notifier',
    factory: (require) => {
      const module = { exports: {} };
      const exports = module.exports;
      Object.defineProperty(exports, '__esModule', { value: true });

      const React = require('react');

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

      let activeSettings = null;

      function fetchSettingsSync() {
        if (typeof fetch === 'function') {
          fetch('/dsh-notifier/api/settings')
            .then(res => res.json())
            .then(data => {
              if (data.ok && data.settings) {
                activeSettings = data.settings;
              }
            })
            .catch(() => {});
        }
      }
      fetchSettingsSync();

      /**
       * 原生 macOS 风格 Toggle Switch 开关组件（克制雅致的 Apple 蓝）
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

      /**
       * 在 DSH 窗口内滑出原生暗色浮窗 Toast（解决前台时 macOS 屏蔽横幅的问题）
       */
      function showInAppToast(ctx, eventData) {
        if (typeof document === 'undefined') return;

        const containerId = 'dsh-notifier-toast-container';
        let container = document.getElementById(containerId);
        if (!container) {
          container = document.createElement('div');
          container.id = containerId;
          container.style.cssText = 'position:fixed;top:20px;right:20px;z-index:99999;display:flex;flex-direction:column;gap:10px;pointer-events:none;max-width:380px;';
          document.body.appendChild(container);
        }

        const toast = document.createElement('div');
        toast.style.cssText = [
          'pointer-events:auto;',
          'box-sizing:border-box;',
          'width:350px;',
          'padding:12px 14px;',
          'border-radius:10px;',
          'background:rgba(26, 29, 36, 0.95);',
          'backdrop-filter:blur(24px);',
          '-webkit-backdrop-filter:blur(24px);',
          'border:1px solid rgba(255, 255, 255, 0.12);',
          'box-shadow:0 8px 30px rgba(0, 0, 0, 0.45);',
          'color:#ffffff;',
          'font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,sans-serif;',
          'cursor:pointer;',
          'transition:transform 0.22s cubic-bezier(0.2, 0, 0, 1), opacity 0.2s;',
          'transform:translateX(30px);',
          'opacity:0;',
        ].join('');

        const titleText = eventData.title || 'DSH 任务完成';
        const subtitleText = eventData.subtitle || '';
        const summaryText = eventData.summary || '';

        toast.innerHTML = [
          '<div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:4px;">',
          '  <div style="display:flex;align-items:center;gap:6px;">',
          '    <span style="display:inline-block;width:8px;height:8px;border-radius:50%;background:#0a84ff;"></span>',
          `    <span style="font-size:13.5px;font-weight:600;color:#fff;">${titleText}</span>`,
          subtitleText ? `    <span style="font-size:11.5px;color:#8a8f98;">· ${subtitleText}</span>` : '',
          '  </div>',
          '  <button type="button" class="toast-close" style="background:none;border:none;color:#8a8f98;cursor:pointer;font-size:14px;padding:0 2px;line-height:1;">×</button>',
          '</div>',
          summaryText ? `<div style="font-size:12px;color:#c9d1d9;line-height:1.4;margin-top:4px;overflow:hidden;text-overflow:ellipsis;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;">${summaryText}</div>` : '',
          '<div style="font-size:11px;color:#0a84ff;margin-top:6px;">点击直接查看此会话 →</div>'
        ].join('');

        let isDismissed = false;
        const dismiss = () => {
          if (isDismissed) return;
          isDismissed = true;
          toast.style.transform = 'translateX(30px)';
          toast.style.opacity = '0';
          setTimeout(() => toast.remove(), 250);
        };

        toast.onclick = (e) => {
          if (e.target.classList.contains('toast-close')) {
            e.stopPropagation();
            dismiss();
            return;
          }
          window.focus();
          const sessionId = eventData.sessionId;
          if (sessionId && sessionId !== 'current') {
            if (ctx && ctx.uiWorkspace && typeof ctx.uiWorkspace.openSession === 'function') {
              ctx.uiWorkspace.openSession(sessionId);
            } else {
              const el = document.querySelector(`[data-session-id="${sessionId}"], [data-id="${sessionId}"]`);
              if (el) el.click();
            }
          }
          dismiss();
        };

        container.appendChild(toast);

        requestAnimationFrame(() => {
          toast.style.transform = 'translateX(0)';
          toast.style.opacity = '1';
        });

        setTimeout(dismiss, 6000);
      }

      /**
       * 统一事件调度中心 (前后台绝对互斥分流，绝不重复弹窗)
       */
      function handleIncomingNotification(ctx, eventData) {
        const s = activeSettings || DEFAULT_UI_SETTINGS;
        if (!s.enabled) return;

        const isFocused = typeof document !== 'undefined' && document.hasFocus();

        // 1. 检查提醒时机模式
        if (s.alertTiming === 'unfocused' && isFocused && eventData.type !== 'test') {
          return;
        }

        // 2. 检查自动跳转
        if (s.autoJumpSession && eventData.sessionId && eventData.sessionId !== 'current') {
          try {
            const currentId = ctx && ctx.uiWorkspace?.mainReference?.sessionId;
            if (currentId !== eventData.sessionId && ctx.uiWorkspace && typeof ctx.uiWorkspace.openSession === 'function') {
              ctx.uiWorkspace.openSession(eventData.sessionId);
            }
          } catch (_) {}
        }

        // 3. 绝对互斥分流：在 DSH 内只出应用内浮窗，切走只出系统横幅
        if (isFocused) {
          if (s.enableInAppToast !== false) {
            showInAppToast(ctx, eventData);
          }
        } else {
          if (s.enableBanner !== false) {
            sendNativeNotification(ctx, eventData);
          }
        }
      }

      /**
       * 设置面板主视图
       */
      function NotifierSettingsView(props) {
        const { ctx } = props;
        const [settings, setSettings] = React.useState(activeSettings || DEFAULT_UI_SETTINGS);
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
          fetch('/dsh-notifier/api/settings')
            .then(res => res.json())
            .then(data => {
              if (data.ok && data.settings) {
                setSettings(data.settings);
                activeSettings = data.settings;
                if (data.availableSounds) setSounds(data.availableSounds);
              }
            })
            .catch(() => {});
        }, []);

        const updateSetting = async (key, val) => {
          const next = { ...settings, [key]: val };
          setSettings(next);
          activeSettings = next;
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

          handleIncomingNotification(ctx, {
            type: 'test',
            title: 'DSH 任务完成',
            subtitle: '耗时 3.5s (测试)',
            summary: '已为你完成代码分析与重构，点击本通知可直接跳转回此会话。',
            sessionId: 'current',
          });

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

        return React.createElement('div', {
          style: {
            padding: '0 4px 24px 4px',
            fontFamily: 'inherit',
            color: 'var(--dsw-alias-label-primary, inherit)',
            maxWidth: '720px',
          }
        }, [
          // 顶部标题栏
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
                }, '完成通知与审批提醒'),
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
              }, '管理任务完成通知、等待审批与 Plan 提交通知、提示音效及前后台提醒模式。')
            ]),

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
              React.createElement('div', { style: { fontSize: '12px', color: 'var(--dsw-alias-label-caption, #8a8f98)', marginTop: '2px' } }, '总开关：对话完成或需要决策时进行通知提醒')
            ]),
            React.createElement(Switch, {
              key: 'sw1',
              checked: !!settings.enabled,
              onChange: (val) => updateSetting('enabled', val)
            })
          ]),

          // Row 2: 提醒时机模式
          React.createElement('div', {
            key: 'row-timing',
            style: {
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '12px 0',
              borderBottom: '1px solid var(--dsw-alias-border-l1, rgba(255, 255, 255, 0.06))',
              opacity: settings.enabled ? 1 : 0.45,
            }
          }, [
            React.createElement('div', { key: 'l-timing' }, [
              React.createElement('div', { style: { fontSize: '13.5px', fontWeight: '450' } }, '提醒时机'),
              React.createElement('div', { style: { fontSize: '12px', color: 'var(--dsw-alias-label-caption, #8a8f98)', marginTop: '2px' } }, '全量提醒：无论当前是否在看 DSH 均提醒；仅未聚焦：在 DSH 内操作时静默，最小化或切走时才提醒')
            ]),
            React.createElement('select', {
              key: 'sel-timing',
              disabled: !settings.enabled,
              value: settings.alertTiming || 'always',
              onChange: (e) => updateSetting('alertTiming', e.target.value),
              style: {
                height: '26px',
                padding: '0 8px',
                borderRadius: '6px',
                border: '1px solid var(--dsw-alias-border-l2, rgba(255, 255, 255, 0.12))',
                backgroundColor: 'var(--dsw-alias-bg-module-platform, rgba(255, 255, 255, 0.05))',
                color: 'inherit',
                fontSize: '12px',
                cursor: !settings.enabled ? 'not-allowed' : 'pointer',
                outline: 'none',
              }
            }, [
              React.createElement('option', { key: 'opt1', value: 'always' }, '全量提醒（始终提醒 - 推荐）'),
              React.createElement('option', { key: 'opt2', value: 'unfocused' }, '仅在未聚焦 / 后台时提醒')
            ])
          ]),

          // Row 3: 自动跳转到对应会话
          React.createElement('div', {
            key: 'row-autojump',
            style: {
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '12px 0',
              borderBottom: '1px solid var(--dsw-alias-border-l1, rgba(255, 255, 255, 0.06))',
              opacity: settings.enabled ? 1 : 0.45,
            }
          }, [
            React.createElement('div', { key: 'l-jump' }, [
              React.createElement('div', { style: { fontSize: '13.5px', fontWeight: '450' } }, '自动跳转到对应会话'),
              React.createElement('div', { style: { fontSize: '12px', color: 'var(--dsw-alias-label-caption, #8a8f98)', marginTop: '2px' } }, '开启后，后台任务完成或停下来等待审批时，无需手动点击通知，DSH 自动将视图切入该会话')
            ]),
            React.createElement(Switch, {
              key: 'sw-jump',
              disabled: !settings.enabled,
              checked: !!settings.autoJumpSession,
              onChange: (val) => updateSetting('autoJumpSession', val)
            })
          ]),

          // Row 4: 前后台通知形式说明（智能分流）
          React.createElement('div', {
            key: 'row-toast',
            style: {
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '12px 0',
              borderBottom: '1px solid var(--dsw-alias-border-l1, rgba(255, 255, 255, 0.06))',
              opacity: settings.enabled ? 1 : 0.45,
            }
          }, [
            React.createElement('div', { key: 'l-toast' }, [
              React.createElement('div', { style: { fontSize: '13.5px', fontWeight: '450' } }, '前后台智能分流通知'),
              React.createElement('div', { style: { fontSize: '12px', color: 'var(--dsw-alias-label-caption, #8a8f98)', marginTop: '2px' } }, '在 DSH 窗口内只弹轻量应用内浮窗；窗口最小化或切走时只弹系统横幅，二者互斥，绝不重复弹窗')
            ]),
            React.createElement(Switch, {
              key: 'sw-toast',
              disabled: !settings.enabled,
              checked: settings.enableInAppToast !== false,
              onChange: (val) => updateSetting('enableInAppToast', val)
            })
          ]),

          // Row 5: 完成提示音
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
              React.createElement('div', { style: { fontSize: '12px', color: 'var(--dsw-alias-label-caption, #8a8f98)', marginTop: '2px' } }, '任务结算时播放的系统音效')
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

          // Row 6: 等待权限审批与 Plan 提交通知
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

          // Row 7: 最小提醒耗时阈值
          React.createElement('div', {
            key: 'row-duration',
            style: {
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '12px 0',
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
          ])
        ]);
      }

      function setupNotificationListener(ctx) {
        if (typeof window === 'undefined') return;

        if (window.Notification && window.Notification.permission === 'default') {
          try {
            window.Notification.requestPermission();
          } catch (_) {}
        }

        try {
          const eventSource = new EventSource('/dsh-notifier/api/events');

          eventSource.onmessage = (e) => {
            if (!e.data) return;
            try {
              const eventData = JSON.parse(e.data);
              handleIncomingNotification(ctx, eventData);
            } catch (err) {
              console.warn('[dsh-completion-notifier] parse event error:', err);
            }
          };

          eventSource.onerror = () => {};

          ctx.effect(() => () => {
            eventSource.close();
          }, 'dsh-completion-notifier: close event source');
        } catch (err) {
          console.warn('[dsh-completion-notifier] SSE setup failed:', err);
        }
      }

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
              if (text.includes('完成通知') || text.includes('通知与审批') || text.includes('通知与标题') || (text.includes('通知') && (text.includes('提醒') || text.includes('设置')))) {
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
              label: () => '完成通知与审批提醒',
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
