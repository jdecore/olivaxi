// API URL configuration for olivaξ
// All API calls should use these helpers

export function getApiUrl(): string {
  const base = import.meta.env.PUBLIC_API_URL || 'http://localhost:3000';
  return base.replace(/\/$/, '');
}

export function apiUrl(path: string): string {
  const base = getApiUrl();
  const cleanPath = path.replace(/\/$/, '').replace(/^\/api/, '');
  return `${base}/api${cleanPath}`;
}
