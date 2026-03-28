export const apiUrl = (path: string) => {
  // En producción usar la variable de entorno o el subdominio api
  if (typeof window !== 'undefined') {
    const envUrl = "https://api.olivaxi.duckdns.org";
    if (envUrl) return `${envUrl}${path}`;
  }
  const baseUrl = import.meta.env.PUBLIC_API_URL?.replace(/\/$/, "") || "http://localhost:3000";
  return `${baseUrl}${path}`;
};
