# olivaξ - Proyecto Documentación

## 📋 Resumen

Proyecto Astro para monitoreo climático de olivares españoles. Combina datos climáticos en tiempo real con análisis específico por variedad de olivo para ayudar a agricultores a tomar decisiones prácticas contra el cambio climático.

**Características principales:**
- Mapa de calor interactivo con riesgo personalizado por variedad
- Chatbot Consejero con IA (streaming SSE)
- Catálogo de 6 variedades de olivo con análisis climático
- Sistema de alertas personalizado por provincia y variedad
- Comparador visual de variedades
- Carrusel de cards premium (Mercado, Clima, Recomendación)

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
│   │   └── ComparadorVariedades.astro # Comparador visual
│   ├── layouts/
│   │   └── Layout.astro         # Layout base con CSS variables + navbar redondeada
│   ├── lib/
│   │   ├── api.ts               # Funciones helper
│   │   └── variedades.ts        # Datos compartidos de variedades
│   └── pages/
│       ├── index.astro           # Homepage (bento grid + mapa + cards premium)
│       ├── consejero.astro      # Chat (client:only="react")
│       ├── variedades.astro     # Catálogo variedades (estilo neobrutalista)
│       ├── alertas.astro        # Formulario alertas (estilo neobrutalista)
│       ├── plagas.astro         # Página de plagas
│       └── agua-suelos.astro    # Página agua y suelos
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

### Rangos agronómicos por variedad

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
| `/` | Homepage con bento grid, mapa (60%) + sidebar (40%), mapa destacado, cards premium, top 3 riesgos |
| `/consejero` | Chat con IA (streaming SSE) |
| `/variedades` | Catálogo neobrutalista con comparador visual y filtros climáticos |
| `/alertas` | Formulario de alertas personalizado (estilo neobrutalista) |
| `/plagas` | Información sobre plagas |
| `/agua-suelos` | Página de agua y suelos |

---

## 📝 Historial de Cambios Recientes

### 2026-03-27 - Optimización de código + UI

**Cambios implementados:**

1. ✅ **Código unificado**
   - Nuevo archivo `src/lib/variedades.ts` con VARIEDADES, ICONOS_ALERTAS, PLAGAS_INFO
   - Eliminado duplicación en MapaCalor.astro, alertas.astro
   - Cálculos solo en backend, frontend solo renderiza

2. ✅ **Eliminación de código muerto**
   - Eliminados componentes sin usar: AlertasClimaticas.astro, AlertasPlagas.astro, AnalisisOlivar.astro, RankingRiesgo.astro
   - Eliminado archivo sin usar: src/data/variedades.json
   - Eliminado CSS sin usar: ThemeToggle.module.css

3. ✅ **Cards premium (carrusel)**
   - 3 cards: MERCADO, CLIMA, RECOMENDACIÓN
   - Diseño estilo carta con bordes y sombras
   - Carrusel horizontal con flechas de navegación
   - Dots indicadores

4. ✅ **Mapa más alto**
   - Aumentado a 580px para igualar panel de alertas
   - Responsive: 350px tablet, 280px móvil

5. ✅ **Formulario alertas neobrutalista**
   - Bordes cuadrados, border negro 3px
   - Sombra offset (6px 6px 0 #1C1C1C)
   - Botón con efecto hover
   - Labels en mayúsculas

6. ✅ **Espacios reducidos**
   - Hero: padding y min-height reducidos
   - Bento grid: gap y margin reducidos

7. ✅ **Optimización móvil completa**
   - Homepage: mapa adaptativo, cards carrusel
   - Alertas: formulario responsive
   - Variedades: grid 1 columna, filtros compactos

---

### 2026-03-26 - Sistema de riesgo automático

1. ✅ **Backend (api/routes/clima.ts)**
   - Rangos agronómicos actualizados por variedad (basados en investigación)
   - Funciones con umbrales exactos: frío (-10°C a -3°C), calor (35°C a 40°C), humedad (70-80%)

2. ✅ **Frontend (MapaCalor.astro)**
   - Eliminado botón manual ⚠️ de riesgo
   - Colores cambian automáticamente según variedad seleccionada
   - Zoom automático a provincia

3. ✅ **Navbar**
   - Estilo redondeado (border-radius: 50px)
   - Fondo blanco, distribución simétrica

---

## 📋 Estado Actual

### Último comando ejecutado:
```bash
npm run build  # Pasa correctamente (6 páginas)
```

### Pendientes:
- **Logo SVG**: El usuario proporcionará un SVG detallado con viewBox "0 0 1720 580" que debe reemplazar el SVG placeholder actual en `src/layouts/Layout.astro` líneas 40-46
  - El SVG debe estilizarse para matching con el navbar (tamaño, colores dark/light)
  - Actualmente hay un SVG inline temporal simple

### Mejoras futuras sugeridas:
1. Añadir datos dinámicos de precios del aceite
2. Pronóstico 7 días
3. Datos de viento, UV
4. Notificaciones push
5. Widget de tendencia semanal

---

## 🔧 Componentes del Mapa

### MapaCalor.astro
- Filtros: 🌡️ temperatura, 💧 humedad, 🌧️ lluvia
- Colores automáticos según variedad
- Leaflet con CartoDB dark/light tiles dinámico
- CircleMarkers con animación
- Tooltip muestra datos climáticos + riesgo por variedad
- Zoom a provincia en evento `provincia-seleccionada`

### index.astro (Homepage)
- Hero minimalista (40vh, padding compactado)
- Bento grid: mapa (60%) + sidebar (40%)
- Sidebar: selector provincia, selector variedad, alertas en tiempo real
- Mapa destacado (580px) después del top 3
- Premium cards carrusel (Mercado, Clima, Recomendación)
- localStorage para persistir selección de provincia/variedad

### variedades.astro
- Header neobrutalista con borde limón
- Grid de tarjetas con shadow offset
- Filtros por condiciones climáticas
- Comparador visual entre 2 variedades

### alertas.astro
- Formulario neobrutalista
- Estilo distintivo con bordes cuadrados y sombras offset

---

## 🔧 Estado de Implementación del Logo

### 2026-03-27 - Implementación del Logo SVG

**Trabajo realizado:**

1. ✅ **Navbar flotante mejorada**
   - Diseño flotante rectangular con border-radius: 16px
   - Márgenes de ~2cm de los bordes (top: 16px, left/right: 24px, bottom: 16px)
   - Fondo blanco/gris según theme
   - Distribución simétrica: logo | nav links | theme toggle + botón alertas

2. ✅ **Orden del navbar (izquierda a derecha)**
   - Logo SVG (reemplazando emoji 🫒)
   - Inicio → Consejero → Variedades → Agua y Suelos → Plagas
   - Theme toggle button (☀️)
   - Botón "Activar alertas" (color lima/lime #D4E849)

3. ✅ **Logo SVG implementado**
   - Archivo: `/public/logo.svg`
   - Usado en `src/layouts/Layout.astro` líneas 39-42
   - Altura: 36px en el navbar
   - Dos variantes de color: ramas en `currentColor`, aceitunas en `#D4E849`

4. ✅ **Responsive del navbar**
   - Desktop (>900px): muestra nav links horizontal +隐藏 hamburger
   - Móvil (≤900px):隐藏 nav links, muestra hamburger + dropdown

5. ✅ **Build verificado**
   - `npm run build` pasa correctamente

---

## 📌 Guía para Continuar el Trabajo

### Estado actual del proyecto

El proyecto está en un estado funcional con:
- ✅ Frontend Astro funcionando en puerto 4321
- ✅ Backend Bun funcionando en puerto 3000
- ✅ Sistema de clima, riesgo y alertas operativo
- ✅ Navbar con logo SVG implementado (/public/logo.svg)

### Para continuar desde donde se quedó:

El proyecto está completo. Si necesitas hacer cambios:

1. **Modificar el logo**: Editar `/public/logo.svg`
2. **Modificar el navbar**: Editar `src/layouts/Layout.astro` líneas 36-78
3. **Verificar el build**:
   ```bash
   npm run build
   ```

### Archivos relevantes

| Archivo | Descripción |
|---------|-------------|
| `src/layouts/Layout.astro` | Layout principal - navbar en líneas 36-78, CSS del navbar en líneas ~230-320 |
| `public/logo.svg` | Logo SVG del navbar |
| `<style>` en Layout | Variables CSS de theme (--color-limon, etc.) |

---

*Documentación actualizada: 2026-03-27*