import { AVAILABLE_SOUNDS } from './persist.js';

function json(res, status, data) {
  res.writeHead(status, {
    'content-type': 'application/json; charset=utf-8',
    'cache-control': 'no-cache',
  });
  res.end(JSON.stringify(data));
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    req.on('data', chunk => chunks.push(chunk));
    req.on('end', () => {
      if (chunks.length === 0) return resolve({});
      try {
        resolve(JSON.parse(Buffer.concat(chunks).toString('utf8')));
      } catch (e) {
        reject(new Error('Invalid JSON body'));
      }
    });
    req.on('error', reject);
  });
}

export function makeNotifierRoutes(service, triggerReload) {
  const sseClients = new Set();

  service.broadcastToClients = (eventData) => {
    const payload = `data: ${JSON.stringify(eventData)}\n\n`;
    for (const client of sseClients) {
      try {
        client.write(payload);
      } catch (e) {
        sseClients.delete(client);
      }
    }
    return sseClients.size;
  };

  const eventsHandler = (req, res) => {
    if (req.method !== 'GET') {
      res.writeHead(405);
      res.end();
      return;
    }

    res.writeHead(200, {
      'content-type': 'text/event-stream',
      'cache-control': 'no-cache',
      'connection': 'keep-alive',
    });
    res.write('retry: 5000\n\n');

    sseClients.add(res);
    req.on('close', () => {
      sseClients.delete(res);
    });
  };

  const settingsHandler = async (req, res) => {
    if (req.method === 'GET') {
      return json(res, 200, {
        ok: true,
        settings: service.getSettings(),
        availableSounds: AVAILABLE_SOUNDS,
      });
    }
    if (req.method === 'POST') {
      try {
        const body = await readBody(req);
        const updated = await service.updateSettings(body);
        return json(res, 200, { ok: true, settings: updated });
      } catch (err) {
        return json(res, 400, { ok: false, error: err.message });
      }
    }
    res.writeHead(405);
    res.end();
  };

  const testHandler = async (req, res) => {
    if (req.method !== 'POST') {
      res.writeHead(405);
      res.end();
      return;
    }
    try {
      const body = await readBody(req);
      await service.testNotify(body);
      return json(res, 200, { ok: true, message: 'Test notification triggered' });
    } catch (err) {
      return json(res, 500, { ok: false, error: err.message });
    }
  };

  const reloadHandler = async (req, res) => {
    if (req.method !== 'POST') {
      res.writeHead(405);
      res.end();
      return;
    }
    try {
      if (typeof triggerReload === 'function') {
        const outcome = await triggerReload();
        return json(res, 200, { ok: true, message: 'Plugin hot-reloaded successfully', outcome });
      }
      return json(res, 200, { ok: true, message: 'Reload not supported in this runtime' });
    } catch (err) {
      return json(res, 500, { ok: false, error: err.message });
    }
  };

  return [
    { kind: 'exact', path: '/dsh-notifier/api/events', handler: eventsHandler },
    { kind: 'exact', path: '/dsh-notifier/api/settings', handler: settingsHandler },
    { kind: 'exact', path: '/dsh-notifier/api/test', handler: testHandler },
    { kind: 'exact', path: '/dsh-notifier/api/reload', handler: reloadHandler },

    // 兼容别名
    { kind: 'exact', path: '/api/notifier/events', handler: eventsHandler },
    { kind: 'exact', path: '/api/notifier/settings', handler: settingsHandler },
    { kind: 'exact', path: '/api/notifier/test', handler: testHandler },
    { kind: 'exact', path: '/api/notifier/reload', handler: reloadHandler },
  ];
}
