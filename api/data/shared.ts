export const VARIEDADES_INFO: Record<string, any> = {
  cornicabra: { nombre: "Cornicabra", clima: { frio: "muy-alta", calor: "muy-alta", sequia: "muy-alta", humedad_alta: "media" } },
  picual: { nombre: "Picual", clima: { frio: "alta", calor: "muy-alta", sequia: "media", humedad_alta: "baja" } },
  arbequina: { nombre: "Arbequina", clima: { frio: "muy-alta", calor: "media", sequia: "baja", humedad_alta: "baja" } },
  hojiblanca: { nombre: "Hojiblanca", clima: { frio: "media", calor: "alta", sequia: "media-alta", humedad_alta: "media" } },
  manzanilla: { nombre: "Manzanilla", clima: { frio: "media", calor: "media-alta", sequia: "baja", humedad_alta: "baja" } },
  empeltre: { nombre: "Empeltre", clima: { frio: "alta", calor: "media-alta", sequia: "muy-alta", humedad_alta: "media" } }
};

export const CONSEJOS: Record<string, string[]> = {
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

export const NORMALIZAR_TIPO_ALERTA: Record<string, string> = {
  calor: 'ola_calor',
  helada: 'helada',
  sequia: 'sequia_extrema',
  humedad: 'alta_humedad',
  todas: 'todas_alertas',
  todas_las_alertas: 'todas_alertas',
  repilo_hongo: 'repilo',
  verticilosis: 'repilo',
  antracnosis: 'repilo',
};

export function normalizarTipoAlertaCompartido(tipo: string): string {
  const t = String(tipo || '').trim();
  return NORMALIZAR_TIPO_ALERTA[t] || t || 'condiciones_optimas';
}

export function activarPorTipoCompartido(tipo: string, riesgosActivos: any[]): boolean {
  const normalizado = normalizarTipoAlertaCompartido(tipo);
  const equivalencias: Record<string, string[]> = {
    ola_calor: ['ola_calor', 'calor_critico', 'suelo_caliente', 'eto_alta'],
    calor_critico: ['calor_critico', 'ola_calor', 'suelo_caliente', 'eto_alta'],
    sequia_extrema: ['sequia_extrema', 'estres_hidrico', 'suelo_seco', 'deficit_pluviometrico', 'eto_alta'],
    estres_hidrico: ['estres_hidrico', 'sequia_extrema', 'suelo_seco', 'deficit_pluviometrico', 'eto_alta'],
    alta_humedad: ['alta_humedad', 'repilo', 'repilo_hongo', 'antracnosis', 'verticilosis', 'tuberculosis', 'suelo_encharcado'],
    repilo: ['repilo', 'repilo_hongo', 'antracnosis', 'verticilosis', 'tuberculosis', 'alta_humedad'],
    inundacion: ['inundacion', 'suelo_encharcado', 'alta_humedad'],
    helada: ['helada', 'helada_critica', 'suelo_frio'],
    helada_critica: ['helada_critica', 'helada', 'suelo_frio'],
  };
  if (normalizado === 'todas_alertas') return riesgosActivos.length > 0;
  if (normalizado === 'condiciones_optimas') return riesgosActivos.length === 0;
  const candidatos = new Set(equivalencias[normalizado] || [normalizado]);
  return riesgosActivos.some(r => candidatos.has(r.tipo));
}
