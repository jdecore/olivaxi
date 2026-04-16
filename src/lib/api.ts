// API URL configuration for ollaξ

export function getApiUrl(): string {
  if (typeof window !== 'undefined') {
    const { hostname } = window.location;
    
    // Local/development - use proxy
    if (hostname === 'localhost' || hostname === '127.0.0.1' || hostname.startsWith('192.168.') || hostname.startsWith('10.')) {
      return '';
    }
  }

  // Production - use external API on port 3000
  return 'http://45.90.237.135:3000';
}

export function apiUrl(path: string): string {
  const base = getApiUrl();
  const cleanPath = path.replace(/\/$/, '').replace(/^\/api/, '');
  if (!base || base === '/') return `/api${cleanPath}`;
  return `${base}/api${cleanPath}`;
}

export function apiUrlCandidates(path: string): string[] {
  const cleanPath = path.replace(/\/$/, '').replace(/^\/api/, '');
  return ['/api' + cleanPath];
}