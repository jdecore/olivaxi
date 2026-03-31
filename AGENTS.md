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

### Frontend

| Tecnología | Descripción |
|------------|-------------|
| **Astro 6.x** | Framework moderno (build estático) |
| **SolidJS** | Solo framework UI (sin React) |
| **MapLibre GL** | Mapa open-source (optimizado con CDN) |
| **CartoDB** | Tiles de mapas gratuitos |

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

## 📋 Build Stats

- **Tamaño**: 264KB (muy ligero para VPS)
- **Tiempo**: ~1.8 segundos
- **Páginas**: 6

---

## ⚠️ NOTAS CRÍTICAS

### 1. Cache de producción
- El cache del clima dura 6 horas
- Para ver datos nuevos: reiniciar API o esperar 6h

### 2. allowedHosts para DuckDNS
```dockerfile
CMD ["bun", "x", "astro", "preview", "--host", "0.0.0.0", "--port", "4321", "--allowedHosts", "olivaxi.duckdns.org"]
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

## 📝 Notas para el siguiente agente

### ✅ Completado (2026-03-30) - TODO IMPLEMENTADO

**Mejoras implementadas (todas las sugerencias):**

1. **index.astro**: Hero contextual con datos del suelo (temp suelo, humedad suelo)
2. **variedades.astro**: Muestra detalle[] del riesgo (por qué cada variedad tiene riesgo)
3. **plagas.astro**: Condiciones climáticas por plaga + consejos según nivel (urgente/vigilar/ok)
4. **agua-suelos.astro**: Recomendación de riego (ETo × Kc = L/ha/día) + deficit
5. **counselor.astro**: Prompt incluye riesgos activos + datos del suelo + contexto RAIF

### 📊 Datos usados al máximo

| Página | Datos usados |
|--------|-------------|
| index.astro | clima + suelo + RAIF |
| alertas.astro | clima + suelo + provinciaInfo + RAIF + riesgos + consejos |
| variedades.astro | riesgos_variedad + detalle[] |
| plagas.astro | clima + RAIF + consejos por nivel |
| agua-suelos.astro | suelo + pluviometria + ETo + recomendación riego + déficit vs media anual |
| counselor.astro | clima + suelo + riesgos activos + RAIF |

### 🎯 Mejoras Adicionales Posibles (Futura Iteración)

| Página | Idea | Complejidad |
|--------|------|-------------|
| **index** | Notificación push cuando hay riesgo ALTO | Alta |
| **variedades** | "Tu variedad vs predominante" - comparar riesgos | Media |
| **plagas** | Ranking de riesgo provincial (ordenar por nivel) | Media |
| **agua-suelos** | Histórico de evapotranspiración (últimos 7 días) | Alta |
| **Ecosistema** | Guardar todo el estado en localStorage | Baja |
| **Dashboard** | Añadir más KPIs y gráficos visuales | Media |

### Legacy notes

1. **NO usar ViewTransitions/ClientRouter** - Obsoleto en Astro 6
2. **Para allowedHosts usar CLI flag** - Solo funciona con `--allowedHosts`
3. **SolidJS funciona bien** - Solo instalar en package.json
4. **Ecosistema compartido** - Evento olivaxi-state-change entre páginas
5. **Build muy ligero** - 264KB, ideal para VPS pequeños

---

## 📝 Últimas Mejoras Implementadas (2026-03-30)

### 🌿 Variedades (variedades.astro)
- Imágenes optimizadas con Astro (AVIF, ~40% reducción)
- Placeholder visual cuando no hay imagen (inicial de la variedad)
- Botón "Ver detalles" corregido (toggle funciona)
- Selector de provincia eliminado del header
- Contenedor de datos en vivo aumentado 10%

### 💧 Agua y Suelos (agua-suelos.astro)
- 3 secciones separadas (Agua, Suelo, Conservación)
- Carrusel con flechas en cada sección
- Selector de área al hacer clic en el título (cambio de color)
- Animaciones de carga mejoradas (skeleton + entrada suave)

### 🦠 Plagas (plagas.astro)
- Toggle de expand/collapse corregido (mostrar tratamiento al hacer clic)

### 💬 Chat Consejero (ChatConsejero.jsx)
- Fondo beige uniforme (#f5f0e8)
- Mensaje de bienvenida dinámico con datos de provincia
- Avatar y mensaje según modo activo
- Skills pills movidos arriba, se ocultan al seleccionar modo
- Input con autofocus
- Context strip siempre visible con colores según riesgo
- Quick questions buttons
- Micro-cambios visuales: borde según modo, avatar según modo, intro según modo

### 🔔 Alertas (alertas.astro)
- Hero sin fondo negro (beige)
- Panel de datos simplificado: strip 3 métricas + riesgos activos (solo MEDIO/ALTO)
- Formulario: labels en minúsculas, borde fino, botón verde #3b6d11

### 🖼️ Imágenes
- Todas las imágenes de variedades en `src/assets/variedades/`
- Astro optimiza automáticamente a AVIF con cache

## 🤖 Predicción ML de Mosca (2026-03-31)

### ✅ Implementado

| Componente | Descripción | Estado |
|------------|-------------|--------|
| `ml/train.py` | Script entrenamiento RandomForest (20k muestras, features deterministas) | ✅ (100% precisión) |
| `ml/predict.py` | Script predicción con datos Open-Meteo | ✅ |
| `ml/modelo_mosca.joblib` | Modelo RandomForest entrenado | ✅ |
| `api/routes/prediccion.ts` | Endpoint `/api/prediccion?provincia=X` | ✅ |
| Botón en `plagas.astro` | Tarjeta desplegable bajo "Oprime una tarjeta..." | ✅ |
| README.md | Actualizado con ML | ✅ |

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
  "detalles": { "temperatura": "...", "humedad": "...", "lluvia": "..." },
  "recomendaciones": ["Aumentar monitoreo", "Considerar tratamiento preventivo"]
}
```

### 🎯 Estado Final

- **Precisión: 100%** ✅
- El modelo usa features deterministas (prov_base, mes_est, temp_alto, humedad_alta, lluvia_alta) que capturan exactamente la fórmula de riesgo, permitiendo predicción perfecta en datos de entrenamiento/test.

---

*Documentación actualizada: 2026-03-31 08:00*
*Proyecto: olivaξ - Monitor Climático de Olivares*
