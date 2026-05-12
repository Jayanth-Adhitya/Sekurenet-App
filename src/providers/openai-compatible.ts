import { LLMProvider, ChatMessage, ProviderConfig } from './types';

export class OpenAICompatibleProvider implements LLMProvider {
  id: string;
  name: string;
  private baseUrl: string;
  private apiKey: string;
  private model: string;

  constructor(config: ProviderConfig) {
    this.id = config.id;
    this.name = config.name;
    this.baseUrl = config.baseUrl.replace(/\/+$/, '');
    this.apiKey = config.apiKey;
    this.model = config.model;
  }

  async sendMessage(
    messages: ChatMessage[],
    onToken: (token: string) => void
  ): Promise<void> {
    const url = `${this.baseUrl}/chat/completions`;

    return new Promise((resolve, reject) => {
      const xhr = new XMLHttpRequest();
      xhr.open('POST', url);
      xhr.setRequestHeader('Content-Type', 'application/json');
      if (this.apiKey) {
        xhr.setRequestHeader('Authorization', `Bearer ${this.apiKey}`);
      }

      let lastIndex = 0;

      xhr.onprogress = () => {
        const newText = xhr.responseText.substring(lastIndex);
        lastIndex = xhr.responseText.length;

        const lines = newText.split('\n');
        for (const line of lines) {
          const trimmed = line.trim();
          if (!trimmed.startsWith('data: ')) continue;
          const data = trimmed.slice(6);
          if (data === '[DONE]') return;

          try {
            const parsed = JSON.parse(data);
            const delta = parsed.choices?.[0]?.delta?.content;
            if (delta) onToken(delta);
          } catch {
            // skip malformed chunks
          }
        }
      };

      xhr.onload = () => {
        if (xhr.status >= 200 && xhr.status < 300) {
          resolve();
        } else {
          reject(new Error(`LLM request failed (${xhr.status}): ${xhr.responseText}`));
        }
      };

      xhr.onerror = () => {
        reject(new Error('Network error'));
      };

      xhr.send(
        JSON.stringify({
          model: this.model,
          messages,
          stream: true,
        })
      );
    });
  }
}
