export const apiUrl = (path: string) => {
  // El subdominio api ahora tiene HTTPS con letsencrypt
  return `https://api.olivaxi.duckdns.org${path}`;
};
