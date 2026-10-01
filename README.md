# dsh-completion-notifier 🔔

[English](#english) | [中文说明](#中文说明)

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![Platform](https://img.shields.io/badge/Platform-macOS-lightgrey.svg)]()
[![DSH](https://img.shields.io/badge/DSH-Plugin-007AFF.svg)](https://github.com/deepseek-ai)

> **DeepSeek Harness (DSH) 原生系统通知、审批提醒与会话智能命名插件**  
> 对话结算或挂起等待操作（权限允许 / Plan 审核 / 决策选择）时自动触发 macOS 系统通知与高保真提示音，点击横幅秒切会话；首轮对话后智能提炼清晰中文标题，彻底告别机械的 `task ready`。

---

<a id="中文说明"></a>
## 🌟 核心特性 (Features)

- 🔔 **macOS 原生通知中心集成**：
  - 通知左上角 **100% 呈现 DSH 官方蓝白鲸鱼图标**，彻底告别系统脚本编辑器的“小纸卷轴”；
  - 附带单轮耗时统计（如 `⚡️ 耗时 3.5s`）与 **AI 回复的 60 字精炼对话摘要**（已自动剥离思考过程与 Markdown 符号）。
- 🎯 **点击通知直达会话框**：
  - 点击系统通知横幅瞬间将 DSH Desktop 窗口激活置顶，并 **精准跳转打开对应的会话框**，绝不触发任何脚本编辑器或访达窗口！
- ⚠️ **权限审批与 Plan 提交通知 (告别后台死等)**：
  - 当 AI 正在等待用户操作（**点击「允许」授权高危命令、审核「Plan 方案」或回答选择题**）时，立即发出系统横幅与清脆提示音，即使窗口最小化也能第一时间获悉并处理。
- ✨ **智能会话标题提炼 (告别无脑 task ready)**：
  - 解决 DSH 默认机械截取第一句造成的满屏 `task ready`、`task ready (1)` 或命令截断；
  - 首轮对话完成后，根据用户真实意图与 AI 核心答复，自动提炼 **6~10 字清晰高信息量的中文会话主题**，侧边栏实时改变。
- 🧹 **一键修复历史无脑会话**：
  - 设置面板提供「✨ 修复历史标题」按钮，一键扫描重命名侧边栏现存的陈旧无脑会话。
- ⚙️ **纯正 macOS 极简设置面板**：
  - 彻底移除生硬外框，完美融入 DSH 原生设置列表；
  - 采用仿 iOS / macOS 原生的 **丝滑胶囊 Toggle Switch 开关**，告别丑陋的原生方块复选框。
- 🔄 **自适应零重启热插拔 (Hot Plug Engine)**：
  - 内置动态时间戳 ESM 缓存击穿与本地源码热监视（Live Watcher），代码改动保存 150ms 自动热替换，无需频繁退出关机 DSH。

---

## 🏛️ 架构设计 (Architecture)

本插件遵循 DSH 官方推荐的 **Cordis 双半区（Host + Client）解耦架构**：

```text
┌─────────────────────────────────────────────────────────────────┐
│                     DeepSeek Harness (DSH)                      │
│                                                                 │
│   ┌─────────────────────────────────────────────────────────┐   │
│   │ Client 半区 (React Web UI / Electron 渲染层)             │   │
│   │                                                         │   │
│   │  1. 原生设置面板 (macOS 胶囊 Switch / 历史会话一键修复)    │   │
│   │  2. 监听 Host 端 SSE 事件通道 (/api/notifier/events)    │   │
│   │  3. 调度 Web Notification API ──► macOS 原生系统通知     │   │
│   │     • 绑定 DSH 官方蓝白鲸鱼图标                          │   │
│   │     • 绑定 notification.onclick ──► 聚焦窗口 + 会话跳转  │   │
│   └─────────┬───────────────────────────────────────────────┘   │
│             │ HTTP REST / SSE 实时数据流                         │
│             ▼                                                   │
│   ┌─────────────────────────────────────────────────────────┐   │
│   │ Host 半区 (Node.js 微内核 / Cordis Service)              │   │
│   │                                                         │   │
│   │  1. 监听 session/event (turn/end, approval/asked, Plan) │   │
│   │  2. 智能提炼 6~10 字中文会话标题并写入 session/title     │   │
│   │  3. 智能清洗提取 AI 最终答复摘要 (剥离思考标签与标记)   │   │
│   │  4. 触发本地系统原生调用 (afplay 高保真提示音)           │   │
│   │  5. 自适应零重启热插拔引擎 (ESM Cache-Busting)           │   │
│   └─────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────┘
```

---

## 🚀 安装与启用 (Installation)

### 方式一：通过 DSH 插件市场安装（最推荐）

1. 打开 DSH Desktop 客户端，进入 **设置 → 插件市场 (Plugin Market)**；
2. 在搜索栏输入 `dsh-completion-notifier` 或 `通知`；
3. 点击 **「安装」**，完成后即刻生效。

### 方式二：通过 DSH 命令行安装

```bash
# 直接安装官方发布版本
dsh plugin --profile web add dsh-completion-notifier

# 或直接通过 GitHub 仓库安装
dsh plugin --profile web add github:zepeng-jin/dsh-completion-notifier
```

### 方式三：本地二次开发与调试

```bash
git clone https://github.com/zepeng-jin/dsh-completion-notifier.git
cd dsh-completion-notifier

# 以软链接方式挂载至当前 Profile
dsh plugin --profile web add link:$(pwd)
```

---

## ⚙️ 配置说明 (Configuration)

所有选项均可在 DSH 的图形化设置面板中直观修改，也会自动持久化保存于 `~/.dsh/notifier.json`：

| 配置项 | 类型 | 默认值 | 说明 |
| :--- | :--- | :--- | :--- |
| `enabled` | `boolean` | `true` | 总开关：是否在任务完成或等待审批时进行提醒 |
| `enableBanner` | `boolean` | `true` | 是否在 macOS 通知中心弹出带 DSH 白鲸图标的原生横幅 |
| `enableSound` | `boolean` | `true` | 触发时是否播放系统高保真提示音 |
| `soundName` | `string` | `"Glass"` | 完成提示音效（可选 Glass, Ping, Hero, Pop, Submarine, Purr, Funk 等） |
| `notifyOnApproval` | `boolean` | `true` | 核心提醒：等待权限审批 (允许按钮)、Plan 方案审核或选择题时通知 |
| `minDurationSec` | `number` | `3` | 最短提醒耗时阈值（秒）。任务耗时低于此值时不打扰 |
| `autoTitle` | `boolean` | `true` | 首轮对话后自动提炼 6~10 字清晰中文标题，彻底告别 `task ready` |
| `notifyOnError` | `boolean` | `true` | 任务执行报错或异常中断时是否播放警示音与提示 |

---

<a id="english"></a>
## 🌐 English Overview

**dsh-completion-notifier** is an open-source DeepSeek Harness (DSH) plugin providing macOS native notifications with official app branding, audible completion alerts, interaction waiting notices (Approval / Plan review), and smart session title summarization.

### Key Highlights
- **Native macOS Notification Center**: Real-time banners branded with DSH's official whale icon, precise duration metrics, and cleaned conversation summaries.
- **Click-to-Navigate**: Clicking the banner focuses the DSH window and instantly jumps to the corresponding session.
- **Approval & Plan Mode Alerts**: Never keep AI waiting idle — get notified when the agent pauses for human permission ('Allow'), plan review, or user questions.
- **Smart Session Titler**: Replaces mechanical 'task ready' defaults with concise, meaningful titles derived from the first turn.
- **Modern macOS Settings UI**: Embedded in DSH Desktop settings with native smooth toggle switches.
- **Zero-Restart Hot Plug**: Built-in dynamic ESM reload engine for instantaneous development iteration.

### CLI Install
```bash
dsh plugin --profile web add dsh-completion-notifier
```

---

## 📄 开源协议 (License)

[MIT License](LICENSE) © [zepengjin](https://github.com/zepeng-jin)
