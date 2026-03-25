# olivaξ - Proyecto Documentación

## 📋 Resumen

Proyecto Astro para monitoreo climático de olivares españoles. Incluye:
- Mapa de calor en tiempo real
- Chatbot Consejero con streaming SSE
- Catálogo de variedades de olivo
- Sistema de alertas

## 🏗️ Estructura Actual

```
olivaxi/
├── api/                          # Backend Bun/Hono
│   ├── index.ts                  # Servidor principal (puerto 3000)
│   │                             # CORS: localhost:4321-4324
│   │                             # idleTimeout: 120s
│   ├── routes/
│   │   ├── clima.ts             # GET /api/clima
│   │   ├── chat.ts              # POST /api/chat (streaming SSE + provider info)
│   │   └── alertas.ts           # POST /api/alertas
│   ├── services/
│   │   └── llmRotation.ts       # Fallback Groq/Gemini/OpenRouter
│   └── db/
│       └── sqlite.ts            # Base de datos SQLite compartida
├── src/
│   ├── components/
│   │   ├── MapaCalor.jsx        # Mapa Leaflet con fadeIn animado
│   │   ├── ChatConsejero.jsx    # Chat con streaming, modo oscuro adaptativo
│   │   ├── ThemeToggle.astro    # Toggle tema claro/oscuro
│   │   ├── RankingRiesgo.astro    # Top 3 provincias (server-side render)
│   │   ├── RankingRiesgo.jsx      # (deprecated, usar .astro)
│   │   └── ComparadorVariedades.jsx # Comparador de variedades
│   │   └── ComparadorVariedades.jsx # Comparador de variedades
│   ├── data/
│   │   └── variedades.json       # 6 variedades con datos científicos
│   ├── layouts/
│   │   └── Layout.astro         # Layout base con CSS variables + dark mode
│   ├── lib/
│   │   └── api.ts               # Funciones apiUrl()
│   └── pages/
│       ├── index.astro           # Homepage con bento grid
│       ├── conseajero.astro      # Chat completo (client:only="react")
│       ├── variedades.astro      # Catálogo con filtros
│       └── alertas.astro        # Formulario alertas
├── .env                          # Variables de entorno
└── astro.config.mjs              # Config Astro + React
```

## 🎨 Paleta C: Sal y Aceituna

Colores con soporte dark mode completo:

| Elemento | Light Mode | Dark Mode |
|----------|------------|-----------|
| Background (body) | #F7F4EE (Sal crema) | #000000 (Negro puro) |
| Primary text | #1C1C1C (Aceituna oscuro) | #F7F4EE (Sal) |
| Muted text | #4a4a40 | #a0a095 |
| Borders | #1C1C1C | #F7F4EE |
| Accent/Limon | #D4E849 | #D4E849 |
| White surface | #FFFFFF | #1a1a1a |

## 🚀 Cómo ejecutar

### Frontend (Astro)
```bash
npm run dev      # Puerto 4321-4324
npm run build    # Build producción
```

### Backend (Bun)
```bash
bun run api/index.ts   # Puerto 3000
```

## ⚙️ Configuración

### Variables de entorno (.env)
```
PUBLIC_API_URL=http://localhost:3000
GROQ_KEY=tu_key
GEMINI_KEY=tu_key
OPENROUTER_KEY=tu_key
GMAIL_APP_PASSWORD=tu_password
```

### Timeouts
- Bun idleTimeout: 120s
- LLM timeout: 60s
- LLM max_tokens: 2000

## 🔧 Componentes

### MapaCalor.jsx
- Fetch a `/api/clima`
- Leaflet con CartoDB dark/light tiles dinámico
- CircleMarkers con color según temperatura (gradient completo)
- Animación fadeIn con delay escalonado (index * 0.05s)
- Tooltip adaptativo al tema

### ChatConsejero.jsx
- Flujo: provincia → pregunta → streaming
- Estados: step (1/2/3), messages[], provincia, isLoading, isWaiting
- **Typing indicator**: Se muestra mientras espera el primer chunk del stream
- Streaming SSE con buffer acumulador
- Renderiza markdown: `**texto**` → `<strong>`
- **Proveedor shown**: Muestra "Powered by [Groq/Gemini/OpenRouter]" en header
- Modo oscuro adaptativo con CSS variables

### ThemeToggle.astro
- Controla `data-theme` attribute en `<html>`
- Emite evento `modoOscuroChange` para sincronización
- Soporte para prefers-color-scheme

## 📄 API Endpoints

### GET /api/clima
Retorna array de provincias con:
```json
{
  "provincia": "Jaén",
  "lat": 37.77,
  "lon": -3.79,
  "temperatura": 38,
  "riesgo": "alto",
  "source": "api"
}
```

### POST /api/chat
Body:
```json
{ "mensaje": "...", "provincia": "Jaén" }
```
Response: Stream SSE con chunks `{"texto": "...", "provider": "Groq"}`
- El campo `provider` solo está presente en el primer chunk

### POST /api/alertas
Body:
```json
{ "nombre": "...", "email": "...", "provincia": "Jaén", "tipo": "calor" }
```
Respuesta: `{ "ok": true }`

## 🔗 Rutas

- `/` - Homepage con bento grid y mapa
- `/consejero` - Chat con streaming (client:only="react")
- `/variedades` - Catálogo con filtros
- `/alertas` - Formulario

## 🐛 Problemas conocidos

### Streaming se corta
- Verificar logs en consola navegador: `[Chat] Chunk N:`
- Verificar logs backend: `[LLM] CHUNK RAW:`, `[LLM] TOTAL CHARS:`
- Timeout aumentado a 60s en LLM, 120s en Bun

### API keys no configuradas
- Las claves en .env son placeholders: `tu_key_de_groq`, `tu_key_de_gemini`, etc.
- El chatbot NO funcionará hasta que el usuario configure claves reales
- Las alertas dependen de GMAIL_APP_PASSWORD

## 📝 Historial de cambios

### 2026-03-24 - Sesión de bugs + Dark mode + UX improvements

**Bugs corregidos:**
1. ✅ `src/lib/api.ts` - Eliminado console.log en producción
2. ✅ `MapaCalor.jsx` - Consolidado useEffect duplicado para theme
3. ✅ `MapaCalor.jsx` - Corregido tooltip dark mode (#000000 en vez de #1C1C1C)
4. ✅ `MapaCalor.jsx` - Corregido legend background dark mode
5. ✅ `index.astro` - Colores hardcodeados en decisiones usando CSS variables
6. ✅ `api/routes/chat.ts` - Ahora usa provincia del request en el prompt
7. ✅ `ThemeToggle.astro` - Corregida sintaxis TypeScript inválida
8. ✅ `RankingRiesgo.jsx` - Reescrito con CSS variables + dark mode
9. ✅ `ComparadorVariedades.jsx` - Reescrito con CSS variables + dark mode
10. ✅ `api/routes/alertas.ts` - Cambiado a usar import db compartido (evita locking)
11. ✅ `ChatConsejero.jsx` - Reescrito con detección de tema correcta
12. ✅ `consejero.astro` - Cambiado a client:only="react" para evitar flash
13. ✅ `Layout.astro` - Script de tema movido al inicio del head para evitar flash
14. ✅ `api/services/llmRotation.ts` - Ahora retorna el provider usado
15. ✅ `api/routes/chat.ts` - Envia provider en el primer chunk SSE
16. ✅ `ChatConsejero.jsx` - Muestra "Powered by [provider]" en header

**Cambios de UX:**
- Header del chat ahora muestra el proveedor usado (Groq/Gemini/OpenRouter)
- "En línea" removido del header del chat
- Flash de tema eliminado en carga inicial

**Archivos modificados:**
- `src/lib/api.ts`
- `src/components/MapaCalor.jsx`
- `src/components/ChatConsejero.jsx`
- `src/components/RankingRiesgo.jsx`
- `src/components/ComparadorVariedades.jsx`
- `src/components/ThemeToggle.astro`
- `src/layouts/Layout.astro`
- `src/pages/index.astro`
- `src/pages/consejero.astro`
- `src/pages/variedades.astro`
- `api/routes/chat.ts`
- `api/routes/alertas.ts`
- `api/services/llmRotation.ts`

### 2026-03-23 - Sesión UI fixes
**Cambios realizados:**
1. ✅ `.mapa-card` - añadido `margin-top: 60px` para evitar colisión con navbar fixed
2. ✅ `MapaCalor.jsx` - leyenda ahora usa color dinámico según `modoOscuro`
3. ✅ Botón "Ver el mapa →" cambiado a "Hablar con el consejeros →" en hero-card
4. ✅ Botón "Activar alerta" movido de hero-card a la tarjeta 11M hectáreas
5. ✅ Añadido enlace "Variedades →" en hero-card

## 🚀 Estado actual

- ✅ Build pasa correctamente (`npm run build`)
- ✅ UI responsive con dark mode completo
- ✅ Todos los componentes usan CSS variables
- ✅ Chat muestra qué proveedor se está usando
- ✅ Tests API con Bun (`bun test`)
- ⚠️ Chatbot necesita API keys reales para funcionar
- ⚠️ Alertas necesita GMAIL_APP_PASSWORD configurado

---

## 📊 Inventario de Datos

### Datos de Open-Meteo actualmente USADOS:
| Campo | Endpoint | Ejemplo |
|-------|----------|---------|
| `temperatura` | /api/clima | 12.5°C |
| `humedad` | /api/clima | 70% |
| `lluvia` | /api/clima | 0mm |
| `riesgo` | /api/clima (calculado) | "bajo" |
| `lat`/`lon` | /api/clima | 37.77, -3.79 |

### Datos DISPONIBLES pero NO USADOS:
- **Pronóstico 7 días** (daily: temp_max, temp_min, precipitation)
- **Velocidad viento** (wind_speed_10m)
- **Dirección viento** (wind_direction_10m)
- **Temperatura suelo** (soil_temperature_0cm)
- **Humedad suelo** (soil_moisture_0to1cm)
- **Evapotranspiración** (et0_fao_evapotranspiration)
- **Índice UV** (uv_index)

### Base de datos SQLite:
- `clima_cache`: id, datos (JSON), cached_at
- `alertas`: id, nombre, email, provincia, tipo, activa, last_notified_at, created_at

### Variety data (variedades.json):
- 6 variedades: Koroneiki, Souri, Hojiblanca, Picual, Arbequina, Manzanilla
- Campos: resistencia_sequia, tolerancia_calor, productividad, estudios, etiquetas, notas_climaticas

---

### 2026-03-24 (tarde) - Testing + Mejoras UI + Inventario

**Testing implementado:**
1. ✅ `tests/api.test.ts` - Nuevo archivo con tests Bun
   - `GET /api/clima` - Valida estructura JSON
   - `POST /api/alertas` - Valida respuesta ok
   - `POST /api/alertas` - Valida 400 en campos faltantes
   - `GET /api/analisis/:provincia` - Valida estructura análisis
   - Ejecutar con: `bun test` (requiere API corriendo en puerto 3000)

**MapaCalor.jsx mejorado:**
1. ✅ Skeleton loading con círculos animados (reemplaza spinner)
2. ✅ Filtros de riesgo (Todos/Alto/Medio/Bajo) en top-right del mapa
3. ✅ Filtrado client-side basado en propiedad `riesgo`

**alertas.astro corregido:**
1. ✅ Feedback con CSS variables (eliminado Tailwind inexistente)
2. ✅ Clases `.warning`, `.success`, `.error` definidas con variables CSS

**Bug de base de datos corregido:**
1. ✅ `api/db/sqlite.ts` - Schema `clima_cache` cambiado de `CHECK (id = 1)` a `INTEGER PRIMARY KEY`
2. ✅ Esto resolvió el error "SQLiteError: no such column: id"

**Archivos modificados/nuevos:**
- `tests/api.test.ts` (nuevo)
- `src/components/MapaCalor.jsx`
- `src/pages/alertas.astro`
- `api/db/sqlite.ts`

---

### 2026-03-24 - Sesión de bugs + Dark mode + UX improvements

**Bugs corregidos:**
1. ✅ `src/lib/api.ts` - Eliminado console.log en producción
2. ✅ `MapaCalor.jsx` - Consolidado useEffect duplicado para theme
3. ✅ `MapaCalor.jsx` - Corregido tooltip dark mode (#000000 en vez de #1C1C1C)
4. ✅ `MapaCalor.jsx` - Corregido legend background dark mode
5. ✅ `index.astro` - Colores hardcodeados en decisiones usando CSS variables
6. ✅ `api/routes/chat.ts` - Ahora usa provincia del request en el prompt
7. ✅ `ThemeToggle.astro` - Corregida sintaxis TypeScript inválida
8. ✅ `RankingRiesgo.jsx` - Reescrito con CSS variables + dark mode
9. ✅ `ComparadorVariedades.jsx` - Reescrito con CSS variables + dark mode
10. ✅ `api/routes/alertas.ts` - Cambiado a usar import db compartido (evita locking)
11. ✅ `ChatConsejero.jsx` - Reescrito con detección de tema correcta
12. ✅ `consejero.astro` - Cambiado a client:only="react" para evitar flash
13. ✅ `Layout.astro` - Script de tema movido al inicio del head para evitar flash
14. ✅ `api/services/llmRotation.ts` - Ahora retorna el provider usado
15. ✅ `api/routes/chat.ts` - Envia provider en el primer chunk SSE
16. ✅ `ChatConsejero.jsx` - Muestra "Powered by [provider]" en header

**Cambios de UX:**
- Header del chat ahora muestra el proveedor usado (Groq/Gemini/OpenRouter)
- "En línea" removido del header del chat
- Flash de tema eliminado en carga inicial

**Archivos modificados:**
- `src/lib/api.ts`
- `src/components/MapaCalor.jsx`
- `src/components/ChatConsejero.jsx`
- `src/components/RankingRiesgo.jsx`
- `src/components/ComparadorVariedades.jsx`
- `src/components/ThemeToggle.astro`
- `src/layouts/Layout.astro`
- `src/pages/index.astro`
- `src/pages/consejero.astro`
- `src/pages/variedades.astro`
- `api/routes/chat.ts`
- `api/routes/alertas.ts`
- `api/services/llmRotation.ts`

---

## 2026-03-25 (madrugada) - Optimización SSR + Event listeners

**Cambios realizados:**
1. ✅ `AlertasClimaticas.jsx` - Añadido listener para evento `datos-provincia` (disparado desde index.astro al cambiar provincia en dropdown). Ahora actualiza alertas sin necesidad de fetch adicional ya que el evento contiene los datos.
2. ✅ Tabla de Provincias (`index.astro`) - Movido fetch a Astro server-side, eliminado JavaScript del navegador
3. ✅ Hero Stats (`index.astro`) - Calculadas estadísticas en servidor (tempMax, tempMin, avgTemp, totalProvincias)
4. ✅ `RankingRiesgo.astro` - Nuevo componente Astro que renderiza en server-side (build time)
5. ✅ `index.astro` script - Simplificado, eliminado código muerto (referencias a provinciaSelect undefined, tabla rendering redundante). Añadido listener correcto para actualizar decisiones-rápidas al hacer clic en el mapa.

**Archivos modificados/nuevos:**
- `src/components/AlertasClimaticas.jsx`
- `src/pages/index.astro`
- `src/components/RankingRiesgo.astro` (nuevo)

---

## 2026-03-25 (mañana) - Conversión ComparadorVariedades a Astro

**Cambios realizados:**
1. ✅ `src/components/ComparadorVariedades.astro` - Nuevo componente Astro + vanilla JS
   - Reemplaza el componente React (423 líneas) con versión Astro pura (~405 líneas)
   - Usa data attributes en HTML para almacenar datos de variedades
   - Vanilla JS maneja la lógica de selección y comparación
   - No requiere `client:*` directive - SSR completo
2. ✅ `src/pages/variedades.astro` - Actualizado
   - Import cambiado de `.jsx` a `.astro`
   - Removido `client:load` directive
   - Prop cambiada de `variedades` a `varietyData`
   - Removido script inline obsoleto

**Resultado:**
- Build pasa correctamente: 4 páginas
- Variety data renderizado server-side
- JS cliente solo para funcionalidad de comparación

**Archivos creados/modificados:**
- `src/components/ComparadorVariedades.astro` (nuevo)
- `src/pages/variedades.astro` (modificado)
- `src/components/ComparadorVariedades.jsx` (eliminado)

---

## 2026-03-25 (tarde) - Optimización adicional

**Intentos:**
1. ❌ Se intentó simplificar `index.astro` reemplazando el script inline con un `<form method="GET">` para el dropdown de provincia
   - Hubo problemas de caching de build que causaban errores "Unterminated string literal"
   - Se decidió mantener el script inline existente

**Resultado final:**
- Objetivo principal logrado: eliminar React del ComparadorVariedades
- Build pasa correctamente

---

## 💾 Estado de la sesión actual

### Último comando ejecutado:
```bash
npm run build  # Pasa correctamente (4 páginas)
```

### Errores pendientes:
- Ninguno

### Notas de la sesión:
- Se intentó simplificar `index.astro` reemplazando el script inline con un `<form method="GET">` para el dropdown de provincia, pero hubo problemas de caching de build que causaban errores "Unterminated string literal". Se decidió mantener el script inline existente ya que el objetivo principal (eliminar React del ComparadorVariedades) se logró.

### Pendientes del usuario:
- Ninguno

### Próximos pasos sugeridos:
1. Añadir pronóstico 7 días al endpoint /api/clima
2. Añadir datos de viento, UV, evapotranspiración
3. Crear widget de tendencia semanal
4. Implementar tooltip extendido en el mapa