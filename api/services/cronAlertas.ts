import nodemailer from "nodemailer";
import db from "../db/sqlite";
import { PROVINCIAS } from "../data/provincias";
import { calcularRiesgosOlivar } from "./riesgos";

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
const PRIORIDAD_RIESGO: Record<string, number> = { alto: 3, medio: 2, bajo: 1 };
const NORMALIZAR_TIPO_ALERTA: Record<string, string> = {
  calor: 'ola_calor',
  helada: 'helada',
  sequia: 'sequia_extrema',
  humedad: 'alta_humedad',
};

function normalizarTipoAlerta(tipo: string): string {
  return NORMALIZAR_TIPO_ALERTA[tipo] || tipo || 'condiciones_optimas';
}

function normalizarHumedadSuelo(humedadSuelo: number | undefined): number {
  const valor = Number(humedadSuelo ?? 0);
  if (!Number.isFinite(valor)) return 0;
  return valor <= 1 ? valor * 100 : valor;
}

function getRiesgosActivos(datos: any): any[] {
  const riesgos: any[] = [];
  const temp = Number(datos.temp ?? 0);
  const humedad = Number(datos.humedad ?? 0);
  const lluvia = Number(datos.lluvia ?? 0);
  const sueloTemp = Number(datos.suelo_temp ?? 0);
  const sueloHumedad = normalizarHumedadSuelo(datos.suelo_humedad);
  const eto = Number(datos.evapotranspiracion ?? 0);
  const pluviometriaAnual = Number(datos.pluviometriaAnual ?? 0);
  const kc = 0.7;
  const deficit = Math.max(0, eto * kc - lluvia);
  const lluviaMedia = pluviometriaAnual > 0 ? pluviometriaAnual / 365 : 0;
  const ro = callRiesgosOlivar(temp, humedad, lluvia);
  const rp = datos.riesgos_plaga || {};

  if (ro.calor?.nivel === 'alto') riesgos.push({ tipo: 'ola_calor', nivel: 'alto', titulo: 'Calor extremo', icono: '🔥' });
  if (ro.frio?.nivel === 'alto') riesgos.push({ tipo: 'helada', nivel: 'alto', titulo: 'Helada', icono: '❄️' });
  if (ro.alta_humedad?.nivel === 'alto') riesgos.push({ tipo: 'alta_humedad', nivel: 'alto', titulo: 'Humedad alta', icono: '🍄' });
  if (ro.alta_lluvia?.nivel === 'alto') riesgos.push({ tipo: 'inundacion', nivel: 'alto', titulo: 'Lluvia intensa', icono: '🌊' });
  if (ro.baja_humedad?.nivel === 'alto') riesgos.push({ tipo: 'sequia_extrema', nivel: 'alto', titulo: 'Sequía', icono: '🏜️' });

  if (rp.mosca?.nivel === 'alto') riesgos.push({ tipo: 'mosca', nivel: 'alto', titulo: 'Mosca', icono: '🪰' });
  if (rp.polilla?.nivel === 'alto') riesgos.push({ tipo: 'polilla', nivel: 'alto', titulo: 'Polilla', icono: '🦋' });
  if (rp.xylella?.nivel === 'alto') riesgos.push({ tipo: 'xylella', nivel: 'alto', titulo: 'Xylella', icono: '🚨' });
  if (rp.repilo?.nivel === 'alto') riesgos.push({ tipo: 'repilo', nivel: 'alto', titulo: 'Repilo', icono: '🍂' });

  if (sueloHumedad < 20 || eto > 6.5 || deficit > 4 || (lluviaMedia > 0 && lluvia < lluviaMedia * 0.25 && eto > 4)) {
    riesgos.push({ tipo: 'sequia_extrema', nivel: 'alto', titulo: 'Estrés hídrico de suelo', icono: '📉' });
  }
  if (sueloHumedad > 80) riesgos.push({ tipo: 'inundacion', nivel: 'alto', titulo: 'Suelo encharcado', icono: '🌊' });
  if (humedad > 75 && lluvia > 2 && temp >= 10 && temp <= 20) riesgos.push({ tipo: 'repilo', nivel: lluvia > 6 ? 'alto' : 'medio', titulo: 'Repilo fúngico', icono: '🍂' });
  if (sueloHumedad > 75 && sueloTemp >= 18 && sueloTemp <= 26 && temp >= 15 && temp <= 30) riesgos.push({ tipo: 'hongos_criticos', nivel: sueloHumedad > 85 ? 'alto' : 'medio', titulo: 'Verticilosis', icono: '🍄' });
  if (humedad > 80 && temp >= 15 && temp <= 22 && lluvia > 3) riesgos.push({ tipo: 'hongos_criticos', nivel: lluvia > 8 ? 'alto' : 'medio', titulo: 'Antracnosis', icono: '🦠' });
  if (lluvia > 8 && temp < 16 && humedad > 75) riesgos.push({ tipo: 'hongos_criticos', nivel: lluvia > 15 ? 'alto' : 'medio', titulo: 'Tuberculosis', icono: '🧫' });

  return riesgos.sort((a, b) => (PRIORIDAD_RIESGO[b.nivel] || 1) - (PRIORIDAD_RIESGO[a.nivel] || 1));
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

  const provincesToCheck = [...new Set(alertasActivas.map((a) => a.provincia))].slice(0, 10);
  console.log("[CRON] Provincias a verificar:", provincesToCheck);

  // Obtener coordenadas
  const PROVINCIAS_COORDS: Record<string, { lat: number; lon: number }> = {};
  for (const p of PROVINCIAS) {
    PROVINCIAS_COORDS[p.nombre] = { lat: p.lat, lon: p.lon };
  }

  // Obtener datos climáticos
  const datosClima: Record<string, any> = {};

  await Promise.all(
    provincesToCheck.map(async (provincia) => {
      const p = PROVINCIAS_COORDS[provincia];
      if (!p) return;
      try {
        const res = await fetch(
          `https://api.open-meteo.com/v1/forecast?latitude=${p.lat}&longitude=${p.lon}&current=temperature_2m,relative_humidity_2m,precipitation,soil_temperature_0cm,soil_moisture_0_to_1cm,et0_fao_evapotranspiration`
        );
        const d = await res.json();
        datosClima[provincia] = {
          temp: d.current?.temperature_2m ?? 0,
          humedad: d.current?.relative_humidity_2m ?? 50,
          lluvia: d.current?.precipitation ?? 0,
          suelo_temp: d.current?.soil_temperature_0cm ?? 0,
          suelo_humedad: d.current?.soil_moisture_0_to_1cm ?? 0,
          evapotranspiracion: d.current?.et0_fao_evapotranspiration ?? 0,
          pluviometriaAnual: 0,
          riesgos_plaga: {},
        };
      } catch {
        datosClima[provincia] = { temp: 0, humedad: 50, lluvia: 0, suelo_temp: 0, suelo_humedad: 0, evapotranspiracion: 0, pluviometriaAnual: 0, riesgos_plaga: {} };
      }
    })
  );

  console.log("[CRON] Datos climáticos:", datosClima);

  let enviados = 0;
  for (const alerta of alertasActivas) {
    const clima = datosClima[alerta.provincia] || { temp: 0, humedad: 50, lluvia: 0, suelo_temp: 0, suelo_humedad: 0, evapotranspiracion: 0, pluviometriaAnual: 0, riesgos_plaga: {} };
    const tipo = normalizarTipoAlerta(alerta.tipo || 'condiciones_optimas');
    const temp = Number(clima.temp || 0);
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
    const riesgos = callRiesgosOlivar(temp, clima.humedad, clima.lluvia);

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
