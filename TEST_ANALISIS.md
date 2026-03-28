# 🔍 ANÁLISIS COMPLETO DEL SISTEMA - OLIVAξ

## 📊 RESUMEN EJECUTIVO

| Área | Estado | Notas |
|------|--------|-------|
| **Frontend** | ✅ Funcional | 6 páginas, build pasando |
| **Backend API** | ⚠️ Parcial | Clima funciona, Chat requiere keys |
| **Ecosistema** | ❌ No conectado | No hay estado global compartido |

---

## 1. SEGURIDAD

### ✅ Lo que está bien:
- Sanitización de inputs en chat.ts (líneas 63-67)
- Rate limiting implementado (chat.ts líneas 7-43)
- Validación de parámetros

### ⚠️ Problemas encontrados:
1. **No hay API key en .env** - Las keys están como placeholders
2. **Exposición de datos climáticos** - Todo el array de clima se envía al LLM
3. **Sin autenticación** - Cualquiera puede usar el chat y alertas

### 🔧 Recomendaciones:
```env
# .env - Añadir tus keys reales
GROQ_KEY=gsk_xxxx
GEMINI_KEY=AIzaSyxxxx
OPENROUTER_KEY=sk-or-xxxx
```

---

## 2. VELOCIDAD

### Backend - /api/clima
- ✅ **Cache**: 6 horas (CACHE_TTL en clima.ts línea 34)
- ✅ **Fetch paralelo**: No - se hace secuencial por provincia
- ⚠️ **10 provincias = 10 llamadas a Open-Meteo** - Cuello de botella

### Backend - /api/chat
- ⚠️ **Sin timeout para LLM** - 60s (línea 36 llmRotation.ts)
- ⚠️ **Prompt muy grande** - Envía todo el array de clima (línea 87 chat.ts)

### Frontend
- ✅ **Build estático** - Solo client-side fetching
- ⚠️ **Múltiples fetches redundantes** - index.astro hace fetch 2 veces

### 🔧 Optimizaciones sugeridas:
```typescript
// 1. Cachear respuesta de Open-Meteo para todas las provincias
// 2. Reducir el systemPrompt a solo datos relevantes de la provincia actual
// 3. Agregar streaming completo al frontend (ya implementado en chat.ts)
```

---

## 3. CONEXIÓN (ECOSISTEMA)

### ❌ PROBLEMA CRÍTICO - Estado no compartido

| Página | Lee provincia | Lee variedad | Publica cambios |
|--------|---------------|--------------|-----------------|
| **index.astro** | ✅ localStorage | ✅ localStorage | ✅ Evento custom |
| **consejero.astro** | ✅ localStorage | ❌ No | ❌ No |
| **variedades.astro** | ❌ No | ❌ No | ❌ No |
| **alertas.astro** | ❌ No | ❌ No | ❌ No |
| **plagas.astro** | ❌ No | ❌ No | ❌ No |
| **agua-suelos.astro** | ❌ No | ❌ No | ❌ No |

### Problemas específicos:

1. **index.astro**: Guarda en localStorage y dispatchEvent
2. **ChatConsejero.jsx**: Solo lee, no comunica cambios
3. **Variedades**: No tiene acceso a provincia seleccionada
4. **Alertas**: No sabe qué provincia tiene el usuario

### 🔧 Solución - Evento global:

```javascript
// En cualquier página que cambie provincia:
window.dispatchEvent(new CustomEvent('olivaxi-provincia-change', { 
  detail: { provincia: 'Jaén', variedad: 'picual' } 
}));

// En cualquier página que escuche:
window.addEventListener('olivaxi-provincia-change', (e) => {
  console.log('Nueva provincia:', e.detail.provincia);
});
```

---

## 4. BACKEND - ENDPOINTS

### /api/clima ✅
- **Funciona**: Devuelve datos de 10 provincias
- **Cache**: SQLite con TTL 6h
- **Velocidad**: ~2-5 segundos (Open-Meteo)

### /api/chat ⚠️
- **Dependencia**: Requiere GROQ_KEY, GEMINI_KEY, u OPENROUTER_KEY
- **Error actual**: "API keys no configuradas" (503)
- **Fallback**: Rotación entre 3 proveedores

### /api/alertas ✅
- **Funciona**: Inserta en SQLite
- **Email**: Requiere GMAIL_APP_PASSWORD configurado

### /api/analisis ⚠️
- **Ruta llamada**: index.astro línea 1444
- **No encontrada**: Retorna null si falla

---

## 5. FRONTEND - PÁGINAS

| Página | Estado | Notas |
|--------|--------|-------|
| **index.astro** | ✅ | Mapa + sidebar + cards |
| **consejero.astro** | ✅ | Chat con streaming |
| **variedades.astro** | ✅ | Catálogo neobrutalista |
| **alertas.astro** | ✅ | Formulario neobrutalista |
| **plagas.astro** | ✅ | Info estática |
| **agua-suelos.astro** | ✅ | Info estática |

---

## 6. PRUEBAS RECOMENDADAS

### Manual:
1. Abrir index → seleccionar provincia → verificar mapa
2. Ir a /consejero → verificar que mantiene provincia
3. Ir a /variedades → verificar que muestra datos
4. Cambiar variedad en index → verificar otras páginas

### API:
```bash
# Test clima
curl http://localhost:3000/api/clima | jq '.[0].provincia'

# Test chat (requiere keys)
curl -X POST http://localhost:3000/api/chat \
  -H "Content-Type: application/json" \
  -d '{"mensaje":"hola","provincia":"Jaén"}'
```

---

## 🎯 PRIORIDADES DE CORRECCIÓN

### Alta prioridad:
1. ✅ **Conectar ecosistema** - Evento global para provincia/variedad
2. ✅ **Añadir keys** - .env con GROQ/GEMINI/OpenRouter

### Media prioridad:
3. Optimizar prompt del chat (solo datos de provincia actual)
4. Reducir fetch redundantes en index.astro
5. Agregar timeout configurable al LLM

### Baja prioridad:
6. Autenticación básica para endpoints
7. Rate limiting por usuario en clima
8. Cache de análisis provincial