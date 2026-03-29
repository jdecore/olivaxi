export const apiUrl = (path: string) => {
  const cleanPath = path.replace(/\/$/, '');
  return `https://olivaxi.duckdns.org/api${cleanPath}`;
};