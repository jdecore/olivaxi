export const apiUrl = (path: string) => {
  // El subdominio api.olivaxi.duckdns.org necesita /api prefix
  return `https://api.olivaxi.duckdns.org/api${path}`;
};
