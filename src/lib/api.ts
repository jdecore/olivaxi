export const apiUrl = (path: string) => {
  // En producción usar el mismo dominio + /api (Traefik redirige al contenedor API)
  if (typeof window !== 'undefined') {
    return `https://olivaxi.duckdns.org/api${path}`;
  }
  return `http://localhost:3000${path}`;
};
