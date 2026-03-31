// API URL configuration for olivaξ
// All API calls should use these helpers

export function getApiUrl(): string {
  const configured = (import.meta.env.PUBLIC_API_URL || '').trim();
  if (configured) return configured.replace(/\/$/, '');

  // Fallback runtime para builds donde PUBLIC_API_URL no quedó inyectado.
  if (typeof window !== 'undefined') {
    const { protocol, hostname } = window.location;
    if (hostname === 'localhost' || hostname === '127.0.0.1') {
      return `${protocol}//${hostname}:3000`;
    }
    return `${protocol}//${hostname}:3001`;
  }

  return 'http://localhost:3000';
}

export function apiUrl(path: string): string {
  const base = getApiUrl();
  const cleanPath = path.replace(/\/$/, '').replace(/^\/api/, '');
  if (!base || base === '/') return `/api${cleanPath}`;
  if (base.endsWith('/api')) return `${base}${cleanPath}`;
  return `${base}/api${cleanPath}`;
}

export function apiUrlCandidates(path: string): string[] {
  const cleanPath = path.replace(/\/$/, '').replace(/^\/api/, '');
  const candidates = [];

  // Prioriza same-origin para despliegues con reverse proxy (Dokploy/Nginx)
  candidates.push(`/api${cleanPath}`);
  candidates.push(apiUrl(path));

  if (typeof window !== 'undefined') {
    const { protocol, hostname } = window.location;
    candidates.push(`${protocol}//${hostname}:3001/api${cleanPath}`);
    candidates.push(`${protocol}//${hostname}:3000/api${cleanPath}`);
    candidates.push(`/api${cleanPath}`);
  }

  return [...new Set(candidates)];
}
