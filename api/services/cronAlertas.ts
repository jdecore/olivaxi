import nodemailer from "nodemailer";
import db from "../db/sqlite";
import { calcularRiesgosOlivar } from "./riesgos";
import { getClimaData, getClimaByProvincia, getRiesgosActivos } from "../routes/clima";

// Configuración de email
const gmailUser = process.env.GMAIL_USER;
const getGmailPass = () => (process.env.GMAIL_APP_PASSWORD || "").replace(/\s+/g, "").trim();

const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: gmailUser,
    pass: getGmailPass(),
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
const NORMALIZAR_TIPO_ALERTA: Record<string, string> = {
  calor: 'ola_calor',
  helada: 'helada',
  sequia: 'sequia_extrema',
  humedad: 'alta_humedad',
};

function normalizarTipoAlerta(tipo: string): string {
  return NORMALIZAR_TIPO_ALERTA[tipo] || tipo || 'condiciones_optimas';
}

function activarPorTipo(tipo: string, riesgosActivos: any[]): boolean {
  const t = normalizarTipoAlerta(tipo);
  if (t === 'condiciones_optimas') return riesgosActivos.length === 0;
  return riesgosActivos.some(r => r.tipo === t);
}

export async function ejecutarCheckAlertas(): Promise<{ ok: boolean; alertas: number; enviados: number }> {
  const gmailPass = getGmailPass();
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

  await getClimaData();

  let enviados = 0;
  for (const alerta of alertasActivas) {
    const clima = getClimaByProvincia(alerta.provincia);
    if (!clima) continue;
    const tipo = normalizarTipoAlerta(alerta.tipo || 'condiciones_optimas');
    const temp = Number(clima.temperatura || 0);
    const riesgosActivos = getRiesgosActivos(clima);
    
    // Skip si ya se notificó en las últimas 12 horas
    if (alerta.last_notified_at && (now - alerta.last_notified_at < TWELVE_HOURS)) {
      continue;
    }

    // Determinar si activar alerta
    const activar = activarPorTipo(tipo, riesgosActivos);
    
    if (!activar) continue;

    console.log(`[CRON] Enviando alerta a ${alerta.nombre} en ${alerta.provincia} (${temp}°C)`);

    // Generar email personalizado
    const icon = tipo === 'helada' ? '❄️' : tipo === 'inundacion' ? '🌊' : tipo === 'mosca' ? '🪰' : tipo === 'polilla' ? '🦋' : tipo === 'repilo' ? '🍂' : tipo === 'xylella' ? '🚨' : tipo === 'hongos_criticos' ? '🍄' : '🔥';
    const titulo = `ALERTA ${tipo.replaceAll('_', ' ').toUpperCase()}`;
    const consejos = CONSEJOS[tipo] || [];
    const riesgos = callRiesgosOlivar(temp, Number(clima.humedad || 0), Number(clima.lluvia || 0));

    const html = `
<p>Hola <strong>${alerta.nombre}</strong>,</p>
<p><strong>${icon} ${titulo}</strong></p>
<p>Tu provincia <strong>${alerta.provincia}</strong> ha alcanzado los <strong>${temp.toFixed(1)}°C</strong>.</p>
<p><strong>Situación actual:</strong></p>
<ul>
  <li>Temperatura: ${temp.toFixed(1)}°C (${riesgos.calor.descripcion})</li>
  <li>Humedad: ${clima.humedad}% (${riesgos.baja_humedad.descripcion})</li>
  <li>Riesgos: ${riesgosActivos.slice(0, 3).map(r => `${r.icono} ${r.titulo}`).join(' · ') || 'Sin riesgos destacados'}</li>
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
