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
    model: "meta-llama/llama-3.1-8b-instruct",
  },
];

const RETRY_DELAY = 1500;
const TIMEOUT_MS = 45000;

function sleep(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function isRetriableError(error: any, response?: Response): boolean {
  if (!response) return true;
  
  const status = response.status;
  if (status === 401 || status === 403) return false;
  if (status === 429) return true;
  if (status >= 500 && status < 600) return true;
  if (error?.message?.includes('aborted')) return true;
  
  return true;
}

export async function llamarLLMStream(
  messages: { role: string; content: string }[],
  onChunk: (texto: string, provider: string) => void
): Promise<void> {
  const availableProviders = PROVIDERS.filter(p => p.key);
  
  if (availableProviders.length === 0) {
    throw new Error("No hay API keys configuradas");
  }

  for (let attempt = 0; attempt < availableProviders.length; attempt++) {
    const provider = availableProviders[attempt];
    
    console.log(`[LLM] Intento ${attempt + 1}/${availableProviders.length}: ${provider.name}`);

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => {
        controller.abort();
        console.log(`[LLM] Timeout: ${provider.name}`);
      }, TIMEOUT_MS);

      const response = await fetch(provider.url, {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${provider.key}`,
          "Content-Type": "application/json",
          ...(provider.name === "OpenRouter" ? {
            "HTTP-Referer": "https://olivaxi.es",
            "X-Title": "olivaξ"
          } : {})
        },
        body: JSON.stringify({
          model: provider.model,
          messages,
          stream: true,
          max_tokens: 1500,
          temperature: 0.7,
        }),
        signal: controller.signal
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        const errorBody = await response.text().catch(() => '');
        const errorMsg = `${provider.name} error ${response.status}: ${errorBody.substring(0, 100)}`;
        console.error(`[LLM] ${errorMsg}`);
        
        if (!isRetriableError({ message: errorMsg }, response)) {
          throw new Error(errorMsg);
        }
        
        if (attempt < availableProviders.length - 1) {
          console.log(`[LLM] Esperando ${RETRY_DELAY}ms antes de reintentar...`);
          await sleep(RETRY_DELAY);
        }
        continue;
      }

      if (!response.body) {
        throw new Error(`${provider.name} sin body en respuesta`);
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
              // Ignorar parse errors de líneas no-JSON
            }
          }
        }
      }

      console.log(`[LLM] Éxito con ${provider.name}`);
      return;
      
    } catch (e: any) {
      console.error(`[LLM] Fallo ${provider.name}:`, e.message);
      
      if (attempt < availableProviders.length - 1) {
        console.log(`[LLM] Reintentando con siguiente proveedor en ${RETRY_DELAY}ms...`);
        await sleep(RETRY_DELAY);
      }
    }
  }

  throw new Error("Todos los proveedores fallaron");
}