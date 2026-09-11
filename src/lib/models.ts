export interface AiModelPreset {
  id: string;
  name: string;
  subtitle: string;
}

export const AI_MODELS: AiModelPreset[] = [
  { id: 'gemini-3.6-flash', name: 'Gemini 3.6 Flash', subtitle: 'Google · model-id preset' },
  { id: 'gemini-3.7-flash', name: 'Gemini 3.7 Flash', subtitle: 'Google · model-id preset' },
  { id: 'gemini-3.8-flash', name: 'Gemini 3.8 Flash', subtitle: 'Google · model-id preset' },
  { id: 'gemini-3.1-flash-lite', name: 'Gemini 3.1 Flash-Lite', subtitle: 'Google · fast fallback preset' },
  { id: 'deepseek-ai/deepseek-v4-flash-0731', name: 'DeepSeek V4 Flash', subtitle: 'NVIDIA · model-id preset' },
  { id: 'nvidia/llama-3.1-nemotron-ultra-253b-v1', name: 'Nemotron Ultra 253B', subtitle: 'NVIDIA · model-id preset' },
  { id: 'moonshotai/kimi-k3', name: 'Kimi K3', subtitle: 'NVIDIA · model-id preset' },
  { id: 'grok-4.2', name: 'Grok 4.2', subtitle: 'xAI · model-id preset' },
  { id: 'grok-4.5', name: 'Grok 4.5', subtitle: 'xAI · model-id preset' },
  { id: 'grok-4.6', name: 'Grok 4.6', subtitle: 'xAI · model-id preset' },
];

/**
 * Model IDs must match the provider API exactly (lowercase, hyphenated).
 * Earlier presets used display names with spaces ('Gemini 3.6 flash'),
 * which the API rejects with 404. Normalize those legacy values (which may
 * persist in localStorage via Settings) to the real IDs.
 */
const LEGACY_MODEL_IDS: Record<string, string> = {
  'gemini 3.6 flash': 'gemini-3.6-flash',
  'gemini 3.7 flash': 'gemini-3.7-flash',
  'gemini 3.8 flash': 'gemini-3.8-flash',
};

export function normalizeModelId(id: string): string {
  const trimmed = (id ?? '').trim();
  if (!trimmed) return trimmed;
  return LEGACY_MODEL_IDS[trimmed.toLowerCase()] ?? trimmed;
}

export function resolveModel(id: string): AiModelPreset {
  const normalized = normalizeModelId(id);
  return AI_MODELS.find((m) => m.id === normalized) ?? { id: normalized, name: normalized, subtitle: 'Custom · set in Settings' };
}
