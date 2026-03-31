import nodemailer from "nodemailer";
import db from "../db/sqlite";
import { calcularRiesgosOlivar } from "./riesgos";
import { getClimaData, getClimaByProvincia, getRiesgosActivos } from "../routes/clima";
import { VARIEDADES_INFO, CONSEJOS, normalizarTipoAlertaCompartido, activarPorTipoCompartido } from "../data/shared";

// Configuración de email
const getGmailUser = () => (process.env.GMAIL_USER || "").trim();
const getGmailPass = () => (process.env.GMAIL_APP_PASSWORD || "").replace(/\s+/g, "").trim();
const getTransporter = () => nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: getGmailUser(),
    pass: getGmailPass(),
  },
});

// Helper wrapper
const callRiesgosOlivar = (t: number, h: number, l: number) => calcularRiesgosOlivar({ temp: t, humedad: h, lluvia: l });

function normalizarTipoAlerta(tipo: string): string {
  return normalizarTipoAlertaCompartido(tipo);
}

function activarPorTipo(tipo: string, riesgosActivos: any[]): boolean {
  return activarPorTipoCompartido(tipo, riesgosActivos);
}

export async function ejecutarCheckAlertas(): Promise<{ ok: boolean; alertas: number; enviados: number }> {
  const gmailUser = getGmailUser();
  const gmailPass = getGmailPass();
  if (!gmailPass || !gmailUser) {
    console.log("[CRON] Sin Gmail config completa (user/pass), saltando");
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
      await getTransporter().sendMail({
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
