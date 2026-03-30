import { Hono } from "hono";
import nodemailer from "nodemailer";
import db from "../db/sqlite";
import { PROVINCIAS } from "../data/provincias";
import { getClimaByProvincia, getClimaData, getRiesgosActivos } from "./clima";
import { calcularRiesgosPlaga, calcularRiesgosOlivar } from "../services/riesgos";

// ============================================
// SEGURIDAD - Rate Limiting simple (in-memory)
// ============================================
const RATE_LIMIT_WINDOW = 60 * 1000;
const RATE_LIMIT_MAX = 10;
const requestCounts = new Map<string, { count: number; resetTime: number }>();

// Cleanup expired entries every 10 minutes
setInterval(() => {
  const now = Date.now();
  for (const [key, val] of requestCounts.entries()) {
    if (now > val.resetTime + RATE_LIMIT_WINDOW) requestCounts.delete(key);
  }
}, 10 * 60 * 1000);

function checkRateLimit(ip: string): boolean {
  const now = Date.now();
  const record = requestCounts.get(ip);
  
  if (!record || now > record.resetTime) {
    requestCounts.set(ip, { count: 1, resetTime: now + RATE_LIMIT_WINDOW });
    return true;
  }
  
  if (record.count >= RATE_LIMIT_MAX) {
    return false;
  }
  
  record.count++;
  return true;
}

function getClientIP(c: any): string {
  return c.req.header('x-forwarded-for')?.split(',')[0]?.trim() 
    || c.req.header('x-real-ip') 
    || 'unknown';
}

// ============================================
// AUDITORÍA - Logging
// ============================================
const AUDIT_LOG: { timestamp: number; ip: string; action: string; success: boolean; details?: string }[] = [];

function logAudit(ip: string, action: string, success: boolean, details?: string) {
  const entry = { timestamp: Date.now(), ip, action, success, details };
  AUDIT_LOG.push(entry);
  // Mantener solo últimos 1000 registros
  if (AUDIT_LOG.length > 1000) AUDIT_LOG.shift();
  console.log(`[AUDIT] ${action} - ${ip} - ${success ? 'OK' : 'FAIL'}${details ? ' - ' + details : ''}`);
}

// ============================================
// Verificación de Email (Double Opt-in)
// ============================================
const pendingVerifications = new Map<string, { email: string; nombre: string; provincia: string; variedad: string; tipo: string; fenologia: string; expires: number }>();

function generateVerificationToken(): string {
  return crypto.randomUUID() + '-' + Date.now();
}

const gmailUser = process.env.GMAIL_USER || "jdenriquezr@gmail.com";
const getGmailPass = () => (process.env.GMAIL_APP_PASSWORD || "").replace(/\s+/g, "").trim();

const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: gmailUser,
    pass: getGmailPass(),
  },
});

// ============================================
// LLM para Emails Personalizados - Alertas
// ============================================
const LLM_ALERTAS_PROVIDERS = [
  {
    name: "GeminiAlertas",
    url: "https://generativelanguage.googleapis.com/v1beta/openai/chat/completions",
    key: process.env.GEMINI_ALERTAS_KEY,
    model: "gemini-2.0-flash",
  },
  {
    name: "Cerebras1",
    url: "https://api.cerebras.ai/v1/chat/completions",
    key: process.env.CEREBRAS_KEY_1,
    model: "llama3.1-70b",
  },
  {
    name: "Cerebras2",
    url: "https://api.cerebras.ai/v1/chat/completions",
    key: process.env.CEREBRAS_KEY_2,
    model: "llama3.1-70b",
  },
];

interface ContextoAlerta {
  nombre: string;
  provincia: string;
  variedad: string;
  variedadNombre: string;
  fenologia: string;
  tipo: string;
  temp: number;
  humedad: number;
  lluvia: number;
  suelo: {
    temperatura: number;
    humedad: number;
    evapotranspiracion: number;
  };
  sueloAnalitica: {
    humedadPorcentaje: number;
    necesidadRiego: number;
    deficitRiego: number;
    lluviaMediaDiaria: number;
  };
  riesgosActivos: { tipo: string; categoria: string; nivel: string; titulo: string; icono: string }[];
  riesgos_olivar: {
    frio: { nivel: string; descripcion: string };
    calor: { nivel: string; descripcion: string };
    baja_humedad: { nivel: string; descripcion: string };
    alta_humedad: { nivel: string; descripcion: string };
    baja_lluvia: { nivel: string; descripcion: string };
    alta_lluvia: { nivel: string; descripcion: string };
  };
  riesgos_plaga: {
    mosca: { nivel: string; descripcion: string };
    polilla: { nivel: string; descripcion: string };
    xylella: { nivel: string; descripcion: string };
    repilo: { nivel: string; descripcion: string };
  };
  faseFenologica: string;
}

function construirPromptBienvenida(contexto: ContextoAlerta): string {
  return `Eres un asistente experto en olivar y cambio climático. Escribe un email de bienvenida personalizado y cálido para un usuario que ha activado una alerta de olivar.

INFORMACIÓN DEL USUARIO:
- Nombre: ${contexto.nombre}
- Provincia: ${contexto.provincia}
- Variedad de olivo: ${contexto.variedadNombre}
- Fase fenológica: ${contexto.faseFenologica}

DATOS CLIMÁTICOS ACTUALES DE LA ZONA:
- Temperatura: ${contexto.temp}°C
- Humedad: ${contexto.humedad}%
- Lluvia: ${contexto.lluvia}mm

DATOS DE SUELO Y RIEGO:
- Temperatura suelo: ${contexto.suelo.temperatura}°C
- Humedad suelo: ${contexto.suelo.humedad}%
- Evapotranspiración (ETo): ${contexto.suelo.evapotranspiracion} mm/día
- Necesidad de riego: ${contexto.sueloAnalitica.necesidadRiego} mm/día
- Déficit hídrico: ${contexto.sueloAnalitica.deficitRiego} mm/día

RIESGOS CLIMÁTICOS ACTUALES:
- Frío: ${contexto.riesgos_olivar.frio.nivel} - ${contexto.riesgos_olivar.frio.descripcion}
- Calor: ${contexto.riesgos_olivar.calor.nivel} - ${contexto.riesgos_olivar.calor.descripcion}
- Humedad baja: ${contexto.riesgos_olivar.baja_humedad.nivel} - ${contexto.riesgos_olivar.baja_humedad.descripcion}
- Humedad alta: ${contexto.riesgos_olivar.alta_humedad.nivel} - ${contexto.riesgos_olivar.alta_humedad.descripcion}

RIESGOS DE PLAGAS:
- Mosca del olivo: ${contexto.riesgos_plaga.mosca.nivel} - ${contexto.riesgos_plaga.mosca.descripcion}
- Polilla: ${contexto.riesgos_plaga.polilla.nivel} - ${contexto.riesgos_plaga.polilla.descripcion}
- Xylella: ${contexto.riesgos_plaga.xylella.nivel} - ${contexto.riesgos_plaga.xylella.descripcion}
- Repilo: ${contexto.riesgos_plaga.repilo.nivel} - ${contexto.riesgos_plaga.repilo.descripcion}

RIESGOS ACTIVOS PRIORIZADOS:
${contexto.riesgosActivos.slice(0, 6).map(r => `- ${r.icono} ${r.titulo} [${r.categoria}] (${r.nivel})`).join('\n')}

INSTRUCCIONES:
1. Usa el nombre del usuario
2. Menciona la variedad de olivo que tiene
3. Da la bienvenida de manera cálida y profesional
4. Explica brevemente qué recibirá (alertas cuando el clima afecte su cultivo)
5. Añade 3-4 consejos prácticos basados en la situación climática actual de su zona
6. Usa emojis relevantes para hacerlo más visual
7. El email debe ser corto (máximo 200 palabras)
8. Firma como "🫒 Equipo olivaξ"

Devuelve SOLO el contenido HTML del body del email (sin etiquetas <html> ni <body>).`;
}

function construirPromptAlerta(contexto: ContextoAlerta): string {
  return `Eres un asistente experto en olivar y cambio climático. Escribe un email de ALERTA URGENTE personalizada para un usuario cuyo olivar está en riesgo.

INFORMACIÓN DEL USUARIO:
- Nombre: ${contexto.nombre}
- Provincia: ${contexto.provincia}
- Variedad de olivo: ${contexto.variedadNombre}
- Fase fenológica: ${contexto.faseFenologica}
- Tipo de alerta activada: ${contexto.tipo}

DATOS CLIMÁTICOS CRÍTICOS ACTUALES:
- Temperatura: ${contexto.temp}°C
- Humedad: ${contexto.humedad}%
- Lluvia: ${contexto.lluvia}mm

DATOS DE SUELO Y RIEGO:
- Temperatura suelo: ${contexto.suelo.temperatura}°C
- Humedad suelo: ${contexto.suelo.humedad}%
- Evapotranspiración (ETo): ${contexto.suelo.evapotranspiracion} mm/día
- Necesidad de riego: ${contexto.sueloAnalitica.necesidadRiego} mm/día
- Déficit hídrico: ${contexto.sueloAnalitica.deficitRiego} mm/día

RIESGOS CLIMÁTICOS ACTIVOS:
- Frío: ${contexto.riesgos_olivar.frio.nivel} - ${contexto.riesgos_olivar.frio.descripcion}
- Calor: ${contexto.riesgos_olivar.calor.nivel} - ${contexto.riesgos_olivar.calor.descripcion}
- Humedad baja: ${contexto.riesgos_olivar.baja_humedad.nivel} - ${contexto.riesgos_olivar.baja_humedad.descripcion}
- Humedad alta: ${contexto.riesgos_olivar.alta_humedad.nivel} - ${contexto.riesgos_olivar.alta_humedad.descripcion}

RIESGOS DE PLAGAS ASOCIADOS:
- Mosca del olivo: ${contexto.riesgos_plaga.mosca.nivel}
- Polilla: ${contexto.riesgos_plaga.polilla.nivel}
- Repilo: ${contexto.riesgos_plaga.repilo.nivel}

RIESGOS ACTIVOS PRIORIZADOS:
${contexto.riesgosActivos.slice(0, 6).map(r => `- ${r.icono} ${r.titulo} [${r.categoria}] (${r.nivel})`).join('\n')}

INSTRUCCIONES:
1. Usa el nombre del usuario
2. El asunto debe ser claro y urgente (ej: "🔥 ALERTA: Calor extremo en Jaén")
3. Indica la temperatura actual y qué significa para su olivo
4. Da 4-5 ACCIONES CONCRETAS Y URGENTES que debe tomar ahora mismo
5. Considera su variedad de olivo específica al dar recomendaciones
6. Menciona la fase fenológica actual si es relevante
7. Usa emojis para hacerlo visual y urgente
8. El email debe ser moderado (150-250 palabras)
9. Firma como "🫒 Equipo olivaξ"

Devuelve SOLO el contenido HTML del body del email (sin etiquetas <html> ni <body>).`;
}

async function generarEmailConLLM(
  contexto: ContextoAlerta,
  tipo: "bienvenida" | "alerta"
): Promise<string | null> {
  const prompt = tipo === "bienvenida"
    ? construirPromptBienvenida(contexto)
    : construirPromptAlerta(contexto);

  const messages = [
    { role: "system", content: "Eres un experto en olivar y comunicación con agricultores. Escribes emails claros, prácticos y útiles." },
    { role: "user", content: prompt }
  ];

  const errors: Error[] = [];

  for (const provider of LLM_ALERTAS_PROVIDERS) {
    if (!provider.key) {
      errors.push(new Error(`${provider.name} sin API key`));
      continue;
    }

    try {
      console.log(`[LLM-Alertas] Llamando a ${provider.name}...`);

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 45000);

      const response = await fetch(provider.url, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${provider.key}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: provider.model,
          messages,
          max_tokens: 1000,
          temperature: 0.7,
        }),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new Error(`${provider.name} error: ${response.status}`);
      }

      const data = await response.json();
      const content = data.choices?.[0]?.message?.content;

      if (content) {
        console.log(`[LLM-Alertas] Email generado con ${provider.name}`);
        return content;
      }
    } catch (e) {
      console.error(`[LLM-Alertas] Error con ${provider.name}:`, e);
      errors.push(e as Error);
      continue;
    }
  }

  console.error(`[LLM-Alertas] Todos los providers fallaron:`, errors.map(e => e.message).join(", "));
  return null;
}

async function enviarAlertaInmediata(alerta: any, ip: string): Promise<boolean> {
  const tipo = normalizarTipoAlerta(alerta.tipo || 'condiciones_optimas');
  await getClimaData();
  const provData = getClimaByProvincia(alerta.provincia);
  const temp = provData?.temperatura ?? 0;
  const riesgosActivos = getRiesgosActivosDesdeProvinciaData(provData);
  const activar = activarPorTipo(tipo, riesgosActivos);

  if (!activar) {
    logAudit(ip, 'VERIFY_IMMEDIATE_SKIP', true, 'Sin riesgo activo ahora');
    return false;
  }

  const contexto = await obtenerContextoAlerta(
    alerta.provincia,
    alerta.variedad,
    alerta.fenologia,
    alerta.nombre,
    tipo
  );

  let emailHtml: string | null = null;
  let llmUsed = false;

  if (contexto) {
    emailHtml = await generarEmailConLLM(contexto, "alerta");
    if (emailHtml) llmUsed = true;
  }

  if (!emailHtml) {
    const icon = tipo === 'helada' ? '❄️' : tipo === 'inundacion' ? '🌊' : tipo === 'mosca' ? '🪰' : tipo === 'polilla' ? '🦋' : tipo === 'repilo' ? '🍂' : tipo === 'xylella' ? '🚨' : tipo === 'hongos_criticos' ? '🍄' : '🔥';
    const titulo = `ALERTA ${tipo.replaceAll('_', ' ').toUpperCase()}`;
    const consejos = CONSEJOS[tipo] || [];
    emailHtml = `<p>Hola <strong>${alerta.nombre}</strong>,</p>
<p><strong>${icon} ${titulo}</strong></p>
<p>Tu provincia <strong>${alerta.provincia}</strong> presenta riesgo activo ahora mismo.</p>
<p>🌡️ Temperatura actual: <strong>${temp.toFixed(1)}°C</strong></p>
<p><strong>Riesgos activos:</strong> ${riesgosActivos.slice(0, 3).map(r => `${r.icono} ${r.titulo}`).join(' · ') || 'Sin riesgos críticos'}</p>
<p><strong>Acciones recomendadas:</strong></p>
<ul>${consejos.map(c => `<li>${c}</li>`).join('') || ''}</ul>
<p>🫒 Equipo olivaξ</p>`;
  }

  await transporter.sendMail({
    from: `olivaξ <${gmailUser}>`,
    to: alerta.email,
    subject: llmUsed ? `🚨 ALERTA URGENTE - ${alerta.provincia}: ${temp.toFixed(1)}°C` : `🚨 ALERTA INMEDIATA - ${alerta.provincia}`,
    html: emailHtml,
  });

  db.query("UPDATE alertas SET last_notified_at = ? WHERE id = ?")
    .run(Date.now(), alerta.id);

  logAudit(ip, 'VERIFY_IMMEDIATE_SENT', true, `id=${alerta.id} email=${alerta.email}`);
  return true;
}

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
  verticilosis: ['🍄 Mejora drenaje y evita exceso de humedad', '🌳 Retira ramas secas y desinfecta herramientas'],
  antracnosis: ['🧫 Retira frutos afectados', '💨 Mejora aireación y evita heridas en fruto'],
  tuberculosis: ['✂️ Desinfecta herramientas de poda', '🧯 Evita poda con lluvia o alta humedad'],
  suelo_seco: ['🚿 Programa riego de apoyo por la mañana', '🪵 Refuerza acolchado para retener agua'],
  suelo_encharcado: ['🌊 Abre drenajes y evita compactación', '🚫 Suspende riego hasta normalizar suelo'],
  suelo_frio: ['🧊 Evita labores agresivas en raíz', '🌤️ Prioriza labores en horas templadas'],
  suelo_caliente: ['🔥 Reduce evaporación con cobertura', '🌅 Evita riegos en horas de máximo calor'],
  eto_alta: ['☀️ Ajusta riego por ETo diaria', '📉 Divide riego en pulsos cortos'],
  deficit_pluviometrico: ['📉 Compensa déficit con riego controlado', '🧪 Revisa humedad del bulbo húmedo'],
  todas_alertas: ['🔔 Recibirás avisos de cualquier riesgo activo', '📲 Revisa alertas a diario en episodios extremos'],
  condiciones_optimas: ['✅ Continúa con tu rutina', '📊 Monitorea regularmente', '🌳 Tu olivar está bien']
};

// Use functions from ../services/riesgos.ts
// calcularRiesgosPlaga and calcularRiesgosOlivar imported at top

const VALID_PROVINCIAS = PROVINCIAS.map(p => p.nombre);
const VALID_VARIEDADES = Object.keys(VARIEDADES_INFO);
const VALID_TIPOS = Object.keys(CONSEJOS);
const NORMALIZAR_TIPO_ALERTA: Record<string, string> = {
  calor: 'ola_calor',
  helada: 'helada',
  sequia: 'sequia_extrema',
  humedad: 'alta_humedad',
  todas: 'todas_alertas',
  todas_las_alertas: 'todas_alertas',
};

// Helper to call imported functions (they use object params)
const callRiesgosPlaga = (t: number, h: number, l: number) => calcularRiesgosPlaga({ temp: t, humedad: h, lluvia: l });
const callRiesgosOlivar = (t: number, h: number, l: number) => calcularRiesgosOlivar({ temp: t, humedad: h, lluvia: l });
const normalizarHumedadSuelo = (humedadSuelo: number | undefined): number => {
  const valor = Number(humedadSuelo ?? 0);
  if (!Number.isFinite(valor)) return 0;
  return valor <= 1 ? valor * 100 : valor;
};

function getFrontendBaseUrl(): string {
  const explicitWeb = process.env.PUBLIC_WEB_URL || process.env.ALERTAS_WEB_URL;
  if (explicitWeb) return explicitWeb.replace(/\/$/, '');

  const apiBase = (process.env.PUBLIC_API_URL || '')
    .replace(/\/$/, '')
    .replace(/\/api$/, '');

  if (apiBase) {
    return apiBase
      .replace(/:3000$/, ':4321')
      .replace(/:3001$/, ':4321')
      .replace(/:3002$/, ':4321');
  }

  return 'http://45.90.237.135:4321';
}

function getRiesgosActivosDesdeProvinciaData(provData: any): any[] {
  return getRiesgosActivos(provData);
}

function normalizarTipoAlerta(tipo: string): string {
  const t = sanitizeStr(tipo || '', 50);
  if (VALID_TIPOS.includes(t)) return t;
  return NORMALIZAR_TIPO_ALERTA[t] || 'condiciones_optimas';
}

function activarPorTipo(tipo: string, riesgosActivos: any[]): boolean {
  const normalizado = normalizarTipoAlerta(tipo);
  if (normalizado === 'todas_alertas') return riesgosActivos.length > 0;
  if (normalizado === 'condiciones_optimas') return riesgosActivos.length === 0;
  return riesgosActivos.some(r => r.tipo === normalizado);
}

// ============================================

// ============================================
// Función para obtener contexto completo del clima (usa cache)
// ============================================
async function obtenerContextoAlerta(
  provincia: string,
  variedad: string,
  fenologia: string,
  nombre: string,
  tipo: string
): Promise<ContextoAlerta | null> {
  // Usar datos cacheados del clima (evita llamar a Open-Meteo)
  const provinciaData = getClimaByProvincia(provincia);
  
  if (!provinciaData) {
    console.log("[Alertas] No hay datos cacheados para", provincia);
    // Fallback: valores por defecto
    return {
      nombre, provincia, variedad,
      variedadNombre: VARIEDADES_INFO[variedad]?.nombre || variedad,
      fenologia: fenologia || 'No especificada', tipo,
      temp: 20, humedad: 50, lluvia: 0,
      suelo: { temperatura: 18, humedad: 50, evapotranspiracion: 3 },
      sueloAnalitica: { humedadPorcentaje: 50, necesidadRiego: 2.1, deficitRiego: 2.1, lluviaMediaDiaria: 1.5 },
      riesgosActivos: [],
      riesgos_olivar: callRiesgosOlivar(20, 50, 0),
      riesgos_plaga: callRiesgosPlaga(20, 50, 0),
      faseFenologica: fenologia || 'No especificada'
    };
  }

  const temp = provinciaData.temperatura ?? 20;
  const humedad = provinciaData.humedad ?? 50;
  const lluvia = provinciaData.lluvia ?? 0;
  const sueloHumedad = normalizarHumedadSuelo(provinciaData.suelo_humedad);
  const eto = Number(provinciaData.evapotranspiracion ?? 0);
  const kc = 0.7;
  const necesidadRiego = Math.round((eto * kc) * 10) / 10;
  const deficitRiego = Math.round(Math.max(0, necesidadRiego - lluvia) * 10) / 10;
  const lluviaMediaDiaria = Math.round(((Number(provinciaData.pluviometriaAnual || 0) / 365) || 0) * 10) / 10;

  const riesgos_olivar = callRiesgosOlivar(temp, humedad, lluvia);
  const riesgos_plaga = callRiesgosPlaga(temp, humedad, lluvia);
  const riesgosActivos = getRiesgosActivosDesdeProvinciaData(provinciaData);

  const varInfo = VARIEDADES_INFO[variedad];
  const faseFenologica = fenologia || 'No especificada';

  return {
    nombre,
    provincia,
    variedad,
    variedadNombre: varInfo?.nombre || variedad,
    fenologia: faseFenologica,
    tipo,
    temp,
    humedad,
    lluvia,
    suelo: {
      temperatura: Number(provinciaData.suelo_temp ?? 0),
      humedad: sueloHumedad,
      evapotranspiracion: eto
    },
    sueloAnalitica: {
      humedadPorcentaje: sueloHumedad,
      necesidadRiego,
      deficitRiego,
      lluviaMediaDiaria
    },
    riesgosActivos,
    riesgos_olivar,
    riesgos_plaga,
    faseFenologica
  };
}

// ============================================
// Sanitización mejorada
// ============================================
const sanitizeStr = (str: string, maxLen = 100): string => {
  if (typeof str !== 'string') return '';
  return str.replace(/[<>'";&\\]/g, '').trim().slice(0, maxLen);
};

const isValidEmail = (email: string): boolean => {
  if (typeof email !== 'string') return false;
  const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
  return emailRegex.test(email);
};

// ============================================
// Calcular tipos de alerta disponibles (backend)
// ============================================
function calcularTiposAlerta(provincia: string, variedad: string): string[] {
  const provinciaData = getClimaByProvincia(provincia);
  
  if (!provinciaData) return ['condiciones_optimas'];
  const riesgosActivos = getRiesgosActivosDesdeProvinciaData(provinciaData);
  const tipos = [...new Set(riesgosActivos.map(r => r.tipo).filter((t: string) => VALID_TIPOS.includes(t)))];
  return tipos.length ? ['todas_alertas', ...tipos] : ['condiciones_optimas'];
}

// ============================================
// ENDPOINTS
// ============================================
const alertas = new Hono();

// Endpoint para obtener tipos de alerta disponibles (todo cálculo en backend)
alertas.get("/tipos", async (c) => {
  const provincia = c.req.query('provincia');
  const variedad = c.req.query('variedad') || '';
  
  if (!provincia) {
    return c.json({ error: "Provincia requerida" }, 400);
  }
  
  if (!VALID_PROVINCIAS.includes(provincia)) {
    return c.json({ error: "Provincia inválida" }, 400);
  }
  
  if (variedad && !VALID_VARIEDADES.includes(variedad)) {
    return c.json({ error: "Variedad inválida" }, 400);
  }
  
  const tipos = calcularTiposAlerta(provincia, variedad);
  return c.json({ tipos });
});

// Endpoint para verificar email (double opt-in)
alertas.post("/verify", async (c) => {
  const ip = getClientIP(c);
  
  if (!checkRateLimit(ip)) {
    logAudit(ip, 'VERIFY_RATE_LIMIT', false);
    return c.json({ error: "Demasiadas solicitudes" }, 429);
  }
  
  const body = await c.req.json().catch(() => ({}));
  const token = sanitizeStr(body.token || '', 100);
  
  const verification = pendingVerifications.get(token);
  if (!verification || Date.now() > verification.expires) {
    logAudit(ip, 'VERIFY_INVALID', false, 'Token inválido o expirado');
    return c.json({ error: "Token inválido o expirado" }, 400);
  }
  
  // Validar de nuevo todos los datos
  const { email, nombre, provincia, variedad, tipo, fenologia } = verification;
  
  // Verificar límites
  const alertasExistentes = db.query("SELECT COUNT(*) as count FROM alertas WHERE email = ? AND activa = 1").get(email) as { count: number };
  if (alertasExistentes.count >= 3) {
    logAudit(ip, 'VERIFY_LIMIT', false, 'Máximo 3 alertas');
    pendingVerifications.delete(token);
    return c.json({ error: "Máximo 3 alertas por email" }, 400);
  }
  
  const alertaDuplicada = db.query(
    "SELECT id FROM alertas WHERE email = ? AND provincia = ? AND variedad = ? AND activa = 1"
  ).get(email, provincia, variedad || '') as { id: number } | undefined;
  
  if (alertaDuplicada) {
    logAudit(ip, 'VERIFY_DUPLICATE', false, 'Alerta duplicada');
    pendingVerifications.delete(token);
    return c.json({ error: "Ya tienes una alerta activa para esta combinación" }, 400);
  }
  
  const alertasProvincia = db.query(
    "SELECT COUNT(*) as count FROM alertas WHERE email = ? AND provincia = ? AND activa = 1"
  ).get(email, provincia) as { count: number };
  if (alertasProvincia.count >= 2) {
    logAudit(ip, 'VERIFY_PROVINCIA_LIMIT', false, 'Máximo 2 por provincia');
    pendingVerifications.delete(token);
    return c.json({ error: "Máximo 2 alertas por provincia" }, 400);
  }
  
  // Insertar en DB
  const createdAt = Date.now();
  const insert = db.query(
    "INSERT INTO alertas (nombre, email, provincia, variedad, tipo, fenologia, activa, created_at) VALUES (?, ?, ?, ?, ?, ?, 1, ?)"
  );
  insert.run(nombre, email, provincia, variedad || '', tipo, fenologia, createdAt);
  
  pendingVerifications.delete(token);
  logAudit(ip, 'VERIFY_SUCCESS', true, `Alerta creada para ${email}`);
  
  // Enviar email de confirmación
  const gmailPass = getGmailPass();
  if (gmailPass) {
    try {
      const varInfo = VARIEDADES_INFO[variedad];
      const emailHtml = `<p>Hola <strong>${nombre}</strong>,</p>
<p>✅ Tu alerta está confirmada en olivaξ para <strong>${provincia}</strong>.</p>
${varInfo ? `<p>Variedad: <strong>${varInfo.nombre}</strong></p>` : ''}
<p>Te avisaremos cuando las condiciones climáticas afecten a tu cultivo de olivo.</p>
<p>🫒 Equipo olivaξ</p>`;
      
      await transporter.sendMail({
        from: `olivaξ <${gmailUser}>`,
        to: email,
        subject: `✅ Alerta confirmada - ${provincia}`,
        html: emailHtml,
      });
      logAudit(ip, 'EMAIL_SENT', true, 'Confirmación enviada');
    } catch (e) {
      logAudit(ip, 'EMAIL_FAIL', false, String(e));
    }
  }

  // Disparo inmediato de evaluación de riesgo tras confirmar.
  if (gmailPass) {
    try {
      const alertaCreada = db.query(
        "SELECT * FROM alertas WHERE email = ? AND provincia = ? AND created_at = ? ORDER BY id DESC LIMIT 1"
      ).get(email, provincia, createdAt) as any;
      if (alertaCreada) {
        await enviarAlertaInmediata(alertaCreada, ip);
      }
    } catch (e) {
      logAudit(ip, 'VERIFY_IMMEDIATE_FAIL', false, String(e));
    }
  }
  
  return c.json({ ok: true, message: "Alerta confirmada" });
});

// Endpoint principal - solo prepara verificación
alertas.post("/", async (c) => {
  const ip = getClientIP(c);
  logAudit(ip, 'ALERTA_REQUEST', true);
  
  // Rate limiting
  if (!checkRateLimit(ip)) {
    logAudit(ip, 'ALERTA_RATE_LIMIT', false);
    return c.json({ error: "Demasiadas solicitudes. Intenta en un minuto." }, 429);
  }
  
  const body = await c.req.json().catch(() => ({}));
  
  const nombreRaw = body.nombre || '';
  const emailRaw = body.email || '';
  const provinciaRaw = body.provincia || '';
  const variedadRaw = body.variedad || '';
  const tipoRaw = body.tipo || 'condiciones_optimas';
  const fenologiaRaw = body.fenologia || '';

  if (!nombreRaw || !emailRaw || !provinciaRaw) {
    logAudit(ip, 'ALERTA_MISSING_FIELDS', false);
    return c.json({ error: "Faltan datos requeridos" }, 400);
  }

  const nombre = sanitizeStr(nombreRaw, 50);
  const email = sanitizeStr(emailRaw, 100);
  const provincia = sanitizeStr(provinciaRaw, 50);
  const variedad = sanitizeStr(variedadRaw, 30);
  const tipo = normalizarTipoAlerta(tipoRaw);
  const fenologia = fenologiaRaw ? sanitizeStr(fenologiaRaw, 20) : '';

  if (!isValidEmail(email)) {
    logAudit(ip, 'ALERTA_INVALID_EMAIL', false);
    return c.json({ error: "Email inválido" }, 400);
  }

  if (!VALID_PROVINCIAS.includes(provincia)) {
    logAudit(ip, 'ALERTA_INVALID_PROVINCIA', false);
    return c.json({ error: "Provincia inválida" }, 400);
  }

  if (variedad && !VALID_VARIEDADES.includes(variedad)) {
    logAudit(ip, 'ALERTA_INVALID_VARIEDAD', false);
    return c.json({ error: "Variedad inválida" }, 400);
  }

  // Verificar límites ANTES de crear verificación
  const alertasExistentes = db.query("SELECT COUNT(*) as count FROM alertas WHERE email = ? AND activa = 1").get(email) as { count: number };
  if (alertasExistentes.count >= 3) {
    logAudit(ip, 'ALERTA_LIMIT_3', false);
    return c.json({ error: "Máximo 3 alertas por email." }, 400);
  }

  const alertaDuplicada = db.query(
    "SELECT id FROM alertas WHERE email = ? AND provincia = ? AND variedad = ? AND activa = 1"
  ).get(email, provincia, variedad || '') as { id: number } | undefined;

  if (alertaDuplicada) {
    logAudit(ip, 'ALERTA_DUPLICATE', false);
    return c.json({ error: "Ya tienes una alerta activa para esta combinación" }, 400);
  }

  const alertasProvincia = db.query(
    "SELECT COUNT(*) as count FROM alertas WHERE email = ? AND provincia = ? AND activa = 1"
  ).get(email, provincia) as { count: number };
  if (alertasProvincia.count >= 2) {
    logAudit(ip, 'ALERTA_LIMIT_PROVINCIA', false);
    return c.json({ error: "Máximo 2 alertas por provincia." }, 400);
  }

  // DOUBLE OPT-IN: Crear token de verificación
  const verifyToken = generateVerificationToken();
  const VERIFY_EXPIRES = 24 * 60 * 60 * 1000; // 24 horas
  
  pendingVerifications.set(verifyToken, {
    email, nombre, provincia, variedad, tipo, fenologia,
    expires: Date.now() + VERIFY_EXPIRES
  });

  logAudit(ip, 'ALERTA_VERIFY_SENT', true, `Token enviado a ${email}`);

  // Enviar email de verificación
  const gmailPass = getGmailPass();
  if (gmailPass) {
    try {
      const verifyUrl = `${getFrontendBaseUrl()}/alertas?verify=${verifyToken}`;
      const emailHtml = `<p>Hola <strong>${nombre}</strong>,</p>
<p>Confirma tu alerta para <strong>${provincia}</strong> haciendo clic en el botón:</p>
<p style="text-align: center; margin: 20px 0;">
  <a href="${verifyUrl}" style="background: #D4E849; color: #1C1C1C; padding: 12px 24px; text-decoration: none; font-weight: bold; border-radius: 6px; display: inline-block;">✅ Confirmar mi alerta</a>
</p>
<p>Si no solicitaste esta alerta, ignora este email.</p>
<p style="color: #666; font-size: 12px;">Este enlace expira en 24 horas.</p>
<p>🫒 Equipo olivaξ</p>`;
      
      await transporter.sendMail({
        from: `olivaξ <${gmailUser}>`,
        to: email,
        subject: `Confirma tu alerta - ${provincia}`,
        html: emailHtml,
      });
    } catch (e) {
      logAudit(ip, 'ALERTA_VERIFY_EMAIL_FAIL', false, String(e));
      return c.json({ error: "Error al enviar email de verificación" }, 500);
    }
  } else {
    // Sin email, crear directamente (modo desarrollo)
    const insert = db.query(
      "INSERT INTO alertas (nombre, email, provincia, variedad, tipo, fenologia, activa, created_at) VALUES (?, ?, ?, ?, ?, ?, 1, ?)"
    );
    insert.run(nombre, email, provincia, variedad || '', tipo, fenologia, Date.now());
    logAudit(ip, 'ALERTA_CREATED_DEV', true);
    return c.json({ ok: true, message: "Alerta creada (modo desarrollo)" });
  }

  return c.json({ ok: true, message: "Revisa tu email para confirmar la alerta" });
});

// Endpoint de auditoría (protegido)
alertas.get("/audit", async (c) => {
  const apiKey = c.req.header('x-api-key');
  const validKey = process.env.ALERTAS_AUDIT_KEY;
  
  if (!validKey || apiKey !== validKey) {
    return c.json({ error: "No autorizado" }, 401);
  }
  
  const since = Date.now() - (24 * 60 * 60 * 1000); // últimas 24 horas
  const recent = AUDIT_LOG.filter(e => e.timestamp > since);
  return c.json({ audit: recent, total: AUDIT_LOG.length });
});

// Endpoint de check (protegido con API key)
alertas.post("/check", async (c) => {
  const ip = getClientIP(c);
  
  // Proteger con API key
  const apiKey = c.req.header('x-api-key');
  const validKey = process.env.ALERTAS_CHECK_KEY;
  
  if (!validKey || apiKey !== validKey) {
    logAudit(ip, 'CHECK_UNAUTHORIZED', false);
    return c.json({ error: "No autorizado" }, 401);
  }
  
  const gmailPass = getGmailPass();
  if (!gmailPass) return c.json({ error: "Sin Gmail config" }, 500);

  logAudit(ip, 'CHECK_START', true);
  
  const alertasActivas = db
    .query("SELECT * FROM alertas WHERE activa = 1")
    .all() as any[];

  // Limitar a 50 alertas por ejecución para evitar saturación
  const alertasLimit = alertasActivas.slice(0, 50);
  
  const now = Date.now();
  const TWELVE_HOURS = 12 * 60 * 60 * 1000;

  const provincesToCheck = [...new Set(alertasLimit.map((a) => a.provincia))].slice(0, 10);
  console.log("[ALERTAS] Provincias a verificar (max 10):", provincesToCheck);

  // Usar cache del clima - primero asegurar que hay datos
  await getClimaData();
  
  // Obtener datos climáticos del cache para cada provincia
  const datosClima: Record<string, { temp: number; humedad: number; lluvia: number }> = {};

  for (const provincia of provincesToCheck) {
    const provData = getClimaByProvincia(provincia);
    if (provData) {
      datosClima[provincia] = {
        temp: provData.temperatura ?? 0,
        humedad: provData.humedad ?? 50,
        lluvia: provData.lluvia ?? 0
      };
    } else {
      datosClima[provincia] = { temp: 0, humedad: 50, lluvia: 0 };
    }
  }

  console.log("[ALERTAS] Datos climáticos del cache:", datosClima);

  let enviados = 0;
  for (const alerta of alertasActivas) {
    const tipo = normalizarTipoAlerta(alerta.tipo || 'condiciones_optimas');
    const provData = getClimaByProvincia(alerta.provincia);
    const temp = provData?.temperatura ?? 0;
    const riesgosActivos = getRiesgosActivosDesdeProvinciaData(provData);
    
    if (alerta.last_notified_at && (now - alerta.last_notified_at < TWELVE_HOURS)) {
      continue;
    }

    const activar = activarPorTipo(tipo, riesgosActivos);
    
    if (activar) {
      console.log(`[ALERTAS] Activando alerta para ${alerta.nombre} en ${alerta.provincia} (${temp}°C)`);
      
      // Generar contexto para LLM
      const contexto = await obtenerContextoAlerta(
        alerta.provincia,
        alerta.variedad,
        alerta.fenologia,
        alerta.nombre,
        tipo
      );

      let emailHtml: string | null = null;
      let emailSubject = `🔥 ALERTA: ${alerta.provincia} a ${temp.toFixed(1)}°C`;
      let llmUsed = false;

      // Intentar generar email con LLM
      if (contexto) {
        console.log("[ALERTAS] Generando email de alerta con LLM...");
        emailHtml = await generarEmailConLLM(contexto, "alerta");
        if (emailHtml) {
          llmUsed = true;
          console.log("[ALERTAS] Email de alerta personalizado generado con LLM");
        }
      }

      // Fallback al template tradicional
      if (!emailHtml) {
        console.log("[ALERTAS] Usando template tradicional de alerta (fallback)");
        const icon = tipo === 'helada' ? '❄️' : tipo === 'inundacion' ? '🌊' : tipo === 'mosca' ? '🪰' : tipo === 'polilla' ? '🦋' : tipo === 'repilo' ? '🍂' : tipo === 'xylella' ? '🚨' : tipo === 'hongos_criticos' ? '🍄' : '🔥';
        const titulo = `ALERTA ${tipo.replaceAll('_', ' ').toUpperCase()}`;
        const consejos = CONSEJOS[tipo] || [];
        
        emailHtml = `<p>Hola <strong>${alerta.nombre}</strong>,</p>
<p><strong>${icon} ${titulo}</strong></p>
<p>Tu provincia <strong>${alerta.provincia}</strong> ha alcanzado los <strong>${temp.toFixed(1)}°C</strong>.</p>
<p><strong>Riesgos activos:</strong> ${riesgosActivos.slice(0, 3).map(r => `${r.icono} ${r.titulo}`).join(' · ') || 'Sin riesgos críticos'}</p>
<p><strong>Consejos urgentes:</strong></p>
<ul>${consejos.map(c => `<li>${c}</li>`).join('') || ''}</ul>
<p>🫒 Equipo olivaξ</p>`;
      } else {
        // El LLM ya incluye la firma, no añadir nada extra
      }

      try {
        await transporter.sendMail({
          from: `olivaξ <${gmailUser}>`,
          to: alerta.email,
          subject: llmUsed ? `🚨 ALERTA URGENTE - ${alerta.provincia}: ${temp.toFixed(1)}°C` : emailSubject,
          html: emailHtml,
        });
        console.log("[ALERTAS] Alerta enviada a:", alerta.email, llmUsed ? "(con LLM)" : "(template)");
        
        db.query("UPDATE alertas SET last_notified_at = ? WHERE id = ?")
          .run(now, alerta.id);
          
        enviados++;
      } catch (e) {
        console.log("[ALERTAS] Error:", e);
      }
    }
  }

  return c.json({ ok: true, alertas: alertasActivas.length, enviados, datosClima });
});

export default alertas;
