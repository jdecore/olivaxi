# olivaξ - Proyecto Documentación

## 📋 Resumen

Proyecto Astro para monitoreo climático de olivares españoles. Combina datos climáticos en tiempo real con análisis específico por variedad de olivo para ayudar a agricultores a tomar decisiones prácticas contra el cambio climático.

**Características principales:**
- Mapa de calor interactivo con riesgo personalizado por variedad
- Chatbot Consejero con IA (streaming SSE)
- Catálogo de 6 variedades de olivo con análisis climático
- Sistema de alertas personalizado por provincia y variedad

---

## 🏗️ Estructura del Proyecto

```
olivaxi/
├── api/                          # Backend Bun/Hono
│   ├── index.ts                  # Servidor principal (puerto 3000)
│   ├── routes/
│   │   ├── clima.ts             # GET /api/clima (datos + riesgos por variedad)
│   │   ├── chat.ts              # POST /api/chat (streaming SSE + provider)
│   │   └── alertas.ts           # POST /api/alertas (guarda variedad)
│   ├── services/
│   │   └── llmRotation.ts       # Fallback Groq/Gemini/OpenRouter
│   ├── db/
│   │   └── sqlite.ts            # Base de datos SQLite
│   └── data/
│       └── provincias.ts        # 10 provincias olivareras españolas
├── src/
│   ├── components/
│   │   ├── MapaCalor.astro      # Mapa Leaflet con filtros + riesgo variedad
│   │   ├── ChatConsejero.jsx    # Chat con streaming SSE
│   │   ├── ThemeToggle.astro    # Toggle tema claro/oscuro
│   │   ├── AlertasClimaticas.astro  # Panel de alertas
│   │   ├── AlertasPlagas.astro  # Alertas de plagas
│   │   ├── AnalisisOlivar.astro # Análisis por provincia
│   │   ├── ComparadorVariedades.astro # Comparador visual
│   │   └── RankingRiesgo.astro   # Top 3 provincias en riesgo
│   ├── data/
│   │   └── variedades.json      # 6 variedades con datos climáticos
│   ├── layouts/
│   │   └── Layout.astro         # Layout base con CSS variables
│   ├── lib/
│   │   └── api.ts               # Funciones helper
│   └── pages/
│       ├── index.astro           # Homepage (bento grid)
│       ├── conseajero.astro      # Chat (client:only="react")
│       ├── variedades.astro       # Catálogo variedades
│       ├── alertas.astro         # Formulario alertas
│       └── plagas.astro          # Página de plagas
├── .env                          # Variables de entorno
└── astro.config.mjs              # Config Astro
```

---

## 🛠️ Tecnologías

| Capa | Tecnología |
|------|-------------|
| Frontend | Astro, React, SolidJS (solo Chat) |
| Backend | Bun, Hono |
| Base de datos | SQLite (bun:sqlite) |
| Mapas | Leaflet + CartoDB tiles |
| AI/LLM | Groq, Gemini, OpenRouter (streaming SSE) |
| Emails | Nodemailer + Gmail |
| Datos climáticos | Open-Meteo API |

---

## 📊 Datos del Sistema

### Datos de Open-Meteo (usados)

| Campo | Descripción | Ejemplo |
|-------|-------------|---------|
| `temperatura` | Temperatura actual °C | 32.5 |
| `humedad` | Humedad relativa % | 45 |
| `lluvia` | Precipitación mm | 0 |
| `suelo_temp` | Temp. suelo 0cm | 28.3 |
| `suelo_humedad` | Humedad suelo 0-1cm | 0.25 |
| `evapotranspiracion` | ET0 diaria mm | 4.2 |

### Datos calculados por el backend

| Campo | Descripción |
|-------|-------------|
| `riesgo` | Nivel general (alto/medio/bajo) basado en 6 condiciones |
| `estado` | Estado térmico (Frío/Fresco/Templado/Cálido/Calor/Extremo) |
| `riesgos_olivar` | 6 condiciones: frio, calor, baja_humedad, alta_humedad, baja_lluvia, alta_lluvia |
| `riesgos_plaga` | 4 plagas: mosca, polilla, xylella, repilo |
| `riesgos_variedad` | Score de riesgo (0-10) por cada una de las 6 variedades |

### Datos de variedades (variedades.json)

6 variedades con datos de resistencia climática:
- **Cornicabra**: muy-alta calor/sequía, media humedad
- **Picual**: muy-alta calor, media sequia, baja humedad
- **Arbequina**: media calor, baja sequia/humedad
- **Hojiblanca**: alta calor, media-alta sequia, media humedad
- **Manzanilla**: media-alta calor, baja sequia/humedad
- **Empeltre**: media-alta calor, muy-alta sequia, media humedad

### Base de datos SQLite

```sql
-- clima_cache: datos climáticos cacheados
clima_cache(id, datos JSON, cached_at)

-- alertas: usuarios registrados
alertas(id, nombre, email, provincia, variedad, tipo, activa, last_notified_at, created_at)
```

---

## 🎨 Paleta de Colores

| Elemento | Light Mode | Dark Mode |
|----------|------------|-----------|
| Background | #F7F4EE (Sal crema) | #000000 |
| Primary text | #1C1C1C (Aceituna) | #F7F4EE |
| Muted text | #4a4a40 | #a0a095 |
| Borders | #1C1C1C | #F7F4EE |
| Accent/Limon | #D4E849 | #D4E849 |
| White surface | #FFFFFF | #1a1a1a |

### Colores de riesgo del mapa

| Nivel | Score | Color |
|-------|-------|-------|
| Óptimo | 0 | #16a34a (verde oscuro) |
| Bajo | 1-3 | #22c55e (verde) |
| Medio | 4-6 | #f59e0b (ámbar) |
| Crítico | 7+ | #ef4444 (rojo) |

---

## 🚀 Cómo ejecutar

### Frontend (Astro)
```bash
npm run dev      # Puerto 4321
npm run build   # Build producción
```

### Backend (Bun)
```bash
bun run api/index.ts   # Puerto 3000
```

### Variables de entorno (.env)
```
PUBLIC_API_URL=http://localhost:3000
GROQ_KEY=tu_key
GEMINI_KEY=tu_key
OPENROUTER_KEY=tu_key
GMAIL_USER=tu_email@gmail.com
GMAIL_APP_PASSWORD=tu_password
```

---

## 📄 API Endpoints

### GET /api/clima
Retorna array de provincias con datos completos:
```json
{
  "provincia": "Jaén",
  "lat": 37.77,
  "lon": -3.79,
  "temperatura": 32,
  "humedad": 45,
  "lluvia": 0,
  "riesgo": "medio",
  "estado": "Cálido",
  "riesgos_olivar": { "frio": {...}, "calor": {...}, ... },
  "riesgos_plaga": { "mosca": {...}, "polilla": {...}, ... },
  "riesgos_variedad": {
    "picual": { "score": 5, "nivel": "medio", "detalle": ["🔥 Calor sensible"] },
    "arbequina": { "score": 7, "nivel": "crítico", "detalle": ["🔥 Calor sensible", "🏜️ Sequía sensible"] },
    ...
  }
}
```

### POST /api/chat
Streaming SSE con chunks de texto + provider info

### POST /api/alertas
Body:
```json
{ "nombre": "...", "email": "...", "provincia": "Jaén", "variedad": "picual", "tipo": "calor_critico" }
```

---

## 🔗 Rutas del Frontend

| Ruta | Descripción |
|------|-------------|
| `/` | Homepage con mapa + selectores provincia/variedad + alertas en tiempo real |
| `/consejero` | Chat con IA (streaming SSE) |
| `/variedades` | Catálogo con comparador visual de variedades |
| `/alertas` | Formulario de alertas personalizado |
| `/plagas` | Información sobre plagas |

---

## 📝 Historial de Cambios Recientes

### 2026-03-26 - Sistema de riesgo por variedad

**Implementación completa:**

1. ✅ **Backend (api/routes/clima.ts)**
   - Nueva función `calcularScoreRiesgo()` que calcula score 0-10 basado en 4 condiciones climáticas
   - Variable `VARIEDADES_RESISTENCIAS` con resistencias de cada variedad
   - Cálculo de riesgo para las 6 variedades en cada provincia
   - Campo `riesgos_variedad` incluido en respuesta del endpoint

2. ✅ **Frontend (MapaCalor.astro)**
   - Nuevo filtro "⚠️" para mostrar riesgo por variedad
   - Función `getColorByRiesgoVariedad()` usa datos del backend directamente
   - Función `getTooltipRiesgoVariedad()` muestra score, nivel y detalle
   - Leyenda actualizada con escala de riesgo

3. ✅ **Formulario alertas (alertas.astro)**
   - Auto-relleno desde localStorage (provincia + variedad)
   - Cálculo de tipo de alerta dinámico basado en clima + variedad
   - Nuevo campo de variedad
   - Mensaje mejorado

4. ✅ **Base de datos (sqlite.ts)**
   - Añadida columna `variedad` a tabla alertas

5. ✅ **ComparadorVariedades.astro**
   - 5 barras horizontales (❄️ Frío, 🔥 Calor, 🏜️ Sequía, 💧 Humedad, 📊 Producción)
   - Comparación entre variedades

**Resultado visual:**
- Sin variedad: colores por temperatura/humedad/lluvia
- Con variedad + filtro ⚠️: colores según riesgo específico para esa variedad
  - 🟢 Verde (óptimo/bajo): score 0-3
  - 🟡 Ámbar (medio): score 4-6
  - 🔴 Rojo (crítico): score 7+

---

### Estados anteriores

- ✅ Build pasa correctamente
- ✅ UI responsive con dark mode completo
- ✅ Sistema de alertas personalizado
- ✅ Mapa con riesgo por variedad
- ⚠️ Chatbot necesita API keys reales (Groq/Gemini/OpenRouter)
- ⚠️ Alertas necesitan GMAIL_APP_PASSWORD configurado

---

## 📋 Estado Actual

### Último comando ejecutado:
```bash
npm run build  # Pasa correctamente (5 páginas)
```

### Pendientes:
- Ninguno crítico

### Mejoras futuras sugeridas:
1. Añadir pronóstico 7 días
2. Datos de viento, UV
3. Notificaciones push
4. Widget de tendencia semanal

---

## 🔧 Componentes del Mapa

### MapaCalor.astro
- Filtros: 🌡️ temperatura, 💧 humedad, 🌧️ lluvia, ⚠️ riesgo-variedad
- Leaflet con CartoDB dark/light tiles dinámico
- CircleMarkers con animación fadeIn
- Tooltip muestra datos climáticos + riesgo por variedad
- Listener para evento `variedad-seleccionada` que actualiza el mapa en tiempo real

### index.astro (Homepage)
- Hero minimalista estilo Arc
- Bento grid: mapa (60%) + sidebar (40%)
- Sidebar: selector provincia, selector variedad, alertas en tiempo real
- localStorage para persistir selección de provincia/variedad

---

*Documentación actualizada: 2026-03-26*
