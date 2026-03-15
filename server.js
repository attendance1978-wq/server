import http from 'http';
import os from 'os';
import { Router } from './router.js';

/**
 * Returns all local IPv4 addresses of the machine.
 * @returns {string[]}
 */
export function getLocalIPs() {
  const interfaces = os.networkInterfaces();
  const ips = [];
  for (const iface of Object.values(interfaces)) {
    for (const config of iface) {
      if (config.family === 'IPv4' && !config.internal) {
        ips.push(config.address);
      }
    }
  }
  return ips;
}

/**
 * Creates a new HTTP server with a built-in router.
 * @param {object} options - Server options
 * @param {function} options.onError - Custom error handler
 */
export function createServer(options = {}) {
  const router = new Router();

  const server = http.createServer(async (req, res) => {
    res.json = (data, status = 200) => {
      res.writeHead(status, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify(data));
    };

    res.send = (body, status = 200) => {
      res.writeHead(status, { 'Content-Type': 'text/plain' });
      res.end(String(body));
    };

    res.html = (body, status = 200) => {
      res.writeHead(status, { 'Content-Type': 'text/html' });
      res.end(body);
    };

    req.body = await parseBody(req);

    const url = new URL(req.url, `http://${req.headers.host}`);
    req.query = Object.fromEntries(url.searchParams);
    req.pathname = url.pathname;

    try {
      const handled = await router.handle(req, res);
      if (!handled) {
        res.json({ error: 'Not Found', path: req.pathname }, 404);
      }
    } catch (err) {
      if (options.onError) {
        options.onError(err, req, res);
      } else {
        console.error('Server error:', err);
        res.json({ error: 'Internal Server Error', message: err.message }, 500);
      }
    }
  });

  // Override listen to print local + network IP addresses
  const originalListen = server.listen.bind(server);
  server.listen = (port, ...args) => {
    const cb = args.find(a => typeof a === 'function');
    const rest = args.filter(a => typeof a !== 'function');

    return originalListen(port, ...rest, () => {
      const ips = getLocalIPs();
      console.log('');
      console.log('  🚀 Server is running!');
      console.log('');
      console.log(`  Local:    http://localhost:${port}`);
      for (const ip of ips) {
        console.log(`  Network:  http://${ip}:${port}`);
      }
      console.log('');
      if (cb) cb();
    });
  };

  server.router = router;
  server.get    = (path, ...handlers) => router.add('GET',    path, handlers);
  server.post   = (path, ...handlers) => router.add('POST',   path, handlers);
  server.put    = (path, ...handlers) => router.add('PUT',    path, handlers);
  server.delete = (path, ...handlers) => router.add('DELETE', path, handlers);
  server.use    = (path, ...handlers) => router.use(path, handlers);

  return server;
}

async function parseBody(req) {
  return new Promise((resolve) => {
    const chunks = [];
    req.on('data', chunk => chunks.push(chunk));
    req.on('end', () => {
      const raw = Buffer.concat(chunks).toString();
      if (!raw) return resolve({});
      const contentType = req.headers['content-type'] || '';
      if (contentType.includes('application/json')) {
        try { resolve(JSON.parse(raw)); } catch { resolve({}); }
      } else {
        resolve(raw);
      }
    });
    req.on('error', () => resolve({}));
  });
}