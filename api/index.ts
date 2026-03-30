import { Hono } from "hono";
import clima from "./routes/clima";
import chat from "./routes/chat";
import alertas from "./routes/alertas";
import analisis from "./routes/analisis";
import { ejecutarCheckAlertas } from "./services/cronAlertas";

const app = new Hono();

// Allowed origins for CORS (production + dev)
const ALLOWED_ORIGINS = process.env.ALLOWED_ORIGINS 
  ? process.env.ALLOWED_ORIGINS.split(',').map(s => s.trim())
  : ['http://45.90.237.135', 'http://45.90.237.135:4321', 'http://localhost:4321', 'http://localhost:3000'];

// Rate limiting simple en memoria con cleanup periódico
const rateLimitMap = new Map<string, { count: number; resetTime: number }>();
const RATE_LIMIT = 100;
const RATE_LIMIT_WINDOW = 60 * 60 * 1000;

// Cleanup expired entries every 10 minutes
setInterval(() => {
  const now = Date.now();
  for (const [key, value] of rateLimitMap.entries()) {
    if (now > value.resetTime + RATE_LIMIT_WINDOW) {
      rateLimitMap.delete(key);
    }
  }
}, 10 * 60 * 1000);

const isInternalCron = (c: any): boolean => {
  return c.req.header('X-Internal-Cron') === 'true';
};

const rateLimitMiddleware = async (c: any, next: () => Promise<void>) => {
  if (isInternalCron(c)) {
    await next();
    return;
  }
  
  const ip = c.req.header('x-forwarded-for') || c.req.header('x-real-ip') || 'unknown';
  
  let record = rateLimitMap.get(ip);
  if (!record || Date.now() > record.resetTime) {
    record = { count: 0, resetTime: Date.now() + RATE_LIMIT_WINDOW };
    rateLimitMap.set(ip, record);
  }
  
  record.count++;
  
  if (record.count > RATE_LIMIT) {
    return c.json({ error: 'Demasiadas solicitudes. Intenta más tarde.' }, 429);
  }
  
  await next();
};

app.use("*", rateLimitMiddleware);

app.use("*", async (c, next) => {
  c.header('Access-Control-Allow-Origin', '*');
  c.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  c.header('Access-Control-Allow-Headers', 'Content-Type, X-Internal-Cron');
  c.header('Access-Control-Expose-Headers', 'Content-Length');
  c.header('Access-Control-Max-Age', '86400');
  
  if (c.req.method === 'OPTIONS') {
    return c.text('', 204);
  }
  
  await next();
});

app.route("/api/clima", clima);
app.route("/api/chat", chat);
app.route("/api/alertas", alertas);
app.route("/api/analisis", analisis);

app.get("/api", (c) => c.json({
  nombre: "olivaξ API",
  version: "1.0.0",
  endpoints: ["/api/clima", "/api/chat", "/api/alertas", "/api/analisis"]
}));

app.get("/test-cors", (c) => {
  c.header('Access-Control-Allow-Origin', '*');
  return c.json({ status: 'ok', cors: 'set' });
});

console.log("API olivaξ corriendo en :3000");

// CRON - Llamar directamente a la función de check (sin HTTP)
const ALERTAS_CHECK_INTERVAL = 15 * 60 * 1000;
setInterval(async () => {
  console.log("[CRON] Verificando alertas de clima...");
  try {
    const resultado = await ejecutarCheckAlertas();
    console.log("[CRON] Resultado:", resultado);
  } catch (e) {
    console.log("[CRON] Error:", e);
  }
}, ALERTAS_CHECK_INTERVAL);

Bun.serve({
  port: 3000,
  hostname: '0.0.0.0',
  idleTimeout: 120,
  fetch: app.fetch,
});