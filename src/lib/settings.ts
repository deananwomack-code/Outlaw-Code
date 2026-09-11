/**
 * AI client configuration.
 *
 * Resolved with this priority (highest first):
 *   1. localStorage overrides set from the in-app Settings modal
 *   2. Vite env vars (VITE_OPENAI_API_KEY / VITE_OPENAI_BASE_URL / VITE_OPENAI_MODEL)
 *   3. built-in defaults
 *
 * Works with any OpenAI-compatible endpoint (OpenAI, OpenRouter, Together,
 * local LLMs behind an OpenAI-compatible server, etc.).
 */

export interface AiSettings {
  apiKey: string;
  baseURL: string;
  model: string;
}

import { normalizeModelId } from './models';

const STORAGE_KEY = 'cursor_ai_settings';

const ENV = import.meta.env as unknown as Record<string, string | undefined>;

export const DEFAULT_SETTINGS: AiSettings = {
  apiKey: ENV.VITE_OPENAI_API_KEY ?? '',
  baseURL: ENV.VITE_OPENAI_BASE_URL ?? 'https://api.openai.com/v1',
  model: ENV.VITE_OPENAI_MODEL ?? 'gpt-4o-mini',
};

function loadStoredOverrides(): Partial<AiSettings> {
  if (typeof window === 'undefined') return {};
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw) as Partial<AiSettings>;
    return parsed && typeof parsed === 'object' ? parsed : {};
  } catch {
    return {};
  }
}

export function loadSettings(): AiSettings {
  const overrides = loadStoredOverrides();
  return {
    apiKey: overrides.apiKey?.trim() || DEFAULT_SETTINGS.apiKey,
    baseURL: overrides.baseURL?.trim() || DEFAULT_SETTINGS.baseURL,
    model: normalizeModelId(overrides.model?.trim() || DEFAULT_SETTINGS.model),
  };
}

export function saveModel(model: string): void {
  if (typeof window === 'undefined') return;
  const normalized = normalizeModelId(model);
  localStorage.setItem(STORAGE_KEY, JSON.stringify({ ...loadStoredOverrides(), model: normalized }));
}

export function saveSettings(settings: AiSettings): AiSettings {
  const normalized: AiSettings = {
    apiKey: settings.apiKey.trim(),
    baseURL: settings.baseURL.trim(),
    model: normalizeModelId(settings.model),
  };
  if (typeof window !== 'undefined') {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(normalized));
  }
  return normalized;
}

export function clearSettings(): void {
  if (typeof window !== 'undefined') {
    localStorage.removeItem(STORAGE_KEY);
  }
}

export function isConfigured(settings: AiSettings): boolean {
  return !!settings.apiKey && !!settings.model;
}
