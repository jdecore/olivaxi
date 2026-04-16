// API URL configuration for ollaξ
// All API calls should use these helpers

export function getApiUrl(): string {
  // Use relative path - Vite proxy will forward to Python API on localhost:3000
  if (typeof window !== 'undefined') {
    const { protocol, hostname } = window.location;
    if (hostname === 'localhost' || hostname === '127.0.0.1') {
      return '';
    }
  }

  // In production, use empty string (proxy handles it)
  return '';
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
