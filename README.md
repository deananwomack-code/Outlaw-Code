# Outlaw-code (my-code-studio)

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

> ⚠️ In a static frontend build, the API key is exposed to the browser. This is intentional for local/personal use. For production, proxy requests through your own backend.

### Sandbox / preview (stub)

The sandbox, live preview, and file-explorer-against-remote-FS features relied on Blink's hosted cloud sandboxes, which no longer exist. `src/lib/sandbox.ts` now provides a minimal in-browser **stub** so the editor UI keeps working end-to-end. Wire `createSandbox` / `connectSandbox` / `getPreviewUrl` to your own sandbox or preview backend when ready.

## Development

```bash
npm install --legacy-peer-deps   # openai v5 has an optional peer on zod v3; project uses zod v4
npm run dev                       # start Vite dev server (port 3000)
npx tsc --noEmit                  # typecheck
npx vite build                    # production build
```
