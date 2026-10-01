import { NotifierService } from './src/host/service.js';
import { makeNotifierRoutes } from './src/host/routes.js';

export const name = 'dsh-completion-notifier';
export const inject = ['webServer'];

export function apply(ctx, config = {}) {
  const service = new NotifierService(ctx, config);

  // 注册 HTTP API 路由
  ctx.effect(() => {
    const routes = makeNotifierRoutes(service);
    const disposers = routes.map(r => ctx.webServer.register(r));
    return () => {
      for (const dispose of disposers) dispose();
    };
  }, 'dsh-completion-notifier: api routes');
}

export default { name, inject, apply };
