# olivaξ - Proyecto Documentación

## 📋 Resumen

Proyecto Astro 6 para monitoreo climático de olivares españoles. Combina datos climáticos en tiempo real con análisis específico por variedad de olivo para ayudar a agricultores a tomar decisiones prácticas contra el cambio climático.

**Características principales:**
- Mapa de calor interactivo con riesgo personalizado por variedad
- Chatbot Consejero con IA (streaming SSE)
- Catálogo de 6 variedades de olivo con análisis climático
- Sistema de alertas personalizado por provincia y variedad
- Comparador visual de variedades
- Datos contextuales por provincia en todas las páginas

---

## 🛠️ Tecnologías del Proyecto

### Backend (Python + FastAPI)

| Tecnología | Descripción |
|------------|-------------|
| **Python 3.10+** | Runtime |
| **FastAPI** | Framework web moderno |
| **SQLAlchemy (async)** | ORM async con aiosqlite |
| **aiosmtplib** | Email async con Gmail |
| **aiohttp** | HTTP client async |
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

## 📊 API Endpoints (FastAPI)

### GET /api/clima/
- **Cache**: 6 horas en SQLite
- **Provincias**: 10 en paralelo (asyncio.gather)
- **Retorna**: temperatura, humedad, lluvia, riesgos_olivar, riesgos_plaga, riesgos_variedad, estado, riesgo

### GET /api/clima/dashboard
- **Parámetros**: provincia, variedad (opcional)
- **Retorna**: datos completos con riesgos y consejos
```json
{
  "ok": true,
  "provincia": "Jaén",
  "clima": { "temperatura": 24, "humedad": 60, "lluvia": 0, "estado": "Templado", "riesgo": "bajo" },
  "suelo": { "temperatura": 18, "humedad": 45, "evapotranspiracion": 4.2 },
  "provinciaInfo": { "altitud": 800, "pluviometriaAnual": 600, "tipoSuelo": "calizo-arcilloso", "variedadPredominante": "picual", "epocaCritica": "primavera", "consejosSuelo": [...] },
  "plagas": { "mosca": { "nivel": "medio" }, "polilla": { "nivel": "alto" }, "repilo": { "nivel": "bajo" } },
  "riesgos": { "olivar": {...}, "variedad": {...} },
  "riesgosActivos": [{ "tipo": "calor", "nivel": "alto", "titulo": "Calor", "icono": "🔥" }],
  "consejos": ["Riega antes del amanecer", "Aplica mulch"],
  "variedadRiesgo": { "nivel": "bajo", "score": 3 }
}
```

### GET /api/clima/provincias
- Lista de todas las provincias con datos básicos

### GET /api/alertas/tipos
- **Parámetros**: provincia, variedad
- **Retorna**: tipos de alerta disponibles según riesgos

### POST /api/alertas/
- Crear nueva alerta (double opt-in)

### POST /api/alertas/verify
- Verificar token de email

### GET /api/alertas/status
- Estado del sistema de alertas

### GET /api/chat/
- Chat LLM con streaming SSE (Groq → Gemini → OpenRouter)

### GET /api/analisis/{provincia}
- Análisis agrícola de una provincia

### GET /api/prediccion/
- **Parámetros**: provincia
- Predicción ML de mosca del olivo

---

## 📂 Estructura del Proyecto (Backend Python)

```
oliva-api/
├── app/
│   ├── __init__.py
│   ├── main.py              # FastAPI app entry
│   ├─��� config.py           # Pydantic Settings
│   ├── dependencies/
│   │   ├── database.py    # SQLAlchemy async
│   │   └── __init__.py
│   ├── routers/
│   │   ├── clima.py       # /clima endpoints
│   │   ├── chat.py       # /chat (SSE)
│   │   ├── alertas.py    # /alertas
│   │   ├── analisis.py  # /analisis
│   │   ├── prediccion.py # /prediccion
│   │   └── __init__.py
│   ├── services/
│   │   ├── riesgos.py   # Cálculos de riesgo
│   │   ├── llm.py       # Rotación LLM
│   │   └── __init__.py
│   ├── data/
│   │   ├── provincias.py # Datos estáticos provincias
│   │   ├── varieties.py # Datos variedades + consejos
│   │   └── __init__.py
│   └── models/
│       └── __init__.py
├── .venv/                 # Virtual environment
├── .env                   # Variables de entorno
├── .env.example
├── pyproject.toml
└── requirements.txt
```

---

## 🚀 Cómo ejecutar

### Backend (Python FastAPI)
```bash
cd oliva-api

# Crear venv si no existe
python3 -m venv .venv

# Instalar dependencias
.venv/bin/pip install fastapi uvicorn pydantic pydantic-settings sqlalchemy aiosqlite aiohttp python-dotenv aiosmtplib

# Iniciar API
.venv/bin/python -m uvicorn app.main:app --host 0.0.0.0 --port 3000
```

### Frontend (Astro)
```bash
npm run dev        # Desarrollo puerto 4321
npm run build      # Build producción
npm run preview   # Preview local
```

### Test local completo
```bash
# Terminal 1 - API
cd oliva-api && .venv/bin/python -m uvicorn app.main:app --host 0.0.0.0 --port 3000

# Terminal 2 - Frontend
npm run dev
```

---

## 🔑 Variables de Entorno

```env
# CORS
CORS_ORIGINS=http://localhost:4321,http://127.0.0.1:4321,http://45.90.237.135:4321

# Database
DATABASE_URL=sqlite+aiosqlite:///./olivaxi.db

# Open-Meteo
OPEN_METEO_URL=https://api.open-meteo.com/v1/forecast

# LLM Keys
GROQ_KEY=tu_key_de_groq
GEMINI_KEY=tu_key_de_gemini
OPENROUTER_KEY=tu_key_de_openrouter
GEMINI_ALERTAS_KEY=
CEREBRAS_KEY_1=
CEREBRAS_KEY_2=

# Email
GMAIL_USER=tu_email@gmail.com
GMAIL_APP_PASSWORD=tu_password

# Alert Keys
ALERTAS_AUDIT_KEY=changeme
ALERTAS_CHECK_KEY=changeme

# ML
ML_PYTHON_PATH=python3
ML_PREDICT_SCRIPT=./ml/predict.py
```

---

## ⚠️ NOTAS CRÍTICAS

### 1. Rate Limiting
- Implementado en memoria para cada endpoint
- Limpieza periódica cada 10 minutos

### 2. Cache de producción
- El cache del clima dura 6 horas
- Para ver datos nuevos: reiniciar API

### 3. Open-Meteo rate limits
- La API gratuita tiene límite de 10.000 peticiones/día
- Si recibe 429, usa fallback del cache anterior

---

## 🧪 Testing

```bash
# Test API root
curl http://localhost:3000/api

# Test clima
curl http://localhost:3000/api/clima/

# Test dashboard
curl "http://localhost:3000/api/clima/dashboard?provincia=Jaén"

# Test alertas/tipos
curl "http://localhost:3000/api/alertas/tipos?provincia=Jaén&variedad=picual"

# Test analisis
curl http://localhost:3000/api/analisis/Jaén
```

---

## 📋 Estado de Implementación

| Página | Completado |
|--------|------------|
| **Backend Python** | 100% |
| **index.astro** | 100% |
| **alertas.astro** | 100% |
| **variedades.astro** | 100% |
| **plagas.astro** | 100% |
| **agua-suelos.astro** | 100% |
| **counselor.astro** | 100% |

---

*Documentación actualizada: 2026-04-16*
*Proyecto: olivaξ - Monitor Climático de Olivares*
*Backend actual: Python+FastAPI*
