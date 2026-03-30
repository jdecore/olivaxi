// Shared risk calculation functions for olive groves
// Extracted from clima.ts and alertas.ts to avoid duplication

export interface CondicionesClimaticas {
  temp: number;
  humedad: number;
  lluvia: number;
}

export interface NivelRiesgo {
  nivel: 'alto' | 'medio' | 'bajo';
  descripcion: string;
  consejo?: string;
  impacto?: string;
}

export interface ResultadoRiesgoPlaga {
  mosca: NivelRiesgo;
  polilla: NivelRiesgo;
  xylella: NivelRiesgo;
  repilo: NivelRiesgo;
}

export interface ResultadoRiesgoOlivar {
  frio: NivelRiesgo;
  calor: NivelRiesgo;
  baja_humedad: NivelRiesgo;
  alta_humedad: NivelRiesgo;
  baja_lluvia: NivelRiesgo;
  alta_lluvia: NivelRiesgo;
}

export function calcularRiesgosPlaga({ temp, humedad, lluvia }: CondicionesClimaticas): ResultadoRiesgoPlaga {
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

export function calcularRiesgosOlivar({ temp, humedad, lluvia }: CondicionesClimaticas): ResultadoRiesgoOlivar {
  const frio = (() => {
    if (temp < 0) {
      return { nivel: 'alto', descripcion: 'Helada - riesgo de daño en flores y frutos', impacto: 'Daño en floración, pérdida de cosecha' };
    } else if (temp < 5) {
      return { nivel: 'medio', descripcion: 'Temperatura muy baja - riesgo de helada', impacto: 'Vigilar estado del olivo' };
    }
    return { nivel: 'bajo', descripcion: 'Temperatura adecuada para olivo', impacto: 'Sin riesgo de heladas' };
  })();

  const calor = (() => {
    if (temp > 40) {
      return { nivel: 'alto', descripcion: 'Calor extremo - cierre estomático', impacto: 'Estrés hídrico severo, reducción fotosíntesis' };
    } else if (temp > 35) {
      return { nivel: 'medio', descripcion: 'Temperatura alta - estrés térmico', impacto: 'Mayor demanda de agua' };
    }
    return { nivel: 'bajo', descripcion: 'Temperatura normal para olivo', impacto: 'Condiciones óptimas' };
  })();

  const baja_humedad = (() => {
    if (humedad < 20) {
      return { nivel: 'alto', descripcion: 'Humedad muy baja - estrés hídrico severo', impacto: 'Sequía, limitación de crecimiento' };
    } else if (humedad < 35) {
      return { nivel: 'medio', descripcion: 'Humedad baja - precaución', impacto: 'Aumentar riego' };
    }
    return { nivel: 'bajo', descripcion: 'Humedad adecuada', impacto: 'Sin riesgo' };
  })();

  const alta_humedad = (() => {
    if (humedad > 85) {
      return { nivel: 'alto', descripcion: 'Humedad muy alta - riesgo de enfermedades', impacto: 'Fungal: repilo, verticilosis' };
    } else if (humedad > 75) {
      return { nivel: 'medio', descripcion: 'Humedad elevada - vigilancia', impacto: 'Monitorear enfermedades' };
    }
    return { nivel: 'bajo', descripcion: 'Humedad normal', impacto: 'Sin riesgo' };
  })();

  const baja_lluvia = (() => {
    if (lluvia < 0.5) {
      return { nivel: 'alto', descripcion: 'Sequía severa - reducción producción hasta 20%', impacto: 'Reducción rendimiento aceituna' };
    } else if (lluvia < 2) {
      return { nivel: 'medio', descripcion: 'Lluvia baja - monitorear riego', impacto: 'Posible déficit hídrico' };
    }
    return { nivel: 'bajo', descripcion: 'Precipitación adecuada', impacto: 'Sin riesgo' };
  })();

  const alta_lluvia = (() => {
    if (lluvia > 20) {
      return { nivel: 'alto', descripcion: 'Lluvia intensa - riesgo de inundación', impacto: 'Asfixia radicular, erosión suelo' };
    } else if (lluvia > 10) {
      return { nivel: 'medio', descripcion: 'Lluvia moderada - vigilancia', impacto: 'Posible encharcamiento' };
    }
    return { nivel: 'bajo', descripcion: 'Precipitación normal', impacto: 'Sin riesgo' };
  })();

  return { frio, calor, baja_humedad, alta_humedad, baja_lluvia, alta_lluvia };
}

// Helper to get the highest risk level from a risks object
export function getHighestRisk(riesgos: Record<string, { nivel: string }>): string {
  const priority: Record<string, number> = { 'alto': 3, 'medio': 2, 'bajo': 1 };
  let highest = 'bajo';
  for (const r of Object.values(riesgos)) {
    if ((priority[r.nivel] || 0) > (priority[highest] || 0)) {
      highest = r.nivel;
    }
  }
  return highest;
}

// Helper to calculate risk score (0-10) for variety comparison
export function calcularScoreRiesgo(riesgosOlivar: ResultadoRiesgoOlivar, riesgosPlaga: ResultadoRiesgoPlaga): number {
  let score = 0;
  
  // Olivar risks (weight: 60%)
  const olivarScores = [
    riesgosOlivar.frio.nivel === 'alto' ? 2 : riesgosOlivar.frio.nivel === 'medio' ? 1 : 0,
    riesgosOlivar.calor.nivel === 'alto' ? 2 : riesgosOlivar.calor.nivel === 'medio' ? 1 : 0,
    riesgosOlivar.baja_humedad.nivel === 'alto' ? 2 : riesgosOlivar.baja_humedad.nivel === 'medio' ? 1 : 0,
    riesgosOlivar.alta_humedad.nivel === 'alto' ? 2 : riesgosOlivar.alta_humedad.nivel === 'medio' ? 1 : 0,
  ];
  score += (olivarScores.reduce((a, b) => a + b, 0) / 4) * 6;
  
  // Plaga risks (weight: 40%)
  const plagaScores = [
    riesgosPlaga.mosca.nivel === 'alto' ? 3 : riesgosPlaga.mosca.nivel === 'medio' ? 1.5 : 0,
    riesgosPlaga.polilla.nivel === 'alto' ? 3 : riesgosPlaga.polilla.nivel === 'medio' ? 1.5 : 0,
    riesgosPlaga.repilo.nivel === 'alto' ? 3 : riesgosPlaga.repilo.nivel === 'medio' ? 1.5 : 0,
  ];
  score += (plagaScores.reduce((a, b) => a + b, 0) / 3) * 4;
  
  return Math.min(10, Math.round(score));
}