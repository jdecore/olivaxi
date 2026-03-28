export const apiUrl = (path: string) => {
  // El subdominio api está configurado con HTTP (sin SSL)
  return `http://api.olivaxi.duckdns.org${path}`;
};
