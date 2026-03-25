import { useState, useEffect } from 'react';
import { apiUrl } from '../lib/api';
import { useMap } from 'react-leaflet';

function MapResizer() {
  const map = useMap();
  useEffect(() => {
    setTimeout(() => map.invalidateSize(), 100);
    return undefined;
  }, [map]);
  return null;
}

export default function MapaCalor({ onProvinciaClick }) {
  const [MapComponent, setMapComponent] = useState(null);
  const [datos, setDatos] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState(null);
  const [filtroActivo, setFiltroActivo] = useState("temperatura");
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
    console.log('[MapaCalor] Starting load, apiUrl:', apiUrl('/api/clima'));
    
    import('react-leaflet')
      .then((leaflet) => {
        console.log('[MapaCalor] Leaflet imported');
        setMapComponent(leaflet);
        return fetch(apiUrl('/api/clima'));
      })
      .then((r) => {
        console.log('[MapaCalor] Fetch response:', r.status);
        if (!r.ok) throw new Error('Error al cargar clima: ' + r.status);
        return r.json();
      })
      .then((data) => {
        console.log('[MapaCalor] Data received:', data.length, 'items');
        setDatos(data);
        setCargando(false);
      })
      .catch((err) => {
        console.error('[MapaCalor] Error:', err);
        setError(err.message);
        setCargando(false);
      });
  }, []);

  const datosFiltrados = datos;

  const skeletonProvincias = [
    { nombre: "Jaén", lat: 37.77, lon: -3.79 },
    { nombre: "Córdoba", lat: 37.88, lon: -4.78 },
    { nombre: "Sevilla", lat: 37.38, lon: -5.97 },
    { nombre: "Granada", lat: 37.18, lon: -3.6 },
    { nombre: "Málaga", lat: 36.72, lon: -4.42 },
    { nombre: "Badajoz", lat: 38.87, lon: -6.97 },
  ];

  // Calculate position for skeleton circles based on lat/lon
  const getSkeletonPosition = (lat, lon) => {
    // Map bounds: [[27, -20], [55, 15]]
    const minLat = 27, maxLat = 55, minLon = -20, maxLon = 15;
    const x = ((lon - minLon) / (maxLon - minLon)) * 100;
    const y = ((maxLat - lat) / (maxLat - minLat)) * 100;
    return { left: `${x}%`, top: `${y}%` };
  };

  if (cargando || !MapComponent) {
    return (
      <div className="mapa-skeleton">
        <div className="skeleton-filters">
          <div className="skeleton-select"></div>
        </div>
        <div className="skeleton-map">
          {skeletonProvincias.map((p, i) => {
            const pos = getSkeletonPosition(p.lat, p.lon);
            return (
              <div 
                key={i} 
                className="skeleton-circle"
                style={{
                  ...pos,
                  transform: 'translate(-50%, -50%)'
                }}
              />
            );
          })}
        </div>
        <p className="skeleton-text">Cargando datos climáticos...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="mapa-error">
        <p>⚠️ {error} — Intenta recargar la página</p>
      </div>
    );
  }

  const { MapContainer, TileLayer, CircleMarker, Tooltip } = MapComponent;

  const getColorByTemperatura = (temp) => {
    if (temp < 10) return { fill: '#74B9FF', stroke: '#0984e3' };
    if (temp < 20) return { fill: '#55EFC4', stroke: '#00b894' };
    if (temp < 28) return { fill: '#A8D8A8', stroke: '#27ae60' };
    if (temp < 35) return { fill: '#FDCB6E', stroke: '#f39c12' };
    if (temp < 38) return { fill: '#E17055', stroke: '#d63031' };
    return { fill: '#D63031', stroke: '#b71c1c' };
  };

  const getColorByHumedad = (humedad) => {
    if (humedad < 20) return { fill: '#D63031', stroke: '#b71c1c' };
    if (humedad < 40) return { fill: '#E17055', stroke: '#d63031' };
    if (humedad < 60) return { fill: '#FDCB6E', stroke: '#f39c12' };
    if (humedad < 80) return { fill: '#55EFC4', stroke: '#00b894' };
    return { fill: '#74B9FF', stroke: '#0984e3' };
  };

  const getColorByPrecipitacion = (lluvia) => {
    if (lluvia === 0) return { fill: '#FDCB6E', stroke: '#f39c12' };
    if (lluvia < 2) return { fill: '#55EFC4', stroke: '#00b894' };
    if (lluvia < 10) return { fill: '#74B9FF', stroke: '#0984e3' };
    return { fill: '#0984e3', stroke: '#0652DD' };
  };

  const getColor = (provincia) => {
    switch (filtroActivo) {
      case 'temperatura':
        return getColorByTemperatura(provincia.temperatura);
      case 'humedad':
        return getColorByHumedad(provincia.humedad);
      case 'precipitacion':
        return getColorByPrecipitacion(provincia.lluvia);
      default:
        return getColorByTemperatura(provincia.temperatura);
    }
  };

  const getMarkerRadius = (humedad) => {
    return 8 + (humedad / 100) * 8;
  };

  const getRiesgoEmoji = (riesgo) => {
    return riesgo === 'alto' ? '🔴' : riesgo === 'medio' ? '🟡' : '🟢';
  };

  const getLeyenda = () => {
    switch (filtroActivo) {
      case 'temperatura':
        return [
          { label: '<10°C', color: '#74B9FF' },
          { label: '10-20°C', color: '#55EFC4' },
          { label: '20-28°C', color: '#A8D8A8' },
          { label: '28-35°C', color: '#FDCB6E' },
          { label: '35-38°C', color: '#E17055' },
          { label: '>38°C', color: '#D63031' },
        ];
      case 'humedad':
        return [
          { label: '<20%', color: '#D63031' },
          { label: '20-40%', color: '#E17055' },
          { label: '40-60%', color: '#FDCB6E' },
          { label: '60-80%', color: '#55EFC4' },
          { label: '>80%', color: '#74B9FF' },
        ];
      case 'precipitacion':
        return [
          { label: '0mm', color: '#FDCB6E' },
          { label: '<2mm', color: '#55EFC4' },
          { label: '2-10mm', color: '#74B9FF' },
          { label: '>10mm', color: '#0984e3' },
        ];
      default:
        return [];
    }
  };

  const getTooltipContent = (provincia, fill) => {
    const baseStyle = {
      fontFamily: '-apple-system, sans-serif',
      fontSize: '12px',
      fontWeight: '600',
      color: modoOscuro ? '#F7F4EE' : '#1C1C1C',
      background: modoOscuro ? '#000000' : '#F7F4EE',
      border: '2px solid #F7F4EE',
      borderRadius: '4px',
      padding: '6px 10px',
      minWidth: '100px'
    };

    switch (filtroActivo) {
      case 'temperatura':
        return (
          <div style={baseStyle}>
            <div style={{ fontSize: '14px', marginBottom: '4px' }}>{provincia.provincia}</div>
            <div style={{ color: fill, fontSize: '13px', fontWeight: '700' }}>
              🌡️ {provincia.temperatura}°C
            </div>
            <div style={{ fontSize: '11px', color: modoOscuro ? '#a0a095' : '#4a4a40', marginTop: '2px' }}>
              {provincia.estado}
            </div>
          </div>
        );
      case 'humedad':
        return (
          <div style={baseStyle}>
            <div style={{ fontSize: '14px', marginBottom: '4px' }}>{provincia.provincia}</div>
            <div style={{ color: fill, fontSize: '13px', fontWeight: '700' }}>
              💧 {provincia.humedad}%
            </div>
            {provincia.suelo_humedad !== undefined && (
              <div style={{ fontSize: '11px', color: modoOscuro ? '#a0a095' : '#4a4a40', marginTop: '2px' }}>
                🌱 Suelo: {(provincia.suelo_humedad * 100).toFixed(0)}%
              </div>
            )}
          </div>
        );
      case 'precipitacion':
        return (
          <div style={baseStyle}>
            <div style={{ fontSize: '14px', marginBottom: '4px' }}>{provincia.provincia}</div>
            <div style={{ color: fill, fontSize: '13px', fontWeight: '700' }}>
              🌧️ {provincia.lluvia}mm
            </div>
            {provincia.evapotranspiracion !== undefined && (
              <div style={{ fontSize: '11px', color: modoOscuro ? '#a0a095' : '#4a4a40', marginTop: '2px' }}>
                💨 ET0: {provincia.evapotranspiracion.toFixed(1)}mm
              </div>
            )}
          </div>
        );
      default:
        return null;
    }
  };

  const filterLabels = {
    temperatura: 'Temp',
    humedad: 'Humedad',
    precipitacion: 'Lluvia'
  };

  const filterIcons = {
    temperatura: '🌡️',
    humedad: '💧',
    precipitacion: '🌧️'
  };

  return (
    <MapContainer
      center={[40.0, -3.5]}
      zoom={6}
      minZoom={5}
      maxZoom={10}
      maxBounds={[[27, -20], [55, 15]]}
      style={{ 
        height: '380px', 
        width: '100%', 
        borderRadius: '4px'
      }}
      className="mapa-container"
    >
      <style>{`
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(4px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes pulse {
          0%, 100% { transform: scale(1); opacity: 0.15; }
          50% { transform: scale(1.1); opacity: 0.25; }
        }
        @keyframes skeletonPulse {
          0%, 100% { opacity: 0.3; }
          50% { opacity: 0.5; }
        }
        .marker-fadeIn {
          animation: fadeIn 0.35s ease-out forwards;
          opacity: 0;
        }
        .marker-pulse {
          animation: pulse 2s ease-in-out infinite;
        }
        .skeleton-circle {
          position: absolute;
          width: 20px;
          height: 20px;
          border-radius: 50%;
          background: ${modoOscuro ? '#333' : '#ccc'};
          animation: skeletonPulse 1.5s ease-in-out infinite;
        }
        .mapa-filters {
          position: absolute;
          top: 10px;
          right: 10px;
          z-index: 1000;
          display: flex;
          gap: 4px;
          background: ${modoOscuro ? 'rgba(0,0,0,0.85)' : 'rgba(247,244,238,0.85)'};
          padding: 6px;
          border-radius: 4px;
          border: 2px solid #F7F4EE;
        }
        .mapa-filters button {
          padding: 4px 8px;
          font-size: 11px;
          font-weight: 600;
          border: 1px solid #F7F4EE;
          border-radius: 3px;
          background: var(--color-limon);
          color: #1C1C1C;
          cursor: pointer;
          transition: all 0.2s;
        }
        .mapa-filters button:hover {
          background: #c5d93e;
        }
        .mapa-filters button.active {
          background: #FFFFFF;
          color: #1C1C1C;
          border-color: #FFFFFF;
        }
        .mapa-skeleton {
          height: 380px;
          width: 100%;
          background: ${modoOscuro ? '#000' : '#F7F4EE'};
          border-radius: 4px;
          border: 2px solid #F7F4EE;
          position: relative;
          display: flex;
          flex-direction: column;
        }
        .skeleton-text {
          position: absolute;
          bottom: 20px;
          left: 50%;
          transform: translateX(-50%);
          color: ${modoOscuro ? '#a0a095' : '#4a4a40'};
          font-size: 12px;
        }
        .skeleton-filters {
          position: absolute;
          top: 10px;
          right: 10px;
          z-index: 10;
        }
        .skeleton-select {
          width: 70px;
          height: 26px;
          background: ${modoOscuro ? '#333' : '#ccc'};
          border-radius: 3px;
          animation: skeletonPulse 1.5s ease-in-out infinite;
        }
        .skeleton-map {
          height: 340px;
          width: 100%;
          position: relative;
        }
        .skeleton-circle {
          position: absolute;
          width: 20px;
          height: 20px;
          border-radius: 50%;
          background: ${modoOscuro ? '#333' : '#ccc'};
          animation: skeletonPulse 1.5s ease-in-out infinite;
        }
        .olivax-tooltip .leaflet-tooltip {
          background: transparent;
          border: none;
          box-shadow: none;
        }
        /* Reduced motion support */
        @media (prefers-reduced-motion: reduce) {
          .marker-fadeIn { animation: none; opacity: 1; }
          .marker-pulse { animation: none; }
          .skeleton-circle { animation: none; }
        }
        /* Mobile optimization */
        @media (max-width: 768px) {
          .marker-fadeIn { animation-duration: 0.2s; }
        }
      `}</style>
      <MapResizer />
      <div className="mapa-filters">
        {['temperatura', 'humedad', 'precipitacion'].map((filtro) => (
          <button
            key={filtro}
            className={filtroActivo === filtro ? 'active' : ''}
            onClick={() => setFiltroActivo(filtro)}
          >
            {filterIcons[filtro]} {filterLabels[filtro]}
          </button>
        ))}
      </div>
      <TileLayer 
        url={modoOscuro 
          ? "https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
          : "https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png"
        }
        attribution='© CartoDB'
      />
      {datosFiltrados.map((provincia, index) => {
        const { fill, stroke } = getColor(provincia);
        const radius = getMarkerRadius(provincia.humedad);
        const isExtremo = provincia.estado === 'Extremo' && filtroActivo === 'temperatura';
        
        return (
          <div key={provincia.provincia}>
            {/* Pulse effect for extreme markers when viewing temperature */}
            {isExtremo && (
              <CircleMarker
                center={[provincia.lat, provincia.lon]}
                radius={radius + 8}
                pathOptions={{
                  fillColor: fill,
                  fillOpacity: 0.15,
                  color: fill,
                  weight: 0,
                  interactive: false
                }}
              />
            )}
            {/* Main marker */}
            <CircleMarker
              center={[provincia.lat, provincia.lon]}
              radius={radius}
              pathOptions={{
                fillColor: fill,
                color: stroke,
                fillOpacity: 0.9,
                weight: 2.5,
              }}
              className={`marker-fadeIn ${isExtremo ? 'marker-pulse' : ''}`}
              style={{
                animationDelay: `${index * 0.05}s`
              }}
              eventHandlers={{
                click: () => {
                  if (onProvinciaClick) {
                    onProvinciaClick(provincia.provincia);
                  } else {
                    window.dispatchEvent(new CustomEvent('provincia-seleccionada', { 
                      detail: { provincia: provincia.provincia } 
                    }));
                  }
                }
              }}
            >
              <Tooltip 
                permanent={false} 
                direction="top"
                className="olivax-tooltip"
              >
                {getTooltipContent(provincia, fill)}
              </Tooltip>
            </CircleMarker>
          </div>
        );
      })}
      {/* Legend - horizontal compact */}
      <div style={{
        position: 'absolute',
        bottom: '10px',
        left: '10px',
        right: '10px',
        background: modoOscuro ? 'rgba(0,0,0,0.95)' : 'rgba(247,244,238,0.95)',
        border: '2px solid #F7F4EE',
        borderRadius: '4px',
        padding: '6px 8px',
        fontSize: '9px',
        fontFamily: '-apple-system, sans-serif',
        zIndex: 1000,
        display: 'flex',
        flexWrap: 'wrap',
        gap: '4px',
        justifyContent: 'center'
      }}>
        {getLeyenda().map((item) => (
          <div key={item.label} style={{ display: 'flex', alignItems: 'center', gap: '3px' }}>
            <div style={{
              width: '8px',
              height: '8px',
              borderRadius: '50%',
              background: item.color,
              border: '1px solid #F7F4EE',
              flexShrink: 0
            }}></div>
            <span style={{ color: modoOscuro ? '#F7F4EE' : '#1C1C1C', whiteSpace: 'nowrap' }}>{item.label}</span>
          </div>
        ))}
      </div>
    </MapContainer>
  );
}