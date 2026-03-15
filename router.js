export class Router {
  constructor() {
    this.routes = [];
    this.middleware = [];
  }

  /**
   * Register a route.
   * @param {string} method - HTTP method
   * @param {string} path - URL path (supports :params and * wildcards)
   * @param {function[]} handlers - Middleware + final handler
   */
  add(method, path, handlers) {
    this.routes.push({ method: method.toUpperCase(), pattern: compilePath(path), handlers });
    return this;
  }

  /**
   * Register middleware (runs before route handlers).
   * @param {string|function} pathOrHandler - Path prefix or handler
   * @param {function[]} handlers
   */
  use(pathOrHandler, handlers = []) {
    if (typeof pathOrHandler === 'function') {
      this.middleware.push({ prefix: '/', handler: pathOrHandler });
    } else {
      for (const h of handlers) {
        this.middleware.push({ prefix: pathOrHandler, handler: h });
      }
    }
    return this;
  }

  async handle(req, res) {
    // Run global middleware
    for (const { prefix, handler } of this.middleware) {
      if (req.pathname.startsWith(prefix)) {
        const stop = await runHandler(handler, req, res);
        if (stop) return true;
      }
    }

    // Match route
    for (const route of this.routes) {
      if (route.method !== req.method) continue;
      const match = route.pattern.exec(req.pathname);
      if (!match) continue;

      req.params = match.groups || {};

      // Run handler chain
      for (const handler of route.handlers) {
        const stop = await runHandler(handler, req, res);
        if (stop) return true;
      }
      return true;
    }

    return false;
  }
}

function compilePath(path) {
  const pattern = path
    .replace(/\//g, '\\/')
    .replace(/:([a-zA-Z_][a-zA-Z0-9_]*)/g, '(?<$1>[^\\/]+)')
    .replace(/\*/g, '.*');
  return new RegExp(`^${pattern}$`);
}

function runHandler(handler, req, res) {
  return new Promise((resolve, reject) => {
    let nextCalled = false;
    const next = () => { nextCalled = true; resolve(false); };
    try {
      const result = handler(req, res, next);
      if (result && typeof result.then === 'function') {
        result.then(() => { if (!nextCalled) resolve(true); }).catch(reject);
      } else {
        if (!nextCalled) resolve(true);
      }
    } catch (err) {
      reject(err);
    }
  });
}
