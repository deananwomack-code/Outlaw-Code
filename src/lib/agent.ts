/**
 * OpenAI-compatible chat client.
 *
 * Replaces the former Blink `Agent` runtime. Uses the official `openai` SDK
 * pointed at any OpenAI-compatible endpoint (OpenAI, OpenRouter, Together,
 * local LLMs, etc.) configured via src/lib/settings.ts.
 *
 * Streaming uses the universally-compatible Chat Completions `stream: true`
 * contract (choices[].delta.content), which every OpenAI-compatible provider
 * supports.
 */
import OpenAI from 'openai';
import { loadSettings, type AiSettings } from './settings';

export type ChatRole = 'system' | 'user' | 'assistant';

export interface ChatMessage {
  id: string;
  role: ChatRole;
  content: string;
  /** Optional tool-invocation parts (kept for UI compatibility; currently unused). */
  parts?: { type: string; toolName?: string; state?: string; input?: unknown }[];
}

export interface SendMessageOptions {
  /** Conversation history (excluding the new user message). */
  messages: ChatMessage[];
  /** The new user prompt. */
  prompt: string;
  /** System prompt. Defaults to the coding-agent prompt. */
  systemPrompt?: string;
  /** Called for each streamed text delta. */
  onDelta?: (delta: string) => void;
  /** Abort the in-flight request. */
  signal?: AbortSignal;
}

export const CODING_AGENT_SYSTEM_PROMPT = `You are an elite front-end engineer and landing-page designer. You help the user build distinctive, scroll-animated React + Tailwind landing pages.

When the user asks you to build something:
- Respond with a short, plain-text plan first (no markdown headings, no bullet asterisks).
- Then provide the full code in fenced code blocks (\`\`\`jsx ... \`\`\`) so it can be copied.
- Prefer Tailwind utility classes, GSAP/ScrollTrigger for scroll animations, and Google Fonts.
- Respect prefers-reduced-motion.

When the user asks a question (Ask mode), answer concisely and read-only — explain concepts rather than editing files.`;

export const ASK_AGENT_SYSTEM_PROMPT = `You are a helpful, concise code assistant. Answer the user's questions about codebases and software engineering. You are in "Ask" (read-only) mode: explain rather than modify, and suggest concrete next steps.`;

function buildClient(settings: AiSettings): OpenAI {
  return new OpenAI({
    apiKey: settings.apiKey || 'sk-no-key',
    baseURL: settings.baseURL || undefined,
    dangerouslyAllowBrowser: true,
  });
}

/**
 * Send a prompt and stream the assistant reply token-by-token.
 * Returns the full assembled text. Throws on API/auth errors.
 */
export async function streamChatCompletion(
  opts: SendMessageOptions,
): Promise<string> {
  const settings = loadSettings();
  const client = buildClient(settings);

  const history = opts.messages
    .filter((m) => m.role !== 'system')
    .map((m) => ({ role: m.role, content: m.content }));

  const completion = await client.chat.completions.create(
    {
      model: settings.model,
      stream: true,
      messages: [
        { role: 'system', content: opts.systemPrompt ?? CODING_AGENT_SYSTEM_PROMPT },
        ...history,
        { role: 'user', content: opts.prompt },
      ],
    },
    { signal: opts.signal },
  );

  let full = '';
  for await (const chunk of completion) {
    const delta = chunk.choices?.[0]?.delta?.content ?? '';
    if (delta) {
      full += delta;
      opts.onDelta?.(delta);
    }
  }
  return full;
}

/** Generate a unique id for a chat message. */
export function newMessageId(): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return crypto.randomUUID();
  }
  return `msg_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}
