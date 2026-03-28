// Sistema de estado compartido para olivaξ
// Agregar en el Layout o en cada página que necesite compartir estado

const OlivaxiState = {
  // Keys de localStorage
  PROVINCIA_KEY: 'olivaxi_provincia',
  VARIEDAD_KEY: 'olivaxi_variedad',
  
  // Evento global para cambios
  CHANGE_EVENT: 'olivaxi-state-change',
  
  // Obtener estado actual
  getProvincia: () => {
    if (typeof localStorage === 'undefined') return null;
    return localStorage.getItem('olivaxi_provincia') || null;
  },
  
  getVariedad: () => {
    if (typeof localStorage === 'undefined') return null;
    return localStorage.getItem('olivaxi_variedad') || null;
  },
  
  // Guardar y notificar cambio
  setProvincia: (value) => {
    if (typeof localStorage === 'undefined') return;
    localStorage.setItem(OlivaxiState.PROVINCIA_KEY, value);
    window.dispatchEvent(new CustomEvent(OlivaxiState.CHANGE_EVENT, {
      detail: { provincia: value, variedad: OlivaxiState.getVariedad() }
    }));
  },
  
  setVariedad: (value) => {
    if (typeof localStorage === 'undefined') return;
    localStorage.setItem(OlivaxiState.VARIEDAD_KEY, value);
    window.dispatchEvent(new CustomEvent(OlivaxiState.CHANGE_EVENT, {
      detail: { provincia: OlivaxiState.getProvincia(), variedad: value }
    }));
  },
  
  // Escuchar cambios desde otras páginas
  onChange: (callback) => {
    window.addEventListener(OlivaxiState.CHANGE_EVENT, (e) => callback(e.detail));
    
    // También escuchar eventos legacy del mapa
    window.addEventListener('provincia-seleccionada', (e) => {
      OlivaxiState.setProvincia(e.detail.provincia);
    });
    window.addEventListener('variedad-seleccionada', (e) => {
      OlivaxiState.setVariedad(e.detail.variedad);
    });
  },
  
  // Sincronizar entre tabs
  init: () => {
    if (typeof localStorage === 'undefined') return;
    
    window.addEventListener('storage', (e) => {
      if (e.key === OlivaxiState.PROVINCIA_KEY || e.key === OlivaxiState.VARIEDAD_KEY) {
        window.dispatchEvent(new CustomEvent(OlivaxiState.CHANGE_EVENT, {
          detail: { 
            provincia: OlivaxiState.getProvincia(), 
            variedad: OlivaxiState.getVariedad() 
          }
        }));
      }
    });
  }
};

// Inicializar
if (typeof window !== 'undefined') {
  OlivaxiState.init();
}

export default OlivaxiState;