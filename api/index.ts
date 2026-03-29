import { Hono } from "hono";
import { cors } from "hono/cors";
import { compress } from "hono/compress";
import clima from "./routes/clima";
import chat from "./routes/chat";
import alertas from "./routes/alertas";
import analisis from "./routes/analisis";
import { ejecutarCheckAlertas } from "./services/cronAlertas";

const app = new Hono();

// Rate limiting simple en memoria (resetea cada hora)
// EXCLUIR las peticiones del CRON interno (header X-Internal-Cron)
const rateLimitMap = new Map<string, { count: number; resetTime: number }>();
const RATE_LIMIT = 100;
const RATE_LIMIT_WINDOW = 60 * 60 * 1000;

const isInternalCron = (c: any): boolean => {
  return c.req.header('X-Internal-Cron') === 'true';
};

const rateLimitMiddleware = async (c: any, next: () => Promise<void>) => {
  // Skip rate limit para CRON interno
  if (isInternalCron(c)) {
    await next();
    return;
  }
  
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

app.route("/api/clima", clima);
app.route("/api/chat", chat);
app.route("/api/alertas", alertas);
app.route("/api/analisis", analisis);

app.get("/api", (c) => c.json({
  nombre: "olivaξ API",
  version: "1.0.0",
  endpoints: ["/api/clima", "/api/chat", "/api/alertas", "/api/analisis"]
}));

app.get("/", (c) => c.text("OK"));

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