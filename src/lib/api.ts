export const apiUrl = (path: string) => {
  // El subdominio api.olivaxi.duckdns.org sirve la API en la raíz, no en /api
  return `https://api.olivaxi.duckdns.org${path}`;
};
