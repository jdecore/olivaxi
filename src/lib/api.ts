export const apiUrl = (path: string) => {
  // En producción usar el subdominio api si está disponible
  if (typeof window !== 'undefined') {
    const host = window.location.hostname;
    if (host.includes('duckdns.org')) {
      // Usar subdominio api si está configurado, si no usar el mismo host
      return `https://api.olivaxi.duckdns.org${path}`;
    }
  }
  const baseUrl = import.meta.env.PUBLIC_API_URL?.replace(/\/$/, "") || "http://localhost:3000";
  return `${baseUrl}${path}`;
};
