export const apiUrl = (path: string) => {
  // En producción (DuckDNS) usar HTTP - Traefik termina SSL y redirige
  if (typeof window !== 'undefined') {
    const host = window.location.hostname;
    if (host.includes('duckdns.org') || host.includes('olivaxi')) {
      return `http://api.olivaxi.duckdns.org${path}`;
    }
    // En desarrollo local
    if (host === 'localhost' || host === '127.0.0.1') {
      return `http://localhost:3000${path}`;
    }
  }
  return `http://localhost:3000${path}`;
};
