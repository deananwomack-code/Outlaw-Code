export interface AiModelPreset {
  id: string;
  name: string;
  subtitle: string;
}

export const AI_MODELS: AiModelPreset[] = [
  { id: 'Gemini 3.6 flash', name: 'Gemini 3.6 Flash', subtitle: 'Google · model-id preset' },
  { id: 'Gemini 3.7 flash', name: 'Gemini 3.7 Flash', subtitle: 'Google · model-id preset' },
  { id: 'Gemini 3.8 Flash', name: 'Gemini 3.8 Flash', subtitle: 'Google · model-id preset' },
  { id: 'deepseek-ai/deepseek-v4-flash-0731', name: 'DeepSeek V4 Flash', subtitle: 'NVIDIA · model-id preset' },
  { id: 'nvidia/llama-3.1-nemotron-ultra-253b-v1', name: 'Nemotron Ultra 253B', subtitle: 'NVIDIA · model-id preset' },
  { id: 'moonshotai/kimi-k3', name: 'Kimi K3', subtitle: 'NVIDIA · model-id preset' },
  { id: 'grok-4.2', name: 'Grok 4.2', subtitle: 'xAI · model-id preset' },
  { id: 'grok-4.5', name: 'Grok 4.5', subtitle: 'xAI · model-id preset' },
  { id: 'grok-4.6', name: 'Grok 4.6', subtitle: 'xAI · model-id preset' },
];

export function resolveModel(id: string): AiModelPreset {
  return AI_MODELS.find((m) => m.id === id) ?? { id, name: id, subtitle: 'Custom · set in Settings' };
}
