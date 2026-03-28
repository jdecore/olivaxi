export const apiUrl = (path: string) => {
  // Usar variable de entorno en producción o fallback dinámico
  const envUrl = "https://api.olivaxi.duckdns.org";
  if (envUrl) {
    return `${envUrl}${path}`;
  }
  // Fallback: usar la URL actual del navegador
  if (typeof window !== 'undefined') {
    const base = `${window.location.protocol}//${window.location.host}`;
    return `${base}/api${path}`;
  }
  return `http://localhost:3000${path}`;
};
