export const PLAGAS_CATALOGO = [
  { id: 'mosca', nombre: 'Mosca del olivo', icono: '🪰', condiciones: ['Altas Temperaturas', 'Baja Lluvia (Sequía)'], tratamiento: '🪤 Trap+cebo: 70-100 trampas McPhail por hectare\n🍯 Cebo: Aplica cebo proteico en parcheo\n💊 Insecticida: Si +7% frutos picados', severidad: 'alta' },
  { id: 'polilla', nombre: 'Polilla del olivo (Prays)', icono: '🦋', condiciones: ['Bajas Temperaturas', 'Altas Temperaturas', 'Baja Humedad', 'Baja Lluvia'], tratamiento: '🦠 Bacillus thuringiensis en floración\n🛢️ Aceites minerales como preventivo\n🔍 Monitorea con trampas para detectar picos', severidad: 'media' },
  { id: 'xylella', nombre: 'Xylella fastidiosa', icono: '🚨', condiciones: ['Altas Temperaturas', 'Baja Humedad'], tratamiento: '🦟 Controla el vector (Philaenus spumarius)\n✂️ Elimina árboles enfermos inmediatamente\n📢 Notifica a autoridades fitosanitarias', severidad: 'alta' },
  { id: 'tuberculosis', nombre: 'Tuberculosis del olivo', icono: '🦠', condiciones: ['Bajas Temperaturas', 'Alta Humedad'], tratamiento: '💉 Aplica cobre en heridas de poda\n💧 Mejora el drenaje del suelo\n✂️ Poda sanitaria + destruir restos', severidad: 'media' },
  { id: 'repilo', nombre: 'Repilo', icono: '🍂', condiciones: ['Alta Humedad'], tratamiento: '💊 Cobre: máximo 4kg/ha/año\n🧂 Bicarbonatos: 500-1000g por hectolitro\n⏰ Trata preventivamente tras el invierno', severidad: 'alta' },
  { id: 'barrenillo', nombre: 'Barrenillo', icono: '🪲', condiciones: ['Altas Temperaturas', 'Baja Humedad', 'Estrés hídrico'], tratamiento: '🪵 Retira la leña de poda del terreno\n🪤 Trampea la madera infectada\n💧 Evita que el árbol se debilite por sequía', severidad: 'media' },
  { id: 'cochinilla', nombre: 'Cochinilla', icono: '🐛', condiciones: ['Altas Temperaturas', 'Baja Humedad'], tratamiento: '🛢️ Aceites minerales para asfixiarlas\n💊 Insecticidas sistémicos si hay infestación\n🌬️ Mejora la ventilación del olivar', severidad: 'baja' },
  { id: 'phytophthora', nombre: 'Phytophthora', icono: '🍄', condiciones: ['Alta Humedad', 'Alta Lluvia'], tratamiento: '💧 Elimina el encharcamiento\n💊 Fungicidas: metalaxyl o fosetil-Al\n🚜 Mejora el drenaje antes de plantar', severidad: 'alta' },
  { id: 'lepra', nombre: 'Lepra', icono: '🤕', condiciones: ['Bajas Temperaturas', 'Alta Humedad'], tratamiento: '💉 Aplica cobre en heridas\n✂️ Poda sanitaria inmediata\n🗑️ Elimina y quema los restos afectados', severidad: 'media' },
  { id: 'verticillium', nombre: 'Verticillium', icono: '🥀', condiciones: ['Alta Lluvia'], tratamiento: '🔄 Rotación de cultivos antes de plantar\n☀️ Solariza el suelo\n✂️ Evita heridas en raíces\n🌱 Usa variedades resistentes', severidad: 'alta' }
];

export const CAMBIO_CLIMATICO_PLAGAS = [
  { plaga: 'Mosca del olivo', cambio: '+3°C alarga actividad hasta noviembre', severidad: 'alta' },
  { plaga: 'Xylella fastidiosa', cambio: 'Expansión norteña, transmitida por Philaenus spumarius', severidad: 'critica' },
  { plaga: 'Hongos oportunistas', cambio: '+60% pérdidas proyectadas con +2°C', severidad: 'alta' }
];

export const VARIEDADES_CATALOGO = [
  { id: 'cornicabra', nombre: 'Cornicabra', origen: 'Castilla-La Mancha', categoria: 'Rústica', tags: 'frio sequia', frio: -10, calor: 40, scores: { frio: 95, calor: 90, sequia: 95, prod: 75 }, riesgo: 'Vulnerable a enfermedades fúngicas con humedad persistente.' },
  { id: 'picual', nombre: 'Picual', origen: 'Jaén, Andalucía', categoria: 'Reina', tags: 'calor prod', frio: -7, calor: 40, scores: { frio: 80, calor: 85, sequia: 70, prod: 95 }, riesgo: 'Sensible a Xylella, repilo y antracnosis en ambientes húmedos.' },
  { id: 'arbequina', nombre: 'Arbequina', origen: 'Lleida, Cataluña', categoria: 'Superintensiva', tags: 'prod', frio: -5, calor: 35, scores: { frio: 70, calor: 50, sequia: 40, prod: 90 }, riesgo: 'Alta vulnerabilidad a hongos y estrés hídrico.' },
  { id: 'hojiblanca', nombre: 'Hojiblanca', origen: 'Málaga, Andalucía', categoria: 'Doble aptitud', tags: 'calor', frio: -3, calor: 38, scores: { frio: 55, calor: 80, sequia: 65, prod: 72 }, riesgo: 'Sensibilidad media a heladas y enfermedades fúngicas.' },
  { id: 'manzanilla', nombre: 'Manzanilla', origen: 'Sevilla, Andalucía', categoria: 'Mesa', tags: 'prod', frio: -3, calor: 38, scores: { frio: 45, calor: 65, sequia: 35, prod: 70 }, riesgo: 'Muy sensible a repilo, antracnosis y Xylella.' },
  { id: 'empeltre', nombre: 'Empeltre', origen: 'Aragón', categoria: 'Continental', tags: 'frio sequia calor', frio: -5, calor: 38, scores: { frio: 70, calor: 75, sequia: 85, prod: 65 }, riesgo: 'Media sensibilidad a hongos en ambientes húmedos.' }
];
