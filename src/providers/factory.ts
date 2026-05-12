import { LLMProvider, ProviderConfig } from './types';
import { OpenAICompatibleProvider } from './openai-compatible';
import { GeminiProvider } from './gemini';

export function createProvider(config: ProviderConfig): LLMProvider {
  if (config.id === 'gemini') {
    return new GeminiProvider(config);
  }
  return new OpenAICompatibleProvider(config);
}
