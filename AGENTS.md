# olivaξ - Proyecto Documentación

## 📋 Resumen

Proyecto Astro 6 para monitoreo climático de olivares españoles. Combina datos climáticos en tiempo real con análisis específico por variedad de olivo para ayudar a agricultores a tomar decisiones prácticas contra el cambio climático.

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
| **Bun** | Runtime de JavaScript ultrarrápido |
| **Hono** | Framework web minimalista para Bun |
| **SQLite (bun:sqlite)** | Base de datos embebida |
| **Open-Meteo API** | API gratuita de datos climáticos |
| **Groq/Gemini/OpenRouter** | LLMs con rotación automática |

### Frontend

| Tecnología | Descripción |
|------------|-------------|
| **Astro 6.x** | Framework moderno (build estático) |
| **SolidJS** | Solo framework UI (sin React) |
| **MapLibre GL** | Mapa open-source (optimizado con CDN) |
| **CartoDB** | Tiles de mapas gratuitos |

---

## 🏗️ Estructura del Proyecto

```
olivaxi/
├── api/                          # Backend Bun/Hono
│   ├── index.ts                  # Servidor principal (puerto 3000)
│   ├── routes/
│   │   ├── clima.ts             # GET /api/clima (cache 6h)
│   │   ├── chat.ts              # POST /api/chat (streaming SSE)
│   │   ├── alertas.ts           # POST /api/alertas
│   │   └── analisis.ts          # Análisis provincial
│   ├── services/
│   │   ├── llmRotation.ts       # Fallback Groq/Gemini/OpenRouter
│   │   └── cronAlertas.ts       # CRON de alertas cada 15min
│   ├── db/
│   │   └── sqlite.ts            # Base de datos SQLite
│   └── data/
│       └── provincias.ts        # 10 provincias olivareras
├── src/
│   ├── components/
│   │   ├── MapaCalor.astro      # Mapa Leaflet
│   │   ├── ChatConsejero.jsx    # Chat SolidJS
│   │   └── ThemeToggle.astro    # Toggle tema
│   ├── layouts/
│   │   └── Layout.astro         # Layout base
│   ├── lib/
│   │   ├── api.ts               # Helper API
│   │   ├── state.ts             # Estado compartido
│   │   └── variedades.ts        # Datos variedades
│   └── pages/
│       ├── index.astro           # Homepage
│       ├── consejero.astro      # Chat
│       ├── variedades.astro      # Catálogo
│       ├── alertas.astro         # Formulario alertas
│       ├── plagas.astro         # Info plagas
│       └── agua-suelos.astro     # Info agua/suelos
├── astro.config.mjs              # Config Astro 6
├── vite.config.js                # Vite config
├── Dockerfile                    # Multi-stage build
└── docker-compose.yml            # Dokploy config
```

---

## ⚠️ NOTAS CRÍTICAS - Errores resueltos

### 1. ViewTransitions/ClientRouter NO EXISTE en Astro 6
- **Error**: `"ClientRouter" is not exported by "astro:transitions"`
- **Solución**: Eliminar imports de ViewTransitions/ClientRouter del Layout.astro
- **Más info**: Astro 6 ya no usa ViewTransitions, el sistema de transiciones cambió

### 2. allowedHosts para DuckDNS (PROBLEMA ACTIVO)
- **Error**: `Blocked request. This host ("olivaxi.duckdns.org") is not allowed.`
- **Solución**: Usar flag CLI `--allowedHosts` en el CMD del Dockerfile:
```dockerfile
CMD ["bun", "x", "astro", "preview", "--host", "0.0.0.0", "--port", "4321", "--allowedHosts", "olivaxi.duckdns.org"]
```
- **No funciona**: preview.allowedHosts en astro.config.mjs ni vite.config.js
- **SÍ funciona**: --allowedHosts como argumento CLI

### 3. Leaflet no encontrado en build
- **Error**: `Rollup failed to resolve import "leaflet"`
- **Solución**: Agregar leaflet a dependencies en package.json:
```json
"leaflet": "^1.9.4"
```

---

## 📊 API Endpoints

### GET /api/clima
- **Cache**: 6 horas en SQLite
- **Provincias**: 10 en paralelo (Promise.all)
- **Retorna**: temperatura, humedad, lluvia, riesgos_olivar, riesgos_plaga, riesgos_variedad, estado, riesgo

### POST /api/chat
- **Streaming**: SSE (Server-Sent Events)
- **Rotación**: Groq → Gemini → OpenRouter (automático)
- **Retry**: Delay 1.5s entre proveedores
- **Timeout**: 45s por request

### POST /api/alertas
- **Storage**: SQLite
- **Email**: Requiere GMAIL_APP_PASSWORD

---

## 🚀 Cómo ejecutar

### Frontend (Astro)
```bash
npm run dev        # Desarrollo puerto 4321
npm run build      # Build producción
npm run preview    # Preview local
```

### Backend (Bun)
```bash
bun run api/index.ts   # Puerto 3000
```

### Test local con host específico
```bash
bun x astro preview --host 0.0.0.0 --port 4321 --allowedHosts olivaxi.duckdns.org
```

---

## 🎨 Paleta de Colores

| Elemento | Light Mode | Dark Mode |
|----------|------------|-----------|
| Background | #F7F4EE | #000000 |
| Primary text | #1C1C1C | #F7F4EE |
| Accent/Limon | #D4E849 | #D4E849 |

---

## 📋 Estado Actual

### Build stats (2026-03-28):
- **Tamaño**: 264KB (muy ligero para VPS) ⬇️ de 424KB
- **Tiempo**: ~2.5 segundos ⬇️ de 4s
- **Páginas**: 6

### Optimizaciones aplicadas:
- Prefetch habilitado (hover strategy) - navegación instantánea
- Assets inline hasta 4KB (antes 2KB)
- Logo optimizado (103KB → 4KB)
- Favicon SVG (17MB → 4KB)
- Código limpio (eliminadas funciones no usadas)

### Deploy actual:
- **Web**: https://olivaxi.duckdns.org
- **API**: Puerto 3000 (vía Traefik)

### Funcionando:
- ✅ Mapa de calor
- ✅ Chat con LLM
- ✅ Sistema de alertas
- ✅ Catálogo variedades
- ✅ Tema light/dark
- ✅ Prefetch para navegación rápida

---

## 🔧 Configuración Dokploy

### docker-compose.yml
```yaml
services:
  web:
    build: .
    ports:
      - "4321:4321"
  api:
    build: ./api
    ports:
      - "3000:3000"
```

### Dockerfile (CRÍTICO - allowedHosts)
```dockerfile
FROM oven/bun:latest AS base
WORKDIR /app

FROM base AS deps
COPY package.json ./
RUN bun install --frozen-lockfile

FROM base AS builder
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN bun run build

FROM base AS runner
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules/.astro ./node_modules/.astro

EXPOSE 4321
CMD ["bun", "x", "astro", "preview", "--host", "0.0.0.0", "--port", "4321", "--allowedHosts", "olivaxi.duckdns.org"]
```

---

## 🔑 Variables de Entorno

```env
# API Keys para Chat
GROQ_KEY=tu_key_de_groq
GEMINI_KEY=tu_key_de_gemini
OPENROUTER_KEY=tu_key_de_openrouter

# Email para alertas
GMAIL_USER=tu_email@gmail.com
GMAIL_APP_PASSWORD=tu_password

# URL del backend
PUBLIC_API_URL=http://localhost:3000
```

---

## 🧪 Testing

```bash
# Test API clima
curl http://localhost:3000/api/clima | jq '.[0]'

# Test API chat
curl -X POST http://localhost:3000/api/chat \
  -H "Content-Type: application/json" \
  -d '{"mensaje":"hola","provincia":"Jaén"}'

# Test frontend con DuckDNS header
curl -H "Host: olivaxi.duckdns.org" http://localhost:4321/
```

---

## 📝 Notas para el siguiente agente

1. **NO usar ViewTransitions/ClientRouter** - Obsoleto en Astro 6
2. **Para allowedHosts usar CLI flag** - La config no funciona, solo el flag
3. **SolidJS funciona bien** - Solo instalar en package.json
4. **Ecosistema compartido** - Ya hay evento olivaxi-state-change pero no está implementado completamente
5. **Build muy ligero** - 264KB, ideal para VPS pequeños
6. **Prefetch activado** - Las páginas se precargan al hacer hover

---

*Documentación actualizada: 2026-03-28*
*Proyecto: olivaξ - Monitor Climático de Olivares*