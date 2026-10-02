# DeepSeek Harness (DSH) 插件开发与发布完全指南 (Skill)

本技能指南提炼自 DeepSeek Harness (DSH) 官方微内核架构设计、官方插件规范以及实战开发经验。用于指导在 DSH 环境下开发、调试、热插拔、美化与发布高质量原生插件。

---

## 1. 架构核心哲学：Cordis 双半区解耦模型

DSH 插件严格遵循 **Host（Node.js 微内核）+ Client（React Web UI）** 双半区解耦模型：

```text
┌─────────────────────────────────────────────────────────────┐
│                    DeepSeek Harness (DSH)                   │
│                                                             │
│   ┌─────────────────────────────────────────────────────┐   │
│   │ Client 半区 (React Web UI / Electron 渲染层)         │   │
│   │                                                     │   │
│   │  • 插槽挂载: settings.section, sidebar.panellist    │   │
│   │  • 原生调用: Web Notification API (DSH 白鲸图标)    │   │
│   │  • 交互响应: notification.onclick (聚焦窗口+切会话) │   │
│   └───────────────┬─────────────────────────────────────┘   │
│                   │ HTTP REST / SSE 实时长连接 (/api/*)      │
│                   ▼                                         │
│   ┌─────────────────────────────────────────────────────┐   │
│   │ Host 半区 (Node.js 微内核 / Cordis Service)          │   │
│   │                                                     │   │
│   │  • 会话事件监听: ctx.on('session/event', ...)        │   │
│   │  • 任务结算: turn/end, 权限审批: approval/asked      │   │
│   │  • 智能命名: session.append('session/title', ...)   │   │
│   │  • 原生能力: afplay 高保真系统音效                  │   │
│   │  • 热插拔引擎: 动态时间戳 import + 源码热监听       │   │
│   └─────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
```

- **会话日志即唯一真理 (The Session Log is the Only Truth)**：所有核心状态应尽量通过 `session.append(...)` 派发事件，依靠投影（Projections）驱动 UI 实时响应，插件内存仅作为派生缓存。
- **生命周期完全受控**：所有事件监听、定时器、路由注册均需放入 `ctx.effect`，并在销毁钩子中释放，实现“拔出即净”。

---

## 2. 标准工程结构规范 (Manifest)

一个标准的公开版开源插件（参考 `dsh-task-board`）目录结构如下：

```text
my-dsh-plugin/
├── package.json              # 模块定义、双半区导出与 DSH 清单声明
├── cordis.patch.yml          # DSH 补丁配置 (即插即用挂载声明)
├── LICENSE                   # 开源协议 (通常为 MIT 或 Apache-2.0)
├── README.md                 # 中英双语文档 (严禁写死个人本地硬盘绝对路径)
├── index.js                  # Host 半区入口 (服务生命周期、路由、热重载)
├── client.js                 # Client 半区入口 (模块加载、插槽注册、样式)
└── src/
    ├── host/                 # Host 端业务服务
    │   ├── service.js        # 核心服务 (事件监听、逻辑调度)
    │   ├── routes.js         # HTTP REST 与 SSE 实时路由
    │   └── persist.js        # 本地配置存储
    └── client/               # Client 端界面与交互
        ├── SettingsView.js   # 设置面板视图组件
        └── locales.js        # 中英双语文本字典
```

### 关键清单配置 (`package.json`)
```json
{
  "name": "my-dsh-plugin",
  "version": "1.0.0",
  "type": "module",
  "icon": "icon.svg",
  "main": "./index.js",
  "exports": {
    ".": "./index.js",
    "./client": "./client.js",
    "./package.json": "./package.json",
    "./icon.svg": "./icon.svg",
    "./locale/*.json": "./locale/*.json"
  },
  "files": [
    "index.js",
    "client.js",
    "cordis.patch.yml",
    "src",
    "icon.svg",
    "locale"
  ],
  "dsh": {
    "bundle": {
      "patch": "./cordis.patch.yml"
    },
    "client": {
      "platform": "web",
      "inject": [
        "@deepseek-ai/dsh-client-ui-slots",
        "@deepseek-ai/dsh-client-ui-workspace"
      ]
    }
  }
}
```

### 专属图标与多语言卡片定义
在 DSH 的「内置插件」列表中，如果插件没有提供专属图标，会退化为默认的四格拼图占位符。若要拥有类似 `dsh-context`、`dsh-dream-skin` 或 `OpenViking 记忆` 的精美独立图标和中文标题：
1. **专属图标 (`icon.svg`)**：在根目录下创建 `icon.svg`（SVG 格式，64x64 或 1024x1024，小于 256 KiB）；
2. **多语言描述 (`locale/zh.json`)**：
   ```json
   {
     "meta": {
       "title": "插件中文展示名 (my-dsh-plugin)",
       "description": "一行精炼克制的中文功能描述。"
     }
   }
   ```
DSH 宿主微内核会在启动时自动将 `icon.svg` 转换为 base64 内联展示，并在插件列表中高亮呈现专属视觉标识！

### 补丁配置文件 (`cordis.patch.yml`)
补丁文件是 DSH 挂载插件的即插即用契约：
```yaml
- insert:
    - id: my-dsh-plugin
      name: 'my-dsh-plugin'
```
保持插件职责单一（Single Responsibility Principle）：通知插件专注于通知与审批提醒，避免杂糅会话管理等异质功能。

---

## 3. 环境与安装关键陷阱 (避坑必读)

### 陷阱 1：DSH Desktop 与 DSH CLI 路径不同
- **DSH Desktop (桌面版)** 真实的 Profile 目录是：  
  `$HOME/Library/Application Support/dsh-desktop/harness/profiles/web/`
- **DSH CLI (命令行版)** Profile 目录是：  
  `$HOME/.dsh/profiles/web/`
- *切忌将桌面版的软链接建到 `~/.dsh`，否则 DSH Desktop 根本不会读取！*

### 陷阱 2：如何在【插件市场 → 已安装】正确出现并支持按需启用
只在 `cordis.patch.yml` 里写 `- insert` 是不够的，必须在 Profile 的 `package.json` 中声明：
1. `dependencies`: `"my-dsh-plugin": "github:owner/repo"` 或版本号；
2. `dsh.profile.bundles`: 加入 `"my-dsh-plugin"`；
这样插件市场扫描时才能将其识别为正规已安装插件，并生成卡片，赋予一键切换【启用中 / 已停用】的能力！

---

## 4. Host 端高级模式：零重启热插拔与会话事件拦截

### 4.1 零重启热插拔加载器 (Hot Plug Engine)
Node.js 原生 ESM 会永久缓存 `import` 的模块，修改代码后如果不重启应用，内存中跑的依然是旧代码。在 `index.js` 中使用带时间戳的动态导入和文件监视，即可实现保存即生效：

```javascript
import { watch } from 'node:fs';
import { fileURLToPath } from 'node:url';

export const name = 'my-dsh-plugin';
export const inject = ['webServer'];

export function apply(ctx, config = {}) {
  let currentService = null;
  let currentDisposers = [];

  async function reloadPlugin() {
    // 优雅注销上一代实例
    if (currentService?.dispose) currentService.dispose();
    for (const dispose of currentDisposers) dispose();
    currentDisposers = [];

    // 动态时间戳击穿 Node 内存缓存
    const timestamp = Date.now();
    const { MyService } = await import(`./src/host/service.js?t=${timestamp}`);
    const { makeRoutes } = await import(`./src/host/routes.js?t=${timestamp}`);

    currentService = new MyService(ctx, config);
    const routes = makeRoutes(currentService, () => reloadPlugin());
    for (const r of routes) currentDisposers.push(ctx.webServer.register(r));
  }

  ctx.effect(() => {
    void reloadPlugin();
    // 监听本地源码变更，150ms 自动热替换
    const dir = fileURLToPath(new URL('./src/host', import.meta.url));
    const watcher = watch(dir, { recursive: true }, () => reloadPlugin());
    return () => {
      watcher.close();
      if (currentService?.dispose) currentService.dispose();
    };
  }, 'my-dsh-plugin: lifecycle');
}
```

### 4.2 拦截全场景会话阻塞事件
不要只监听 `turn/end`！AI 执行过程中停下来等待人类操作时，必须发出即时提醒：
```javascript
ctx.on('session/event', (session, event) => {
  const sessionId = String(session.id);

  // 1. 权限审批等待 (允许/拒绝按钮)
  if (event.type === 'approval/asked') {
    broadcast({ type: 'approval', title: 'DSH 权限审批确认', subtitle: '等待授权执行', sessionId });
  }

  // 2. Plan 模式审查 (批准计划/保持计划按钮)
  if (event.type === 'tool/call' && event.data?.name === 'exit_plan_mode') {
    broadcast({ type: 'plan-review', title: 'DSH 计划待审批', subtitle: '方案已制定', sessionId });
  }

  // 3. 用户选择题与决策 (Ask User Question)
  if (event.type === 'tool/call' && event.data?.name === 'ask_user_question') {
    broadcast({ type: 'question', title: 'DSH 决策确认', subtitle: '等待回复', sessionId });
  }

  // 4. 轮次结算 (对话完成)
  if (event.type === 'turn/end' && event.data?.reason?.kind === 'completed') {
    broadcast({ type: 'completed', title: 'DSH 任务完成', subtitle: '对话已完成', sessionId });
  }
});
```

### 4.3 智能会话命名 (解决 task ready 机械命名)
DSH 默认回退逻辑是截取用户第一句话的前几个词，导致侧边栏经常充满 `task ready`、`task ready (1)`。在首轮对话完成后，提取用户真实需求 + AI 答复摘要，自动提炼标题并提交：
```javascript
session.append('session/title', {
  title: smartTitle, // 6~10 个字地道中文标题
  messageSeqs: [],
  source: { kind: 'user' }
});
```

---

## 5. Client 端设计秘籍：原生图标、会话直达与像素级对齐

### 5.1 系统通知绝不要调用 osascript
- **大坑**：在 Node 端执行 `osascript -e 'display notification ...'`，macOS 会把发送者认定为“脚本编辑器（Script Editor）”，通知图标被写死为纸卷轴，点击横幅系统会傻乎乎弹出一个 iCloud / 访达文件打开框！
- **正解**：在 Client 渲染层直接使用 `new window.Notification(title, { body, tag })`！
  - Electron 原生接管：通知图标 **100% 自动呈现 Dock 栏上的 DSH 官方蓝白鲸图标**；
  - 交互回调：绑定 `notification.onclick = () => { window.focus(); ctx.uiWorkspace.openSession(sessionId); }`，点击通知横幅瞬间将窗口置顶并直接跳转对应会话框！

### 5.2 独立设置侧栏分类 (`settings.section`)
不要把大型设置面板堆在 `settings.general.item`（容易造成长列表臃肿以及重复渲染）。正式注册到左侧侧栏一级菜单：
```javascript
ctx.slots.inject('settings.section', () =>
  ctx.slots.register({
    name: 'settings.section',
    id: 'my-plugin-settings',
    order: 35,
    label: () => '我的插件设置',
  }, (props) => React.createElement(MySettingsView, { ctx, ...props }))
);
```

### 5.3 导航项像素级绝对对齐 (严禁使用 ::before)
官方的设置导航按钮 `.VOzbGW_navCell` 自带 `display: flex; gap: 8px; padding: 9px 16px 9px 12px;`。
- 如果用 `::before` 加 `margin-right: 8px`，间距会和自带的 `gap: 8px` 叠加变成 16px，导致文字向右移位严重错位！
- **终极方案**：直接对官方原生生成的 `<svg class="VOzbGW_navIcon">` 应用 mask 替换形状：
```css
[data-my-plugin-nav] > svg {
  width: 16px !important;
  height: 16px !important;
  flex: none !important;
  background-color: currentColor !important;
  -webkit-mask: url("data:image/svg+xml,...") no-repeat center !important;
  mask: url("data:image/svg+xml,...") no-repeat center !important;
  -webkit-mask-size: 16px 16px !important;
  mask-size: 16px 16px !important;
}
[data-my-plugin-nav] > svg * {
  display: none !important;
}
```
图标与文字的左边缘将与上方官方项 **100% 在同一条垂直线上像素级对齐**！

### 5.4 视觉克制与纯矢量 SVG
- 严禁滥用彩色大 Emoji（如 🔔、✨、⚠️、⚡️），避免玩具感；
- 图标统一使用内联矢量 SVG（线宽 1.5~1.75px，采用 `currentColor` 跟随主题自然变色）；
- 开关采用仿 iOS / macOS 的平滑胶囊 Toggle Switch（带阴影白色圆球与 cubic-bezier 缓动），坚决告别生硬的原生 HTML 方块复选框。

---


### 5.5 前台活动抑制破局方案：应用内浮窗 Toast (In-App Toast)
- **现象**：当用户正在 DSH 界面中操作（窗口处于聚焦活跃状态 `document.hasFocus() === true`）时，macOS 系统通知中心默认会判定“用户正在注视该应用”，并对前台应用的横幅进行静默压制，导致屏幕右上角完全看不到系统横幅！
- **破解方案**：双轨通知机制。
  - 后台切走时：依赖 macOS 系统通知中心弹窗；
  - 前台在用时：由插件前端在 DSH 窗口右上角滑出一个精致的原生暗色 In-App Toast 浮窗（`backdrop-filter: blur(24px)`），附带任务摘要与点击直达，实现无论前台还是后台 100% 提醒，绝不漏消息！

### 5.6 自动切换会话 (Auto-Jump) 与提醒时机策略 (Alert Timing)
- **自动切会话**：在多任务并发场景下，用户可能在看 Session B，而后台跑着的 Session A 完成或需要审批。开启 `autoJumpSession` 后，插件在事件到达时直接调用 `ctx.uiWorkspace.openSession(sessionId)`，无需用户手动寻找或点击，DSH 自动切入该会话！
- **提醒时机模式**：
  - **全量提醒 (Always)**：无论窗口聚焦与否，均发出声音、系统横幅与应用内浮窗；
  - **仅在未聚焦 / 后台时提醒 (Unfocused only)**：在 DSH 内专注阅读时不打扰，窗口最小化或切到其他软件后才提醒。

---

## 6. 官方插件市场 (dsh-market) 收录与发布流程

DSH 客户端内的插件市场索引来自官方开源目录仓库：  
👉 [awesome-dsh-plugin/awesome-dsh-plugin](https://github.com/awesome-dsh-plugin/awesome-dsh-plugin)

### 收录硬性条件：
1. **GitHub 公开开源**：包含真实可用代码与 MIT / Apache 协议；
2. **声明 `dsh.bundle` 清单**：`package.json` 必须带有 `"dsh": { "bundle": { "patch": "./cordis.patch.yml" } }`；
3. **添加 Topic 标签**：在 GitHub 仓库添加 `dsh-plugin` 标签；
4. **仓库创建满 24 小时 (1 day old)**：官方 CI 防刷门槛；
5. **提交单文件 PR**：
   在官方仓库的 `data/plugins/` 目录下创建文件 `<owner>__<repo>.yml`：
   ```yaml
   url: https://github.com/owner/repo
   name: owner/repo
   category: notify # 参考官方分类列表
   description:
     en: Concise functional description ending with a period.
     zh: 准确不夸张的中文功能描述，以句号结尾。
   ```
PR 合并后数小时内，全平台 DSH 用户的插件市场便可搜索并一键安装你的插件！
