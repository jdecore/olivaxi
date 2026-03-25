const PROVIDERS = [
  {
    name: "Groq",
    url: "https://api.groq.com/openai/v1/chat/completions",
    key: process.env.GROQ_KEY,
    model: "llama-3.3-70b-versatile",
  },
  {
    name: "Gemini",
    url: "https://generativelanguage.googleapis.com/v1beta/openai/chat/completions",
    key: process.env.GEMINI_KEY,
    model: "gemini-2.0-flash",
  },
  {
    name: "OpenRouter",
    url: "https://openrouter.ai/api/v1/chat/completions",
    key: process.env.OPENROUTER_KEY,
    model: "openrouter/free",
  },
];

export async function llamarLLMStream(
  messages: { role: string; content: string }[],
  onChunk: (texto: string, provider: string) => void
): Promise<void> {
  const errors: Error[] = [];

  for (const provider of PROVIDERS) {
    if (!provider.key) {
      errors.push(new Error(`${provider.name} sin API key`));
      continue;
    }

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 60000);

      console.log('[LLM] Llamando a', provider.name);

      const response = await fetch(provider.url, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${provider.key}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: provider.model,
          messages,
          stream: true,
          max_tokens: 2000,
        }),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok || !response.body) {
        throw new Error(`${provider.name} error: ${response.status}`);
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";

      while (true) {
        const { done, value } = await reader.read();
        
        if (done) break;

        const decoded = decoder.decode(value, { stream: true });
        buffer += decoded;
        const lines = buffer.split("\n");
        buffer = lines.pop() || "";

        for (const line of lines) {
          const trimmedLine = line.trim();
          if (!trimmedLine || trimmedLine === "data: [DONE]") continue;
          
          if (trimmedLine.startsWith("data: ")) {
            try {
              const json = JSON.parse(trimmedLine.slice(6));
              const content = json.choices?.[0]?.delta?.content;
              if (content) {
                onChunk(content, provider.name);
              }
            } catch {
              // Ignorar parse errors
            }
          }
        }
      }

      console.log('[LLM] Stream completado con', provider.name);
      return;
    } catch (e) {
      console.error('[LLM] Error:', e);
      errors.push(e as Error);
      continue;
    }
  }

  throw new Error(`Todos los LLM fallaron: ${errors.map((e) => e.message).join(", ")}`);
}
