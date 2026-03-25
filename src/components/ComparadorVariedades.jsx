import { useState, useEffect } from 'react';

export default function ComparadorVariedades({ variedades }) {
  const [seleccionadas, setSeleccionadas] = useState([]);
  const [filtro, setFiltro] = useState('all');
  const [modoOscuro, setModoOscuro] = useState(false);

  useEffect(() => {
    const theme = document.documentElement.getAttribute('data-theme');
    setModoOscuro(theme === 'dark');

    const handleThemeChange = (e) => {
      setModoOscuro(e.detail.modoOscuro);
    };
    window.addEventListener('modoOscuroChange', handleThemeChange);
    return () => window.removeEventListener('modoOscuroChange', handleThemeChange);
  }, []);

  const varietiesFiltradas = filtro === 'all' 
    ? variedades 
    : variedades.filter(v => v.tags.includes(filtro));

  useEffect(() => {
    const botones = document.querySelectorAll('#filter-buttons .filter-btn');
    botones.forEach(btn => {
      btn.addEventListener('click', () => {
        const nuevoFiltro = btn.getAttribute('data-filter');
        setFiltro(nuevoFiltro);
        botones.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
      });
    });
  }, []);

  const toggleSeleccion = (nombre) => {
    if (seleccionadas.includes(nombre)) {
      setSeleccionadas(seleccionadas.filter(s => s !== nombre));
    } else if (seleccionadas.length < 2) {
      setSeleccionadas([...seleccionadas, nombre]);
    } else {
      setSeleccionadas([seleccionadas[1], nombre]);
    }
  };

  const limpiarComparacion = () => {
    setSeleccionadas([]);
  };

  const variedadA = variedades.find(v => v.nombre === seleccionadas[0]);
  const variedadB = variedades.find(v => v.nombre === seleccionadas[1]);

  const getWinner = (key) => {
    if (!variedadA || !variedadB) return null;
    if (variedadA[key] > variedadB[key]) return 'A';
    if (variedadB[key] > variedadA[key]) return 'B';
    return 'tie';
  };

  // Dynamic styles based on theme
  const colors = {
    border: 'var(--color-border)',
    background: 'var(--color-white-surface)',
    text: 'var(--color-aceituna)',
    muted: 'var(--color-muted)',
    accent: 'var(--color-limon)',
    sal: 'var(--color-sal)'
  };

  return (
    <>
      <section className="var-grid">
        {varietiesFiltradas.map((v) => (
          <div className="var-card" key={v.id} data-tags={v.tags.join(",")}>
            <span className="var-badge">{v.etiqueta}</span>
            <h3>🫒 {v.nombre}</h3>
            <p className="var-origen">📍 {v.origen}</p>
            
            <div className="var-bars">
              <div className="var-bar-row">
                <span className="var-bar-label">Sequía</span>
                <div className="var-bar-bg">
                  <div className="var-bar-fill var-bar-sequía" style={{ width: `${v.resistencia_sequia}%` }}></div>
                </div>
                <span className="var-bar-value">{v.resistencia_sequia}%</span>
              </div>
              <div className="var-bar-row">
                <span className="var-bar-label">Calor</span>
                <div className="var-bar-bg">
                  <div className="var-bar-fill var-bar-calor" style={{ width: `${v.tolerancia_calor}%` }}></div>
                </div>
                <span className="var-bar-value">{v.tolerancia_calor}%</span>
              </div>
              <div className="var-bar-row">
                <span className="var-bar-label">Prod.</span>
                <div className="var-bar-bg">
                  <div className="var-bar-fill var-bar-prod" style={{ width: `${v.productividad}%` }}></div>
                </div>
                <span className="var-bar-value">{v.productividad}%</span>
              </div>
            </div>
            
            <p className="var-studies">📄 {v.estudios} estudios</p>
            <p className="var-desc">{v.descripcion}</p>
            <div className="var-notes">🌡️ {v.notas_climaticas}</div>
            
            <button
              onClick={() => toggleSeleccion(v.nombre)}
              className="var-btn"
            >
              {seleccionadas.includes(v.nombre) ? 'Seleccionada ✓' : 'Comparar'}
            </button>
          </div>
        ))}
      </section>

      {seleccionadas.length === 1 && (
        <div className="sticky-bar">
          Selecciona una segunda variedad para comparar
        </div>
      )}

      {seleccionadas.length === 2 && variedadA && variedadB && (
        <div className="compare-panel">
          <button onClick={limpiarComparacion} className="clear-btn">
            × Limpiar comparación
          </button>
          
          <h3 className="compare-title">
            Comparación: {variedadA.nombre} vs {variedadB.nombre}
          </h3>

          <table className="compare-table">
            <thead>
              <tr>
                <th>Métrica</th>
                <th>{variedadA.nombre}</th>
                <th>{variedadB.nombre}</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>Sequía</td>
                <td className={getWinner('resistencia_sequia') === 'A' ? 'winner' : ''}>
                  <div className="bar-container">
                    <div className="bar-bg">
                      <div className={`bar-fill ${getWinner('resistencia_sequia') === 'A' ? 'winner-fill' : 'sequia-fill'}`} style={{ width: `${variedadA.resistencia_sequia}%` }}></div>
                    </div>
                    <span>{variedadA.resistencia_sequia}%</span>
                  </div>
                </td>
                <td className={getWinner('resistencia_sequia') === 'B' ? 'winner' : ''}>
                  <div className="bar-container">
                    <div className="bar-bg">
                      <div className={`bar-fill ${getWinner('resistencia_sequia') === 'B' ? 'winner-fill' : 'sequia-fill'}`} style={{ width: `${variedadB.resistencia_sequia}%` }}></div>
                    </div>
                    <span>{variedadB.resistencia_sequia}%</span>
                  </div>
                </td>
              </tr>
              <tr>
                <td>Calor</td>
                <td className={getWinner('tolerancia_calor') === 'A' ? 'winner' : ''}>
                  <div className="bar-container">
                    <div className="bar-bg">
                      <div className={`bar-fill ${getWinner('tolerancia_calor') === 'A' ? 'winner-fill' : 'calor-fill'}`} style={{ width: `${variedadA.tolerancia_calor}%` }}></div>
                    </div>
                    <span>{variedadA.tolerancia_calor}%</span>
                  </div>
                </td>
                <td className={getWinner('tolerancia_calor') === 'B' ? 'winner' : ''}>
                  <div className="bar-container">
                    <div className="bar-bg">
                      <div className={`bar-fill ${getWinner('tolerancia_calor') === 'B' ? 'winner-fill' : 'calor-fill'}`} style={{ width: `${variedadB.tolerancia_calor}%` }}></div>
                    </div>
                    <span>{variedadB.tolerancia_calor}%</span>
                  </div>
                </td>
              </tr>
              <tr>
                <td>Producción</td>
                <td className={getWinner('productividad') === 'A' ? 'winner' : ''}>
                  <div className="bar-container">
                    <div className="bar-bg">
                      <div className={`bar-fill ${getWinner('productividad') === 'A' ? 'winner-fill' : 'prod-fill'}`} style={{ width: `${variedadA.productividad}%` }}></div>
                    </div>
                    <span>{variedadA.productividad}%</span>
                  </div>
                </td>
                <td className={getWinner('productividad') === 'B' ? 'winner' : ''}>
                  <div className="bar-container">
                    <div className="bar-bg">
                      <div className={`bar-fill ${getWinner('productividad') === 'B' ? 'winner-fill' : 'prod-fill'}`} style={{ width: `${variedadB.productividad}%` }}></div>
                    </div>
                    <span>{variedadB.productividad}%</span>
                  </div>
                </td>
              </tr>
              <tr>
                <td>Estudios</td>
                <td className={getWinner('estudios') === 'A' ? 'winner' : ''}>{variedadA.estudios}</td>
                <td className={getWinner('estudios') === 'B' ? 'winner' : ''}>{variedadB.estudios}</td>
              </tr>
              <tr>
                <td>Origen</td>
                <td>{variedadA.origen}</td>
                <td>{variedadB.origen}</td>
              </tr>
            </tbody>
          </table>
        </div>
      )}

      <style>{`
        .var-grid {
          display: grid;
          grid-template-columns: 1fr;
          gap: 1.5rem;
          max-width: 64rem;
          margin: 0 auto;
          padding: 3rem 1rem;
          background: var(--color-sal);
        }

        @media (min-width: 768px) { .var-grid { grid-template-columns: 1fr 1fr; } }
        @media (min-width: 1024px) { .var-grid { grid-template-columns: 1fr 1fr 1fr; } }

        .var-card {
          background: var(--color-white-surface);
          border: 2px solid var(--color-border);
          border-radius: 6px;
          padding: 1.5rem;
          border-top: 3px solid var(--color-border);
        }

        .var-card:hover {
          border-top-color: var(--color-limon);
        }

        .var-badge {
          background: var(--color-limon);
          color: var(--color-aceituna);
          border-radius: 4px;
          padding: 4px 10px;
          font-size: 11px;
          font-weight: 700;
        }

        .var-card h3 {
          font-weight: 700;
          font-size: 1.25rem;
          margin-top: 0.75rem;
          font-family: 'Gill Sans', 'Gill Sans MT', 'Trebuchet MS', system-ui, sans-serif;
          color: var(--color-aceituna);
        }

        .var-origen {
          font-size: 0.875rem;
          color: var(--color-muted);
          margin-top: 0.25rem;
        }

        .var-bars { margin-top: 1rem; display: flex; flex-direction: column; gap: 0.5rem; }

        .var-bar-row { display: flex; align-items: center; gap: 0.5rem; }

        .var-bar-label { font-size: 11px; color: var(--color-muted); width: 3rem; }

        .var-bar-bg {
          flex: 1;
          background: var(--color-sal);
          border-radius: 4px;
          height: 6px;
        }

        .var-bar-fill { height: 6px; border-radius: 4px; }
        .var-bar-sequía { background: #D4E849; }
        .var-bar-calor { background: #F59E0B; }
        .var-bar-prod { background: #3B82F6; }

        .var-bar-value { font-size: 11px; color: var(--color-muted); width: 2rem; text-align: right; }

        .var-studies { font-size: 0.875rem; color: var(--color-muted); margin-top: 0.75rem; }
        .var-desc { font-size: 0.875rem; color: var(--color-aceituna); margin-top: 0.5rem; }

        .var-notes {
          margin-top: 0.75rem;
          background: var(--color-sal);
          border-radius: 4px;
          padding: 0.5rem;
          font-size: 0.75rem;
          color: var(--color-muted);
        }

        .var-btn {
          margin-top: 10px;
          width: 100%;
          padding: 6px;
          font-size: 11px;
          font-weight: 700;
          text-transform: uppercase;
          letter-spacing: 0.05em;
          border: 2px solid var(--color-border);
          border-radius: 4px;
          cursor: pointer;
          background: var(--color-white-surface);
          color: var(--color-aceituna);
          transition: all 0.2s;
        }

        .var-btn:hover {
          background: var(--color-limon);
        }

        .sticky-bar {
          position: fixed;
          bottom: 0;
          left: 0;
          right: 0;
          background: var(--color-aceituna);
          color: var(--color-sal);
          padding: 10px 20px;
          font-size: 12px;
          text-align: center;
          z-index: 100;
        }

        .compare-panel {
          border: 2px solid var(--color-border);
          border-radius: 6px;
          background: var(--color-white-surface);
          padding: 20px;
          margin: 24px auto 0;
          max-width: 64rem;
        }

        .clear-btn {
          background: transparent;
          border: 2px solid var(--color-border);
          border-radius: 4px;
          font-size: 11px;
          font-weight: 700;
          padding: 6px 12px;
          cursor: pointer;
          float: right;
          color: var(--color-aceituna);
        }

        .compare-title {
          font-size: 18px;
          margin-bottom: 16px;
          margin-top: 0;
          color: var(--color-aceituna);
          font-family: 'Gill Sans', 'Gill Sans MT', 'Trebuchet MS', system-ui, sans-serif;
        }

        .compare-table {
          width: 100%;
          border-collapse: collapse;
        }

        .compare-table th {
          text-align: left;
          padding: 8px;
          font-size: 12px;
          color: var(--color-muted);
          width: 25%;
        }

        .compare-table th:nth-child(2),
        .compare-table th:nth-child(3) {
          text-align: center;
          font-weight: 700;
          color: var(--color-aceituna);
          width: 37.5%;
        }

        .compare-table td {
          padding: 8px;
          font-size: 12px;
          color: var(--color-muted);
          text-align: center;
        }

        .compare-table td:first-child {
          text-align: left;
          color: var(--color-muted);
        }

        .compare-table td.winner {
          background: var(--color-limon);
        }

        .bar-container {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
        }

        .bar-bg {
          width: 60px;
          height: 8px;
          background: var(--color-sal);
          border-radius: 4px;
          overflow: hidden;
        }

        .bar-fill {
          height: 100%;
          border-radius: 4px;
        }

        .winner-fill {
          background: var(--color-aceituna) !important;
        }

        .sequia-fill { background: #D4E849; }
        .calor-fill { background: #F59E0B; }
        .prod-fill { background: #3B82F6; }
      `}</style>
    </>
  );
}