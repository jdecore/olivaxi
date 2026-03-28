export const apiUrl = (path: string) => {
  // Usar la URL absoluta basada en la ubicación actual
  if (typeof window !== 'undefined') {
    // Construir la URL base desde la ubicación actual del navegador
    const base = `${window.location.protocol}//${window.location.host}`;
    return `${base}/api${path}`;
  }
  return `http://localhost:3000${path}`;
};
