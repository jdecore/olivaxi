# Plan: Nuevo Hero Moderno Minimalista - index.astro

## Objetivo
Reemplazar el hero actual del index.astro por un diseño moderno minimalista con el contenido deseado.

## Cambios a realizar en `src/pages/index.astro`

### 1. Nuevo Hero (reemplaza el `.bento-grid` actual)

Insertar antes del bento-grid:

```astro
<!-- HERO MODERNO -->
<section class="hero-moderno">
  <div class="hero-pildora">
    🫒 Olivo AI
  </div>
  <h1 class="hero-titulo">
    Herramienta potenciada<br/>
    con AI para mejorar<br/>
    el cuidado del olivo<br/>
    contra el cambio climático
  </h1>
  <p class="hero-subtitulo">
    Tu olivar, protegido por IA. Alertas de calor, 
    plagas y sequía en tiempo real para el 
    agricultor español.
  </p>
  <div class="hero-botones">
    <a href="/alertas" class="btn-hero-primario">Activar alerta 🔔</a>
    <a href="/#mapa" class="btn-hero-secundario">Ver el mapa →</a>
  </div>
</section>
```

### 2. Nuevos estilos CSS (agregar en `<style is:global>`)

```css
/* HERO MODERNO */
.hero-moderno {
  background: #F4F1EA;
  padding: 80px 20px;
  max-width: 800px;
  margin: 80px auto 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
  gap: 24px;
}

.hero-pildora {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  background: #2D4A1E;
  color: white;
  padding: 8px 20px;
  border-radius: 999px;
  font-size: 14px;
  font-weight: 600;
  letter-spacing: 0.5px;
}

.hero-titulo {
  font-size: clamp(36px, 6vw, 68px);
  font-weight: 900;
  line-height: 1.05;
  color: #1C1C1C;
  margin: 0;
  letter-spacing: -2px;
}

.hero-subtitulo {
  font-size: 18px;
  color: #6B6B5E;
  max-width: 560px;
  line-height: 1.6;
  margin: 0;
}

.hero-botones {
  display: flex;
  gap: 16px;
  flex-wrap: wrap;
  justify-content: center;
}

.btn-hero-primario {
  background: #4CAF6F;
  color: white;
  padding: 14px 32px;
  border-radius: 999px;
  font-size: 16px;
  font-weight: 600;
  text-decoration: none;
  transition: all 0.25s cubic-bezier(0.16,1,0.3,1);
}

.btn-hero-primario:hover {
  background: #3D9F5F;
  transform: translateY(-1px);
}

.btn-hero-secundario {
  background: transparent;
  border: 1.5px solid #1C1C1C;
  color: #1C1C1C;
  padding: 14px 32px;
  border-radius: 999px;
  font-size: 16px;
  font-weight: 600;
  text-decoration: none;
  transition: all 0.25s cubic-bezier(0.16,1,0.3,1);
}

.btn-hero-secundario:hover {
  background: #1C1C1C;
  color: white;
}
```

### 3. Mover el contenido actual

El `.bento-grid` actual con el mapa, alertas, análisis y demás debe mantenerse pero:
- Quitar el `.hero-card` del interior del bento-grid (el contenido se movió al nuevo hero)
- Reducir el margin-top del `.bento-grid` de `80px` a `40px`

### 4. Mantener funcionalidad

El código JavaScript y los event listeners deben mantenerse intactos.

## Verificación
- `npm run build` debe pasar sin errores
- Todas las funcionalidades existentes deben mantenerse