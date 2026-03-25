import { Hono } from "hono";
import { cors } from "hono/cors";
import { compress } from "hono/compress";
import clima from "./routes/clima";
import chat from "./routes/chat";
import alertas from "./routes/alertas";
import analisis from "./routes/analisis";

const app = new Hono();

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