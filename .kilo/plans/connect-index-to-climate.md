# Plan: Mayor Conectividad en Página de Inicio

## Objetivo
Mejorar la homepage (index.astro) para que funcione como un hub que conecta fluidamente con Agua y Suelos, el Consejero IA, y que muestre el impacto del cambio climático de forma narrativa y práctica.

---

## Mejora 1: Tarjetas Premium Mejoradas (index.astro)

### Problema actual
Las tarjetas de "Estado del suelo", "Predominante" y "Consejo del día" son simples con poco contexto.

### Cambios
- **Card Suelo**: Cambiar de botón por defecto a mini-dashboard que muestre temp_suelo, humedad_suelo, ETo, y un indicador de deficit/surplus de agua. Incluir CTA "Ver más" que lleva a /agua-suelos.
- **Card Variedad**: Mostrar el riesgo dinámico (0-10) y un resumen de los factores de riesgo. Si no hay provincia seleccionada, mostrar "Selecciona provincia para ver riesgos".
- **Card Consejo**: Cambiar a "consejo del día" basado en riesgos activos (no en consejo genérico del dashboard). Si hay riesgos altos, mostrar consejo específico sobre el riesgo principal.

### Archivos a modificar
- `src/pages/index.astro` - Cards container y lógica de `updateDashboard()`
- `src/lib/state.ts` - Nuevo método `getConsejoDelDia(riesgosActivos)`

---

## Mejora 2: Panel "Mi Olivar" Contextual (index.astro)

### Problema actual
El hero no muestra nada útil hasta que el usuario selecciona provincia manualmente.

### Cambios
- Crear un nuevo panel debajo de las tarjetas que muestre el estado consolidado de la provincia seleccionada: provincia, variedad, clima (temp/humedad/lluvia), suelo (temp/humedad/ETo), plagas (niveles), riesgos activos (iconos).
- Este panel debe mantener sync bidireccional con el mapa y las otras páginas (usando OlivaxiState y eventos).
- Si no hay provincia seleccionada, mostrar mensaje invitando a seleccionar una desde el mapa.

### Elementos del panel
```
┌─────────────────────────────────────────────────────┐
│ 🌿 MI OLIVAR - [Provincia]                          │
│ 🫒 Picual · 🌡️24°C · 💧45% · 🌱18°C · ⚠️2 riesgos  │
│ [Mosca] [Calor] [Sequía] ...                        │
│ ┌─────────────┬─────────────┬─────────────────┐    │
│ 🌡️ Suelo: 18°│ 💧 Hum: 45% │ 📊 ETo: 4.2mm   │    │
│ └─────────────┴─────────────┴─────────────────┘    │
│ [Chat con contexto] [Ver Agua] [Activar alertas]    │
└─────────────────────────────────────────────────────┘
```

### Archivos a modificar
- `src/pages/index.astro` - Añadir HTML del panel y estilos
- `src/lib/state.ts` - Añadir `getMiOlivarState()` que retorna todos los datos consolidados

---

## Mejora 3: Narrativa del Cambio Climático (index.astro)

### Problema actual
El site habla de "cambio climático" en el título pero no lo muestra de forma tangible.

### Cambios
- Añadir una barra/section "📈 Impacto del cambio climático" que muestre:
  - Comparación del clima actual vs promedio histórico (si hay datos en el API dashboard)
  - Tendencia de riesgos (si los datos del API incluyen esto)
  - Una línea narrativa: "Esta provincia ha experimentado [+X°C / -Ymm lluvia] respecto a la media de los últimos 30 años"
- Esto debería venir del endpoint `/api/clima/dashboard` si se añade el campo `comparacionHistorica`.

### Cambios en backend
- `api/index.ts` - En `/api/clima/dashboard`, calcular o retornar datos históricos si están disponibles. Si no, se puede construir una narrativa basada en los datos actuales vs umbrales históricos por provincia.

### Archivos a modificar
- `src/pages/index.astro` - Nueva barra/narrativa en el hero o como section separada
- `api/index.ts` - Añadir `comparacionHistorica` al response del dashboard (si hay datos)

---

## Mejora 4: Cache Compartido y Sincronización

### Problema actual
Cada página hace sus propias llamadas al API. No hay cache compartido entre páginas, lo que causa:
- Latencia al navegar entre páginas
- Posibles inconsistencias de datos
- Llamadas innecesarias a Open-Meteo

### Cambios
- Crear `src/lib/cache.ts` que:
  - Usa localStorage para cachear respuestas del API (`olivaxi_cache`)
  - Cada entrada tiene TTL (6 horas para clima, 5 min para otros)
  - Expone métodos: `getCached(key)`, `setCached(key, data, ttl)`
- Modificar `ChatConsejero.jsx` para usar este cache en lugar del cache local en memoria.
- Modificar `index.astro` para usar este cache.
- Modificar `agua-suelos.astro` para usar este cache.

### Archivos a crear
- `src/lib/cache.ts` - Cache compartido basado en localStorage

### Archivos a modificar
- `src/components/ChatConsejero.jsx` - Usar cache.ts en lugar del cache en memoria
- `src/pages/index.astro` - Usar cache.ts
- `src/pages/agua-suelos.astro` - Usar cache.ts

---

## Resumen de Archivos

| Archivo | Acción | Descripción |
|---------|--------|-------------|
| `src/pages/index.astro` | Modificar | Cards mejoradas, panel Mi Olivar, narrativa climática |
| `src/lib/state.ts` | Modificar | `getMiOlivarState()`, `getConsejoDelDia()` |
| `api/index.ts` | Modificar | Añadir `comparacionHistorica` al dashboard |
| `src/lib/cache.ts` | Crear | Cache compartido localStorage |
| `src/components/ChatConsejero.jsx` | Modificar | Usar cache.ts |

---

## Orden de Implementación

1. **cache.ts** - Base para todo lo demás
2. **state.ts** - Añadir nuevos métodos
3. **api/index.ts** - Añadir comparacionHistorica
4. **index.astro** - Cards mejoradas + panel Mi Olivar + narrativa
5. **ChatConsejero.jsx** - Usar cache.ts

---

## Estimación

- 5 archivos modificados
- 1 archivo creado
- ~200-300 líneas de código nuevas
- Baja audiencia (index es la homepage)