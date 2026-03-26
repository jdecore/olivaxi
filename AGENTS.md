# olivaξ - Proyecto Documentación

## 📋 Resumen

Proyecto Astro para monitoreo climático de olivares españoles. Combina datos climáticos en tiempo real con análisis específico por variedad de olivo para ayudar a agricultores a tomar decisiones prácticas contra el cambio climático.

**Características principales:**
- Mapa de calor interactivo con riesgo personalizado por variedad
- Chatbot Consejero con IA (streaming SSE)
- Catálogo de 6 variedades de olivo con análisis climático
- Sistema de alertas personalizado por provincia y variedad
- Comparador visual de variedades

---

## 🛠️ Tecnologías del Proyecto

### Backend

| Tecnología | Descripción |
|------------|-------------|
| **Bun** | Runtime de JavaScript ultrarrápido (escrito en Zig) - 3x más rápido que Node.js |
| **Hono** | Framework web minimalista y ultrarrápido para Bun/Cloudflare Workers |
| **SQLite (bun:sqlite)** | Base de datos embebida, sin servidor, ideal para proyectos pequeños |
| **Open-Meteo API** | API gratuita de datos climáticos (no requiere API key) |
| **Groq/Gemini/OpenRouter** | LLMs para el chatbot con sistema de fallback automático |
| **Nodemailer** | Librería para envío de emails (Gmail SMTP) |

### Frontend

| Tecnología | Descripción |
|------------|-------------|
| **Astro** | Framework moderno que genera HTML estático, hydrate solo componentes interactivos |
| **React** | Librería UI para el chatbot y componentes dinámicos |
| **Leaflet** | Librería de mapas open-source (ligera vs Google Maps) |
| **CartoDB** | Tiles de mapas (Light/Dark) gratuitos para Leaflet |
| **CSS Variables** | Theme system para modo claro/oscuro |
| **ClientRouter** | Navegación SPA de Astro (transiciones suaves) |

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
│   │   ├── MapaCalor.astro      # Mapa Leaflet con riesgo automático por variedad
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
│   │   └── Layout.astro         # Layout base con CSS variables + navbar redondeada
│   ├── lib/
│   │   └── api.ts               # Funciones helper
│   └── pages/
│       ├── index.astro           # Homepage (bento grid + mapa destacado)
│       ├── conseajero.astro      # Chat (client:only="react")
│       ├── variedades.astro       # Catálogo variedades (estilo neobrutalista)
│       ├── alertas.astro         # Formulario alertas
│       └── plagas.astro          # Página de plagas
├── .env                          # Variables de entorno
└── astro.config.mjs              # Config Astro
```

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

### Rangos agronómicos por variedad (actualizado 2026-03-26)

| Variedad | Frío | Calor | Humedad alta | Sequía |
|----------|------|-------|--------------|--------|
| **Cornicabra** | -10°C | 40°C | <80% | Muy alta |
| **Picual** | -7°C | 40°C | <75% | Buena |
| **Arbequina** | -5°C | 35°C | <70% | Baja |
| **Hojiblanca** | -3°C | 38°C | <75% | Media-alta |
| **Manzanilla** | -3°C | 38°C | <70% | Baja |
| **Empeltre** | -5°C | 38°C | <75% | Muy alta |

### Base de datos SQLite

```sql
-- clima_cache: datos climáticos cacheados (TTL 6 horas)
clima_cache(id, datos JSON, cached_at)

-- alertas: usuarios registrados para alertas
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
| `/` | Homepage con bento grid, mapa (60%) + sidebar (40%), mapa destacado, top 3 riesgos |
| `/consejero` | Chat con IA (streaming SSE) |
| `/variedades` | Catálogo neobrutalista con comparador visual y filtros climáticos |
| `/alertas` | Formulario de alertas personalizado |
| `/plagas` | Información sobre plagas |

---

## 📝 Historial de Cambios Recientes

### 2026-03-26 - Sistema de riesgo automático + Mejoras UI

**Cambios implementados:**

1. ✅ **Mapa interactivo (MapaCalor.astro)**
   - Eliminado botón manual ⚠️ de riesgo
   - Colores cambian automáticamente según variedad seleccionada
   - Zoom automático a provincia cuando se selecciona en sidebar
   - Filtros: 🌡️ temperatura, 💧 humedad, 🌧️ lluvia
   - Tooltip muestra riesgo específico por variedad

2. ✅ **Backend (api/routes/clima.ts)**
   - Rangos agronámicos actualizados por variedad (basados en investigación)
   - Funciones con umbrales exactos: frío (-10°C a -3°C), calor (35°C a 40°C), humedad (70-80%)
   - Score de riesgo mejorado considerando múltiples factores

3. ✅ **Página Variedades (variedades.astro)**
   - Estilo neobrutalista con bordes negros y sombras offset
   - Filtros por 6 condiciones climáticas: 🔥 CALOR ALTO, ❄️ FRÍO, 💧 HUMEDAD ALTA, 🏜️ HUMEDAD BAJA, 🌧️ POCA LLUVIA, 📈 PRODUCCIÓN
   - Tarjetas con datos agronómicos: rangos de temperatura, resistencias, riesgos
   - Comparador visual entre variedades

4. ✅ **Navbar (Layout.astro)**
   - Estilo redondeado (border-radius: 50px)
   - Fondo blanco, borde sutil
   - Distribución simétrica con gap uniforme
   - Botón de alertas con hover suave
   - Mayor longitud (min-width: 800px)

5. ✅ **Homepage (index.astro)**
   - Nuevo mapa destacado (450px) debajo del top 3 riesgos
   - Espacios reducidos (~5% menos entre secciones)
   - Hero compactado (50vh, padding reducido)
   - Mapa en bento grid: 60% mapa + 40% sidebar

**Resultado visual:**
- Mapa cambia de colores automáticamente al seleccionar variedad
- Zoom smooth a provincia seleccionada
- UI más compacta y acercada al navbar
- Neobrutalismo en página de variedades

---

### Estados anteriores

- ✅ Build pasa correctamente (5 páginas)
- ✅ UI responsive con dark mode completo
- ✅ Sistema de alertas personalizado
- ✅ Mapa con riesgo automático por variedad
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
- Filtros: 🌡️ temperatura, 💧 humedad, 🌧️ lluvia
- Colores automáticos según variedad (sin botón manual)
- Leaflet con CartoDB dark/light tiles dinámico
- CircleMarkers con animación fadeIn
- Tooltip muestra datos climáticos + riesgo por variedad
- Zoom a provincia en evento `provincia-seleccionada`

### index.astro (Homepage)
- Hero minimalista (50vh, padding compactado)
- Bento grid: mapa (60%) + sidebar (40%)
- Sidebar: selector provincia, selector variedad, alertas en tiempo real
- Mapa destacado (450px) después del top 3
- localStorage para persistir selección de provincia/variedad

### variedades.astro
- Header neobrutalista con borde limón
- Grid de tarjetas con shadow offset
- Filtros por condiciones climáticas
- Comparador visual entre 2 variedades

---

*Documentación actualizada: 2026-03-26*