import { useState, useEffect } from 'react';
import { apiUrl } from '../lib/api';

export default function AnalisisOlivar({ provincia, initialData }) {
  const [datos, setDatos] = useState(initialData || null);
  const [cargando, setCargando] = useState(!initialData);
  const [error, setError] = useState(null);
  const [modoOscuro, setModoOscuro] = useState(() => {
    if (typeof window !== 'undefined') {
      return document.documentElement.getAttribute('data-theme') === 'dark';
    }
    return false;
  });

  useEffect(() => {
    const handleModoChange = (e) => {
      setModoOscuro(e.detail.modoOscuro);
    };
    window.addEventListener('modoOscuroChange', handleModoChange);
    
    const theme = document.documentElement.getAttribute('data-theme');
    setModoOscuro(theme === 'dark');
    
    return () => window.removeEventListener('modoOscuroChange', handleModoChange);
  }, []);

  useEffect(() => {
    if (!provincia) {
      setDatos(null);
      return;
    }
    
    if (initialData) {
      setDatos(initialData);
      setCargando(false);
      return;
    }

    setCargando(true);
    fetch(apiUrl(`/api/analisis/${encodeURIComponent(provincia)}`))
      .then((r) => {
        if (!r.ok) throw new Error('Error al cargar análisis');
        return r.json();
      })
      .then((data) => {
        setDatos(data);
        setCargando(false);
      })
      .catch((err) => {
        setError(err.message);
        setCargando(false);
      });
  }, [provincia, initialData]);

  useEffect(() => {
    const handleProvinciaSeleccionada = (e) => {
      const nuevaProvincia = e.detail?.provincia;
      if (nuevaProvincia) {
        setDatos(null);
        setCargando(true);
      }
    };
    window.addEventListener('provincia-seleccionada', handleProvinciaSeleccionada);
    return () => window.removeEventListener('provincia-seleccionada', handleProvinciaSeleccionada);
  }, []);

  const getNivelColor = (nivel) => {
    const colores = {
      alta: { bg: 'rgba(34, 197, 94, 0.15)', border: '#22c55e', text: '#15803d' },
      media: { bg: 'rgba(245, 158, 11, 0.15)', border: '#f59e0b', text: '#b45309' },
      baja: { bg: 'rgba(239, 68, 68, 0.15)', border: '#ef4444', text: '#dc2626' },
      alto: { bg: 'rgba(239, 68, 68, 0.15)', border: '#ef4444', text: '#dc2626' },
      medio: { bg: 'rgba(245, 158, 11, 0.15)', border: '#f59e0b', text: '#b45309' },
      bajo: { bg: 'rgba(34, 197, 94, 0.15)', border: '#22c55e', text: '#15803d' },
    };
    return colores[nivel] || colores.bajo;
  };

  const getNivelLabel = (nivel) => {
    const labels = { alto: 'Alto', medio: 'Medio', bajo: 'Bajo' };
    return labels[nivel] || 'N/A';
  };

  const getIcono = (tipo) => {
    const iconos = { estres_hidrico: '💧' };
    return iconos[tipo] || '📊';
  };

  if (!provincia) {
    return (
      <div className="analisis-panel" style={panelStyles(modoOscuro)}>
        <style>{fadeInUpStyles}</style>
        <div className="analisis-empty">
          <p style={{ color: modoOscuro ? '#a0a095' : '#4a4a40', textAlign: 'center', padding: '2rem' }}>
            Selecciona una provincia en el mapa o en el selector para ver el análisis.
          </p>
        </div>
      </div>
    );
  }

  if (cargando) {
    return (
      <div className="analisis-panel" style={panelStyles(modoOscuro)}>
        <style>{fadeInUpStyles}</style>
        <div className="analisis-loading">
          <div className="spinner"></div>
          <p style={{ color: modoOscuro ? '#a0a095' : '#4a4a40' }}>Cargando análisis...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="analisis-panel" style={panelStyles(modoOscuro)}>
        <style>{fadeInUpStyles}</style>
        <div className="analisis-error">
          <p style={{ color: '#ef4444' }}>⚠️ {error}</p>
        </div>
      </div>
    );
  }

  const tarjetas = [
    { tipo: 'estres_hidrico', titulo: 'Estrés Hídrico', valor: datos.estres_hidrico, nivel: datos.estres_nivel },
  ];

  return (
    <div className="analisis-panel" style={panelStyles(modoOscuro)}>
      <style>{`
        @keyframes fadeInUp {
          from { opacity: 0; transform: translateY(12px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .analisis-panel {
          animation: fadeInUp 0.4s ease-out;
        }
        @media (prefers-reduced-motion: reduce) {
          .analisis-panel { animation: none; }
        }
      `}</style>
      <h3 style={{
        fontFamily: 'Georgia, serif',
        fontSize: '16px',
        color: modoOscuro ? '#F7F4EE' : '#1C1C1C',
        marginBottom: '16px',
        display: 'flex',
        alignItems: 'center',
        gap: '8px'
      }}>
        📊 Análisis: {provincia}
      </h3>

      <div className="analisis-tarjetas" style={{ display: 'grid', gap: '12px' }}>
        {tarjetas.map((tarjeta) => {
          const colores = getNivelColor(tarjeta.nivel);
          return (
            <div
              key={tarjeta.tipo}
              className="analisis-tarjeta"
              style={{
                background: modoOscuro ? '#1a1a1a' : '#FFFFFF',
                border: `2px solid ${colores.border}`,
                borderLeftWidth: '4px',
                borderRadius: '6px',
                padding: '12px 14px',
                display: 'flex',
                alignItems: 'center',
                gap: '12px'
              }}
            >
              <div style={{ fontSize: '24px' }}>{getIcono(tarjeta.tipo)}</div>
              <div style={{ flex: 1 }}>
                <div style={{
                  fontSize: '11px',
                  color: modoOscuro ? '#a0a095' : '#4a4a40',
                  textTransform: 'uppercase',
                  letterSpacing: '0.5px'
                }}>
                  {tarjeta.titulo}
                </div>
                <div style={{
                  fontSize: '13px',
                  fontWeight: '600',
                  color: modoOscuro ? '#F7F4EE' : '#1C1C1C',
                  marginTop: '2px'
                }}>
                  {tarjeta.valor}
                </div>
              </div>
              <div style={{
                background: colores.bg,
                color: colores.text,
                padding: '4px 8px',
                borderRadius: '4px',
                fontSize: '11px',
                fontWeight: '700'
              }}>
                {getNivelLabel(tarjeta.nivel)}
              </div>
            </div>
          );
        })}
      </div>

      {datos.alertas && datos.alertas.length > 0 && (
        <div className="analisis-alertas" style={{ marginTop: '16px' }}>
          {datos.alertas.map((alerta, i) => (
            <div
              key={i}
              style={{
                background: '#FFF3CD',
                borderLeft: '4px solid #F0A500',
                borderRadius: '8px',
                padding: '12px 16px',
                marginBottom: '8px',
                fontSize: '12px',
                color: '#1C1C1C'
              }}
            >
              ⚠️ {alerta}
            </div>
          ))}
        </div>
      )}
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
  .analisis-panel {
    animation: fadeInUp 0.4s ease-out;
  }
  @media (prefers-reduced-motion: reduce) {
    .analisis-panel { animation: none; }
  }
`;
