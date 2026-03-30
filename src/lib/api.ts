export const apiUrl = (path: string) => {
  const baseUrl = import.meta.env.PUBLIC_API_URL || 'http://localhost:3000';
  const cleanPath = path.replace(/\/$/, '').replace(/^\/api/, '');
  return `${baseUrl}/api${cleanPath}`;
};