import { LLMProvider, ChatMessage, ProviderConfig } from './types';

export class GeminiProvider implements LLMProvider {
  id: string;
  name: string;
  private apiKey: string;
  private model: string;

  constructor(config: ProviderConfig) {
    this.id = config.id;
    this.name = config.name;
    this.apiKey = config.apiKey;
    this.model = config.model;
  }

  async sendMessage(
    messages: ChatMessage[],
    onToken: (token: string) => void
  ): Promise<void> {
    const systemMsg = messages.find((m) => m.role === 'system');
    const chatMessages = messages.filter((m) => m.role !== 'system');

    const contents = chatMessages.map((m) => ({
      role: m.role === 'assistant' ? 'model' : 'user',
      parts: [{ text: m.content }],
    }));

    const body: any = { contents };
    if (systemMsg) {
      body.systemInstruction = { parts: [{ text: systemMsg.content }] };
    }

    const url = `https://generativelanguage.googleapis.com/v1beta/models/${this.model}:streamGenerateContent?alt=sse&key=${this.apiKey}`;

    return new Promise((resolve, reject) => {
      const xhr = new XMLHttpRequest();
      xhr.open('POST', url);
      xhr.setRequestHeader('Content-Type', 'application/json');

      let lastIndex = 0;

      xhr.onprogress = () => {
        const newText = xhr.responseText.substring(lastIndex);
        lastIndex = xhr.responseText.length;

        const lines = newText.split('\n');
        for (const line of lines) {
          const trimmed = line.trim();
          if (!trimmed.startsWith('data: ')) continue;
          const data = trimmed.slice(6);

          try {
            const parsed = JSON.parse(data);
            const text = parsed.candidates?.[0]?.content?.parts?.[0]?.text;
            if (text) onToken(text);
          } catch {
            // skip malformed chunks
          }
        }
      };

      xhr.onload = () => {
        if (xhr.status >= 200 && xhr.status < 300) {
          resolve();
        } else {
          reject(new Error(`Gemini request failed (${xhr.status}): ${xhr.responseText}`));
        }
      };

      xhr.onerror = () => {
        reject(new Error('Network error'));
      };

      xhr.send(JSON.stringify(body));
    });
  }
}
