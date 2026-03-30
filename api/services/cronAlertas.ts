import nodemailer from "nodemailer";
import db from "../db/sqlite";
import { PROVINCIAS } from "../data/provincias";
import { calcularRiesgosOlivar } from "./riesgos";

// Configuración de email
const gmailUser = process.env.GMAIL_USER;

const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: gmailUser,
    pass: process.env.GMAIL_APP_PASSWORD,
  },
});

// Datos de variedades y consejos
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

// Helper wrapper
const callRiesgosOlivar = (t: number, h: number, l: number) => calcularRiesgosOlivar({ temp: t, humedad: h, lluvia: l });

export async function ejecutarCheckAlertas(): Promise<{ ok: boolean; alertas: number; enviados: number }> {
  const gmailPass = process.env.GMAIL_APP_PASSWORD;
  if (!gmailPass) {
    console.log("[CRON] Sin Gmail config, saltando");
    return { ok: false, alertas: 0, enviados: 0 };
  }

  const alertasActivas = db
    .query("SELECT * FROM alertas WHERE activa = 1")
    .all() as any[];

  if (alertasActivas.length === 0) {
    console.log("[CRON] No hay alertas activas");
    return { ok: true, alertas: 0, enviados: 0 };
  }

  const now = Date.now();
  const TWELVE_HOURS = 12 * 60 * 60 * 1000;

  const provincesToCheck = [...new Set(alertasActivas.map((a) => a.provincia))].slice(0, 10);
  console.log("[CRON] Provincias a verificar:", provincesToCheck);

  // Obtener coordenadas
  const PROVINCIAS_COORDS: Record<string, { lat: number; lon: number }> = {};
  for (const p of PROVINCIAS) {
    PROVINCIAS_COORDS[p.nombre] = { lat: p.lat, lon: p.lon };
  }

  // Obtener datos climáticos
  const datosClima: Record<string, { temp: number; humedad: number; lluvia: number }> = {};

  await Promise.all(
    provincesToCheck.map(async (provincia) => {
      const p = PROVINCIAS_COORDS[provincia];
      if (!p) return;
      try {
        const res = await fetch(
          `https://api.open-meteo.com/v1/forecast?latitude=${p.lat}&longitude=${p.lon}&current=temperature_2m,relative_humidity_2m,precipitation`
        );
        const d = await res.json();
        datosClima[provincia] = {
          temp: d.current?.temperature_2m ?? 0,
          humedad: d.current?.relative_humidity_2m ?? 50,
          lluvia: d.current?.precipitation ?? 0
        };
      } catch {
        datosClima[provincia] = { temp: 0, humedad: 50, lluvia: 0 };
      }
    })
  );

  console.log("[CRON] Datos climáticos:", datosClima);

  let enviados = 0;
  for (const alerta of alertasActivas) {
    const clima = datosClima[alerta.provincia] || { temp: 0, humedad: 50, lluvia: 0 };
    const tipo = alerta.tipo || 'calor';
    const temp = clima.temp;
    
    // Skip si ya se notificó en las últimas 12 horas
    if (alerta.last_notified_at && (now - alerta.last_notified_at < TWELVE_HOURS)) {
      continue;
    }

    // Determinar si activar alerta
    let activar = false;
    if (tipo === 'calor' && temp >= 38) activar = true;
    if (tipo === 'helada' && temp <= 0) activar = true;
    if (tipo === 'sequia' && temp >= 35) activar = true;
    
    if (!activar) continue;

    console.log(`[CRON] Enviando alerta a ${alerta.nombre} en ${alerta.provincia} (${temp}°C)`);

    // Generar email personalizado
    const icon = tipo === 'calor' ? '🔥' : tipo === 'helada' ? '❄️' : '💧';
    const titulo = tipo === 'calor' ? 'ALERTA DE CALOR EXTREMO' : tipo === 'helada' ? 'ALERTA DE HELADA' : 'ALERTA DE ESTRÉS HÍDRICO';
    const consejos = CONSEJOS[tipo] || [];
    const riesgos = callRiesgosOlivar(temp, clima.humedad, clima.lluvia);

    const html = `
<p>Hola <strong>${alerta.nombre}</strong>,</p>
<p><strong>${icon} ${titulo}</strong></p>
<p>Tu provincia <strong>${alerta.provincia}</strong> ha alcanzado los <strong>${temp.toFixed(1)}°C</strong>.</p>
<p><strong>Situación actual:</strong></p>
<ul>
  <li>Temperatura: ${temp.toFixed(1)}°C (${riesgos.calor.descripcion})</li>
  <li>Humedad: ${clima.humedad}% (${riesgos.baja_humedad.descripcion})</li>
</ul>
<p><strong>Consejos urgentes:</strong></p>
<ul>${consejos.map(c => `<li>${c}</li>`).join('')}</ul>
<p>🫒 Equipo olivaξ</p>`;

    try {
      await transporter.sendMail({
        from: `olivaξ <${gmailUser}>`,
        to: alerta.email,
        subject: `${icon} ALERTA: ${alerta.provincia} a ${temp.toFixed(1)}°C`,
        html,
      });

      db.query("UPDATE alertas SET last_notified_at = ? WHERE id = ?")
        .run(now, alerta.id);
      
      enviados++;
      console.log(`[CRON] Email enviado a ${alerta.email}`);
    } catch (e) {
      console.log(`[CRON] Error enviando a ${alerta.email}:`, e);
    }
  }

  return { ok: true, alertas: alertasActivas.length, enviados };
}