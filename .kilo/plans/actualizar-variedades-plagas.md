# Plan: Actualizar tarjetas de variedades con información de resistencia a plagas

## Objetivo
Actualizar `src/data/variedades.json` y el componente `ComparadorVariedades.astro` para mostrar información de resistencia a plagas (Xylella, mosca, Prays, hongos).

## Cambios necesarios

### 1. Actualizar `src/data/variedades.json`
Reemplazar las 6 variedades actuales con las nuevas:

| ID | Nombre | Origen | Res.Seq | Tol.Cal | Prod. | Etiqueta | Notas |
|----|---------|--------|---------|---------|-------|-----------|-------|
| leccino | Leccino | Italia | 75 | 72 | 80 | Resistencia Xylella | Xylella: Alta, Mosca: Media |
| favolosa | Favolosa (FS-17) | Italia | 78 | 75 | 82 | Mutante alto rendimiento | Xylella: Alta |
| picual | Picual | Jaén, España | 55 | 78 | 95 | Resistencia Mosca | Xylella: Susceptible, Mosca: Alta |
| cornicabra | Cornicabra | Castilla-La Mancha | 70 | 80 | 75 | Resistencia Mosca | Mosca: Alta |
| arbequina | Arbequina | Lleida | 60 | 62 | 88 | Resistencia Prays/Hongos | Prays: Alta, Hongos: Alta |
| lechin-granada | Lechín de Granada | Granada | 72 | 74 | 70 | Resistencia Prays | Prays: Alta |

Campos adicionales a añadir a cada variedad:
- `plagas: { xylella, mosca, prays }` - resistencia a cada plaga
- `enfermedades: { antracnosis, repilo }` - resistencia a hongos

### 2. Actualizar `src/components/ComparadorVariedades.astro`
- Añadir nueva sección para mostrar resistencia a plagas
- Añadir filtros por resistencia a Xylella, mosca, prays
- Añadir columna en tabla de comparación para resistencias

## Ejecución
1. Escribir nuevo `variedades.json` con las 6 variedades actualizadas
2. Actualizar componente para mostrar datos de plagas y enfermedades
3. Verificar build pasa correctamente