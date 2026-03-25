# Plan de Limpieza + Centralización de Plagas - olivaξ

## Objetivo
Limpiar código redundante, eliminar duplicaciones y mover la lógica de cálculo de plagas al backend.

---

## Problemas Identificados

### 1. PROVINCIAS Duplicado
- **Ubicación**: `api/routes/clima.ts` (líneas 4-15) y `api/routes/alertas.ts` (líneas 72-83)
- **Problema**: Misma constante copiada en dos archivos
- **Solución**: Crear `api/data/provincias.ts` exportando la lista centralizada

### 2. CONSEJOS Duplicado
- **Ubicación**: `api/routes/alertas.ts`
  - `CONSEJOS` (líneas 30-34): 3 consejos por tipo
  - `CONSEJOS_ALERTA` (líneas 105-109): 4 consejos por tipo (duplicado con variaciones)
- **Problema**: Dos objetos con textos casi idénticos
- **Solución**: Unificar en un solo objeto `CONSEJOS` con los consejos más completos

### 3. Email Hardcodeado
- **Ubicación**: `api/routes/alertas.ts` líneas 8, 39, 131
- **Problema**: `jdenriquezr@gmail.com` escrito directamente
- **Solución**: Usar variable de entorno `GMAIL_USER`

### 4. Lógica de Plagas en Frontend
- **Ubicación**: `src/components/AlertasPlagas.jsx` (función `calcularRiesgoPlagas`)
- **Problema**: Cálculo duplicated - el frontend calcula 4 plagas pero el backend también calcula `riesgo_plaga` genérico
- **Solución**: Mover toda la lógica detallada al backend

---

## Plan de Implementación

### Paso 1: Crear archivo centralizado de provincias
**Archivo**: `api/data/provincias.ts`
```typescript
export const PROVINCIAS = [
  { nombre: "Jaén", lat: 37.77, lon: -3.79 },
  // ... todas las provincias
];

export type Provincia = typeof PROVINCIAS[number];
```

### Paso 2: Mover lógica de plagas al backend
**Archivo**: `api/routes/clima.ts`

Crear función `calcularRiesgosPlaga(temp, humedad, lluvia)` que devuelve:
```typescript
{
  mosca: { nivel: 'alto'|'medio'|'bajo', descripcion: string, consejo: string },
  polilla: { nivel: 'alto'|'medio'|'bajo', descripcion: string, consejo: string },
  xylella: { nivel: 'alto'|'medio'|'bajo', descripcion: string, consejo: string },
  repilo: { nivel: 'alto'|'medio'|'bajo', descripcion: string, consejo: string }
}
```

Lógica a移植ar (desde AlertasPlagas.jsx):
- **Mosca**: temp 18-32°C + humedad >60% = alto; temp 15-35°C + humedad >40% = medio
- **Polilla**: temp 15-25°C + lluvia <5mm = alto; temp 10-30°C = medio
- **Xylella**: temp >20°C + humedad >70% + lluvia >10mm = alto; temp >15°C + humedad >50% = medio
- **Repilo**: lluvia >5mm + temp 10-20°C = alto; humedad >70% + temp <25°C = medio

Actualizar `DatosClima` interface para incluir `riesgos_plaga`.

### Paso 3: Actualizar clima.ts - imports y cleanup
- Importar `PROVINCIAS` desde archivo centralizado
- Quitar `uv_index` de los datos devueltos (no se usa)
- Quitar `riesgo_plaga` genérico (reemplazado por `riesgos_plaga` detallado)

### Paso 4: Actualizar alertas.ts
- Importar `PROVINCIAS` desde archivo centralizado
- Eliminar `PROVINCIAS` local (líneas 72-83)
- Unificar `CONSEJOS` y `CONSEJOS_ALERTA` en uno solo
- Usar `process.env.GMAIL_USER` en lugar de email hardcodeado

### Paso 5: Actualizar .env
- Añadir `GMAIL_USER=jdenriquezr@gmail.com`

### Paso 6: Actualizar Frontend - index.astro
En el evento `datos-provincia`, incluir también `riesgos_plaga`:
```javascript
window.dispatchEvent(new CustomEvent('datos-provincia', {
  detail: {
    provincia: provData.provincia,
    temperatura: provData.temperatura,
    humedad: provData.humedad,
    lluvia: provData.lluvia,
    riesgos_plaga: provData.riesgos_plaga  // NUEVO
  }
}));
```

### Paso 7: Actualizar Frontend - AlertasPlagas.jsx
- Eliminar función `calcularRiesgoPlagas()` local
- Recibir `riesgosPlaga` como prop o del evento
- Renderizar directamente los datos recibidos del backend

---

## Archivos a Modificar

| Archivo | Acción |
|---------|--------|
| `api/data/provincias.ts` | **CREAR** |
| `api/routes/clima.ts` | Modificar - importar provincias, nueva función riesgos_plaga, quitar uv_index |
| `api/routes/alertas.ts` | Modificar - importar provincias, unificar CONSEJOS, usar env var |
| `.env` | Añadir GMAIL_USER |
| `src/pages/index.astro` | Modificar - incluir riesgos_plaga en evento |
| `src/components/AlertasPlagas.jsx` | Modificar - eliminar cálculo local, usar datos del backend |

---

## Notas
- Build debe pasar sin errores
- Tests deben seguir funcionando
- El tooltip del mapa puede mostrar riesgo de plagas si se desea (opcional)