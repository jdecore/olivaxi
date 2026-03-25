# Plan: Reemplazar Variedades por Plagas - olivaξ

## Objetivo
Reemplazar la página de variedades por una nueva página de plagas que muestre las condiciones climáticas y sus plagas asociadas, con tarjetas que se voltean para mostrar tratamientos.

## Estructura

### Página: `/plagas`
- Hero con título "🦠 Plagas del Olivar por Condición Climática"
- 3 secciones con filtros tipo tabs:
  1. **Todas** - Grid con las 6 condiciones
  2. **Por condición** - Mismas 6 cartas filtrables
  3. **Cambio climático** - Plagas aumentadas por calentamiento

### Tarjetas (formato similar a variedades)
- **Frente**: Condición climática + icono + lista de plagas/enfermedades
- **Reverso**: Tratamiento recomendado
- Flip al hacer click o hover

## Datos por Condición

### 1. Bajas Temperaturas ❄️
**Plagas**: Tuberculosis, lepra (hongos en heridas), prays
**Tratamiento**: Cobre en heridas; mejorar drenaje y poda sanitaria

### 2. Altas Temperaturas 🔥
**Plagas**: Mosca del olivo, prays, cochinilla (por estrés)
**Tratamiento**: Trampas masivas McPhail (70-100/ha); cebo proteico parcheo; insecticidas si >7% frutos picados

### 3. Baja Humedad (Sequía) 🏜️
**Plagas**: Prays (daños frutos), cochinilla, caída frutos
**Tratamiento**: Bacillus thuringiensis en floración; aceites minerales vs cochinilla

### 4. Alta Humedad 💧
**Plagas**: Repilo (Fusarium), antracnosis, tuberculosis, lepra, Phytophthora
**Tratamiento**: Cobre (máx 4kg/ha/año); bicarbonatos (500-1000g/hl); preventivos post-invierno

### 5. Baja Lluvia (Sequía) 🌵
**Plagas**: Prays, mosca oportunista, estrés general
**Tratamiento**: Riego deficitario controlado; monitoreo con trampas

### 6. Alta Lluvia 🌧️
**Plagas**: Phytophthora (podredumbre radicular), verticillium, hongos radiculares
**Tratamiento**: Mejorar drenaje; fungicidas específicos; evitar encharcamiento

## Cambio Climático (aumentadas)
- **Mosca del olivo**: +3°C alarga actividad hasta noviembre
- **Xylella fastidiosa**: Expansión norteña, transmitida por Philaenus spumarius
- **Prays**: Más ciclos por temperaturas cálidas
- **Hongos oportunistas**: +60% pérdidas proyectadas con +2°C

## Implementación

### Archivos a crear/modificar:
1. `src/pages/plagas.astro` - Nueva página (reemplaza variedades)
2. `src/components/PlagasGrid.astro` - Componente de tarjetas con flip
3. `src/components/PlagasCard.astro` - Tarjeta individual con flip
4. Eliminar `src/pages/variedades.astro` y `src/components/ComparadorVariedades.astro` (opcional)
5. `src/layouts/Layout.astro` - Actualizar navegación

### Formato de tarjeta (flip):
```html
<div class="plaga-card">
  <div class="plaga-front">
    <span class="plaga-icon">❄️</span>
    <h3>Bajas Temperaturas</h3>
    <ul>
      <li>Tuberculosis</li>
      <li>Lepra</li>
      <li>Prays</li>
    </ul>
    <span class="flip-hint">Click para ver tratamiento →</span>
  </div>
  <div class="plaga-back">
    <h3>💊 Tratamiento</h3>
    <p>Aplicar cobre en heridas...</p>
  </div>
</div>
```

### CSS para flip:
```css
.plaga-card { perspective: 1000px; }
.plaga-front, .plaga-back {
  backface-visibility: hidden;
  transition: transform 0.5s;
}
.plaga-back { transform: rotateY(180deg); }
.plaga-card.flipped .plaga-front { transform: rotateY(180deg); }
.plaga-card.flipped .plaga-back { transform: rotateY(360deg); }
```