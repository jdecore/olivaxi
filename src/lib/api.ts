// API URL configuration for ollaξ
// All API calls should use these helpers

export function getApiUrl(): string {
  if (typeof window !== 'undefined') {
    const { protocol, hostname } = window.location;
    
    // Local development - use proxy
    if (hostname === 'localhost' || hostname === '127.0.0.1' || hostname.startsWith('192.168.') || hostname.startsWith('10.')) {
      return '';
    }
  }

  // Production - use external API URL
  return 'http://45.90.237.135:3000';
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
  const candidates = ['/api' + cleanPath];
  
  if (typeof window !== 'undefined') {
    const { protocol, hostname } = window.location;
    candidates.push(protocol + '//' + hostname + ':3000/api' + cleanPath);
    candidates.push('http://localhost:3000/api' + cleanPath);
  }

  return candidates.map(c => c.replace(/\/+/g, '/'));
}