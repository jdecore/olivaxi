import { useState, useEffect } from 'react';

const iconos = {
  mosca: '🦟',
  polilla: '🦋',
  xylella: '🦠',
  repilo: '🍄'
};

const nombres = {
  mosca: 'Mosca del olivo',
  polilla: 'Polilla del olivo',
  xylella: 'Xylella fastidiosa',
  repilo: 'Repilo'
};

export default function AlertasPlagas({ provincia: propsProvincia, temperatura: propsTemp, humedad: propsHumedad, lluvia: propsLluvia, riesgosPlaga: propsRiesgos }) {
  const [provincia, setProvincia] = useState(propsProvincia || null);
  const [temperatura, setTemperatura] = useState(propsTemp || 0);
  const [humedad, setHumedad] = useState(propsHumedad || 0);
  const [lluvia, setLluvia] = useState(propsLluvia || 0);
  const [riesgosPlaga, setRiesgosPlaga] = useState(propsRiesgos || null);
  const [modoOscuro, setModoOscuro] = useState(() => {
    if (typeof window !== 'undefined') {
      return document.documentElement.getAttribute('data-theme') === 'dark';
    }
    return false;
  });

  useEffect(() => {
    const handleDatosProvincia = (e) => {
      setProvincia(e.detail.provincia);
      setTemperatura(e.detail.temperatura);
      setHumedad(e.detail.humedad);
      setLluvia(e.detail.lluvia);
      setRiesgosPlaga(e.detail.riesgos_plaga || null);
    };
    window.addEventListener('datos-provincia', handleDatosProvincia);
    return () => window.removeEventListener('datos-provincia', handleDatosProvincia);
  }, []);

  useEffect(() => {
    const handleModoChange = (e) => {
      setModoOscuro(e.detail.modoOscuro);
    };
    window.addEventListener('modoOscuroChange', handleModoChange);
    
    const theme = document.documentElement.getAttribute('data-theme');
    setModoOscuro(theme === 'dark');
    
    return () => window.removeEventListener('modoOscuroChange', handleModoChange);
  }, []);

  if (!provincia) {
    return (
      <div className="plagas-panel" style={panelStyles(modoOscuro)}>
        <style>{fadeInUpStyles}</style>
        <div className="plagas-empty">
          <p style={{ color: modoOscuro ? '#a0a095' : '#4a4a40', textAlign: 'center', padding: '2rem' }}>
            Selecciona tu provincia para ver alertas de plagas
          </p>
        </div>
      </div>
    );
  }

  const riesgos = riesgosPlaga ? [
    { plaga: 'mosca', nombre: nombres.mosca, icono: iconos.mosca, ...riesgosPlaga.mosca },
    { plaga: 'polilla', nombre: nombres.polilla, icono: iconos.polilla, ...riesgosPlaga.polilla },
    { plaga: 'xylella', nombre: nombres.xylella, icono: iconos.xylella, ...riesgosPlaga.xylella },
    { plaga: 'repilo', nombre: nombres.repilo, icono: iconos.repilo, ...riesgosPlaga.repilo }
  ] : [];

  const getNivelStyles = (nivel) => {
    const styles = {
      alto: { bg: '#FFE5E5', border: '#E74C3C', text: '#C0392B' },
      medio: { bg: '#FFF3CD', border: '#F0A500', text: '#856404' },
      bajo: { bg: '#E8F5E9', border: '#4CAF6F', text: '#2D6A4F' },
    };
    return styles[nivel] || styles.bajo;
  };

  return (
    <div className="plagas-panel" style={panelStyles(modoOscuro)}>
      <style>{`
        @keyframes fadeInUp {
          from { opacity: 0; transform: translateY(12px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .plagas-panel {
          animation: fadeInUp 0.4s ease-out;
        }
        @media (prefers-reduced-motion: reduce) {
          .plagas-panel { animation: none; }
        }
      `}</style>
      <h3 style={{
        fontFamily: 'Georgia, serif',
        fontSize: '16px',
        color: modoOscuro ? '#F7F4EE' : '#1C1C1C',
        marginBottom: '4px'
      }}>
        🦠 Alertas de Plagas en Vivo
      </h3>
      <p style={{
        fontSize: '12px',
        color: modoOscuro ? '#a0a095' : '#4a4a40',
        marginBottom: '16px'
      }}>
        Basado en condiciones climáticas actuales en {provincia}
      </p>

      <div className="plagas-grid" style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(2, 1fr)',
        gap: '12px'
      }}>
        {riesgos.map((item) => {
          const colores = getNivelStyles(item.nivel);
          return (
            <div
              key={item.plaga}
              className="plaga-tarjeta"
              style={{
                background: modoOscuro ? '#1a1a1a' : '#FFFFFF',
                border: `2px solid ${colores.border}`,
                borderRadius: '6px',
                padding: '12px'
              }}
            >
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                marginBottom: '8px'
              }}>
                <span style={{ fontSize: '18px' }}>{item.icono}</span>
                <span style={{
                  fontSize: '13px',
                  fontWeight: '600',
                  color: modoOscuro ? '#F7F4EE' : '#1C1C1C'
                }}>
                  {item.nombre}
                </span>
              </div>
              <div style={{
                background: colores.bg,
                color: colores.text,
                padding: '4px 8px',
                borderRadius: '4px',
                fontSize: '10px',
                fontWeight: '700',
                textTransform: 'uppercase',
                marginBottom: '8px',
                display: 'inline-block'
              }}>
                Riesgo {item.nivel}
              </div>
              <div style={{
                fontSize: '12px',
                color: modoOscuro ? '#a0a095' : '#4a4a40',
                marginBottom: '6px',
                lineHeight: '1.4'
              }}>
                {item.descripcion}
              </div>
              <div style={{
                fontSize: '11px',
                fontWeight: '600',
                color: colores.text
              }}>
                {item.consejo}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

const panelStyles = (modoOscuro) => ({
  background: modoOscuro ? '#000' : '#F7F4EE',
  border: '2px solid #F7F4EE',
  borderRadius: '6px',
  padding: '16px',
  marginTop: '16px'
});

const fadeInUpStyles = `
  @keyframes fadeInUp {
    from { opacity: 0; transform: translateY(12px); }
    to { opacity: 1; transform: translateY(0); }
  }
  .plagas-panel {
    animation: fadeInUp 0.4s ease-out;
  }
`;