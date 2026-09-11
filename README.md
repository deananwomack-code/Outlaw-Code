# Outlaw-code 

A Cursor-style in-browser code editor: file explorer + Monaco editor + AI chat + preview panel.

## What changed (Blink → OpenAI-compatible API)

This app previously ran on the [Blink](https://blink.new) platform — hosted auth, a hosted AI agent runtime (`useAgent` / `Agent` with sandbox tools), and live cloud sandboxes. Blink has been **fully removed**. The AI chat is now backed by the official `openai` SDK pointed at any **OpenAI-compatible endpoint** (OpenAI, OpenRouter, Together AI, local LLMs, …).

### AI configuration

Settings resolve with this priority (highest first):

1. In-app **Settings** modal (stored in `localStorage`)
2. Vite env vars (`.env.local`)
3. Built-in defaults

| Variable | Default | Purpose |
|---|---|---|
| `VITE_OPENAI_API_KEY` | _(empty)_ | API key for your provider |
| `VITE_OPENAI_BASE_URL` | `https://api.openai.com/v1` | OpenAI-compatible base URL |
| `VITE_OPENAI_MODEL` | `gpt-4o-mini` | Default model id |

Copy `.env.example` to `.env.local` and fill in your values, or set them at runtime via the **AI Settings** button (top-right of the prompt screen and the editor header).

Settings remain **one API key + base URL + model**. The browser never calls the provider origin directly: the OpenAI SDK uses same-origin `/api/openai`, and Vite middleware forwards to the Settings base URL via the `X-Upstream-Base-URL` header (stripped before the upstream request). Authorization still comes from Settings. Streaming (SSE / chunked) is piped through the proxy.

> ⚠️ The API key still lives in the browser (local/personal use). The proxy only solves CORS / same-origin for `npm run dev` and `npm run preview`. A static-only host (`vite build` artifacts on CDN/GitHub Pages/etc.) does **not** run this middleware — production needs Node hosting that serves with `vite preview` (or equivalent Connect middleware), or a tiny edge/worker that implements the same `/api/openai` forward. This repo has no separate deploy worker today; local/dev is the supported path.

### Sandbox / preview (stub)

The sandbox, live preview, and file-explorer-against-remote-FS features relied on Blink's hosted cloud sandboxes, which no longer exist. `src/lib/sandbox.ts` now provides a minimal in-browser **stub** so the editor UI keeps working end-to-end. Wire `createSandbox` / `connectSandbox` / `getPreviewUrl` to your own sandbox or preview backend when ready.

## Development

```bash
npm install --legacy-peer-deps   # openai v5 has an optional peer on zod v3; project uses zod v4
npm run dev                       # start Vite dev server (port 3000) — includes AI proxy
npx tsc --noEmit                  # typecheck
npx vite build                    # production build
npm run preview                   # serve build + same AI proxy middleware
```
