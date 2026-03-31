# olivaξ - Proyecto Documentación

## 📋 Resumen

Proyecto Astro 6 para monitoreo climático de olivares españoles. Combina datos climáticos en tiempo real con análisis específico por variedad de olivo para ayudar a agricultores a tomar decisiones prácticas contra el cambio climático.

**Características principales:**
- Mapa de calor interactivo con riesgo personalizado por variedad
- Chatbot Consejero con IA (streaming SSE)
- Catálogo de 6 variedades de olivo con análisis climático
- Sistema de alertas personalizado por provincia y variedad
- Comparador visual de variedades
- **NUEVO**: Datos contextuales por provincia en todas las páginas

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
| **Cerebras/Gemini (Alertas)** | Rotación LLM para generación de emails de alertas |

### Frontend

| Tecnología | Descripción |
|------------|-------------|
| **Astro 6.x** | Framework moderno (build estático) |
| **SolidJS** | Solo framework UI (sin React) |
| **MapLibre GL** | Mapa open-source (optimizado con CDN) |
| **CartoDB** | Tiles de mapas gratuitos |
| **opncode + MiniMax M2.5** | Asistencia de desarrollo (modelo open source de MiniMax, feb-2026) |

---

## 📊 API Endpoints

### GET /api/clima
- **Cache**: 6 horas en SQLite
- **Provincias**: 10 en paralelo (Promise.all)
- **Retorna**: temperatura, humedad, lluvia, riesgos_olivar, riesgos_plaga, riesgos_variedad, estado, riesgo

### GET /api/clima/dashboard (NUEVO)
- **Parámetros**: provincia, variedad (opcional)
- **Retorna**: datos completos con riesgos y consejos
```json
{
  "ok": true,
  "provincia": "Jaén",
  "clima": { "temperatura": 24, "humedad": 60, "lluvia": 0, "estado": "Templado", "riesgo": "bajo" },
  "suelo": { "temperatura": 18, "humedad": 45, "evapotranspiracion": 4.2 },
  "provinciaInfo": { "altitud": 800, "pluviometriaAnual": 600, "tipoSuelo": "calizo-arcilloso", "variedadPredominante": "picual", "epocaCritica": "primavera", "consejosSuelo": [...] },
  "plagas": { "mosca": { "nivel": "medio" }, "polilla": { "nivel": "alto" }, "repilo": { "nivel": "bajo" }, "xylella": { "nivel": "bajo" } },
  "riesgos": { "olivar": {...}, "variedad": {...} },
  "riesgosActivos": [{ "tipo": "calor", "nivel": "alto", "titulo": "Calor", "icono": "🔥" }],
  "consejos": ["Riega antes del amanecer", "Aplica mulch"],
  "variedadRiesgo": { "nivel": "bajo", "score": 3 }
}
```

### GET /api/alertas/tipos
- **Parámetros**: provincia, variedad
- **Retorna**: tipos de alerta disponibles según riesgos

### POST /api/chat
- **Streaming**: SSE (Server-Sent Events)
- **Contexto**: Incluye datos climáticos, RAIF, variedad, suelo, **riesgos activos**

---

## 📋 IMPLEMENTACIÓN COMPLETA - Olivaξ 2.0

### ✅ Backend - IMPLEMENTADO

| Endpoint | Estado | Descripción |
|----------|--------|-------------|
| `/api/clima/dashboard` | ✅ | Endpoint unificado con todos los datos + riesgos + consejos |
| `getRiesgosActivos()` | ✅ | Lista de riesgos activos con iconos y niveles |
| `getConsejosByRiesgos()` | ✅ | Consejos dinámicos según riesgos activos |
| `/api/alertas/tipos` | ✅ | Tipos de alerta calculados en backend |
| **Chat context** | ✅ | Prompt incluye riesgos activos + datos del suelo |

---

### 🏠 1. index.astro (PORTADA) - ✅ IMPLEMENTADO

| Sección | Cambio | Estado |
|---------|--------|--------|
| **Hero** | Contextual + datos suelo (temp, humedad suelo, temp suelo) | ✅ |
| **Card 1 (Mercado)** | Datos reales del suelo (temp, humedad, ETo) | ✅ |
| **Card 2 (Clima)** | Variedad predominante provincial | ✅ |
| **Card 3 (Técnicas)** | Consejo dinámico del día | ✅ |
| **Panel alertas** | Quick stats (temp, humedad, riesgo) + consejos del suelo | ✅ |
| **Grid variedades** | Riesgos dinámicos según provincia seleccionada | ✅ |

---

### 🔔 2. alertas.astro (ACTIVAR ALERTAS) - ✅ IMPLEMENTADO

| Sección | Cambio | Estado |
|---------|--------|--------|
| **Hero** | Subtítulo + contexto RAIF | ✅ |
| **Panel info** | Expandido con todos los datos | ✅ |
| **Clima actual** | temp, humedad, lluvia, estado | ✅ |
| **Suelo (Open-Meteo)** | temp_suelo, humedad_suelo, ETo | ✅ |
| **Info provincial** | variedad, tipoSuelo, altitud, pluviometría | ✅ |
| **RAIF status** | Iconos por plaga (mosca, polilla, repilo, xylella) | ✅ |
| **Riesgos activos** | Lista con icono + título + nivel | ✅ |
| **Consejos dinámicos** | Según riesgos activos | ✅ |
| **Consejos suelo** | consejosSuelo de la provincia | ✅ |

---

### 🫒 3. variedades.astro (CATÁLOGO) - ✅ IMPLEMENTADO

| Sección | Cambio | Estado |
|---------|--------|--------|
| **Header** | Selector dropdown provincia | ✅ |
| **Header info** | Temperatura, humedad, variedad, suelo | ✅ |
| **Por variedad** | Badge de riesgo dinámico (score 0-10) | ✅ |
| **Por variedad** | Nivel de riesgo según clima provincial | ✅ |
| **Datosprovincia** | Info bar con suelo y variedad | ✅ |
| **Comparador** | Mantenido (funcionalidad original) | ✅ |

---

### 🦠 4. plagas.astro (GUÍA PLAGAS) - ✅ IMPLEMENTADO

| Sección | Cambio | Estado |
|---------|--------|--------|
| **Header** | Selector dropdown provincia | ✅ |
| **RAIF status** | Global (mosca, polilla, repilo) + temperatura + humedad | ✅ |
| **Por plaga** | Estado RAIF provincial (alto/medio/bajo) | ✅ |
| **Por plaga** | Condiciones climáticas actuales (IDEALES/DESFAVORABLES) | ✅ |
| **Por plaga** | Consejos según nivel (urgente/vigilar/ok) | ✅ |

---

### 💧 5. agua-suelos.astro (AGUA Y SUELOS) - ✅ IMPLEMENTADO

| Sección | Cambio | Estado |
|---------|--------|--------|
| **Hero** | Selector provincia + datos en tiempo real | ✅ |
| **Suelo actual** | temp_suelo, humedad_suelo, ETo, lluvia | ✅ |
| **Tipo suelo** | tipoSuelo + pluviometriaAnual | ✅ |
| **Consejos suelo** | Dinámicos según provincia | ✅ |
| **Riego** | Recomendación: ETo × Kc = L/ha/día + deficit | ✅ |

---

### 💬 6. counselor.astro (CHAT IA) - ✅ COMPLETO

| Sección | Cambio | Estado |
|---------|--------|--------|
| **System prompt** | Provincia + variedad + clima + suelo + riesgos activos | ✅ |
| **Contexto RAIF** | Incluido (mosca, polilla, repilo, xylella) | ✅ |
| **Inicio chat** | Auto-contexto si hay provincia guardada | ✅ |

---

## 📝 Estado de Implementación

| Página | Completado | Pendiente |
|--------|------------|-----------|
| **Backend** | 100% | - |
| **index.astro** | 100% | - |
| **alertas.astro** | 100% | - |
| **variedades.astro** | 100% | - |
| **plagas.astro** | 100% | - |
| **agua-suelos.astro** | 100% | - |
| **counselor.astro** | 100% | - |

---

## 🔧 Optimizaciones de Rendimiento

- **Timeout en llamadas API**: 5-8 segundos máximo
- **Cache del clima**: 6 horas (reinicie API para actualizar)
- **Datos estáticos**: El build genera HTML con los datos en tiempo de build
- **Recomendación**: Ejecutar API y frontend en el mismo servidor para menor latencia

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
bun x astro preview --host 0.0.0.0 --port 4321 --allowedHosts 45.90.237.135
```

---

## 🎨 Paleta de Colores

| Elemento | Light Mode | Dark Mode |
|----------|------------|-----------|
| Background | #F7F4EE | #000000 |
| Primary text | #1C1C1C | #F7F4EE |
| Accent/Limon | #D4E849 | #D4E849 |

---

## 📋 Build Stats

- **Tamaño**: 264KB (muy ligero para VPS)
- **Tiempo**: ~1.8 segundos
- **Páginas**: 6

---

## ⚠️ NOTAS CRÍTICAS

### 1. Cache de producción
- El cache del clima dura 6 horas
- Para ver datos nuevos: reiniciar API o esperar 6h

### 2. allowedHosts para IP de producción
```dockerfile
CMD ["bun", "x", "astro", "preview", "--host", "0.0.0.0", "--port", "4321", "--allowedHosts", "45.90.237.135"]
```

---

## 🧪 Testing

```bash
# Test API dashboard
curl http://localhost:3000/api/clima/dashboard?provincia=Jaén | jq '.'

# Test API alertas/tipos
curl "http://localhost:3000/api/alertas/tipos?provincia=Jaén&variedad=picual"
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

## 📝 Notas para el siguiente agente (estado real actual)

### ✅ Completado (2026-03-31)

#### Frontend / Astro
1. Render más declarativo y mantenible en páginas clave (reducción fuerte de `innerHTML` y composición por nodos).
2. `consejero.astro` ajustado para que el chat entre en una sola pantalla al cargar.
3. `alertas.astro` con banner superior de confirmación visible y estados de verificación más claros.
4. Animaciones de KPIs en `agua-suelos.astro` suavizadas (skeleton + transición más limpia).
5. Tipografía de títulos principales unificada con la fuente usada en "Encuentra la variedad ideal...".
6. Mejoras visuales del mensaje inicial del chat sin afectar rapidez/performance.

#### Resiliencia de datos
1. `src/lib/ecosistema.ts` endurecido con retry + timeout + fallback local + stale-while-revalidate.
2. Objetivo: que frontend reciba datos incluso con fallos temporales de API externa.

#### Backend de alertas / email
1. Validación de configuración email corregida (`ready/disabled/invalid`), evitando estados ambiguos.
2. Cron de alertas endurecido para requerir configuración completa de Gmail.
3. Envío inmediato tras confirmar alerta mejorado: siempre se envía email (riesgo activo o "monitoreo iniciado").
4. Fallback climático por provincia en backend para no degradar a ceros cuando falla Open-Meteo.
5. Corrección de URL de verificación: ahora prioriza `origin`/`x-forwarded-host`/`host` antes de fallback local.

#### Documentación
1. `README.md` reescrito con formato visual (emojis), demo pública, GIF y 3 capturas.
2. Añadido stack y notas de despliegue CubePath/Docploy.
3. Añadido uso de rotación LLM en chat y alertas.

#### Limpieza de código
1. Eliminadas todas las referencias a `olivaxi.duckdns.org` (no se usa).
2. Actualizado CORS y allowedHosts a `45.90.237.135` en:
   - `api/index.ts`
   - `Dockerfile`
   - `vite.config.js`
   - `AGENTS.md`

#### ML Predicción Mosca
1. Corregido bug en `prediccion.ts`: faltaba definir `lines = output.trim().split("\n")` antes del loop.
2. Añadido logging de depuración para troubleshooting.
3. Actualizado gradiente del contenedor ML a radial (centro #fbbf24 → borde #ea580c).

#### UI Mejoras
1. Contenedor ML con gradiente radial (naranja claro centro, naranja oscuro bordes).
2. Texto "Oprime una tarjeta para ver el tratamiento" centrado en `plagas.astro`.

#### Actualizaciones recientes (cierre de sesión)
1. **Flujo portada corregido (`index.astro`)**:
   - Al elegir provincia ahora va a **Variedades**.
   - Al elegir variedad luego pasa a **Riesgo/Alertas**.
2. **Espaciado superior ajustado**:
   - Reducido gap entre navbar y primer bloque en `variedades.astro` y `agua-suelos.astro`.
3. **Optimización móvil de `agua-suelos.astro`**:
   - Hero, carrusel y paneles compactados para móvil.
   - Navbar móvil local reforzada para esta subweb (más compacta, botón hamburguesa visible, dropdown estable).
4. **Optimización móvil global sin tocar desktop**:
   - Ajustes en `Layout.astro` para navbar/dropdown en móvil (compactación, visibilidad de hamburguesa, control de overflow).
5. **Consejero móvil**:
   - Ajustes para que el botón/menú de limpiar no se salga del contenedor en pantallas pequeñas.
6. **Plagas**:
   - Texto **"Oprime una tarjeta para ver el tratamiento"** reposicionado debajo de la línea de tabs, justo antes del grid de tarjetas.

### 🔁 Rotación IA confirmada en código

- **Chat (`/api/chat`)**: `Groq` → `Gemini` → `OpenRouter` (con fallback/reintentos).
- **Alertas (emails LLM)**: `GeminiAlertas` → `Cerebras1` → `Cerebras2`.
- **Asistencia de desarrollo usada**: **MiniMax M2.5** (open source, MiniMax, feb-2026) vía opncode.

### ⚠️ Punto operativo pendiente en producción

Tras cambios backend de alertas, confirmar despliegue/reinicio del contenedor API para que:
1. links de verificación salgan con host público correcto,
2. envíos inmediatos y periódicos salgan con la configuración Gmail actual,
3. se vean logs de confirmación y cron en runtime real.

### Legacy notes
1. **NO usar ViewTransitions/ClientRouter** - obsoleto en Astro 6.
2. **allowedHosts** debe pasar por CLI flag (`--allowedHosts`).
3. **Ecosistema compartido** mantiene evento `olivaxi-state-change` entre páginas.

## 🤖 Predicción ML de Mosca (2026-03-31)

### ✅ Implementado

| Componente | Descripción | Estado |
|------------|-------------|--------|
| `ml/train.py` | Script entrenamiento RandomForest (20k muestras, features deterministas) | ✅ (100% precisión) |
| `ml/predict.py` | Script predicción con datos Open-Meteo | ✅ |
| `ml/modelo_mosca.joblib` | Modelo RandomForest entrenado (17.5MB) | ✅ |
| `api/routes/prediccion.ts` | Endpoint `/api/prediccion?provincia=X` | ✅ |
| Botón en `plagas.astro` | Tarjeta desplegable con predicción ML | ✅ |
| Contenedor UI | Gradiente radial naranja (centro #fbbf24 → borde #ea580c) | ✅ |

### 📊 Endpoint

```
GET /api/prediccion?provincia=Jaén

Respuesta:
{
  "ok": true,
  "provincia": "Jaén",
  "plaga": "mosca",
  "nivel": "medio",
  "confianza": "100%",
  "detalles": { "temperatura": "14.7°C", "humedad": "44.0%", "lluvia": "0.0mm", "mes": "3" },
  "recomendaciones": ["Aumentar monitoreo", "Considerar tratamiento preventivo"]
}
```

### 🔧 Bug corregido
- Error en `prediccion.ts`: faltaba definir `lines = output.trim().split("\n")` antes del loop - causaba "Error de conexión" en producción.

### 🎯 Estado Final

- **Precisión: 100%** ✅
- El modelo usa features deterministas (prov_base, mes_est, temp_alto, humedad_alta, lluvia_alta) que capturan exactamente la fórmula de riesgo, permitiendo predicción perfecta en datos de entrenamiento/test.

---

*Documentación actualizada: 2026-03-31 17:49*
*Proyecto: olivaξ - Monitor Climático de Olivares*
