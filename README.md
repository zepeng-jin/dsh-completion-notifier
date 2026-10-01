# dsh-completion-notifier 🔔

[English](#english) | [中文说明](#中文说明)

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![Platform](https://img.shields.io/badge/Platform-macOS-lightgrey.svg)]()
[![DSH](https://img.shields.io/badge/DSH-Plugin-007AFF.svg)](https://github.com/deepseek-ai)

> **DSH (DeepSeek Harness) 系统通知与声音提醒插件**  
> 原生集成 DSH 设置面板，对话与长耗时任务完成后自动触发 macOS 系统通知横幅、清脆提示音或语音提醒。

---

<a id="中文说明"></a>
## 🌟 核心特性

- 🔔 **macOS 系统通知中心集成**：任务完成时自动在屏幕右上角弹出系统通知横幅，并附带精确的任务耗时统计。
- 🎵 **多款经典系统音效**：内置 Glass（玻璃清脆声）、Ping（叮咚声）、Hero（凯旋号角）、Pop（气泡轻响）等，支持即时试听与切换。
- 🛡️ **不受浏览器后台节流影响**：基于 DSH Host 端（Node.js 微内核）直接调用操作系统原生能力，即使 DSH 窗口处于最小化、被遮挡或屏幕锁定，也能 100% 准时提醒。
- ⚙️ **原生 DSH 设置面板**：完美融入 DSH Desktop 与 Web 端的「设置」页面，提供直观的可视化开关、耗时滑块与一键测试按钮。
- ⏱️ **智能耗时阈值过滤**：支持自定义最短耗时（默认 3 秒），避免一句话的日常快问快答频繁打扰。
- 🚨 **执行异常报警**：当任务遭遇报错或中断时，自动发出低沉警示音（Basso）与异常提示。

---

## 🏛️ 架构设计 (Architecture)

本插件遵循 DSH 官方推荐的 **Cordis 双半区（Host + Client）解耦架构**：

```text
┌─────────────────────────────────────────────────────────────────┐
│                     DeepSeek Harness (DSH)                      │
│                                                                 │
│   ┌─────────────────────────────────────────────────────────┐   │
│   │ Client 半区 (React Web UI)                               │   │
│   │                                                         │   │
│   │  [DSH 设置面板 / Plugin Center]                           │   │
│   │         │                                               │   │
│   │         ▼                                               │   │
│   │  NotifierSettingsCard (React 界面组件)                   │   │
│   │    - 启用开关 / 横幅开关 / 音效下拉 / 耗时阈值           │   │
│   │    - 🔔「立即测试通知」按钮                              │   │
│   └─────────┬───────────────────────────────────────────────┘   │
│             │ HTTP REST API (/api/notifier/*)                   │
│             ▼                                                   │
│   ┌─────────────────────────────────────────────────────────┐   │
│   │ Host 半区 (Node.js 微内核 / Cordis Service)              │   │
│   │                                                         │   │
│   │  1. 监听 session/event (turn/start ──► turn/end)         │   │
│   │  2. 精确计算单轮耗时 (Duration Tracker)                  │   │
│   │  3. 阈值判断 & 配置持久化 (~/.dsh/notifier.json)         │   │
│   │  4. 触发本地系统原生调用                                 │   │
│   └─────────┬───────────────────────────────────────────────┘   │
└─────────────┼───────────────────────────────────────────────────┘
              │
              ▼
  ┌───────────────────────────────────────────────────────────────┐
  │                        macOS 操作系统                         │
  │                                                               │
  │   • osascript ──► 触发系统通知中心横幅 (Notification Center)   │
  │   • afplay    ──► 播放系统高保真提示音 (/System/Library/Sounds) │
  │   • say       ──► (可选) 系统高品质语音朗读                   │
  └───────────────────────────────────────────────────────────────┘
```

---

## 📂 项目结构

```text
dsh-completion-notifier/
├── package.json              # 模块定义与 DSH bundle 声明
├── cordis.patch.yml          # DSH 配置补丁 (即插即用)
├── LICENSE                   # MIT 开源协议
├── README.md                 # 双语使用与开发文档
├── index.js                  # Host 半区入口 (服务生命周期与路由)
├── client.js                 # Client 半区入口 (模块加载与设置注入)
└── src/
    ├── host/
    │   ├── service.js        # 会话事件监听与调度服务
    │   ├── notifier.js       # macOS 原生命令封装 (afplay / osascript)
    │   ├── routes.js         # HTTP REST API 路由 (/api/notifier/*)
    │   └── persist.js        # 本地配置存储 (~/.dsh/notifier.json)
    └── client/
        ├── NotifierSettingsCard.js # 设置面板可视化卡片组件
        └── locales.js        # 中英双语文本字典
```

---

## 🚀 安装与启用

### 方式一：本地链接开发（最推荐）

#### 对于 DSH Desktop 客户端（macOS 桌面版）：
1. **软链接至 DSH Desktop 真实的 Profile 目录**：
   ```bash
   ln -s "/Volumes/824g硬盘/vibe-coding/dsh-completion-notifier" "$HOME/Library/Application Support/dsh-desktop/harness/profiles/web/node_modules/dsh-completion-notifier"
   ```

2. **在 DSH Desktop 补丁配置中注册插件**：
   编辑 `$HOME/Library/Application Support/dsh-desktop/harness/profiles/web/cordis.patch.yml`，在数组末尾加入：
   ```yaml
   - insert:
       - id: dsh-completion-notifier
         name: 'dsh-completion-notifier'
   ```

#### 对于 DSH CLI 独立版（命令行版）：
1. **软链接至 CLI Profile 目录**：
   ```bash
   ln -s "/Volumes/824g硬盘/vibe-coding/dsh-completion-notifier" ~/.dsh/profiles/web/node_modules/dsh-completion-notifier
   ```
2. 在 `~/.dsh/profiles/web/cordis.patch.yml` 中同样追加上述 `- insert` 条目。

3. **生效方式**：
   DSH 内置热重载服务；配置保存后，直接刷新当前 Web GUI 页面（Cmd + R）或重启应用，进入 **设置 (Settings)** 页面即可看到全新的 **「通知」** 配置卡片！点击 **「🔔 测试通知与声音」** 可立即验证。

---

## ⚙️ 配置说明

所有配置均可在 DSH 的图形化设置面板中修改，也会持久化保存于 `~/.dsh/notifier.json`：

| 配置项 | 类型 | 默认值 | 说明 |
| :--- | :--- | :--- | :--- |
| `enabled` | `boolean` | `true` | 总开关：是否在任务完成时进行提醒 |
| `enableBanner` | `boolean` | `true` | 是否在 macOS 通知中心弹出横幅 |
| `enableSound` | `boolean` | `true` | 是否在结算时播放提示音 |
| `soundName` | `string` | `"Glass"` | 提示音名称（可选 Glass, Ping, Hero, Pop 等） |
| `minDurationSec` | `number` | `3` | 最短提醒耗时阈值（秒）。任务耗时低于此值时不打扰 |
| `notifyOnError` | `boolean` | `true` | 任务执行报错或异常中断时是否播放告警音 |

---

<a id="english"></a>
## 🌐 English Overview

**dsh-completion-notifier** is an open-source DSH (DeepSeek Harness) plugin that delivers native macOS system notifications, banners, and sound effects when an AI agent completes a task or conversation.

### Highlights
- **Native macOS Notification Center**: Real-time banners with duration metrics.
- **Audible Alerts**: Built-in sound library (Glass, Ping, Hero, Pop, etc.) via `afplay`.
- **Zero Browser Throttling**: Operates on the Node.js Host plane, working flawlessly even when minimized or backgrounded.
- **Embedded Settings UI**: Directly configurable inside the DSH desktop settings view.
- **Noise Control**: Configurable minimum execution duration threshold (default: 3s).

---

## 📄 License

MIT © [zepengjin](LICENSE)
