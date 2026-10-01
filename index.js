import { watch } from 'node:fs';
import { fileURLToPath } from 'node:url';

export const name = 'dsh-completion-notifier';
export const inject = ['webServer'];

export function apply(ctx, config = {}) {
  let currentService = null;
  let currentDisposers = [];
  let isReloading = false;

  /**
   * 动态热插拔与重载执行器 (零重启刷新 Node.js 内存模块)
   */
  async function reloadPlugin() {
    if (isReloading) return;
    isReloading = true;

    try {
      // 1. 优雅销毁上一代服务实例与事件监听
      if (currentService && typeof currentService.dispose === 'function') {
        try {
          currentService.dispose();
        } catch (_) {}
      }
      currentService = null;

      // 2. 注销旧的 HTTP API 路由
      for (const dispose of currentDisposers) {
        try {
          dispose();
        } catch (_) {}
      }
      currentDisposers = [];

      // 3. 带时间戳动态加载最新源码，彻底击穿 Node.js 的 ESM 模块内存缓存
      const timestamp = Date.now();
      const serviceUrl = new URL(`./src/host/service.js?t=${timestamp}`, import.meta.url).href;
      const routesUrl = new URL(`./src/host/routes.js?t=${timestamp}`, import.meta.url).href;

      const { NotifierService } = await import(serviceUrl);
      const { makeNotifierRoutes } = await import(routesUrl);

      // 4. 实例化全新服务并重新注入事件
      currentService = new NotifierService(ctx, config);

      // 5. 挂载全新 API 路由（包括一键热重载接口）
      const routes = makeNotifierRoutes(currentService, () => reloadPlugin());
      for (const r of routes) {
        currentDisposers.push(ctx.webServer.register(r));
      }

      console.log(`[dsh-completion-notifier] ⚡️ 插件已完成热插拔重载 (rev: ${timestamp})`);
      return { ok: true, timestamp };
    } catch (err) {
      console.error('[dsh-completion-notifier] 热插拔重载失败:', err);
      return { ok: false, error: err.message };
    } finally {
      isReloading = false;
    }
  }

  // 首次装配挂载
  ctx.effect(() => {
    void reloadPlugin();

    // 启用文件实时监听：本地源码一改动并保存，自动在 150ms 内静默热插拔重载
    let watcher = null;
    let debounceTimer = null;

    try {
      const hostDir = fileURLToPath(new URL('./src/host', import.meta.url));
      watcher = watch(hostDir, { recursive: true }, (eventType, filename) => {
        clearTimeout(debounceTimer);
        debounceTimer = setTimeout(() => {
          console.log(`[dsh-completion-notifier] 检测到源码变动 (${filename})，自动触发热重载...`);
          void reloadPlugin();
        }, 150);
      });
    } catch (err) {
      console.warn('[dsh-completion-notifier] 无法启动文件监视器 (不影响手动热重载):', err.message);
    }

    // 拔出/卸载时的清理逻辑
    return () => {
      clearTimeout(debounceTimer);
      if (watcher) {
        try {
          watcher.close();
        } catch (_) {}
      }
      if (currentService && typeof currentService.dispose === 'function') {
        try {
          currentService.dispose();
        } catch (_) {}
      }
      for (const dispose of currentDisposers) {
        try {
          dispose();
        } catch (_) {}
      }
      currentDisposers = [];
      currentService = null;
    };
  }, 'dsh-completion-notifier: hot-plug lifecycle');
}

export default { name, inject, apply };
