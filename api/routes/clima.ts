import { Hono } from "hono";
import db from "../db/sqlite";
import { PROVINCIAS } from "../data/provincias";

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
}

const CACHE_TTL = 6 * 60 * 60 * 1000;

function calcularRiesgo(temp: number, humedad: number, lluvia: number): string {
  if (temp > 38 || (temp > 32 && humedad < 20)) {
    return "alto";
  }
  if (temp > 30 || (temp > 25 && humedad < 30 && lluvia === 0)) {
    return "medio";
  }
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

function calcularRiesgosPlaga(temp: number, humedad: number, lluvia: number) {
  const mosca = (() => {
    const tempAlto = temp >= 18 && temp <= 32;
    const humidityAlto = humedad > 60;
    const tempMedio = temp >= 15 && temp <= 35;
    const humidityMedio = humedad > 40;
    const tempBajo = temp > 35 || temp < 10;
    const humedadBajo = humedad < 30;

    if (tempAlto && humidityAlto) {
      return { nivel: 'alto', descripcion: 'Condiciones perfectas para reproducción de mosca', consejo: 'Acción inmediata recomendada' };
    } else if (tempMedio && humidityMedio) {
      return { nivel: 'medio', descripcion: 'Vigilar aparición de mosca del olivo', consejo: 'Monitoreo preventivo' };
    } else if (tempBajo || humedadBajo) {
      return { nivel: 'bajo', descripcion: 'Riesgo bajo de mosca del olivo', consejo: 'Sin acción necesaria' };
    }
    return { nivel: 'bajo', descripcion: 'Riesgo bajo de mosca del olivo', consejo: 'Sin acción necesaria' };
  })();

  const polilla = (() => {
    const tempOptimo = temp >= 15 && temp <= 25;
    const lluviaBaja = lluvia < 5;
    const tempMedio = temp >= 10 && temp <= 30;
    const tempBajo = temp < 8 || temp > 32;

    if (tempOptimo && lluviaBaja) {
      return { nivel: 'alto', descripcion: 'Condiciones favorables para polilla', consejo: 'Acción inmediata recomendada' };
    } else if (tempMedio) {
      return { nivel: 'medio', descripcion: 'Monitorear trampas de polilla', consejo: 'Monitoreo preventivo' };
    } else if (tempBajo) {
      return { nivel: 'bajo', descripcion: 'Riesgo bajo de polilla', consejo: 'Sin acción necesaria' };
    }
    return { nivel: 'bajo', descripcion: 'Riesgo bajo de polilla', consejo: 'Sin acción necesaria' };
  })();

  const xylella = (() => {
    const alto = temp > 20 && humedad > 70 && lluvia > 10;
    const medio = temp > 15 && humedad > 50;

    if (alto) {
      return { nivel: 'alto', descripcion: '⚠️ Condiciones de riesgo - Revisar vectores', consejo: 'Acción inmediata recomendada' };
    } else if (medio) {
      return { nivel: 'medio', descripcion: 'Condiciones moderadas - Vigilancia preventiva', consejo: 'Monitoreo preventivo' };
    }
    return { nivel: 'bajo', descripcion: 'Riesgo bajo de Xylella', consejo: 'Sin acción necesaria' };
  })();

  const repilo = (() => {
    const alto = lluvia > 5 && temp >= 10 && temp <= 20;
    const medio = humedad > 70 && temp < 25;

    if (alto) {
      return { nivel: 'alto', descripcion: 'Condiciones ideales para repilo - Aplicar fungicida', consejo: 'Acción inmediata recomendada' };
    } else if (medio) {
      return { nivel: 'medio', descripcion: 'Humedad elevada - Vigilar manchas en hojas', consejo: 'Monitoreo preventivo' };
    }
    return { nivel: 'bajo', descripcion: 'Riesgo bajo de repilo', consejo: 'Sin acción necesaria' };
  })();

  return { mosca, polilla, xylella, repilo };
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
        const res = await fetch(
          `https://api.open-meteo.com/v1/forecast?latitude=${p.lat}&longitude=${p.lon}&current=temperature_2m,relative_humidity_2m,precipitation,soil_temperature_0cm,soil_moisture_0_to_1cm,et0_fao_evapotranspiration`
        );
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
    const riesgo = calcularRiesgo(temp, item.humedad, item.lluvia);
    const estado = getEstado(temp);
    const riesgos_plaga = calcularRiesgosPlaga(temp, item.humedad, item.lluvia);
    return {
      provincia: item.provincia.nombre,
      lat: item.provincia.lat,
      lon: item.provincia.lon,
      temperatura: temp,
      humedad: item.humedad,
      lluvia: item.lluvia,
      riesgo,
      estado,
      source: "api",
      suelo_temp: item.suelo_temp,
      suelo_humedad: item.suelo_humedad,
      evapotranspiracion: item.evapotranspiracion,
      riesgos_plaga,
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

export default clima;