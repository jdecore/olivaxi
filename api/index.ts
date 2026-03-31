import { Hono } from "hono";
import { execSync } from "child_process";
import clima from "./routes/clima";
import chat from "./routes/chat";
import alertas from "./routes/alertas";
import analisis from "./routes/analisis";
import prediccion from "./routes/prediccion";
import { ejecutarCheckAlertas } from "./services/cronAlertas";

const app = new Hono();

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

const rateLimitMiddleware = async (c: any, next: () => Promise<void>) => {
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

const defaultAllowedOrigins = [
  "http://localhost:4321",
  "http://127.0.0.1:4321",
  "http://45.90.237.135:4321",
];
const allowedOrigins = (process.env.CORS_ALLOWED_ORIGINS || "")
  .split(",")
  .map((o) => o.trim())
  .filter(Boolean);
const CORS_ALLOWED = new Set(allowedOrigins.length ? allowedOrigins : defaultAllowedOrigins);

function isOriginAllowed(origin: string): boolean {
  if (CORS_ALLOWED.has(origin)) return true;
  try {
    const u = new URL(origin);
    const h = u.hostname.toLowerCase();
    if (h === "localhost" || h === "127.0.0.1") return true;
    if (h === "45.90.237.135") return true;
    return false;
  } catch {
    return false;
  }
}

app.use("*", async (c, next) => {
  const origin = c.req.header("origin");
  const isAllowedOrigin = !!origin && isOriginAllowed(origin);

  if (origin && !isAllowedOrigin) {
    return c.json({ error: "Origen no permitido por CORS" }, 403);
  }

  if (isAllowedOrigin) {
    c.res.headers.set("Access-Control-Allow-Origin", origin);
    c.res.headers.set("Vary", "Origin");
  }
  c.res.headers.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  c.res.headers.set('Access-Control-Allow-Headers', 'Content-Type');
  c.res.headers.set('Access-Control-Expose-Headers', 'Content-Length');
  c.res.headers.set('Access-Control-Max-Age', '86400');
  
  if (c.req.method === 'OPTIONS') {
    return c.text('', 204);
  }
  
  await next();
});

app.route("/api/clima", clima);
app.route("/api/chat", chat);
app.route("/api/alertas", alertas);
app.route("/api/analisis", analisis);
app.route("/api/prediccion", prediccion);

app.get("/xyz", (c) => c.json({ xyz: "ok" }));

app.get("/api", (c) => c.json({
  nombre: "olivaξ API",
  version: "1.0.0",
  endpoints: ["/api/clima", "/api/chat", "/api/alertas", "/api/analisis", "/api/prediccion"]
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
  fetch: app.fetch
});