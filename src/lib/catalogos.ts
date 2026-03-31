export const PLAGAS_CATALOGO = [
  { id: 'mosca', nombre: 'Mosca del olivo', icono: '🪰', condiciones: ['Altas Temperaturas', 'Baja Lluvia (Sequía)'], tratamiento: 'Trampas masivas McPhail (70-100/ha); cebo proteico parcheo; insecticidas si >7% frutos picados. Con +3°C alarga actividad hasta noviembre.', severidad: 'alta' },
  { id: 'polilla', nombre: 'Polilla del olivo (Prays)', icono: '🦋', condiciones: ['Bajas Temperaturas', 'Altas Temperaturas', 'Baja Humedad', 'Baja Lluvia'], tratamiento: 'Bacillus thuringiensis en floración; aceites minerales; monitoreo con trampas. Más ciclos por temperaturas cálidas.', severidad: 'media' },
  { id: 'xylella', nombre: 'Xylella fastidiosa', icono: '🚨', condiciones: ['Altas Temperaturas', 'Baja Humedad'], tratamiento: 'Control de vectores (Philaenus), eliminación de focos y notificación fitosanitaria obligatoria.', severidad: 'alta' },
  { id: 'tuberculosis', nombre: 'Tuberculosis del olivo', icono: '🦠', condiciones: ['Bajas Temperaturas', 'Alta Humedad'], tratamiento: 'Aplicar cobre en heridas; mejorar drenaje y poda sanitaria. Tratar inmediatamente después de heladas.', severidad: 'media' },
  { id: 'repilo', nombre: 'Repilo', icono: '🍂', condiciones: ['Alta Humedad'], tratamiento: 'Cobre (máx 4kg/ha/año); bicarbonatos (500-1000g/hl); tratamientos preventivos post-invierno.', severidad: 'alta' },
  { id: 'barrenillo', nombre: 'Barrenillo', icono: '🪲', condiciones: ['Altas Temperaturas', 'Baja Humedad', 'Estrés hídrico'], tratamiento: 'Retirar leña de poda, trampeo de madera cebo y evitar debilidad del árbol por sequía.', severidad: 'media' },
  { id: 'cochinilla', nombre: 'Cochinilla', icono: '🐛', condiciones: ['Altas Temperaturas', 'Baja Humedad'], tratamiento: 'Aceites minerales; insecticidas sistémicos; mejorar ventilación. Por estrés hídrico aumenta.', severidad: 'baja' },
  { id: 'phytophthora', nombre: 'Phytophthora', icono: '🍄', condiciones: ['Alta Humedad', 'Alta Lluvia'], tratamiento: 'Mejorar drenaje; fungicidas específicos (metalaxyl, fosetil-Al); evitar encharcamiento.', severidad: 'alta' },
  { id: 'lepra', nombre: 'Lepra', icono: '🤕', condiciones: ['Bajas Temperaturas', 'Alta Humedad'], tratamiento: 'Cobre en heridas; poda sanitaria; eliminar restos vegetales afectados.', severidad: 'media' },
  { id: 'verticillium', nombre: 'Verticillium', icono: '🥀', condiciones: ['Alta Lluvia'], tratamiento: 'Rotación de cultivos; suelo solarizado; evitar heridas en raíces; variedades resistentes.', severidad: 'alta' }
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
