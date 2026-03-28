import { Hono } from "hono";
import nodemailer from "nodemailer";
import db from "../db/sqlite";
import { PROVINCIAS } from "../data/provincias";
import { getClimaByProvincia, getClimaData } from "./clima";

const gmailUser = process.env.GMAIL_USER || "jdenriquezr@gmail.com";

const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: gmailUser,
    pass: process.env.GMAIL_APP_PASSWORD,
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

RIESGOS CLIMÁTICOS ACTIVOS:
- Frío: ${contexto.riesgos_olivar.frio.nivel} - ${contexto.riesgos_olivar.frio.descripcion}
- Calor: ${contexto.riesgos_olivar.calor.nivel} - ${contexto.riesgos_olivar.calor.descripcion}
- Humedad baja: ${contexto.riesgos_olivar.baja_humedad.nivel} - ${contexto.riesgos_olivar.baja_humedad.descripcion}
- Humedad alta: ${contexto.riesgos_olivar.alta_humedad.nivel} - ${contexto.riesgos_olivar.alta_humedad.descripcion}

RIESGOS DE PLAGAS ASOCIADOS:
- Mosca del olivo: ${contexto.riesgos_plaga.mosca.nivel}
- Polilla: ${contexto.riesgos_plaga.polilla.nivel}
- Repilo: ${contexto.riesgos_plaga.repilo.nivel}

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

// ============================================
// Funciones de cálculo de riesgos (para contexto LLM)
// ============================================
function calcularRiesgosPlaga(temp: number, humedad: number, lluvia: number) {
  const mosca = (() => {
    const tempAlto = temp >= 18 && temp <= 32;
    const humidityAlto = humedad > 60;
    const tempMedio = temp >= 15 && temp <= 35;
    const humidityMedio = humedad > 40;
    const tempBajo = temp > 35 || temp < 10;
    const humedadBajo = humedad < 30;

    if (tempAlto && humidityAlto) {
      return { nivel: 'alto', descripcion: 'Condiciones perfectas para reproducción de mosca' };
    } else if (tempMedio && humidityMedio) {
      return { nivel: 'medio', descripcion: 'Vigilar aparición de mosca del olivo' };
    } else if (tempBajo || humedadBajo) {
      return { nivel: 'bajo', descripcion: 'Riesgo bajo de mosca del olivo' };
    }
    return { nivel: 'bajo', descripcion: 'Riesgo bajo de mosca del olivo' };
  })();

  const polilla = (() => {
    const tempOptimo = temp >= 15 && temp <= 25;
    const lluviaBaja = lluvia < 5;
    const tempMedio = temp >= 10 && temp <= 30;
    const tempBajo = temp < 8 || temp > 32;

    if (tempOptimo && lluviaBaja) {
      return { nivel: 'alto', descripcion: 'Condiciones favorables para polilla' };
    } else if (tempMedio) {
      return { nivel: 'medio', descripcion: 'Monitorear trampas de polilla' };
    } else if (tempBajo) {
      return { nivel: 'bajo', descripcion: 'Riesgo bajo de polilla' };
    }
    return { nivel: 'bajo', descripcion: 'Riesgo bajo de polilla' };
  })();

  const xylella = (() => {
    const alto = temp > 20 && humedad > 70 && lluvia > 10;
    const medio = temp > 15 && humedad > 50;

    if (alto) {
      return { nivel: 'alto', descripcion: 'Condiciones de riesgo - Revisar vectores' };
    } else if (medio) {
      return { nivel: 'medio', descripcion: 'Condiciones moderadas - Vigilancia preventiva' };
    }
    return { nivel: 'bajo', descripcion: 'Riesgo bajo de Xylella' };
  })();

  const repilo = (() => {
    const alto = lluvia > 5 && temp >= 10 && temp <= 20;
    const medio = humedad > 70 && temp < 25;

    if (alto) {
      return { nivel: 'alto', descripcion: 'Condiciones ideales para repilo - Aplicar fungicida' };
    } else if (medio) {
      return { nivel: 'medio', descripcion: 'Humedad elevada - Vigilar manchas en hojas' };
    }
    return { nivel: 'bajo', descripcion: 'Riesgo bajo de repilo' };
  })();

  return { mosca, polilla, xylella, repilo };
}

function calcularRiesgosOlivar(temp: number, humedad: number, lluvia: number) {
  const frio = (() => {
    if (temp < 0) {
      return { nivel: 'alto', descripcion: 'Helada - riesgo de daño en flores y frutos' };
    } else if (temp < 5) {
      return { nivel: 'medio', descripcion: 'Temperatura muy baja - riesgo de helada' };
    }
    return { nivel: 'bajo', descripcion: 'Temperatura adecuada para olivo' };
  })();

  const calor = (() => {
    if (temp > 40) {
      return { nivel: 'alto', descripcion: 'Calor extremo - cierre estomático' };
    } else if (temp > 35) {
      return { nivel: 'medio', descripcion: 'Temperatura alta - estrés térmico' };
    }
    return { nivel: 'bajo', descripcion: 'Temperatura normal para olivo' };
  })();

  const baja_humedad = (() => {
    if (humedad < 20) {
      return { nivel: 'alto', descripcion: 'Humedad muy baja - estrés hídrico severo' };
    } else if (humedad < 35) {
      return { nivel: 'medio', descripcion: 'Humedad baja - precaución' };
    }
    return { nivel: 'bajo', descripcion: 'Humedad adecuada' };
  })();

  const alta_humedad = (() => {
    if (humedad > 85) {
      return { nivel: 'alto', descripcion: 'Humedad muy alta - riesgo de enfermedades' };
    } else if (humedad > 75) {
      return { nivel: 'medio', descripcion: 'Humedad elevada - vigilancia' };
    }
    return { nivel: 'bajo', descripcion: 'Humedad normal' };
  })();

  const baja_lluvia = (() => {
    if (lluvia < 0.5) {
      return { nivel: 'alto', descripcion: 'Sequía severa' };
    } else if (lluvia < 2) {
      return { nivel: 'medio', descripcion: 'Lluvia baja - monitorear riego' };
    }
    return { nivel: 'bajo', descripcion: 'Precipitación adecuada' };
  })();

  const alta_lluvia = (() => {
    if (lluvia > 20) {
      return { nivel: 'alto', descripcion: 'Lluvia intensa - riesgo de inundación' };
    } else if (lluvia > 10) {
      return { nivel: 'medio', descripcion: 'Lluvia moderada - vigilancia' };
    }
    return { nivel: 'bajo', descripcion: 'Precipitación normal' };
  })();

  return { frio, calor, baja_humedad, alta_humedad, baja_lluvia, alta_lluvia };
}

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
      riesgos_olivar: calcularRiesgosOlivar(20, 50, 0),
      riesgos_plaga: calcularRiesgosPlaga(20, 50, 0),
      faseFenologica: fenologia || 'No especificada'
    };
  }

  const temp = provinciaData.temperatura ?? 20;
  const humedad = provinciaData.humedad ?? 50;
  const lluvia = provinciaData.lluvia ?? 0;

  const riesgos_olivar = calcularRiesgosOlivar(temp, humedad, lluvia);
  const riesgos_plaga = calcularRiesgosPlaga(temp, humedad, lluvia);

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
    riesgos_olivar,
    riesgos_plaga,
    faseFenologica
  };
}

// ============================================
// Sanitización
// ====================================
const sanitizeStr = (str: string, maxLen = 100): string => {
  return str.replace(/[<>'";]/g, '').trim().slice(0, maxLen);
};

const isValidEmail = (email: string): boolean => {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
};

// ============================================
// ENDPOINTS
// ============================================
const alertas = new Hono();

alertas.post("/", async (c) => {
  const body = await c.req.json().catch(() => ({}));
  
  const nombreRaw = body.nombre || '';
  const emailRaw = body.email || '';
  const provinciaRaw = body.provincia || '';
  const variedadRaw = body.variedad || '';
  const tipoRaw = body.tipo || 'condiciones_optimas';
  const fenologiaRaw = body.fenologia || '';

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
      // Obtener contexto para LLM
      const contexto = await obtenerContextoAlerta(provincia, variedad, fenologia, nombre, tipo);
      let emailHtml: string | null = null;
      let emailSubject = `✅ Tu alerta está activa - ${provincia}`;
      let llmUsed = false;

      // Intentar generar email con LLM
      if (contexto) {
        console.log("[ALERTAS] Generando email con LLM...");
        emailHtml = await generarEmailConLLM(contexto, "bienvenida");
        if (emailHtml) {
          llmUsed = true;
          console.log("[ALERTAS] Email personalizado generado con LLM");
        }
      }

      // Fallback al template tradicional si LLM falla
      if (!emailHtml) {
        console.log("[ALERTAS] Usando template tradicional (fallback)");
        const varInfo = VARIEDADES_INFO[variedad];
        const consejos = CONSEJOS[tipo] || [];
        emailHtml = `<p>Hola <strong>${nombre}</strong>,</p>
<p>Tu alerta está activa en olivaξ para <strong>${provincia}</strong>.</p>
${varInfo ? `<p>Variedad: <strong>${varInfo.nombre}</strong></p>` : ''}
${fenologia ? `<p>Fase fenológica: <strong>${fenologia}</strong></p>` : ''}
<p>Te avisaremos cuando las condiciones climáticas afecten a tu cultivo de olivo.</p>
<p><strong>Consejos para condiciones actuales:</strong></p>
<ul>${consejos.map(c => `<li>${c}</li>`).join('') || '<li>✅ Sin acciones necesarias</li>'}</ul>
<p>🫒 Equipo olivaξ</p>`;
      } else {
        // Añadir footer al email generado por LLM
        emailHtml += `<p style="margin-top: 20px; font-size: 12px; color: #666;">🫒 Equipo olivaξ</p>`;
      }

      await transporter.sendMail({
        from: `olivaξ <${gmailUser}>`,
        to: email,
        subject: llmUsed ? `✅ Bienvenido a olivaξ - ${provincia}` : emailSubject,
        html: emailHtml,
      });
      console.log("[ALERTAS] Email de confirmación enviado a:", email, llmUsed ? "(con LLM)" : "(template)");
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
    const clima = datosClima[alerta.provincia] || { temp: 0, humedad: 50, lluvia: 0 };
    const tipo = alerta.tipo || 'calor';
    const temp = clima.temp;
    
    if (alerta.last_notified_at && (now - alerta.last_notified_at < TWELVE_HOURS)) {
      continue;
    }

    let activar = false;
    if (tipo === 'calor' && temp >= 38) activar = true;
    if (tipo === 'helada' && temp <= 0) activar = true;
    if (tipo === 'sequia' && temp >= 35) activar = true;
    
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
        const icon = tipo === 'calor' ? '🔥' : tipo === 'helada' ? '❄️' : '💧';
        const titulo = tipo === 'calor' ? 'ALERTA DE CALOR EXTREMO' : tipo === 'helada' ? 'ALERTA DE HELADA' : 'ALERTA DE ESTRÉS HÍDRICO';
        const consejos = CONSEJOS[tipo] || [];
        
        emailHtml = `<p>Hola <strong>${alerta.nombre}</strong>,</p>
<p><strong>${icon} ${titulo}</strong></p>
<p>Tu provincia <strong>${alerta.provincia}</strong> ha alcanzado los <strong>${temp.toFixed(1)}°C</strong>.</p>
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