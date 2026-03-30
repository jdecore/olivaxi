// ═══════════════════════════════════════════════════════════
// olivaξ Ecosistema - ÚNICA fuente de verdad compartida
// ═══════════════════════════════════════════════════════════

import { PROVINCIAS, VARIEDADES, CACHE_TTL, API_ENDPOINTS, KC_OLIVO } from './constants';
import { apiUrl } from './api';
import { olivaxiCache } from './cache';

// --- Tipos ---
export interface EcosistemaState {
  provincia: string;
  variedad: string;
  climaData: any[] | null;
  dashboardData: any | null;
}

export type EcosistemaListener = (state: EcosistemaState) => void;

// --- Helpers de UI (reutilizables) ---
export function getRiesgoClass(nivel: string | undefined | null): string {
  if (!nivel) return 'bajo';
  if (nivel === 'alto' || nivel === 'crítico') return 'alto';
  if (nivel === 'medio' || nivel === 'media') return 'medio';
  return 'bajo';
}

export function getRiesgoIcono(nivel: string | undefined | null): string {
  if (nivel === 'alto' || nivel === 'crítico') return '🔴';
  if (nivel === 'medio') return '🟡';
  return '🟢';
}

export function getRiesgoLabel(nivel: string | undefined | null): string {
  if (nivel === 'alto' || nivel === 'crítico') return 'Riesgo alto';
  if (nivel === 'medio') return 'Riesgo medio';
  return 'Riesgo bajo';
}

// --- Constantes reexportadas ---
export { PROVINCIAS, VARIEDADES, CACHE_TTL, API_ENDPOINTS, KC_OLIVO };

// ═══════════════════════════════════════════════════════════
// Ecosistema singleton
// ═══════════════════════════════════════════════════════════
const OlivaxiEcosistema = {
  // Keys de localStorage
  PROVINCIA_KEY: 'olivaxi_provincia',
  VARIEDAD_KEY: 'olivaxi_variedad',

  // Estado interno
  _provincia: '',
  _variedad: '',
  _climaData: null as any[] | null,
  _dashboardData: null as any | null,
  _listeners: new Set<EcosistemaListener>(),
  _initialized: false,

  // ═══════════════════════════════
  // GETTERS
  // ═══════════════════════════════
  get provincia(): string { return this._provincia; },
  get variedad(): string { return this._variedad; },
  get climaData(): any[] | null { return this._climaData; },
  get dashboardData(): any | null { return this._dashboardData; },

  getState(): EcosistemaState {
    return {
      provincia: this._provincia,
      variedad: this._variedad,
      climaData: this._climaData,
      dashboardData: this._dashboardData,
    };
  },

  // ═══════════════════════════════
  // SETTERS (notifican a todos)
  // ═══════════════════════════════
  setProvincia(value: string, options?: { silent?: boolean; fetchDashboard?: boolean }) {
    const opts = { silent: false, fetchDashboard: true, ...options };
    const prev = this._provincia;
    this._provincia = value;

    if (typeof localStorage !== 'undefined') {
      if (value) {
        localStorage.setItem(this.PROVINCIA_KEY, value);
      } else {
        localStorage.removeItem(this.PROVINCIA_KEY);
      }
    }

    if (!opts.silent) {
      this._notify();
    }

    // Fetch dashboard si cambió la provincia
    if (opts.fetchDashboard && value && value !== prev) {
      this.fetchDashboard();
    }
  },

  setVariedad(value: string, options?: { silent?: boolean; fetchDashboard?: boolean }) {
    const opts = { silent: false, fetchDashboard: true, ...options };
    const prev = this._variedad;
    this._variedad = value;

    if (typeof localStorage !== 'undefined') {
      if (value) {
        localStorage.setItem(this.VARIEDAD_KEY, value);
      } else {
        localStorage.removeItem(this.VARIEDAD_KEY);
      }
    }

    if (!opts.silent) {
      this._notify();
    }

    // Refetch dashboard si cambió la variedad y hay provincia
    if (opts.fetchDashboard && this._provincia && value !== prev) {
      this.fetchDashboard();
    }
  },

  // ═══════════════════════════════
  // LISTENERS
  // ═══════════════════════════════
  onChange(listener: EcosistemaListener): () => void {
    this._listeners.add(listener);
    // Llamar inmediatamente con el estado actual
    listener(this.getState());
    return () => { this._listeners.delete(listener); };
  },

  _notify() {
    const state = this.getState();
    this._listeners.forEach(fn => {
      try { fn(state); } catch (e) { console.error('[Ecosistema] Listener error:', e); }
    });
  },

  // ═══════════════════════════════
  // FETCH centralizados
  // ═══════════════════════════════
  async fetchClima(): Promise<any[]> {
    // Cache primero
    const cached = olivaxiCache.get<any[]>(API_ENDPOINTS.CLIMA, undefined, CACHE_TTL.CLIMA);
    if (cached) {
      this._climaData = cached;
      return cached;
    }

    try {
      const res = await fetch(apiUrl(API_ENDPOINTS.CLIMA));
      if (!res.ok) throw new Error(`API ${res.status}`);
      const data = await res.json();
      olivaxiCache.set(API_ENDPOINTS.CLIMA, data);
      this._climaData = data;
      return data;
    } catch (e) {
      console.error('[Ecosistema] Error fetchClima:', e);
      return this._climaData || [];
    }
  },

  async fetchDashboard(): Promise<any | null> {
    if (!this._provincia) return null;

    const params: Record<string, string> = { provincia: this._provincia };
    if (this._variedad) params.variedad = this._variedad;

    // Cache primero
    const cached = olivaxiCache.get<any>(API_ENDPOINTS.DASHBOARD, params, CACHE_TTL.DASHBOARD);
    if (cached) {
      this._dashboardData = cached;
      this._notify();
      return cached;
    }

    try {
      const query = new URLSearchParams(params).toString();
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 5000);
      const res = await fetch(apiUrl(`${API_ENDPOINTS.DASHBOARD}?${query}`), { signal: controller.signal });
      clearTimeout(timeout);

      if (!res.ok) throw new Error(`API ${res.status}`);
      const data = await res.json();

      if (data.ok) {
        olivaxiCache.set(API_ENDPOINTS.DASHBOARD, data, params);
        this._dashboardData = data;
        this._notify();
        return data;
      }
    } catch (e) {
      console.error('[Ecosistema] Error fetchDashboard:', e);
    }
    return null;
  },

  // ═══════════════════════════════
  // ACCIONES de conveniencia
  // ═══════════════════════════════

  // Seleccionar provincia y opcionalmente variedad juntos
  seleccionar(provincia: string, variedad?: string) {
    const provChanged = provincia !== this._provincia;
    const varChanged = variedad !== undefined && variedad !== this._variedad;

    this._provincia = provincia;
    if (variedad !== undefined) this._variedad = variedad;

    if (typeof localStorage !== 'undefined') {
      if (provincia) localStorage.setItem(this.PROVINCIA_KEY, provincia);
      if (variedad !== undefined) {
        if (variedad) localStorage.setItem(this.VARIEDAD_KEY, variedad);
        else localStorage.removeItem(this.VARIEDAD_KEY);
      }
    }

    this._notify();

    if (provChanged || varChanged) {
      this.fetchDashboard();
    }
  },

  // Limpiar todo
  limpiar() {
    this._provincia = '';
    this._variedad = '';
    this._dashboardData = null;
    if (typeof localStorage !== 'undefined') {
      localStorage.removeItem(this.PROVINCIA_KEY);
      localStorage.removeItem(this.VARIEDAD_KEY);
    }
    this._notify();
  },

  // Invalidar cache
  invalidateCache(tipo?: 'clima' | 'dashboard') {
    if (!tipo || tipo === 'clima') olivaxiCache.invalidate(API_ENDPOINTS.CLIMA);
    if (!tipo || tipo === 'dashboard') olivaxiCache.invalidate(API_ENDPOINTS.DASHBOARD);
  },

  // ═══════════════════════════════
  // INICIALIZACIÓN
  // ═══════════════════════════════
  init() {
    if (this._initialized) return;
    this._initialized = true;

    if (typeof localStorage === 'undefined' || typeof window === 'undefined') return;

    // Restaurar estado desde localStorage
    this._provincia = localStorage.getItem(this.PROVINCIA_KEY) || '';
    this._variedad = localStorage.getItem(this.VARIEDAD_KEY) || '';

    // Escuchar cambios entre tabs
    window.addEventListener('storage', (e) => {
      if (e.key === this.PROVINCIA_KEY) {
        this._provincia = e.newValue || '';
        this._notify();
        if (this._provincia) this.fetchDashboard();
      }
      if (e.key === this.VARIEDAD_KEY) {
        this._variedad = e.newValue || '';
        this._notify();
        if (this._provincia) this.fetchDashboard();
      }
    });

    // Compatibilidad: escuchar eventos legacy del mapa
    window.addEventListener('provincia-seleccionada', ((e: CustomEvent) => {
      const prov = e.detail?.provincia;
      if (prov && prov !== this._provincia) {
        this.setProvincia(prov);
      }
    }) as EventListener);

    window.addEventListener('variedad-seleccionada', ((e: CustomEvent) => {
      const v = e.detail?.variedad;
      if (v !== undefined && v !== this._variedad) {
        this.setVariedad(v);
      }
    }) as EventListener);
  },
};

// Inicializar automáticamente en browser
if (typeof window !== 'undefined') {
  OlivaxiEcosistema.init();
}

export default OlivaxiEcosistema;
