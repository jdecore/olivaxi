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

export async function apiFetch(path: string, options?: RequestInit): Promise<Response> {
  const url = apiUrl(path);
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 5000);
  
  try {
    const res = await fetch(url, { ...options, signal: controller.signal });
    clearTimeout(timeout);
    return res;
  } catch (e) {
    clearTimeout(timeout);
    throw e;
  }
}

export async function apiFetchJson<T = any>(path: string, options?: RequestInit): Promise<T | null> {
  try {
    const res = await apiFetch(path, options);
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  }
}