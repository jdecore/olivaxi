export const VARIEDADES = {
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

export const VARIEDADES_LISTA = Object.entries(VARIEDADES).map(([key, val]) => ({
  id: key,
  nombre: val.nombre,
  ...val
}));

export const ICONOS_ALERTAS: Record<string, { icon: string; label: string }> = {
  ola_calor: { icon: "🔥", label: "Ola de calor extrema" },
  calor_critico: { icon: "🔥", label: "Calor crítico para tu variedad" },
  helada: { icon: "❄️", label: "Helada" },
  helada_critica: { icon: "❄️", label: "Helada crítica para tu variedad" },
  estres_hidrico: { icon: "🏜️", label: "Estrés hídrico" },
  sequia_severa: { icon: "🏜️", label: "Sequía severa para tu variedad" },
  sequia_extrema: { icon: "🏜️", label: "Sequía extrema" },
  alta_humedad: { icon: "🦠", label: "Alta humedad - vigilancia de hongos" },
  hongos_criticos: { icon: "🦠", label: "Riesgo hongos crítico para tu variedad" },
  inundacion: { icon: "🌊", label: "Inundación" },
  mosca: { icon: "🦟", label: "Mosca del olivo activa" },
  polilla: { icon: "🦋", label: "Polilla del olivo activa" },
  xylella: { icon: "🦠", label: "Xylella fastidiosa - Riesgo crítico" },
  repilo: { icon: "🍄", label: "Repilo activo" },
  condiciones_optimas: { icon: "✅", label: "Condiciones óptimas" }
};

export const PLAGAS_INFO = [
  { key: 'mosca', nombre: 'Mosca del olivo', icono: '🦟' },
  { key: 'polilla', nombre: 'Polilla', icono: '🦋' },
  { key: 'xylella', nombre: 'Xylella fastidiosa', icono: '🦠' },
  { key: 'repilo', nombre: 'Repilo', icono: '🍄' }
];
