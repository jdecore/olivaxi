// Sistema de cache compartido para olivaξ
// Reemplaza el cache en memoria de ChatConsejero.jsx

interface CacheEntry<T> {
  data: T;
  timestamp: number;
}

class OlivaxiCache {
  private cache: Map<string, CacheEntry<any>> = new Map();
  private defaultTTL = 5 * 60 * 1000; // 5 minutos

  private getKey(endpoint: string, params?: Record<string, string>): string {
    const base = endpoint;
    if (!params) return base;
    const query = Object.entries(params)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([k, v]) => `${k}=${v}`)
      .join('&');
    return `${base}?${query}`;
  }

  get<T>(endpoint: string, params?: Record<string, string>, ttl = this.defaultTTL): T | null {
    const key = this.getKey(endpoint, params);
    const entry = this.cache.get(key);
    
    if (!entry) return null;
    
    if (Date.now() - entry.timestamp > ttl) {
      this.cache.delete(key);
      return null;
    }
    
    return entry.data as T;
  }

  set<T>(endpoint: string, data: T, params?: Record<string, string>): void {
    const key = this.getKey(endpoint, params);
    this.cache.set(key, { data, timestamp: Date.now() });
  }

  invalidate(endpoint?: string): void {
    if (!endpoint) {
      this.cache.clear();
      return;
    }
    const keysToDelete: string[] = [];
    this.cache.forEach((_, key) => {
      if (key.startsWith(endpoint)) keysToDelete.push(key);
    });
    keysToDelete.forEach(k => this.cache.delete(k));
  }

  invalidatePattern(pattern: string): void {
    const keysToDelete: string[] = [];
    this.cache.forEach((_, key) => {
      if (key.includes(pattern)) keysToDelete.push(key);
    });
    keysToDelete.forEach(k => this.cache.delete(k));
  }
}

const olivaxiCache = new OlivaxiCache();

export { olivaxiCache };
export default olivaxiCache;