import { useState, useEffect } from 'react';
import { apiUrl } from '../lib/api';

export default function RankingRiesgo() {
  const [provincias, setProvincias] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [modoOscuro, setModoOscuro] = useState(false);

  useEffect(() => {
    // Detectar modo oscuro
    const theme = document.documentElement.getAttribute('data-theme');
    setModoOscuro(theme === 'dark');

    const handleThemeChange = (e) => {
      setModoOscuro(e.detail.modoOscuro);
    };
    window.addEventListener('modoOscuroChange', handleThemeChange);
    return () => window.removeEventListener('modoOscuroChange', handleThemeChange);
  }, []);

  useEffect(() => {
    fetch(apiUrl('/api/clima'))
      .then(r => r.json())
      .then(data => {
        const sorted = [...data].sort((a, b) => b.temperatura - a.temperatura);
        setProvincias(sorted);
        setCargando(false);
      })
      .catch(() => setCargando(false));
  }, []);

  if (cargando) return null;

  const top3 = provincias.slice(0, 3);

  const styles = {
    wrapper: {
      border: '2px solid var(--color-border)',
      borderRadius: '6px',
      background: 'var(--color-white-surface)',
      padding: '16px',
      fontFamily: "'Gill Sans', 'Gill Sans MT', 'Trebuchet MS', system-ui, sans-serif"
    },
    titleRow: {
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: '12px'
    },
    title: {
      fontFamily: "'Gill Sans', 'Gill Sans MT', 'Trebuchet MS', system-ui, sans-serif",
      fontSize: '15px',
      fontWeight: '600',
      color: 'var(--color-aceituna)'
    },
    liveBadge: {
      fontSize: '10px',
      color: 'var(--color-muted)',
      textTransform: 'uppercase',
      letterSpacing: '0.06em'
    },
    row: {
      display: 'flex',
      alignItems: 'center',
      gap: '10px',
      padding: '8px 0',
      borderBottom: '1px solid var(--color-border)'
    },
    rank: {
      fontFamily: "'Gill Sans', 'Gill Sans MT', 'Trebuchet MS', system-ui, sans-serif",
      fontSize: '18px',
      fontWeight: '600',
      color: 'var(--color-aceituna)',
      width: '20px'
    },
    provinceName: {
      fontSize: '13px',
      fontWeight: '600',
      color: 'var(--color-aceituna)'
    },
    provinceTemp: {
      fontSize: '11px',
      color: 'var(--color-muted)'
    },
    riskBadge: (riesgo) => ({
      fontSize: '10px',
      fontWeight: '700',
      textTransform: 'uppercase',
      letterSpacing: '0.05em',
      padding: '3px 8px',
      borderRadius: '4px',
      border: '2px solid',
      background: riesgo === 'alto' ? 'rgba(220, 38, 38, 0.15)' : riesgo === 'medio' ? 'rgba(245, 158, 11, 0.15)' : 'rgba(34, 197, 94, 0.15)',
      color: riesgo === 'alto' ? '#dc2626' : riesgo === 'medio' ? '#92400e' : '#15803d',
      borderColor: riesgo === 'alto' ? '#dc2626' : riesgo === 'medio' ? '#92400e' : '#15803d'
    })
  };

  return (
    <div style={styles.wrapper}>
      <div style={styles.titleRow}>
        <span style={styles.title}>Top riesgo hoy</span>
        <span style={styles.liveBadge}>en vivo</span>
      </div>

      {top3.map((p, i) => (
        <div key={p.provincia} style={{
          ...styles.row,
          borderBottom: i < 2 ? '1px solid var(--color-border)' : 'none'
        }}>
          <span style={styles.rank}>{i + 1}</span>
          <div style={{ flex: 1 }}>
            <div style={styles.provinceName}>{p.provincia}</div>
            <div style={styles.provinceTemp}>{p.temperatura}°C · {p.humedad}% 💧</div>
          </div>
          <span style={styles.riskBadge(p.riesgo)}>{p.riesgo}</span>
        </div>
      ))}
    </div>
  );
}