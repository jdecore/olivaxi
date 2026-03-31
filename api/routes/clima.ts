import { Hono } from "hono";
import db from "../db/sqlite";
import { PROVINCIAS, getDatosProvincia, getPlagasProvincia, getConsejoSuelo } from "../data/provincias";
import { calcularRiesgosPlaga, calcularRiesgosOlivar } from "../services/riesgos";
import { CONSEJOS, VARIEDADES_INFO } from "../data/shared";

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
    tuberculosis: { nivel: string; descripcion: string; consejo: string };
    barrenillo: { nivel: string; descripcion: string; consejo: string };
    cochinilla: { nivel: string; descripcion: string; consejo: string };
    phytophthora: { nivel: string; descripcion: string; consejo: string };
    lepra: { nivel: string; descripcion: string; consejo: string };
    verticillium: { nivel: string; descripcion: string; consejo: string };
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
const TEMP_MEDIA_HISTORICA_DEFAULT = 22;
const PRECIPITACION_MEDIA_DIARIA_DEFAULT = 2;

function nivelToPriority(nivel: string | undefined): number {
  if (nivel === "crítico") return 4;
  if (nivel === "alto") return 3;
  if (nivel === "medio" || nivel === "media") return 2;
  return 1;
}

function riesgoDesdeActivos(riesgosActivos: any[]): string {
  if (!Array.isArray(riesgosActivos) || riesgosActivos.length === 0) return "bajo";
  const max = riesgosActivos.reduce((acc, r) => Math.max(acc, nivelToPriority(r?.nivel)), 1);
  if (max >= 3) return "alto";
  if (max >= 2) return "medio";
  return "bajo";
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

const VARIEDADES_RESISTENCIAS: Record<string, any> = Object.entries(VARIEDADES_INFO).reduce((acc, [id, v]) => {
  const base = v?.clima || {};
  acc[id] = {
    nombre: v?.nombre || id,
    clima: {
      frio: { nivel: base.frio || "media", rango: id === 'cornicabra' ? -10 : id === 'picual' ? -7 : id === 'arbequina' ? -5 : -3 },
      calor: { nivel: base.calor || "media", rango: id === 'arbequina' ? 35 : id === 'hojiblanca' || id === 'manzanilla' || id === 'empeltre' ? 38 : 40 },
      sequia: { nivel: base.sequia || "media", rangoHumedad: id === 'cornicabra' || id === 'empeltre' ? 20 : id === 'picual' ? 30 : id === 'arbequina' || id === 'manzanilla' ? 50 : 35, rangoLluvia: id === 'cornicabra' || id === 'empeltre' ? 0.5 : id === 'picual' || id === 'hojiblanca' ? 2 : 5 },
      humedad_alta: { nivel: base.humedad_alta || "media", rango: id === 'cornicabra' ? 80 : id === 'arbequina' || id === 'manzanilla' ? 70 : 75 }
    }
  };
  return acc;
}, {} as Record<string, any>);

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
  const staleCache = cacheRow ? JSON.parse(cacheRow.datos) : null;

  if (cacheRow && cacheRow.cached_at > now - CACHE_TTL) {
    const datos = JSON.parse(cacheRow.datos);
    return datos.map((item: any) => ({ ...item, source: "cache" }));
  }

  const data = await Promise.all(
    PROVINCIAS.map(async (p) => {
      const previous = Array.isArray(staleCache)
        ? staleCache.find((row: any) => row?.provincia === p.nombre)
        : null;
      try {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 10000);
        const res = await fetch(
          `https://api.open-meteo.com/v1/forecast?latitude=${p.lat}&longitude=${p.lon}&current=temperature_2m,relative_humidity_2m,precipitation,soil_temperature_0cm,soil_moisture_0_to_1cm,et0_fao_evapotranspiration&daily=et0_fao_evapotranspiration_sum&timezone=auto`,
          { signal: controller.signal }
        );
        clearTimeout(timeout);
        const d = await res.json();
        const etoCurrent = Number(d.current?.et0_fao_evapotranspiration ?? 0);
        const etoDaily = Number(d.daily?.et0_fao_evapotranspiration_sum?.[0] ?? 0);
        const etoFallback = etoCurrent > 0 ? etoCurrent : (etoDaily > 0 ? etoDaily : 0);
        return {
          provincia: p,
          temp: d.current?.temperature_2m ?? 0,
          humedad: d.current?.relative_humidity_2m ?? 0,
          lluvia: d.current?.precipitation ?? 0,
          suelo_temp: d.current?.soil_temperature_0cm ?? 0,
          suelo_humedad: d.current?.soil_moisture_0_to_1cm ?? 0,
          evapotranspiracion: etoFallback,
        };
      } catch (error) {
        console.error("Error fetch:", error);
        if (previous) {
          return {
            provincia: p,
            temp: Number(previous.temperatura ?? 0),
            humedad: Number(previous.humedad ?? 0),
            lluvia: Number(previous.lluvia ?? 0),
            suelo_temp: Number(previous.suelo_temp ?? 0),
            suelo_humedad: Number(previous.suelo_humedad ?? 0),
            evapotranspiracion: Number(previous.evapotranspiracion ?? 0),
          };
        }
        return { provincia: p, temp: 0, humedad: 0, lluvia: 0, suelo_temp: 0, suelo_humedad: 0, evapotranspiracion: 0 };
      }
    })
  );

  const resultados = data.map((item) => {
    const temp = item.temp;
    const humedad = item.humedad;
    const lluvia = item.lluvia;
    const riesgos_olivar = calcularRiesgosOlivar({ temp, humedad, lluvia });
    const estado = getEstado(temp);
    const riesgos_plaga = calcularRiesgosPlaga({ temp, humedad, lluvia });

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
        xylella: { ...riesgos_plaga.xylella, fuente: "RAIF", nivelRAIF: riesgosProvincia.xylella || riesgos_plaga.xylella?.nivel || 'bajo' },
        tuberculosis: { ...riesgos_plaga.tuberculosis, fuente: "RAIF", nivelRAIF: riesgosProvincia.tuberculosis || riesgos_plaga.tuberculosis?.nivel || 'bajo' },
        barrenillo: { ...riesgos_plaga.barrenillo, fuente: "RAIF", nivelRAIF: riesgosProvincia.barrenillo || riesgos_plaga.barrenillo?.nivel || 'bajo' },
        cochinilla: { ...riesgos_plaga.cochinilla, fuente: "RAIF", nivelRAIF: riesgosProvincia.cochinilla || riesgos_plaga.cochinilla?.nivel || 'bajo' },
        phytophthora: { ...riesgos_plaga.phytophthora, fuente: "RAIF", nivelRAIF: riesgosProvincia.phytophthora || riesgos_plaga.phytophthora?.nivel || 'bajo' },
        lepra: { ...riesgos_plaga.lepra, fuente: "RAIF", nivelRAIF: riesgosProvincia.lepra || riesgos_plaga.lepra?.nivel || 'bajo' },
        verticillium: { ...riesgos_plaga.verticillium, fuente: "RAIF", nivelRAIF: riesgosProvincia.verticillium || riesgos_plaga.verticillium?.nivel || 'bajo' },
      })
    };

    const provData = {
      provincia: nombreProvincia,
      lat: item.provincia.lat,
      lon: item.provincia.lon,
      temperatura: temp,
      humedad,
      lluvia,
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
    const riesgosActivos = getRiesgosActivos(provData);
    const riesgo = riesgoDesdeActivos(riesgosActivos);
    return {
      ...provData,
      riesgo,
      riesgosActivos,
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
function getClimaDataCached(): DatosClima[] {
  const cacheRow = db.query("SELECT datos FROM clima_cache WHERE id = 1").get() as { datos: string } | undefined;
  if (cacheRow) {
    try {
      return JSON.parse(cacheRow.datos) as DatosClima[];
    } catch (error) {
      console.warn("[clima] Cache JSON inválido, ignorando cache:", error);
    }
  }
  return [];
}

function normalizarHumedadSuelo(humedadSuelo: number | undefined): number {
  const valor = Number(humedadSuelo ?? 0);
  if (!Number.isFinite(valor)) return 0;
  return valor <= 1 ? valor * 100 : valor;
}

function getRiesgosSueloYHongos(provData: any): any[] {
  const sueloTemp = Number(provData?.suelo_temp ?? 0);
  const sueloHumedad = normalizarHumedadSuelo(provData?.suelo_humedad);
  const eto = Number(provData?.evapotranspiracion ?? 0);
  const lluvia = Number(provData?.lluvia ?? 0);
  const temp = Number(provData?.temperatura ?? 0);
  const humedad = Number(provData?.humedad ?? 0);
  const pluviometriaAnual = Number(provData?.pluviometriaAnual ?? 0);
  const kc = 0.7;
  const necesidadRiego = eto * kc;
  const deficitRiego = Math.max(0, necesidadRiego - lluvia);
  const lluviaMediaDiaria = pluviometriaAnual > 0 ? pluviometriaAnual / 365 : 0;
  const riesgos: any[] = [];

  if (sueloHumedad < 20) riesgos.push({ tipo: 'suelo_seco', categoria: 'suelo', nivel: 'alto', titulo: 'Suelo seco', icono: '🏜️' });
  else if (sueloHumedad < 35) riesgos.push({ tipo: 'suelo_seco', categoria: 'suelo', nivel: 'medio', titulo: 'Humedad de suelo baja', icono: '💧' });

  if (sueloHumedad > 80) riesgos.push({ tipo: 'suelo_encharcado', categoria: 'suelo', nivel: 'alto', titulo: 'Suelo encharcado', icono: '🌊' });
  else if (sueloHumedad > 65) riesgos.push({ tipo: 'suelo_encharcado', categoria: 'suelo', nivel: 'medio', titulo: 'Humedad de suelo alta', icono: '🪨' });

  if (sueloTemp < 6) riesgos.push({ tipo: 'suelo_frio', categoria: 'suelo', nivel: 'alto', titulo: 'Suelo muy frío', icono: '🧊' });
  else if (sueloTemp < 10) riesgos.push({ tipo: 'suelo_frio', categoria: 'suelo', nivel: 'medio', titulo: 'Suelo frío', icono: '❄️' });

  if (sueloTemp > 32) riesgos.push({ tipo: 'suelo_caliente', categoria: 'suelo', nivel: 'alto', titulo: 'Suelo caliente', icono: '🔥' });
  else if (sueloTemp > 28) riesgos.push({ tipo: 'suelo_caliente', categoria: 'suelo', nivel: 'medio', titulo: 'Suelo templado-alto', icono: '🌡️' });

  if (eto > 6.5 || deficitRiego > 4) riesgos.push({ tipo: 'eto_alta', categoria: 'suelo', nivel: 'alto', titulo: 'ETo muy alta', icono: '☀️' });
  else if (eto > 4.5 || deficitRiego > 2) riesgos.push({ tipo: 'eto_alta', categoria: 'suelo', nivel: 'medio', titulo: 'ETo alta', icono: '📈' });

  if (lluviaMediaDiaria > 0 && lluvia < lluviaMediaDiaria * 0.25 && eto > 4) riesgos.push({ tipo: 'deficit_pluviometrico', categoria: 'suelo', nivel: 'alto', titulo: 'Déficit hídrico', icono: '📉' });
  else if (lluviaMediaDiaria > 0 && lluvia < lluviaMediaDiaria * 0.5 && eto > 3) riesgos.push({ tipo: 'deficit_pluviometrico', categoria: 'suelo', nivel: 'medio', titulo: 'Lluvia bajo media', icono: '🌧️' });

  if (humedad > 75 && lluvia > 2 && temp >= 10 && temp <= 20) riesgos.push({ tipo: 'repilo_hongo', categoria: 'hongos', nivel: lluvia > 6 ? 'alto' : 'medio', titulo: 'Repilo fúngico', icono: '🍂' });
  if (sueloHumedad > 75 && sueloTemp >= 18 && sueloTemp <= 26 && temp >= 15 && temp <= 30) riesgos.push({ tipo: 'verticilosis', categoria: 'hongos', nivel: sueloHumedad > 85 ? 'alto' : 'medio', titulo: 'Verticilosis', icono: '🍄' });
  if (humedad > 80 && temp >= 15 && temp <= 22 && lluvia > 3) riesgos.push({ tipo: 'antracnosis', categoria: 'hongos', nivel: lluvia > 8 ? 'alto' : 'medio', titulo: 'Antracnosis', icono: '🦠' });
  if (lluvia > 8 && temp < 16 && humedad > 75) riesgos.push({ tipo: 'tuberculosis', categoria: 'hongos', nivel: lluvia > 15 ? 'alto' : 'medio', titulo: 'Tuberculosis olivo', icono: '🧫' });

  return riesgos;
}

function getConsejosByRiesgos(riesgos_olivar: any, riesgos_plaga: any, riesgosActivos: any[] = []): string[] {
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

  const tiposActivos = new Set((riesgosActivos || []).map((r: any) => r.tipo));
  if (tiposActivos.has('suelo_seco') || tiposActivos.has('eto_alta')) {
    consejos.push('🚿 Ajusta riego diario según ETo y lluvia');
    consejos.push('🌅 Prioriza riego al amanecer para reducir pérdidas');
  }
  if (tiposActivos.has('suelo_encharcado')) {
    consejos.push('🕳️ Mejora drenaje y evita compactación del suelo');
  }
  if (tiposActivos.has('deficit_pluviometrico')) {
    consejos.push('📉 Mantén estrategia de riego deficitario controlado');
  }
  if (tiposActivos.has('verticilosis') || tiposActivos.has('antracnosis') || tiposActivos.has('tuberculosis')) {
    consejos.push('🍄 Refuerza vigilancia fúngica y evita heridas en poda');
    consejos.push('✂️ Desinfecta herramientas y mejora ventilación del olivar');
  }
  
  if (consejos.length === 0) {
    return CONSEJOS.condiciones_optimas;
  }
  
  return [...new Set(consejos)];
}

export function getRiesgosActivos(provData: any): any[] {
  const activos: any[] = [];
  const riesgos_olivar = provData?.riesgos_olivar || {};
  const riesgos_plaga = provData?.riesgos_plaga || {};
  
  if (riesgos_olivar?.calor?.nivel === 'alto') activos.push({ tipo: 'ola_calor', categoria: 'clima', nivel: 'alto', titulo: 'Calor extremo', icono: '🔥' });
  else if (riesgos_olivar?.calor?.nivel === 'medio') activos.push({ tipo: 'calor_critico', categoria: 'clima', nivel: 'medio', titulo: 'Calor', icono: '🌡️' });
  
  if (riesgos_olivar?.frio?.nivel === 'alto') activos.push({ tipo: 'helada', categoria: 'clima', nivel: 'alto', titulo: 'Helada', icono: '❄️' });
  else if (riesgos_olivar?.frio?.nivel === 'medio') activos.push({ tipo: 'helada_critica', categoria: 'clima', nivel: 'medio', titulo: 'Frío', icono: '🌡️' });
  
  if (riesgos_olivar?.baja_humedad?.nivel === 'alto') activos.push({ tipo: 'sequia_extrema', categoria: 'clima', nivel: 'alto', titulo: 'Sequía', icono: '🏜️' });
  else if (riesgos_olivar?.baja_humedad?.nivel === 'medio') activos.push({ tipo: 'estres_hidrico', categoria: 'clima', nivel: 'medio', titulo: 'Baja humedad', icono: '💧' });
  
  if (riesgos_olivar?.alta_humedad?.nivel === 'alto') activos.push({ tipo: 'alta_humedad', categoria: 'hongos', nivel: 'alto', titulo: 'Humedad alta', icono: '🍄' });
  else if (riesgos_olivar?.alta_humedad?.nivel === 'medio') activos.push({ tipo: 'alta_humedad', categoria: 'hongos', nivel: 'medio', titulo: 'Humedad elevada', icono: '🍄' });
  
  if (riesgos_olivar?.alta_lluvia?.nivel === 'alto') activos.push({ tipo: 'inundacion', categoria: 'clima', nivel: 'alto', titulo: 'Lluvia intensa', icono: '🌊' });
  else if (riesgos_olivar?.alta_lluvia?.nivel === 'medio') activos.push({ tipo: 'inundacion', categoria: 'clima', nivel: 'medio', titulo: 'Lluvia moderada', icono: '🌧️' });
  
  if (riesgos_plaga?.mosca?.nivel === 'alto') activos.push({ tipo: 'mosca', categoria: 'plagas', nivel: 'alto', titulo: 'Mosca', icono: '🪰' });
  else if (riesgos_plaga?.mosca?.nivel === 'medio') activos.push({ tipo: 'mosca', categoria: 'plagas', nivel: 'medio', titulo: 'Mosca', icono: '🪰' });
  
  if (riesgos_plaga?.polilla?.nivel === 'alto') activos.push({ tipo: 'polilla', categoria: 'plagas', nivel: 'alto', titulo: 'Polilla', icono: '🦋' });
  else if (riesgos_plaga?.polilla?.nivel === 'medio') activos.push({ tipo: 'polilla', categoria: 'plagas', nivel: 'medio', titulo: 'Polilla', icono: '🦋' });
  
  if (riesgos_plaga?.repilo?.nivel === 'alto') activos.push({ tipo: 'repilo', categoria: 'hongos', nivel: 'alto', titulo: 'Repilo', icono: '🍂' });
  else if (riesgos_plaga?.repilo?.nivel === 'medio') activos.push({ tipo: 'repilo', categoria: 'hongos', nivel: 'medio', titulo: 'Repilo', icono: '🍂' });
  
  if (riesgos_plaga?.xylella?.nivel === 'alto') activos.push({ tipo: 'xylella', categoria: 'plagas', nivel: 'alto', titulo: 'Xylella', icono: '🚨' });
  else if (riesgos_plaga?.xylella?.nivel === 'medio') activos.push({ tipo: 'xylella', categoria: 'plagas', nivel: 'medio', titulo: 'Xylella', icono: '🚨' });
  
  if (riesgos_plaga?.tuberculosis?.nivel === 'alto') activos.push({ tipo: 'tuberculosis', categoria: 'hongos', nivel: 'alto', titulo: 'Tuberculosis olivo', icono: '🧫' });
  else if (riesgos_plaga?.tuberculosis?.nivel === 'medio') activos.push({ tipo: 'tuberculosis', categoria: 'hongos', nivel: 'medio', titulo: 'Tuberculosis olivo', icono: '🧫' });

  if (riesgos_plaga?.barrenillo?.nivel === 'alto') activos.push({ tipo: 'barrenillo', categoria: 'plagas', nivel: 'alto', titulo: 'Barrenillo', icono: '🪲' });
  else if (riesgos_plaga?.barrenillo?.nivel === 'medio') activos.push({ tipo: 'barrenillo', categoria: 'plagas', nivel: 'medio', titulo: 'Barrenillo', icono: '🪲' });

  if (riesgos_plaga?.cochinilla?.nivel === 'alto') activos.push({ tipo: 'cochinilla', categoria: 'plagas', nivel: 'alto', titulo: 'Cochinilla', icono: '🐛' });
  else if (riesgos_plaga?.cochinilla?.nivel === 'medio') activos.push({ tipo: 'cochinilla', categoria: 'plagas', nivel: 'medio', titulo: 'Cochinilla', icono: '🐛' });

  if (riesgos_plaga?.phytophthora?.nivel === 'alto') activos.push({ tipo: 'phytophthora', categoria: 'hongos', nivel: 'alto', titulo: 'Phytophthora', icono: '🍄' });
  else if (riesgos_plaga?.phytophthora?.nivel === 'medio') activos.push({ tipo: 'phytophthora', categoria: 'hongos', nivel: 'medio', titulo: 'Phytophthora', icono: '🍄' });

  if (riesgos_plaga?.lepra?.nivel === 'alto') activos.push({ tipo: 'lepra', categoria: 'hongos', nivel: 'alto', titulo: 'Lepra', icono: '🤕' });
  else if (riesgos_plaga?.lepra?.nivel === 'medio') activos.push({ tipo: 'lepra', categoria: 'hongos', nivel: 'medio', titulo: 'Lepra', icono: '🤕' });

  if (riesgos_plaga?.verticillium?.nivel === 'alto') activos.push({ tipo: 'verticilosis', categoria: 'hongos', nivel: 'alto', titulo: 'Verticilosis', icono: '🥀' });
  else if (riesgos_plaga?.verticillium?.nivel === 'medio') activos.push({ tipo: 'verticilosis', categoria: 'hongos', nivel: 'medio', titulo: 'Verticilosis', icono: '🥀' });
  
  activos.push(...getRiesgosSueloYHongos(provData));
  const prioridad: Record<string, number> = { alto: 3, medio: 2, bajo: 1 };
  return activos.sort((a, b) => (prioridad[b.nivel] || 1) - (prioridad[a.nivel] || 1));
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
        const riesgosActivos = getRiesgosActivos(provData);
        const consejos = getConsejosByRiesgos(provData.riesgos_olivar, provData.riesgos_plaga, riesgosActivos);
        const sueloHumedadPct = normalizarHumedadSuelo(provData.suelo_humedad);
        const kc = 0.7;
        const necesidadRiego = Math.round((Number(provData.evapotranspiracion || 0) * kc) * 10) / 10;
        const deficitRiego = Math.round(Math.max(0, necesidadRiego - Number(provData.lluvia || 0)) * 10) / 10;
        const lluviaMediaDiaria = Math.round(((Number(provData.pluviometriaAnual || 0) / 365) || 0) * 10) / 10;
        
        // Calcular comparacion histórica simulada
        const tempActual = provData.temperatura;
        const tempMediaHistorica = TEMP_MEDIA_HISTORICA_DEFAULT;
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
          precipitacionMedia: PRECIPITACION_MEDIA_DIARIA_DEFAULT,
          deficitLluvia: provData.lluvia < PRECIPITACION_MEDIA_DIARIA_DEFAULT
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
            humedad: sueloHumedadPct,
            evapotranspiracion: provData.evapotranspiracion
          },
          sueloAnalitica: {
            humedadPorcentaje: sueloHumedadPct,
            kc,
            necesidadRiego,
            deficitRiego,
            lluviaMediaDiaria
          },
          provinciaInfo: {
            altitud: provData.altitud,
            pluviometriaAnual: provData.pluviometriaAnual,
            tipoSuelo: provData.tipoSuelo,
            variedadPredominante: provData.variedadPredominante,
            epocaCritica: provData.epocaCritica,
            plagasEndemicas: provData.plagasEndemicas || [],
            plagasUltimaActualizacion: getPlagasProvincia(provincia)?.ultimaActualizacion || null,
            consejosSuelo: provData.consejosSuelo || []
          },
          plagas: {
            mosca: provData.riesgos_plaga?.mosca,
            polilla: provData.riesgos_plaga?.polilla,
            repilo: provData.riesgos_plaga?.repilo,
            xylella: provData.riesgos_plaga?.xylella,
            tuberculosis: provData.riesgos_plaga?.tuberculosis,
            barrenillo: provData.riesgos_plaga?.barrenillo,
            cochinilla: provData.riesgos_plaga?.cochinilla,
            phytophthora: provData.riesgos_plaga?.phytophthora,
            lepra: provData.riesgos_plaga?.lepra,
            verticillium: provData.riesgos_plaga?.verticillium,
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
