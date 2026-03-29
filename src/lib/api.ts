export const apiUrl = (path: string) => {
  const cleanPath = path.replace(/\/$/, '').replace(/^\/api/, '');
  return `http://45.90.237.135:3001/api${cleanPath}`;
};