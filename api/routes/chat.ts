import { Hono } from "hono";
import { getClimaData } from "./clima";
import { llamarLLMStream } from "../services/llmRotation";

const chat = new Hono();

const rateLimit = new Map<string, { count: number; resetAt: number }>();
const RATE_LIMIT = 20;
const RATE_WINDOW = 60 * 1000;

function checkRateLimit(ip: string): boolean {
  const now = Date.now();
  const record = rateLimit.get(ip);
  
  if (!record || record.resetAt < now) {
    rateLimit.set(ip, { count: 1, resetAt: now + RATE_WINDOW });
    return true;
  }
  
  if (record.count >= RATE_LIMIT) {
    return false;
  }
  
  record.count++;
  return true;
}

chat.post("/", async (c) => {
  const ip = c.req.header("cf-connecting-ip") || c.req.header("x-forwarded-for") || "unknown";
  
  if (!checkRateLimit(ip)) {
    return c.json({ error: "Demasiadas peticiones. Intenta más tarde." }, 429);
  }

  const { mensaje, provincia } = await c.req.json();

  if (!mensaje) {
    return c.json({ error: "Falta mensaje" }, 400);
  }

  const hasApiKey = process.env.GROQ_KEY || process.env.GEMINI_KEY || process.env.OPENROUTER_KEY;
  
  if (!hasApiKey) {
    return c.json({ error: "API keys no configuradas" }, 503);
  }

  const climaHoy = await getClimaData();

  const provinciaInfo = climaHoy.find((p: any) => p.provincia === provincia) || climaHoy[0];
  const provinciaNombre = provinciaInfo?.provincia || provincia || 'Andalucía';

  const systemPrompt = `Eres Olivo, consejero experto en olivicultura española, especialmente Andalucía.
Provincia actual: ${provinciaNombre}
Datos climáticos actuales: ${JSON.stringify(climaHoy)}
Reglas IMPORTANTES:
- Responde en español informal y cercano
- Da consejos prácticos y útiles
- NO hay límite de longitud, escribe TODO lo necesario
- NUNCA termines una frase a mitad
- SIEMPRE termina con un punto final completo
- Máximo 5 párrafos`;

  const messages = [
    { role: "system", content: systemPrompt },
    { role: "user", content: mensaje },
  ];

  const body = new ReadableStream({
    async start(controller) {
      const encoder = new TextEncoder();
      let firstChunk = true;
      try {
        await llamarLLMStream(messages, (chunk, provider) => {
          if (firstChunk) {
            controller.enqueue(encoder.encode(`data: ${JSON.stringify({ texto: chunk, provider })}\n\n`));
            firstChunk = false;
          } else {
            controller.enqueue(encoder.encode(`data: ${JSON.stringify({ texto: chunk })}\n\n`));
          }
        });
        controller.enqueue(encoder.encode("data: [DONE]\n\n"));
      } catch (e) {
        console.error("Error en chat:", e);
        controller.enqueue(encoder.encode(`data: ${JSON.stringify({ error: "Error al conectar con LLM" })}\n\n`));
      }
      controller.close();
    },
  });

  return new Response(body, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      "Connection": "keep-alive",
      "X-Accel-Buffering": "no"
    },
  });
});

export default chat;