// ═══════════════════════════════════════════════════════════
// olivaξ Ecosistema - ÚNICA fuente de verdad compartida
// ═══════════════════════════════════════════════════════════

import { PROVINCIAS, VARIEDADES, CACHE_TTL, API_ENDPOINTS, KC_OLIVO } from './constants';
import { apiUrl } from './api';
import { olivaxiCache } from './cache';

// --- Constantes para validación ---
const VARIEDADES_VALIDAS = VARIEDADES.map(v => v.id);
const PROVINCIAS_VALIDAS = [...PROVINCIAS];
const DASHBOARD_CACHE_PREFIX = 'olivaxi_dashboard_cache:';

async function fetchJsonWithRetry(url: string, retries = 3, timeoutMs = 7000): Promise<any> {
  let lastError: unknown = null;
  for (let attempt = 0; attempt < retries; attempt++) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), timeoutMs);
    try {
      const res = await fetch(url, { signal: controller.signal });
      clearTimeout(timeout);
      if (!res.ok) throw new Error(`API ${res.status}`);
      return await res.json();
    } catch (e) {
      clearTimeout(timeout);
      lastError = e;
      if (attempt < retries - 1) {
        await new Promise(r => setTimeout(r, 450 * (attempt + 1)));
      }
    }
  }
  throw lastError || new Error('Fetch failed');
}

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

// --- Validaciones ---
function isVariedadValida(v: string): boolean {
  return VARIEDADES_VALIDAS.includes(v.toLowerCase());
}

function isProvinciaValida(p: string): boolean {
  return PROVINCIAS_VALIDAS.some(v => v.toLowerCase() === p.toLowerCase());
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
  CLIMA_CACHE_KEY: 'olivaxi_clima_cache',

  // Estado interno
  _provincia: '',
  _variedad: '',
  _climaData: null as any[] | null,
  _dashboardData: null as any | null,
  _listeners: new Set<EcosistemaListener>(),
  _initialized: false,
  _fetchId: 0,
  _climaRefreshPromise: null as Promise<any[]> | null,
  _dashboardRefreshPromise: null as Promise<any | null> | null,

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
    if (value && !isProvinciaValida(value)) {
      console.warn('[Ecosistema] Provincia inválida:', value);
      return;
    }
    
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

    // Fetch dashboard si cambió la provincia, luego notificar (así listeners tienen datos)
    if (opts.fetchDashboard && value && value !== prev) {
      this.fetchDashboard().then(() => {
        if (!opts.silent) this._notify();
      });
    } else if (!opts.silent) {
      this._notify();
    }
  },

  setVariedad(value: string, options?: { silent?: boolean; fetchDashboard?: boolean }) {
    if (value && !isVariedadValida(value)) {
      console.warn('[Ecosistema] Variedad inválida:', value);
      return;
    }
    
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

    // Refetch dashboard si cambió la variedad y hay provincia, luego notificar
    if (opts.fetchDashboard && this._provincia && value !== prev) {
      this.fetchDashboard().then(() => {
        if (!opts.silent) this._notify();
      });
    } else if (!opts.silent) {
      this._notify();
    }
  },

  // ═══════════════════════════════
  // LISTENERS
  // ═══════════════════════════════
  // Listener. Opción { immediate: true } llama al callback al registrarse
  onChange(listener: EcosistemaListener, options?: { immediate?: boolean }): () => void {
    this._listeners.add(listener);
    if (options?.immediate) {
      try { listener(this.getState()); } catch (e) { console.error('[Ecosistema] Listener error:', e); }
    }
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
  async fetchClima(retries = 3): Promise<any[]> {
    // Cache primero
    const cached = olivaxiCache.get<any[]>(API_ENDPOINTS.CLIMA, undefined, CACHE_TTL.CLIMA);
    if (cached) {
      this._climaData = cached;
      if (!this._climaRefreshPromise) {
        this._climaRefreshPromise = (async () => {
          try {
            const fresh = await fetchJsonWithRetry(apiUrl(API_ENDPOINTS.CLIMA), 2, 7000);
            if (Array.isArray(fresh) && fresh.length > 0) {
              olivaxiCache.set(API_ENDPOINTS.CLIMA, fresh);
              this._climaData = fresh;
              if (typeof localStorage !== 'undefined') {
                localStorage.setItem(this.CLIMA_CACHE_KEY, JSON.stringify({ ts: Date.now(), data: fresh }));
              }
              this._notify();
              return fresh;
            }
          } catch (e) {
            console.warn('[Ecosistema] refresh clima en background falló:', e);
          } finally {
            this._climaRefreshPromise = null;
          }
          return cached;
        })();
      }
      return cached;
    }

    try {
      const data = await fetchJsonWithRetry(apiUrl(API_ENDPOINTS.CLIMA), retries, 8000);
      olivaxiCache.set(API_ENDPOINTS.CLIMA, data);
      this._climaData = data;
      if (typeof localStorage !== 'undefined') {
        try {
          localStorage.setItem(this.CLIMA_CACHE_KEY, JSON.stringify({
            ts: Date.now(),
            data,
          }));
        } catch (err) {
          console.warn('[Ecosistema] No se pudo guardar cache local de clima:', err);
        }
      }
      return data;
    } catch (e) {
      console.error('[Ecosistema] fetchClima falló:', e);
    }
    console.error('[Ecosistema] fetchClima falló después de', retries, 'intentos');
    if (typeof localStorage !== 'undefined') {
      try {
        const raw = localStorage.getItem(this.CLIMA_CACHE_KEY);
        if (raw) {
          const parsed = JSON.parse(raw) as { ts?: number; data?: any[] };
          const isFresh = parsed?.ts && (Date.now() - parsed.ts) < (12 * 60 * 60 * 1000);
          if (isFresh && Array.isArray(parsed.data) && parsed.data.length > 0) {
            console.warn('[Ecosistema] Usando cache local de clima por fallo de red/API');
            this._climaData = parsed.data;
            return parsed.data;
          }
        }
      } catch (err) {
        console.warn('[Ecosistema] Cache local de clima inválida:', err);
      }
    }
    return this._climaData || [];
  },

  async fetchDashboard(): Promise<any | null> {
    if (!this._provincia) return null;

    const params: Record<string, string> = { provincia: this._provincia };
    if (this._variedad) params.variedad = this._variedad;
    const localDashboardKey = `${DASHBOARD_CACHE_PREFIX}${this._provincia}:${this._variedad || '-'}`;

    // Cache primero
    const cached = olivaxiCache.get<any>(API_ENDPOINTS.DASHBOARD, params, CACHE_TTL.DASHBOARD);
    if (cached) {
      this._dashboardData = cached;
      if (!this._dashboardRefreshPromise) {
        this._dashboardRefreshPromise = (async () => {
          const query = new URLSearchParams(params).toString();
          const refreshFetchId = ++this._fetchId;
          try {
            const fresh = await fetchJsonWithRetry(apiUrl(`${API_ENDPOINTS.DASHBOARD}?${query}`), 2, 7000);
            if (refreshFetchId !== this._fetchId) return cached;
            if (fresh?.ok) {
              olivaxiCache.set(API_ENDPOINTS.DASHBOARD, fresh, params);
              this._dashboardData = fresh;
              if (typeof localStorage !== 'undefined') {
                localStorage.setItem(localDashboardKey, JSON.stringify({ ts: Date.now(), data: fresh }));
              }
              this._notify();
              return fresh;
            }
          } catch (e) {
            console.warn('[Ecosistema] refresh dashboard en background falló:', e);
          } finally {
            this._dashboardRefreshPromise = null;
          }
          return cached;
        })();
      }
      return cached;
    }

    // Prevenir race conditions: incrementar fetchId antes de cada request
    const fetchId = ++this._fetchId;

    try {
      const query = new URLSearchParams(params).toString();
      const data = await fetchJsonWithRetry(apiUrl(`${API_ENDPOINTS.DASHBOARD}?${query}`), 3, 7000);

      // Verificar que este fetch aún es el más reciente
      if (fetchId !== this._fetchId) {
        console.log('[Ecosistema] fetchDashboard descartado (hay uno más reciente)');
        return null;
      }

      if (data.ok) {
        olivaxiCache.set(API_ENDPOINTS.DASHBOARD, data, params);
        this._dashboardData = data;
        if (typeof localStorage !== 'undefined') {
          try {
            localStorage.setItem(localDashboardKey, JSON.stringify({ ts: Date.now(), data }));
          } catch (err) {
            console.warn('[Ecosistema] No se pudo guardar cache local de dashboard:', err);
          }
        }
        return data;
      }
    } catch (e) {
      // Verificar que este fetch aún es el más reciente antes de reportar error
      if (fetchId !== this._fetchId) {
        return null;
      }
      console.error('[Ecosistema] Error fetchDashboard:', e);
      if (typeof localStorage !== 'undefined') {
        try {
          const raw = localStorage.getItem(localDashboardKey);
          if (raw) {
            const parsed = JSON.parse(raw) as { ts?: number; data?: any };
            const isFresh = parsed?.ts && (Date.now() - parsed.ts) < (12 * 60 * 60 * 1000);
            if (isFresh && parsed?.data?.ok) {
              console.warn('[Ecosistema] Usando cache local de dashboard por fallo de red/API');
              this._dashboardData = parsed.data;
              return parsed.data;
            }
          }
        } catch (err) {
          console.warn('[Ecosistema] Cache local de dashboard inválida:', err);
        }
      }
    }
    return this._dashboardData || null;
  },

  // ═══════════════════════════════
  // ACCIONES de conveniencia
  // ═══════════════════════════════

  // Seleccionar provincia y opcionalmente variedad juntos
  seleccionar(provincia: string, variedad?: string) {
    // Validar antes de proceder
    if (provincia && !isProvinciaValida(provincia)) {
      console.warn('[Ecosistema] Provincia inválida:', provincia);
      return;
    }
    if (variedad !== undefined && variedad && !isVariedadValida(variedad)) {
      console.warn('[Ecosistema] Variedad inválida:', variedad);
      return;
    }

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

    if (provChanged || varChanged) {
      this.fetchDashboard().then(() => {
        this._notify();
      });
    } else {
      this._notify();
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

  },
};

// Inicializar automáticamente en browser
if (typeof window !== 'undefined') {
  OlivaxiEcosistema.init();
}

export default OlivaxiEcosistema;
