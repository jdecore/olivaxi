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

const VARIEDADES_INFO: Record<string, any> = {
  cornicabra: { nombre: "Cornicabra", clima: { frio: "muy-alta", calor: "muy-alta", sequia: "muy-alta", humedad_alta: "media" } },
  picual: { nombre: "Picual", clima: { frio: "alta", calor: "muy-alta", sequia: "media", humedad_alta: "baja" } },
  arbequina: { nombre: "Arbequina", clima: { frio: "muy-alta", calor: "media", sequia: "baja", humedad_alta: "baja" } },
  hojiblanca: { nombre: "Hojiblanca", clima: { frio: "media", calor: "alta", sequia: "media-alta", humedad_alta: "media" } },
  manzanilla: { nombre: "Manzanilla", clima: { frio: "media", calor: "media-alta", sequia: "baja", humedad_alta: "baja" } },
  empeltre: { nombre: "Empeltre", clima: { frio: "alta", calor: "media-alta", sequia: "muy-alta", humedad_alta: "media" } }
};

const CONSEJOS: Record<string, string[]> = {
  ola_calor: ['💧 Riega antes del amanecer', '🌿 Evita fertilizar', '🛡️ Acolcha el suelo con paja', '🌳 No podes en días calurosos'],
  calor_critico: ['💧 Aumenta riego', '🌿 Aplica mulch', '🛡️ Protege del sol directo', '🌳 Evita poda'],
  helada: ['🧣 Protege árboles jóvenes con manta', '💧 No riegues antes de helada', '🌳 Evita poda ahora', '🔥 Considera heaters si es viable'],
  helada_critica: ['🧣 Protege con manta térmica', '💧 No riegues', '🌳 Evita podar', '🔥 Calefacción si es viable'],
  estres_hidrico: ['💦 Aplica riego profundo', '🪵 Usa mulch para retener humedad', '✂️ Reduce poda', '🌿 Aplica compost'],
  sequia_severa: ['💧 Aumenta riego significativamente', '🪵 Aplica mulch espeso', '🌳 Reduce frutos si es necesario', '💦 Considera riego de emergencia'],
  sequia_extrema: ['💥 Solicita permiso para emergencia', '🛡️ Protege árboles centenarios', '📞 Contacta asociaciones'],
  alta_humedad: ['🍄 Aplica fungicida preventivo', '🌳 Poda para ventilación', '💧 Evita riego por aspersión', '🔍 Monitorea hojas'],
  hongos_criticos: ['🍄 Aplica fungicida urgente', '🔴 Elimina ramas afectadas', '💧 No riegues por aspersión', '📞 Consulta técnico'],
  inundacion: ['🌊 Revisa drenaje', '🍄 Aplica anti-hongos', '🌳 Evalúa raíces', '🛡️ Protege de erosión'],
  mosca: ['🧪 Aplica tratamiento', '🪓 Recoge frutos afectados', '🔒 Instala trampas', '📅 Programa tratamiento'],
  polilla: ['🪓 Poda afectada', '🧪 Aplica tratamiento', '🔒 Trampas de feromonas', '🥅 Redes anti-insectos'],
  xylella: ['🚨 Notifica a authorities', '🪓 Elimina árboles afectados', '🛡️ Medidas preventivas', '🔬 Confirma laboratorio'],
  repilo: ['🍄 Aplica fungicida', '🌳 Poda para aireación', '💧 Evita exceso de riego', '🔍 Monitorea regularmente'],
  condiciones_optimas: ['✅ Continúa con tu rutina', '📊 Monitorea regularmente', '🌳 Tu olivar está bien']
};

const VALID_PROVINCIAS = PROVINCIAS.map(p => p.nombre);
const VALID_VARIEDADES = Object.keys(VARIEDADES_INFO);
const VALID_TIPOS = Object.keys(CONSEJOS);

// Sanitización
const sanitizeStr = (str: string, maxLen = 100): string => {
  return str.replace(/[<>'";]/g, '').trim().slice(0, maxLen);
};

const isValidEmail = (email: string): boolean => {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
};

const alertas = new Hono();

alertas.post("/", async (c) => {
  const body = await c.req.json().catch(() => ({}));
  
  const nombreRaw = body.nombre || '';
  const emailRaw = body.email || '';
  const provinciaRaw = body.provincia || '';
  const variedadRaw = body.variedad || '';
  const tipoRaw = body.tipo || 'condiciones_optimas';
  const fenologiaRaw = body.fenologia || '';

  // Validación
  if (!nombreRaw || !emailRaw || !provinciaRaw) {
    return c.json({ error: "Faltan datos requeridos" }, 400);
  }

  const nombre = sanitizeStr(nombreRaw, 50);
  const email = sanitizeStr(emailRaw, 100);
  const provincia = sanitizeStr(provinciaRaw, 50);
  const variedad = sanitizeStr(variedadRaw, 30);
  const tipo = VALID_TIPOS.includes(tipoRaw) ? sanitizeStr(tipoRaw, 30) : 'condiciones_optimas';
  const fenologia = fenologiaRaw ? sanitizeStr(fenologiaRaw, 20) : '';

  if (!isValidEmail(email)) {
    return c.json({ error: "Email inválido" }, 400);
  }

  if (!VALID_PROVINCIAS.includes(provincia)) {
    return c.json({ error: "Provincia inválida" }, 400);
  }

  if (variedad && !VALID_VARIEDADES.includes(variedad)) {
    return c.json({ error: "Variedad inválida" }, 400);
  }

  // LIMITACIONES PARA EVITAR ABUSO
  // 1. Máximo 3 alertas por email
  const alertasExistentes = db.query("SELECT COUNT(*) as count FROM alertas WHERE email = ? AND activa = 1").get(email) as { count: number };
  if (alertasExistentes.count >= 3) {
    return c.json({ error: "Máximo 3 alertas por email. Gestiona tus alertas desde el correo recibido." }, 400);
  }

  // 2. Verificar alerta duplicada (misma provincia + variedad)
  const alertaDuplicada = db.query(
    "SELECT id FROM alertas WHERE email = ? AND provincia = ? AND variedad = ? AND activa = 1"
  ).get(email, provincia, variedad || '') as { id: number } | undefined;

  if (alertaDuplicada) {
    return c.json({ error: "Ya tienes una alerta activa para esta combinación" }, 400);
  }

  // 3. Limitar a 2 alertas por provincia (distintas variedades)
  const alertasProvincia = db.query(
    "SELECT COUNT(*) as count FROM alertas WHERE email = ? AND provincia = ? AND activa = 1"
  ).get(email, provincia) as { count: number };
  if (alertasProvincia.count >= 2) {
    return c.json({ error: "Máximo 2 alertas por provincia. Gestiona tus alertas desde el correo recibido." }, 400);
  }

  const insert = db.query(
    "INSERT INTO alertas (nombre, email, provincia, variedad, tipo, fenologia, activa, created_at) VALUES (?, ?, ?, ?, ?, ?, 1, ?)"
  );
  insert.run(nombre, email, provincia, variedad || '', tipo, fenologia, Date.now());

  const gmailPass = process.env.GMAIL_APP_PASSWORD;
  console.log("[ALERTAS] GMAIL_PASS presente:", !!gmailPass);

  if (gmailPass) {
    try {
      const varInfo = VARIEDADES_INFO[variedad];
      const consejos = CONSEJOS[tipo] || [];
      
      await transporter.sendMail({
        from: `olivaξ <${gmailUser}>`,
        to: email,
        subject: `✅ Tu alerta está activa - ${provincia}`,
        html: `<p>Hola <strong>${nombre}</strong>,</p>
<p>Tu alerta está activa en olivaξ para <strong>${provincia}</strong>.</p>
${varInfo ? `<p>Variedad: <strong>${varInfo.nombre}</strong></p>` : ''}
${fenologia ? `<p>Fase fenológica: <strong>${fenologia}</strong></p>` : ''}
<p>Te avisaremos cuando las condiciones climáticas afecten a tu cultivo de olivo.</p>
<p><strong>Consejos para condiciones actuales:</strong></p>
<ul>${consejos.map(c => `<li>${c}</li>`).join('') || '<li>✅ Sin acciones necesarias</li>'}</ul>
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

  // Limitar a 50 alertas por ejecución para evitar saturación
  const alertasLimit = alertasActivas.slice(0, 50);
  
  const now = Date.now();
  const TWELVE_HOURS = 12 * 60 * 60 * 1000;

  const provincesToCheck = [...new Set(alertasLimit.map((a) => a.provincia))].slice(0, 10);
  console.log("[ALERTAS] Provincias a verificar (max 10):", provincesToCheck);

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