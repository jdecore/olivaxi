// API URL configuration for olivaξ

export function getApiUrl(): string {
  const configuredUrl = (import.meta.env.PUBLIC_API_URL ?? '').toString().trim();
  if (configuredUrl) {
    return configuredUrl.replace(/\/$/, '');
  }

  if (typeof window !== 'undefined') {
    const { hostname, protocol } = window.location;
    
    // Local/development - use proxy
    if (hostname === 'localhost' || hostname === '127.0.0.1' || hostname.startsWith('192.168.') || hostname.startsWith('10.')) {
      return '';
    }

    const configuredPort = (import.meta.env.PUBLIC_API_PORT ?? '3001').toString().trim() || '3001';
    return `${protocol}//${hostname}:${configuredPort}`;
  }

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
  const base = getApiUrl();
  const cleanPath = path.replace(/\/$/, '').replace(/^\/api/, '');
  const relative = `/api${cleanPath}`;
  if (!base || base === '/') return [relative];
  if (base.endsWith('/api')) return [`${base}${cleanPath}`, relative];
  return [`${base}/api${cleanPath}`, relative];
}
