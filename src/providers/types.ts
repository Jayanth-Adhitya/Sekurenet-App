export type ProviderId = 'gemini' | 'groq' | 'openclaw' | 'ollama';

export interface ProviderConfig {
  id: ProviderId;
  name: string;
  baseUrl: string;
  apiKey: string;
  model: string;
}

export interface ChatMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

export interface LLMProvider {
  id: string;
  name: string;
  sendMessage(
    messages: ChatMessage[],
    onToken: (token: string) => void
  ): Promise<void>;
}

export interface AppSettings {
  provider: ProviderConfig;
  systemPrompt: string;
  vadThreshold: number;
}

export const DEFAULT_PROVIDERS: Record<ProviderId, ProviderConfig> = {
  gemini: {
    id: 'gemini',
    name: 'Google Gemini',
    baseUrl: 'https://generativelanguage.googleapis.com',
    apiKey: '',
    model: 'gemini-2.0-flash',
  },
  groq: {
    id: 'groq',
    name: 'Groq',
    baseUrl: 'https://api.groq.com/openai/v1',
    apiKey: '',
    model: 'llama-3.3-70b-versatile',
  },
  openclaw: {
    id: 'openclaw',
    name: 'OpenClaw',
    baseUrl: '',
    apiKey: '',
    model: '',
  },
  ollama: {
    id: 'ollama',
    name: 'Ollama',
    baseUrl: 'http://localhost:11434/v1',
    apiKey: '',
    model: 'llama3',
  },
};

export const DEFAULT_SETTINGS: AppSettings = {
  provider: DEFAULT_PROVIDERS.gemini,
  systemPrompt: 'You are a helpful voice assistant. Keep responses concise and conversational.',
  vadThreshold: 0.5,
};
