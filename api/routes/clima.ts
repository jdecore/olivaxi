import { Hono } from "hono";
import db from "../db/sqlite";
import { PROVINCIAS, PROVINCIAS_DATA, getDatosProvincia, getPlagasProvincia, getConsejoSuelo } from "../data/provincias";
import { calcularRiesgosPlaga, calcularRiesgosOlivar } from "../services/riesgos";

export interface DatosClima {
  provincia: string;
  lat: number;
  lon: number;
  temperatura: number;
  humedad: number;
  lluvia: number;
  riesgo: string;
  estado: string;
  source: string;
  suelo_temp?: number;
  suelo_humedad?: number;
  evapotranspiracion?: number;
  riesgos_plaga?: {
    mosca: { nivel: string; descripcion: string; consejo: string };
    polilla: { nivel: string; descripcion: string; consejo: string };
    xylella: { nivel: string; descripcion: string; consejo: string };
    repilo: { nivel: string; descripcion: string; consejo: string };
  };
  riesgos_olivar?: {
    frio: { nivel: string; descripcion: string; impacto: string };
    calor: { nivel: string; descripcion: string; impacto: string };
    baja_humedad: { nivel: string; descripcion: string; impacto: string };
    alta_humedad: { nivel: string; descripcion: string; impacto: string };
    baja_lluvia: { nivel: string; descripcion: string; impacto: string };
    alta_lluvia: { nivel: string; descripcion: string; impacto: string };
  };
}

const CACHE_TTL = 6 * 60 * 60 * 1000;

function calcularRiesgo(riesgos_olivar: any): string {
  const condiciones = [
    riesgos_olivar.frio.nivel,
    riesgos_olivar.calor.nivel,
    riesgos_olivar.baja_humedad.nivel,
    riesgos_olivar.alta_humedad.nivel,
    riesgos_olivar.baja_lluvia.nivel,
    riesgos_olivar.alta_lluvia.nivel
  ];
  
  if (condiciones.includes('alto')) return 'alto';
  if (condiciones.includes('medio')) return 'medio';
  return 'bajo';
}

function getEstado(temp: number): string {
  if (temp < 10) return "Frío";
  if (temp < 20) return "Fresco";
  if (temp < 28) return "Templado";
  if (temp < 35) return "Cálido";
  if (temp < 38) return "Calor";
  return "Extremo";
}

// Use functions from ../services/riesgos.ts

const VARIEDADES_RESISTENCIAS: Record<string, any> = {
  cornicabra: { 
    nombre: "Cornicabra", 
    clima: { 
      frio: { nivel: "muy-alta", rango: -10 },
      calor: { nivel: "muy-alta", rango: 40 },
      sequia: { nivel: "muy-alta", rangoHumedad: 20, rangoLluvia: 0.5 },
      humedad_alta: { nivel: "media", rango: 80 }
    } 
  },
  picual: { 
    nombre: "Picual", 
    clima: { 
      frio: { nivel: "alta", rango: -7 },
      calor: { nivel: "muy-alta", rango: 40 },
      sequia: { nivel: "media", rangoHumedad: 30, rangoLluvia: 2 },
      humedad_alta: { nivel: "baja", rango: 75 }
    } 
  },
  arbequina: { 
    nombre: "Arbequina", 
    clima: { 
      frio: { nivel: "muy-alta", rango: -5 },
      calor: { nivel: "media", rango: 35 },
      sequia: { nivel: "baja", rangoHumedad: 50, rangoLluvia: 5 },
      humedad_alta: { nivel: "baja", rango: 70 }
    } 
  },
  hojiblanca: { 
    nombre: "Hojiblanca", 
    clima: { 
      frio: { nivel: "media", rango: -3 },
      calor: { nivel: "alta", rango: 38 },
      sequia: { nivel: "media-alta", rangoHumedad: 35, rangoLluvia: 2 },
      humedad_alta: { nivel: "media", rango: 75 }
    } 
  },
  manzanilla: { 
    nombre: "Manzanilla", 
    clima: { 
      frio: { nivel: "media", rango: -3 },
      calor: { nivel: "media-alta", rango: 38 },
      sequia: { nivel: "baja", rangoHumedad: 50, rangoLluvia: 5 },
      humedad_alta: { nivel: "baja", rango: 70 }
    } 
  },
  empeltre: { 
    nombre: "Empeltre", 
    clima: { 
      frio: { nivel: "media", rango: -5 },
      calor: { nivel: "media-alta", rango: 38 },
      sequia: { nivel: "muy-alta", rangoHumedad: 20, rangoLluvia: 0.5 },
      humedad_alta: { nivel: "media", rango: 75 }
    } 
  }
};

function calcularScoreRiesgo(temp: number, humedad: number, lluvia: number, variedadClima: any): { score: number; nivel: string; detalle: string[] } {
  if (!variedadClima) {
    return { score: 0, nivel: "óptimo", detalle: [] };
  }

  let score = 0;
  const detalle: string[] = [];

  // Calor: estrés desde 30°C si coincide con floración/cuajado, daño seria > 35°C
  const rangoCalor = variedadClima.calor?.rango || 38;
  const nivelCalor = variedadClima.calor?.nivel || 'media';
  
  if (temp > rangoCalor + 2) {
    score += 3;
    detalle.push(`🔥 Calor crítico (${temp}°C)`);
  } else if (temp > rangoCalor) {
    if (nivelCalor === 'baja') {
      score += 3;
      detalle.push(`🔥 Calor sensible (${temp}°C)`);
    } else if (nivelCalor === 'media') {
      score += 2;
      detalle.push(`🔥 Calor moderado (${temp}°C)`);
    } else {
      score += 1;
      detalle.push(`🌡️ Calor alto (${temp}°C)`);
    }
  } else if (temp > 35) {
    score += 1;
    detalle.push(`🌡️ Estrés térmico (${temp}°C)`);
  }

  // Frío: daño serio entre -3°C y -7°C, riesgo muy alto < -7°C
  const rangoFrio = variedadClima.frio?.rango ?? -7;
  const nivelFrio = variedadClima.frio?.nivel || 'media';

  if (temp < rangoFrio - 3) {
    score += 3;
    detalle.push(`❄️ Helada severa (${temp}°C)`);
  } else if (temp < rangoFrio) {
    if (nivelFrio === 'baja') {
      score += 3;
      detalle.push(`❄️ Helada sensible (${temp}°C)`);
    } else if (nivelFrio === 'media') {
      score += 2;
      detalle.push(`❄️ Frío moderado (${temp}°C)`);
    } else {
      score += 1;
      detalle.push(`🌡️ Temperatura baja (${temp}°C)`);
    }
  } else if (temp < 5) {
    score += 1;
    detalle.push(`🌡️ Temperatura fresca (${temp}°C)`);
  }

  // Sequía/Baja humedad: estrés cuando sequia prolongada + temp > 30°C
  const rangoHumedad = variedadClima.sequia?.rangoHumedad ?? 30;
  const nivelSequia = variedadClima.sequia?.nivel || 'media';

  if (humedad < rangoHumedad - 10) {
    if (nivelSequia === 'baja') {
      score += 3;
      detalle.push(`🏜️ Sequía severa (${humedad}%)`);
    } else if (nivelSequia === 'media' || nivelSequia === 'media-alta') {
      score += 2;
      detalle.push(`🏜️ Sequía moderada (${humedad}%)`);
    } else {
      score += 1;
      detalle.push(`🏜️ Baja humedad (${humedad}%)`);
    }
  } else if (humedad < rangoHumedad) {
    if (nivelSequia === 'baja') {
      score += 2;
      detalle.push(`🏜️ Estrés hídrico (${humedad}%)`);
    } else {
      score += 1;
      detalle.push(`💧 Humedad baja (${humedad}%)`);
    }
  } else if (temp > 30 && humedad < 40) {
    score += 1;
    detalle.push(`🌡️+🏜️ Calor + Sequía`);
  }

  // Lluvia baja
  const rangoLluvia = variedadClima.sequia?.rangoLluvia ?? 2;
  if (lluvia < 0.5 && lluvia > 0) {
    score += 1;
    detalle.push(`🌧️ Lluvia mínima (${lluvia}mm)`);
  }

  // Alta humedad/fungicas: problema con humedad persistente
  const rangoHumedadAlta = variedadClima.humedad_alta?.rango ?? 80;
  const nivelHumedadAlta = variedadClima.humedad_alta?.nivel || 'media';

  if (humedad > rangoHumedadAlta + 10) {
    if (nivelHumedadAlta === 'baja') {
      score += 3;
      detalle.push(`🦠 Hongos riesgo alto (${humedad}%)`);
    } else if (nivelHumedadAlta === 'media') {
      score += 2;
      detalle.push(`🦠 Humedad muy alta (${humedad}%)`);
    } else {
      score += 1;
      detalle.push(`💧 Humedad elevada (${humedad}%)`);
    }
  } else if (humedad > rangoHumedadAlta) {
    if (nivelHumedadAlta === 'baja') {
      score += 2;
      detalle.push(`🦠 Riesgo hongos (${humedad}%)`);
    } else {
      score += 1;
      detalle.push(`💧 Alta humedad (${humedad}%)`);
    }
  }

  // Lluvia alta
  if (lluvia > 20) {
    score += 2;
    detalle.push(`🌊 Lluvia intensa (${lluvia}mm)`);
  } else if (lluvia > 10) {
    score += 1;
    detalle.push(`🌧️ Lluvia moderada (${lluvia}mm)`);
  }

  score = Math.min(score, 10);

  let nivel = "óptimo";
  if (score >= 7) nivel = "crítico";
  else if (score >= 4) nivel = "medio";
  else if (score >= 1) nivel = "bajo";

  return { score, nivel, detalle };
}

export async function getClimaData() {
  const now = Date.now();
  const cacheRow = db.query("SELECT datos, cached_at FROM clima_cache WHERE id = 1").get() as { datos: string; cached_at: number } | undefined;

  if (cacheRow && cacheRow.cached_at > now - CACHE_TTL) {
    const datos = JSON.parse(cacheRow.datos);
    return datos.map((item: any) => ({ ...item, source: "cache" }));
  }

  const data = await Promise.all(
    PROVINCIAS.map(async (p) => {
      try {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 10000);
        const res = await fetch(
          `https://api.open-meteo.com/v1/forecast?latitude=${p.lat}&longitude=${p.lon}&current=temperature_2m,relative_humidity_2m,precipitation,soil_temperature_0cm,soil_moisture_0_to_1cm,et0_fao_evapotranspiration`,
          { signal: controller.signal }
        );
        clearTimeout(timeout);
        const d = await res.json();
        return {
          provincia: p,
          temp: d.current?.temperature_2m ?? 0,
          humedad: d.current?.relative_humidity_2m ?? 0,
          lluvia: d.current?.precipitation ?? 0,
          suelo_temp: d.current?.soil_temperature_0cm ?? 0,
          suelo_humedad: d.current?.soil_moisture_0_to_1cm ?? 0,
          evapotranspiracion: d.current?.et0_fao_evapotranspiration ?? 0,
        };
      } catch (error) {
        console.error("Error fetch:", error);
        return { provincia: p, temp: 0, humedad: 0, lluvia: 0, suelo_temp: 0, suelo_humedad: 0, evapotranspiracion: 0 };
      }
    })
  );

  const resultados = data.map((item) => {
    const temp = item.temp;
    const humedad = item.humedad;
    const lluvia = item.lluvia;
    const riesgos_olivar = calcularRiesgosOlivar(temp, humedad, lluvia);
    const riesgo = calcularRiesgo(riesgos_olivar);
    const estado = getEstado(temp);
    const riesgos_plaga = calcularRiesgosPlaga(temp, humedad, lluvia);

    // Calcular riesgo para cada variedad
    const riesgos_variedad: Record<string, any> = {};
    for (const [key, varData] of Object.entries(VARIEDADES_RESISTENCIAS)) {
      riesgos_variedad[key] = calcularScoreRiesgo(temp, humedad, lluvia, varData.clima);
    }

    const nombreProvincia = item.provincia.nombre;
    const datosProvincia = getDatosProvincia(nombreProvincia);
    const riesgosProvincia = getPlagasProvincia(nombreProvincia);
    const consejos = getConsejoSuelo(nombreProvincia);
    
    // Combinar riesgos genéricos con RAIF
    const riesgosPlagaCombinados = {
      ...riesgos_plaga,
      // Sobrescribir con datos RAIF si existen
      ...(riesgosProvincia && {
        polilla: { ...riesgos_plaga.polilla, fuente: "RAIF", nivelRAIF: riesgosProvincia.polilla },
        mosca: { ...riesgos_plaga.mosca, fuente: "RAIF", nivelRAIF: riesgosProvincia.mosca },
        repilo: { ...riesgos_plaga.repilo, fuente: "RAIF", nivelRAIF: riesgosProvincia.repilo },
      })
    };

    return {
      provincia: nombreProvincia,
      lat: item.provincia.lat,
      lon: item.provincia.lon,
      temperatura: temp,
      humedad,
      lluvia,
      riesgo,
      estado,
      source: "api",
      // Datos del suelo (Open-Meteo)
      suelo_temp: item.suelo_temp,
      suelo_humedad: item.suelo_humedad,
      evapotranspiracion: item.evapotranspiracion,
      // Datos provinciales estáticos
      altitud: datosProvincia?.altitud,
      pluviometriaAnual: datosProvincia?.pluviometriaAnual,
      tipoSuelo: datosProvincia?.suelo,
      variedadPredominante: datosProvincia?.variedadPredominante,
      epocaCritica: datosProvincia?.epocaCritica,
      consejosSuelo: consejos,
      // Riesgos
      riesgos_plaga: riesgosPlagaCombinados,
      riesgos_olivar,
      riesgos_variedad,
    };
  });

  db.query("INSERT OR REPLACE INTO clima_cache (id, datos, cached_at) VALUES (1, ?, ?)").run(
    JSON.stringify(resultados),
    now
  );

  return resultados;
}

const clima = new Hono();

clima.get("/", async (c) => {
  try {
    const data = await getClimaData();
    return c.json(data);
  } catch (error) {
    console.error("ERROR CLIMA:", error);
    return c.json({ error: String(error) }, 500);
  }
});

// Función para obtener clima de una provincia específica (usa cache)
export function getClimaByProvincia(provincia: string) {
  const data = getClimaDataCached();
  return data.find((p: any) => p.provincia === provincia) || null;
}

// Obtener datos climáticos sin hacer llamadas API (usa cache interno)
function getClimaDataCached() {
  const cacheRow = db.query("SELECT datos FROM clima_cache WHERE id = 1").get() as { datos: string } | undefined;
  if (cacheRow) {
    try {
      return JSON.parse(cacheRow.datos);
    } catch {}
  }
  return [];
}

// ============================================
// CONSEJOS por tipo de riesgo
// ============================================
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
  xylella: ['🚨 Notifica a autoridades', '🪓 Elimina árboles afectados', '🛡️ Medidas preventivas', '🔬 Confirma laboratorio'],
  repilo: ['🍄 Aplica fungicida', '🌳 Poda para aireación', '💧 Evita exceso de riego', '🔍 Monitorea regularmente'],
  condiciones_optimas: ['✅ Continúa con tu rutina', '📊 Monitorea regularmente', '🌳 Tu olivar está bien']
};

function getConsejosByRiesgos(riesgos_olivar: any, riesgos_plaga: any): string[] {
  const consejos: string[] = [];
  
  if (riesgos_olivar?.calor?.nivel === 'alto') {
    consejos.push(...CONSEJOS.ola_calor.slice(0, 2));
  } else if (riesgos_olivar?.calor?.nivel === 'medio') {
    consejos.push(...CONSEJOS.calor_critico.slice(0, 2));
  }
  
  if (riesgos_olivar?.frio?.nivel === 'alto') {
    consejos.push(...CONSEJOS.helada.slice(0, 2));
  }
  
  if (riesgos_olivar?.baja_humedad?.nivel === 'alto' || riesgos_olivar?.baja_lluvia?.nivel === 'alto') {
    consejos.push(...CONSEJOS.sequia_extrema.slice(0, 2));
  }
  
  if (riesgos_olivar?.alta_humedad?.nivel === 'alto') {
    consejos.push(...CONSEJOS.alta_humedad.slice(0, 2));
  }
  
  if (riesgos_olivar?.alta_lluvia?.nivel === 'alto') {
    consejos.push(...CONSEJOS.inundacion.slice(0, 2));
  }
  
  if (riesgos_plaga?.mosca?.nivel === 'alto') {
    consejos.push(...CONSEJOS.mosca.slice(0, 2));
  }
  
  if (riesgos_plaga?.polilla?.nivel === 'alto') {
    consejos.push(...CONSEJOS.polilla.slice(0, 2));
  }
  
  if (riesgos_plaga?.repilo?.nivel === 'alto') {
    consejos.push(...CONSEJOS.repilo.slice(0, 2));
  }
  
  if (consejos.length === 0) {
    return CONSEJOS.condiciones_optimas;
  }
  
  return [...new Set(consejos)];
}

function getRiesgosActivos(riesgos_olivar: any, riesgos_plaga: any): any[] {
  const activos: any[] = [];
  
  if (riesgos_olivar?.calor?.nivel === 'alto') activos.push({ tipo: 'calor', nivel: 'alto', titulo: 'Calor extremo', icono: '🔥' });
  else if (riesgos_olivar?.calor?.nivel === 'medio') activos.push({ tipo: 'calor', nivel: 'medio', titulo: 'Calor', icono: '🌡️' });
  
  if (riesgos_olivar?.frio?.nivel === 'alto') activos.push({ tipo: 'frio', nivel: 'alto', titulo: 'Helada', icono: '❄️' });
  else if (riesgos_olivar?.frio?.nivel === 'medio') activos.push({ tipo: 'frio', nivel: 'medio', titulo: 'Frío', icono: '🌡️' });
  
  if (riesgos_olivar?.baja_humedad?.nivel === 'alto') activos.push({ tipo: 'sequia', nivel: 'alto', titulo: 'Sequía', icono: '🏜️' });
  else if (riesgos_olivar?.baja_humedad?.nivel === 'medio') activos.push({ tipo: 'sequia', nivel: 'medio', titulo: 'Baja humedad', icono: '💧' });
  
  if (riesgos_olivar?.alta_humedad?.nivel === 'alto') activos.push({ tipo: 'hongos', nivel: 'alto', titulo: 'Humedad alta', icono: '🍄' });
  
  if (riesgos_olivar?.alta_lluvia?.nivel === 'alto') activos.push({ tipo: 'lluvia', nivel: 'alto', titulo: 'Lluvia intensa', icono: '🌊' });
  
  if (riesgos_plaga?.mosca?.nivel === 'alto') activos.push({ tipo: 'mosca', nivel: 'alto', titulo: 'Mosca', icono: '🪰' });
  else if (riesgos_plaga?.mosca?.nivel === 'medio') activos.push({ tipo: 'mosca', nivel: 'medio', titulo: 'Mosca', icono: '🪰' });
  
  if (riesgos_plaga?.polilla?.nivel === 'alto') activos.push({ tipo: 'polilla', nivel: 'alto', titulo: 'Polilla', icono: '🦋' });
  else if (riesgos_plaga?.polilla?.nivel === 'medio') activos.push({ tipo: 'polilla', nivel: 'medio', titulo: 'Polilla', icono: '🦋' });
  
  if (riesgos_plaga?.repilo?.nivel === 'alto') activos.push({ tipo: 'repilo', nivel: 'alto', titulo: 'Repilo', icono: '🍂' });
  else if (riesgos_plaga?.repilo?.nivel === 'medio') activos.push({ tipo: 'repilo', nivel: 'medio', titulo: 'Repilo', icono: '🍂' });
  
  if (riesgos_plaga?.xylella?.nivel === 'alto') activos.push({ tipo: 'xylella', nivel: 'alto', titulo: 'Xylella', icono: '🚨' });
  else if (riesgos_plaga?.xylella?.nivel === 'medio') activos.push({ tipo: 'xylella', nivel: 'medio', titulo: 'Xylella', icono: '🚨' });
  
  return activos;
}

// Endpoint unificado para el dashboard
clima.get("/dashboard", async (c) => {
  try {
    const provincia = c.req.query('provincia');
    const variedad = c.req.query('variedad') || '';
    
    const data = await getClimaData();
    
    if (provincia) {
      const provData = data.find((p: any) => p.provincia === provincia);
      if (provData) {
        const riesgosActivos = getRiesgosActivos(provData.riesgos_olivar, provData.riesgos_plaga);
        const consejos = getConsejosByRiesgos(provData.riesgos_olivar, provData.riesgos_plaga);
        
        // Calcular comparacion histórica simulada
        const tempActual = provData.temperatura;
        const tempMediaHistorica = 22; // Media de referencia
        const variacionTemp = tempActual - tempMediaHistorica;
        const tendencia = variacionTemp > 1 ? 'subiendo' : variacionTemp < -1 ? 'bajando' : 'estable';
        
        const comparacionHistorica = {
          temperaturaActual: tempActual,
          temperaturaMedia: tempMediaHistorica,
          variacion: Math.round(variacionTemp * 10) / 10,
          tendencia,
          mensaje: variacionTemp > 0 
            ? `+${Math.round(variacionTemp)}°C respecto a la media`
            : variacionTemp < 0 
              ? `${Math.round(variacionTemp)}°C bajo la media`
              : 'Similar a la media histórica',
          riesgoCalor: tempActual > 35,
          riesgoFrio: tempActual < 5,
          precipitacionActual: provData.lluvia,
          precipitacionMedia: 2,
          deficitLluvia: provData.lluvia < 2
        };
        
        return c.json({
          ok: true,
          provincia: provincia,
          clima: {
            temperatura: provData.temperatura,
            humedad: provData.humedad,
            lluvia: provData.lluvia,
            estado: provData.estado,
            riesgo: provData.riesgo
          },
          suelo: {
            temperatura: provData.suelo_temp,
            humedad: provData.suelo_humedad,
            evapotranspiracion: provData.evapotranspiracion
          },
          provinciaInfo: {
            altitud: provData.altitud,
            pluviometriaAnual: provData.pluviometriaAnual,
            tipoSuelo: provData.tipoSuelo,
            variedadPredominante: provData.variedadPredominante,
            epocaCritica: provData.epocaCritica,
            plagasEndemicas: provData.plagasEndemicas || [],
            consejosSuelo: provData.consejosSuelo || []
          },
          plagas: {
            mosca: provData.riesgos_plaga?.mosca,
            polilla: provData.riesgos_plaga?.polilla,
            repilo: provData.riesgos_plaga?.repilo,
            xylella: provData.riesgos_plaga?.xylella
          },
          riesgos: {
            olivar: provData.riesgos_olivar,
            variedad: variedad ? provData.riesgos_variedad?.[variedad] : null
          },
          riesgosActivos,
          consejos,
          variedadRiesgo: variedad ? provData.riesgos_variedad?.[variedad] : null,
          comparacionHistorica
        });
      }
    }
    
    return c.json({ error: "Provincia no encontrada" }, 404);
  } catch (error) {
    console.error("ERROR DASHBOARD:", error);
    return c.json({ error: String(error) }, 500);
  }
});

// Endpoint para obtener todas las provincias
clima.get("/provincias", async (c) => {
  try {
    const data = await getClimaData();
    return c.json(data.map((p: any) => ({
      provincia: p.provincia,
      lat: p.lat,
      lon: p.lon,
      temperatura: p.temperatura,
      riesgo: p.riesgo,
      variedadPredominante: p.variedadPredominante,
      tipoSuelo: p.tipoSuelo
    })));
  } catch (error) {
    return c.json({ error: String(error) }, 500);
  }
});

export default clima;