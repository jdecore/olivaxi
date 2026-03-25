import type { DatosClima } from "../routes/clima";

export interface AnalisisResultado {
  provincia: string;
  alertas: string[];
  recomendaciones: string[];
  cultivo: string;
  estres_hidrico: string;
  estres_nivel: 'alto' | 'medio' | 'bajo';
}

function evaluarTemperatura(temp: number): string[] {
  const alertas: string[] = [];
  if (temp > 42) alertas.push("Temperatura crítica: estrés térmico severo");
  else if (temp > 38) alertas.push("Temperatura alta: riesgo de estrés térmico");
  if (temp < 0) alertas.push("Temperatura de helada: riesgo para olivo");
  return alertas;
}

function evaluarHumedad(humedad: number): string[] {
  const alertas: string[] = [];
  if (humedad < 20) alertas.push("Humedad muy baja: estrés hídrico");
  else if (humedad < 40) alertas.push("Humedad baja: precaución");
  if (humedad > 85) alertas.push("Humedad alta: riesgo de enfermedades fúngicas");
  return alertas;
}

function generarRecomendaciones(temp: number, humedad: number, lluvia: number): string[] {
  const recomendaciones: string[] = [];
  
  if (temp > 35) {
    recomendaciones.push("Aumentar frecuencia de riego");
    recomendaciones.push("Evitar poda en horas de sol");
  }
  if (humedad < 30 && lluvia < 1) {
    recomendaciones.push("Iniciar programa de riego de emergencia");
  }
  if (lluvia < 0.5 && humedad < 50) {
    recomendaciones.push("Aplicar acolchado para retener humedad");
  }
  if (humedad > 80) {
    recomendaciones.push("Monitorear plagas como mosca del olivo");
    recomendaciones.push("Evitar aplicaciones foliares");
  }
  
  return recomendaciones;
}

function calcularEstresHidrico(humedad: number, lluvia: number): { nivel: 'alto' | 'medio' | 'bajo'; descripcion: string } {
  if (humedad < 30 || lluvia < 0.5) {
    return { nivel: 'alto', descripcion: 'Estrés hídrico severo' };
  } else if (humedad < 50 || lluvia < 2) {
    return { nivel: 'medio', descripcion: 'Estrés hídrico moderado' };
  } else {
    return { nivel: 'bajo', descripcion: 'Hidratación adecuada' };
  }
}

export function analizarProvincia(datos: DatosClima): AnalisisResultado {
  const alertasTemp = evaluarTemperatura(datos.temperatura);
  const alertasHum = evaluarHumedad(datos.humedad);
  
  const alertas = [...alertasTemp, ...alertasHum];
  const recomendaciones = generarRecomendaciones(datos.temperatura, datos.humedad, datos.lluvia);
  
  const estres = calcularEstresHidrico(datos.humedad, datos.lluvia);
  
  return {
    provincia: datos.provincia,
    alertas,
    recomendaciones,
    cultivo: "olivo",
    estres_hidrico: estres.descripcion,
    estres_nivel: estres.nivel,
  };
}

export function analizarTodas(data: DatosClima[]): AnalisisResultado[] {
  return data.map(analizarProvincia);
}