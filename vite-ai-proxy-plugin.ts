/**
 * Same-origin AI proxy for the Vite dev + preview servers.
 *
 * Browser clients call `/api/openai/*` on localhost (no CORS). The real
 * OpenAI-compatible upstream base URL is passed in `X-Upstream-Base-URL`
 * and stripped before forwarding. Authorization and the request body are
 * forwarded; the upstream response (including SSE / chunked streams) is
 * piped through without buffering.
 */
import type { Plugin, Connect, PreviewServer, ViteDevServer } from 'vite';
import type { IncomingMessage, ServerResponse } from 'node:http';

export const AI_PROXY_PREFIX = '/api/openai';
export const UPSTREAM_BASE_URL_HEADER = 'x-upstream-base-url';

function readRequestBody(req: IncomingMessage): Promise<Buffer | undefined> {
  if (req.method === 'GET' || req.method === 'HEAD') return Promise.resolve(undefined);
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    req.on('data', (chunk: Buffer) => chunks.push(chunk));
    req.on('end', () => resolve(Buffer.concat(chunks)));
    req.on('error', reject);
  });
}

function isAllowedUpstream(url: URL): boolean {
  return url.protocol === 'https:' || url.protocol === 'http:';
}

function pickRequestHeaders(req: IncomingMessage): Headers {
  const headers = new Headers();
  const forward = ['authorization', 'content-type', 'accept', 'accept-language', 'user-agent'];
  for (const name of forward) {
    const value = req.headers[name];
    if (typeof value === 'string' && value) headers.set(name, value);
  }
  return headers;
}

function writeJson(res: ServerResponse, status: number, body: unknown): void {
  res.statusCode = status;
  res.setHeader('Content-Type', 'application/json');
  res.end(JSON.stringify(body));
}

async function pipeUpstream(
  req: IncomingMessage,
  res: ServerResponse,
): Promise<void> {
  const rawUpstream = req.headers[UPSTREAM_BASE_URL_HEADER];
  const upstreamBase = Array.isArray(rawUpstream) ? rawUpstream[0] : rawUpstream;

  if (!upstreamBase || !upstreamBase.trim()) {
    writeJson(res, 400, {
      error: {
        message: `Missing ${UPSTREAM_BASE_URL_HEADER} header (set from Settings base URL).`,
        type: 'invalid_request_error',
      },
    });
    return;
  }

  const suffix = (req.url ?? '').slice(AI_PROXY_PREFIX.length) || '/';
  let target: URL;
  try {
    const base = upstreamBase.trim().replace(/\/$/, '');
    target = new URL(base + (suffix.startsWith('/') ? suffix : `/${suffix}`));
  } catch {
    writeJson(res, 400, {
      error: {
        message: `Invalid X-Upstream-Base-URL: ${upstreamBase}`,
        type: 'invalid_request_error',
      },
    });
    return;
  }

  if (!isAllowedUpstream(target)) {
    writeJson(res, 400, {
      error: {
        message: 'Upstream base URL must use http: or https:',
        type: 'invalid_request_error',
      },
    });
    return;
  }

  const abort = new AbortController();
  // NOTE: listen on the *response* close, not the request close.
  // `req` emits 'close' as soon as its (POST) body is fully consumed, which
  // would abort the upstream fetch before it starts and return `200` with an
  // empty body. `res` 'close' with !writableEnded means the client went away.
  const onClientClose = () => {
    if (!res.writableEnded) abort.abort();
  };
  res.on('close', onClientClose);

  const body = await readRequestBody(req);
  const headers = pickRequestHeaders(req);

  let upstreamRes: Response;
  try {
    upstreamRes = await fetch(target, {
      method: req.method,
      headers,
      body: body && body.length > 0 ? new Uint8Array(body) : undefined,
      signal: abort.signal,
    });
  } catch (err) {
    res.off('close', onClientClose);
    if (abort.signal.aborted) {
      if (!res.writableEnded) res.end();
      return;
    }
    const message = err instanceof Error ? err.message : String(err);
    writeJson(res, 502, {
      error: {
        message: `Upstream proxy failed: ${message}`,
        type: 'proxy_error',
      },
    });
    return;
  }

  res.statusCode = upstreamRes.status;

  const hopByHop = new Set([
    'connection',
    'keep-alive',
    'proxy-authenticate',
    'proxy-authorization',
    'te',
    'trailers',
    'transfer-encoding',
    'upgrade',
    // Let Node recompute length/encoding for the piped stream.
    'content-encoding',
    'content-length',
  ]);

  upstreamRes.headers.forEach((value, key) => {
    if (hopByHop.has(key.toLowerCase())) return;
    res.setHeader(key, value);
  });

  if (!upstreamRes.body) {
    res.off('close', onClientClose);
    res.end();
    return;
  }

  const reader = upstreamRes.body.getReader();
  try {
    while (true) {
      if (abort.signal.aborted) {
        await reader.cancel();
        break;
      }
      const { done, value } = await reader.read();
      if (done) break;
      if (value) {
        const ok = res.write(Buffer.from(value));
        if (!ok) {
          await new Promise<void>((resolve) => res.once('drain', resolve));
        }
      }
    }
    res.end();
  } catch (err) {
    try {
      await reader.cancel();
    } catch {
      /* ignore */
    }
    if (abort.signal.aborted) {
      if (!res.writableEnded) res.end();
    } else if (!res.headersSent) {
      const message = err instanceof Error ? err.message : String(err);
      writeJson(res, 502, {
        error: { message: `Upstream stream failed: ${message}`, type: 'proxy_error' },
      });
    } else {
      res.destroy(err instanceof Error ? err : undefined);
    }
  } finally {
    res.off('close', onClientClose);
  }
}

function createAiProxyMiddleware(): Connect.NextHandleFunction {
  return (req, res, next) => {
    if (!req.url?.startsWith(AI_PROXY_PREFIX)) {
      next();
      return;
    }
    pipeUpstream(req, res).catch((err) => {
      console.error('[ai-proxy]', err);
      if (!res.headersSent) {
        writeJson(res, 500, {
          error: {
            message: err instanceof Error ? err.message : String(err),
            type: 'proxy_error',
          },
        });
      } else {
        res.destroy();
      }
    });
  };
}

function attach(server: ViteDevServer | PreviewServer): void {
  server.middlewares.use(createAiProxyMiddleware());
}

/** Vite plugin: same-origin OpenAI-compatible proxy for `server` and `preview`. */
export function aiProxyPlugin(): Plugin {
  return {
    name: 'outlaw-ai-proxy',
    configureServer(server) {
      attach(server);
    },
    configurePreviewServer(server) {
      attach(server);
    },
  };
}
