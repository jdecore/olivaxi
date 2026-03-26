import { Hono } from "hono";
import { cors } from "hono/cors";
import { compress } from "hono/compress";
import clima from "./routes/clima";
import chat from "./routes/chat";
import alertas from "./routes/alertas";
import analisis from "./routes/analisis";

const app = new Hono();

// Rate limiting simple en memoria (resetea cada hora)
const rateLimitMap = new Map<string, { count: number; resetTime: number }>();
const RATE_LIMIT = 100; // requests por hora
const RATE_LIMIT_WINDOW = 60 * 60 * 1000; // 1 hora

const rateLimitMiddleware = async (c: any, next: () => Promise<void>) => {
  const ip = c.req.header('x-forwarded-for') || c.req.header('x-real-ip') || 'unknown';
  const now = Date.now();
  
  let record = rateLimitMap.get(ip);
  if (!record || now > record.resetTime) {
    record = { count: 0, resetTime: now + RATE_LIMIT_WINDOW };
    rateLimitMap.set(ip, record);
  }
  
  record.count++;
  
  if (record.count > RATE_LIMIT) {
    return c.json({ error: 'Demasiadas solicitudes. Intenta más tarde.' }, 429);
  }
  
  await next();
};

app.use("*", rateLimitMiddleware);

app.use(
  "*",
  cors({
    origin: '*',
  })
);

app.use("*", compress());

// Sanitización de inputs - evita injection
const sanitizeInput = (input: string): string => {
  return input.replace(/[<>\"'%;()&+]/g, '').trim().slice(0, 200);
};

const validateProvincia = (provincia: string): boolean => {
  const valid = ['Jaén', 'Córdoba', 'Sevilla', 'Granada', 'Málaga', 'Badajoz', 'Toledo', 'Ciudad Real', 'Almería', 'Huelva'];
  return valid.includes(provincia);
};

const validateVariedad = (variedad: string): boolean => {
  const valid = ['cornicabra', 'picual', 'arbequina', 'hojiblanca', 'manzanilla', 'empeltre'];
  return valid.includes(variedad);
};

app.route("/api/clima", clima);
app.route("/api/chat", chat);
app.route("/api/alertas", alertas);
app.route("/api/analisis", analisis);

app.get("/", (c) => c.text("OK"));

console.log("API olivaξ corriendo en :3000");

const ALERTAS_CHECK_INTERVAL = 15 * 60 * 1000; // 15 minutos
setInterval(async () => {
  console.log("[CRON] Verificando temperaturas...");
  const apiUrl = process.env.PUBLIC_API_URL || "http://localhost:3000";
  try {
    const res = await fetch(`${apiUrl}/api/alertas/check`, { method: "POST" });
    const data = await res.json();
    console.log("[CRON] Resultado:", data);
  } catch (e) {
    console.log("[CRON] Error:", e);
  }
}, ALERTAS_CHECK_INTERVAL);

Bun.serve({
  port: 3000,
  idleTimeout: 120,
  fetch: app.fetch,
});