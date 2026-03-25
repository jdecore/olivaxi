import { Hono } from "hono";
import nodemailer from "nodemailer";
import db from "../db/sqlite";
import { PROVINCIAS } from "../data/provincias";

const gmailUser = process.env.GMAIL_USER || "jdenriquezr@gmail.com";

const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: gmailUser,
    pass: process.env.GMAIL_APP_PASSWORD,
  },
});

const CONSEJOS: Record<string, string[]> = {
  calor: ['💧 Riega antes del amanecer', '🌿 Evita fertilizar', '🛡️ Acolcha el suelo con paja', '🌳 No podes en días calurosos'],
  helada: ['🧣 Protege árboles jóvenes con manta', '💧 No riegues antes de helada', '🌳 Evita poda ahora', '🔥 Considera heaters si es viable'],
  sequia: ['💦 Aplica riego profundo', '🪵 Usa mulch para retener humedad', '✂️ Reduce poda para guardar agua', '🌿 Aplica compost para retener agua']
};

const alertas = new Hono();

alertas.post("/", async (c) => {
  const { nombre, email, provincia, tipo = 'calor' } = await c.req.json();

  if (!nombre || !email || !provincia) {
    return c.json({ error: "Faltan datos" }, 400);
  }

  const insert = db.query(
    "INSERT INTO alertas (nombre, email, provincia, tipo, activa, created_at) VALUES (?, ?, ?, ?, 1, ?)"
  );
  insert.run(nombre, email, provincia, tipo, Date.now());

  const gmailPass = process.env.GMAIL_APP_PASSWORD;
  console.log("[ALERTAS] GMAIL_PASS presente:", !!gmailPass);

  if (gmailPass) {
    try {
      await transporter.sendMail({
        from: `olivaξ <${gmailUser}>`,
        to: email,
        subject: `✅ Tu alerta está activa - ${provincia}`,
        html: `<p>Hola <strong>${nombre}</strong>,</p>
<p>Tu alerta está activa en olivaξ.</p>
<p>Te avisaremos cuando <strong>${provincia}</strong> tenga condiciones de <strong>${tipo}</strong>.</p>
<p><strong>Consejos:</strong></p>
<ul>${CONSEJOS[tipo]?.map(c => `<li>${c}</li>`).join('') || ''}</ul>
<p>🫒 Equipo olivaξ</p>`,
      });
      console.log("[ALERTAS] Email de confirmación enviado a:", email);
    } catch (e) {
      console.log("[ALERTAS] Error enviando email:", e);
    }
  }

  return c.json({ ok: true });
});

alertas.post("/check", async (c) => {
  const gmailPass = process.env.GMAIL_APP_PASSWORD;
  if (!gmailPass) return c.json({ error: "Sin Gmail config" }, 500);

  const alertasActivas = db
    .query("SELECT * FROM alertas WHERE activa = 1")
    .all() as any[];

  const now = Date.now();
  const TWELVE_HOURS = 12 * 60 * 60 * 1000;

  const provincesToCheck = [...new Set(alertasActivas.map((a) => a.provincia))];
  console.log("[ALERTAS] Provincias a verificar:", provincesToCheck);

  const PROVINCIAS_COORDS: Record<string, { lat: number; lon: number }> = {};
  for (const p of PROVINCIAS) {
    PROVINCIAS_COORDS[p.nombre] = { lat: p.lat, lon: p.lon };
  }

  const temps: Record<string, number> = {};

  await Promise.all(
    provincesToCheck.map(async (provincia) => {
      const p = PROVINCIAS_COORDS[provincia];
      if (!p) return;
      try {
        const res = await fetch(
          `https://api.open-meteo.com/v1/forecast?latitude=${p.lat}&longitude=${p.lon}&current=temperature_2m`
        );
        const d = await res.json();
        temps[provincia] = d.current?.temperature_2m ?? 0;
      } catch {
        temps[provincia] = 0;
      }
    })
  );

  console.log("[ALERTAS] Temperaturas:", temps);

  let enviados = 0;
  for (const alerta of alertasActivas) {
    const temp = temps[alerta.provincia] ?? 0;
    const tipo = alerta.tipo || 'calor';
    
    if (alerta.last_notified_at && (now - alerta.last_notified_at < TWELVE_HOURS)) {
      continue;
    }

    let activar = false;
    if (tipo === 'calor' && temp >= 38) activar = true;
    if (tipo === 'helada' && temp <= 0) activar = true;
    if (tipo === 'sequia' && temp >= 35) activar = true;
    
    if (activar) {
      const icon = tipo === 'calor' ? '🔥' : tipo === 'helada' ? '❄️' : '💧';
      const titulo = tipo === 'calor' ? 'ALERTA DE CALOR EXTREMO' : tipo === 'helada' ? 'ALERTA DE HELADA' : 'ALERTA DE ESTRÉS HÍDRICO';
      try {
        await transporter.sendMail({
          from: `olivaξ <${gmailUser}>`,
          to: alerta.email,
          subject: `${icon} ALERTA: ${alerta.provincia} a ${temp.toFixed(1)}°C`,
          html: `<p>Hola <strong>${alerta.nombre}</strong>,</p>
<p><strong>${icon} ${titulo}</strong></p>
<p>Tu provincia <strong>${alerta.provincia}</strong> ha alcanzado los <strong>${temp.toFixed(1)}°C</strong>.</p>
<p><strong>Consejos urgentes:</strong></p>
<ul>${CONSEJOS[tipo]?.map(c => `<li>${c}</li>`).join('') || ''}</ul>
<p>🫒 Equipo olivaξ</p>`,
        });
        console.log("[ALERTAS] Alerta enviada a:", alerta.email, "por", temp.toFixed(1) + "°C", "tipo:", tipo);
        
        db.query("UPDATE alertas SET last_notified_at = ? WHERE id = ?")
          .run(now, alerta.id);
          
        enviados++;
      } catch (e) {
        console.log("[ALERTAS] Error:", e);
      }
    }
  }

  return c.json({ ok: true, alertas: alertasActivas.length, enviados, temps });
});

export default alertas;