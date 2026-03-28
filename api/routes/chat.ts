import { Hono } from "hono";
import { getClimaData } from "./clima";
import { llamarLLMStream } from "../services/llmRotation";

const chat = new Hono();

const rateLimit = new Map<string, { count: number; resetAt: number }>();
const RATE_LIMIT = 20;
const RATE_WINDOW = 60 * 1000;

// Skills disponibles para el chat
const SKILL_PROMPTS: Record<string, string> = {
  libre: '',  // Sin skill específico - conversación general
  drought: 'Eres un experto en gestión del estrés hídrico en olivares. Enfoca tus respuestas en técnicas de riego, cubiertas vegetales, y manejo del suelo para conservar agua. Da recomendaciones específicas para la situación actual.',
  calor: 'Eres un experto en protección térmica de olivares. Enfoca tus respuestas en estrategias de sombreo, riego temprano, protección contra olas de calor extremas, y mulch. Considera la variedad del usuario si se menciona.',
  frio: 'Eres un experto en protección contra heladas en olivares. Enfoca tus respuestas en técnicas de protección, momento de poda, prevención de daños por frío, y manejo de árboles dañados.',
  humedad: 'Eres un experto en enfermedades fúngicas del olivo. Enfoca tus respuestas en repilo, aceituna jabonosa, verticilosis, control de humedad, y tratamientos preventivos con fungicidas.',
  plaga: 'Eres un experto en control de plagas del olivo. Enfoca tus respuestas en mosca del olivo, polilla, tuberculosis, barrenillo, y control integrado de plagas (IPM).',
  fenologia: 'Eres un experto en fenología del olivo. Enfoca tus respuestas en las fases del ciclo: reposo (nov-ene), brotación (feb-mar), floración (abr-may), cuaje (may-jun), endurecimiento del hueso (jun-ago), envero (sep-oct), y recolección (oct-nov).',
};

// Soporta both 'plaga' and 'plagas' para compatibilidad
const SKILL_ALIASES: Record<string, string> = {
  plaga: 'plaga',
  plagas: 'plaga',
};

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

  const bodyRaw = await c.req.json().catch(() => ({}));
  const mensajeRaw = bodyRaw.mensaje || '';
  const provinciaRaw = bodyRaw.provincia || '';
  const skillRaw = bodyRaw.skill || '';
  const systemPromptRaw = bodyRaw.systemPrompt || '';

  // Validación de inputs
  if (!mensajeRaw || typeof mensajeRaw !== 'string') {
    return c.json({ error: "Falta mensaje" }, 400);
  }

  const mensaje = mensajeRaw.replace(/[<>'";]/g, '').trim().slice(0, 1000);
  const provincia = provinciaRaw.replace(/[^a-zA-ZáéíóúñÁÉÍÓÚÑ\s]/g, '').trim().slice(0, 50);
  const variedad = (bodyRaw.variedad || '').replace(/[^a-zA-ZáéíóúñÁÉÍÓÚÑ]/g, '').slice(0, 20);
  const historialRaw = bodyRaw.historial || [];
  const historial = Array.isArray(historialRaw) ? historialRaw.slice(-3).join(' | ') : '';
  
  // Resolver alias de skill (ej: 'plagas' -> 'plaga')
  const resolvedSkill = SKILL_ALIASES[skillRaw] || skillRaw;
  const skill = SKILL_PROMPTS[resolvedSkill] || '';

  if (mensaje.length < 2) {
    return c.json({ error: "Mensaje demasiado corto" }, 400);
  }

  const hasApiKey = process.env.GROQ_KEY || process.env.GEMINI_KEY || process.env.OPENROUTER_KEY;
  
  if (!hasApiKey) {
    return c.json({ error: "API keys no configuradas" }, 503);
  }

  const climaHoy = await getClimaData();

  const provinciaInfo = climaHoy.find((p: any) => p.provincia === provincia) || climaHoy[0];
  const provinciaNombre = provinciaInfo?.provincia || provincia || 'Andalucía';

  // Optimizado: solo datos de la provincia actual
  const datosProvincia = {
    temperatura: provinciaInfo?.temperatura,
    humedad: provinciaInfo?.humedad,
    lluvia: provinciaInfo?.lluvia,
    estado: provinciaInfo?.estado,
    riesgo: provinciaInfo?.riesgo,
  };

  // Construir el systemPrompt base - OPTIMIZADO con historial ligero
  const temp = provinciaInfo?.temperatura ?? '';
  const hum = provinciaInfo?.humedad ?? '';
  const llov = provinciaInfo?.lluvia ?? '';
  const estado = provinciaInfo?.estado ?? '';
  const contextoAnterior = historial ? `Historial previo: ${historial}` : '';
  const contextoVariedad = variedad ? `Variedad de olivo: ${variedad}` : '';
  
  let basePrompt = `Eres Olivo, conselheiro experto en olivicultura española.
Provincia: ${provinciaNombre}
Clima: ${temp}°C, ${hum}% humedad, ${llov}mm lluvia - ${estado}
${contextoVariedad}
${contextoAnterior}
Reglas: Español cercano, práctico, máximo 3 párrafos`;

  // Añadir skill específico si está activo
  if (skill) {
    basePrompt = `Eres Olivo, conseillers de olivicultura.
${skill}
Provincia: ${provinciaNombre}
Clima: ${temp}°C, ${hum}% humedad
${contextoVariedad}
${contextoAnterior}
Responde en español, máximo 2 párrafos, sé práctico.`;
  }

  // Añadir systemPrompt personalizado del frontend (para casos específicos)
  if (systemPromptRaw) {
    basePrompt = `${systemPromptRaw}\n\nProvincia: ${provinciaNombre}\nClima: ${temp}°C, ${hum}% humedad\n${contextoVariedad}`;
  }

  // Añadir systemPrompt personalizado del frontend (para casos específicos)
  if (systemPromptRaw) {
    basePrompt = `${systemPromptRaw}\n\nProvincia: ${provinciaNombre}\nClima: ${JSON.stringify(datosProvincia)}`;
  }

  const systemPrompt = basePrompt;

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