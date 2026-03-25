import { useState, useEffect } from 'react';

const ALERTAS_UMBRALES = [
  { tipo: 'hongos', icono: '🦠', emoji: 'Hongos', condicion: (d) => d.humedad > 80, umbral: '>80%' },
  { tipo: 'sequia', icono: '🏜️', emoji: 'Sequía', condicion: (d) => d.humedad < 30, umbral: '<30%' },
  { tipo: 'calor', icono: '🔥', emoji: 'Calor extremo', condicion: (d) => d.temperatura > 35, umbral: '>35°C' },
  { tipo: 'inundacion', icono: '🌊', emoji: 'Inundaciones', condicion: (d) => d.lluvia > 10, umbral: '>10mm' }
];

const CONSEJOS = {
  hongos: 'Aplicar fungicida preventivo. Evitar riegos por aspersión.',
  sequia: 'Aumentar riego por goteo. Aplicar mulch para retención.',
  calor: 'Evitar podas ahora. Regar en horario nocturno.',
  inundacion: 'Revisar drenaje. Aplicar tratamiento anti-hongos.'
};

export default function AlertasClimaticas({ provincia: propsProvincia }) {
  const [provincia, setProvincia] = useState(propsProvincia || null);
  const [datosProvincia, setDatosProvincia] = useState(null);
  const [alertas, setAlertas] = useState([]);
  const [loading, setLoading] = useState(false);
  const [modoOscuro, setModoOscuro] = useState(() => {
    if (typeof window !== 'undefined') {
      return document.documentElement.getAttribute('data-theme') === 'dark';
    }
    return false;
  });

  useEffect(() => {
    const handleProvinciaSeleccionada = async (e) => {
      const prov = e.detail.provincia;
      setProvincia(prov);
      await fetchClima(prov);
    };
    window.addEventListener('provincia-seleccionada', handleProvinciaSeleccionada);
    return () => window.removeEventListener('provincia-seleccionada', handleProvinciaSeleccionada);
  }, []);

  useEffect(() => {
    const handleDatosProvincia = (e) => {
      const { provincia: prov, temperatura, humedad, lluvia } = e.detail;
      setProvincia(prov);
      setDatosProvincia({ provincia: prov, temperatura, humedad, lluvia, riesgo: '' });
      const nuevasAlertas = ALERTAS_UMBRALES
        .filter((a) => a.condicion({ temperatura, humedad, lluvia }))
        .map((a) => ({ ...a, consejo: CONSEJOS[a.tipo] }));
      setAlertas(nuevasAlertas);
      setLoading(false);
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

  async function fetchClima(prov) {
    setLoading(true);
    try {
      const apiBase = typeof window !== 'undefined' 
        ? (import.meta?.env?.PUBLIC_API_URL?.replace(/\/$/, '') || 'http://localhost:3000')
        : 'http://localhost:3000';
      const res = await fetch(`${apiBase}/api/clima`);
      const datos = await res.json();
      const provData = datos.find((p) => p.provincia === prov);
      if (provData) {
        setDatosProvincia(provData);
        const nuevasAlertas = ALERTAS_UMBRALES
          .filter((a) => a.condicion(provData))
          .map((a) => ({ ...a, consejo: CONSEJOS[a.tipo] }));
        setAlertas(nuevasAlertas);
      }
    } catch (err) {
      console.error('Error fetching clima:', err);
    } finally {
      setLoading(false);
    }
  }

  const bgColor = modoOscuro ? '#000000' : '#F7F4EE';
  const borderColor = modoOscuro ? '#F7F4EE' : '#1C1C1C';
  const textColor = modoOscuro ? '#F7F4EE' : '#1C1C1C';
  const mutedColor = modoOscuro ? '#a0a095' : '#4a4a40';
  const accentColor = '#D4E849';

  return (
    <div className="alertas-climaticas">
      <style>{`
        @keyframes shimmer {
          0% { background-position: -200% 0; }
          100% { background-position: 200% 0; }
        }
        @keyframes slideIn {
          from { opacity: 0; transform: translateX(-20px); }
          to { opacity: 1; transform: translateX(0); }
        }
        .alertas-climaticas {
          background: ${bgColor};
          border: 2px solid ${borderColor};
          border-radius: 6px;
          padding: 16px;
          min-height: 100px;
        }
        .alertas-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 12px;
        }
        .alertas-title {
          font-family: Georgia, 'Palatino Linotype', serif;
          font-size: 16px;
          color: ${textColor};
          margin: 0;
        }
        .alertas-subtitle {
          font-size: 12px;
          color: ${mutedColor};
          margin-top: 4px;
        }
        .alertas-stats {
          display: flex;
          gap: 16px;
          font-size: 11px;
          color: ${mutedColor};
        }
        .stat-item {
          display: flex;
          align-items: center;
          gap: 4px;
        }
        .alertas-empty {
          text-align: center;
          padding: 1rem;
          color: ${mutedColor};
          font-size: 13px;
        }
        .alertas-list {
          display: flex;
          flex-direction: column;
          gap: 8px;
        }
        .alerta-item {
          background: ${modoOscuro ? '#1a1a1a' : '#FFFFFF'};
          border: 2px solid ${borderColor};
          border-radius: 4px;
          padding: 12px;
          display: flex;
          align-items: flex-start;
          gap: 12px;
          animation: slideIn 0.3s ease-out forwards;
          opacity: 0;
          transition: transform 0.15s ease, box-shadow 0.15s ease;
        }
        .alerta-item:hover {
          transform: translate(-2px, -2px);
          box-shadow: 4px 4px 0 ${accentColor};
        }
        .alerta-icono {
          font-size: 20px;
          flex-shrink: 0;
        }
        .alerta-contenido {
          flex: 1;
        }
        .alerta-titulo {
          font-size: 13px;
          font-weight: 700;
          color: ${textColor};
          margin-bottom: 4px;
        }
        .alerta-dato {
          font-size: 11px;
          color: ${mutedColor};
          margin-bottom: 6px;
        }
        .alerta-consejo {
          font-size: 12px;
          color: ${textColor};
          line-height: 1.4;
          padding-top: 8px;
          border-top: 1px solid ${modoOscuro ? '#333' : '#ddd'};
        }
        .alertas-loading {
          background: linear-gradient(90deg, ${bgColor} 25%, ${modoOscuro ? '#1a1a1a' : '#e5e5e5'} 50%, ${bgColor} 75%);
          background-size: 200% 100%;
          animation: shimmer 1.5s infinite;
          border-radius: 4px;
          height: 60px;
        }
        @media (prefers-reduced-motion: reduce) {
          .alertas-item, .alertas-loading { animation: none; }
        }
      `}</style>

      <div className="alertas-header">
        <div>
          <h3 className="alertas-title">🚨 Alertas Climáticas</h3>
          <p className="alertas-subtitle">
            {provincia ? `En ${provincia}` : 'Selecciona una provincia en el mapa'}
          </p>
        </div>
        {datosProvincia && (
          <div className="alertas-stats">
            <span className="stat-item">🌡️ {datosProvincia.temperatura}°C</span>
            <span className="stat-item">💧 {datosProvincia.humedad}%</span>
            <span className="stat-item">🌧️ {datosProvincia.lluvia}mm</span>
          </div>
        )}
      </div>

      {loading && <div className="alertas-loading" />}

      {!loading && !provincia && (
        <div className="alertas-empty">
          Haz clic en una provincia del mapa para ver sus alertas
        </div>
      )}

      {!loading && provincia && alertas.length === 0 && (
        <div className="alertas-empty" style={{ color: '#22c55e' }}>
          ✅ Sin alertas activas. Condiciones normales.
        </div>
      )}

      {!loading && alertas.length > 0 && (
        <div className="alertas-list">
          {alertas.map((alerta, index) => (
            <div 
              key={alerta.tipo} 
              className="alerta-item"
              style={{ animationDelay: `${index * 0.1}s` }}
            >
              <span className="alerta-icono">{alerta.icono}</span>
              <div className="alerta-contenido">
                <div className="alerta-titulo">{alerta.emoji}</div>
                <div className="alerta-dato">
                  Umbral: {alerta.umbral} • {alerta.tipo === 'hongos' && `Humedad: ${datosProvincia?.humedad}%`}
                  {alerta.tipo === 'sequia' && `Humedad: ${datosProvincia?.humedad}%`}
                  {alerta.tipo === 'calor' && `Temperatura: ${datosProvincia?.temperatura}°C`}
                  {alerta.tipo === 'inundacion' && `Lluvia: ${datosProvincia?.lluvia}mm`}
                </div>
                <div className="alerta-consejo">💡 {alerta.consejo}</div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}