// Deprecated: AI client config now lives in src/lib/settings.ts and the client
// is constructed per-request in src/lib/agent.ts. This re-export keeps any
// legacy imports resolving; prefer importing from './agent' or './settings'.
export { loadSettings, DEFAULT_SETTINGS } from './settings';
export { streamChatCompletion } from './agent';
