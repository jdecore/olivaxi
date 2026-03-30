// Shared state for clima data across components
// Prevents duplicate API calls

type ClimaData = any[] | null;

let _climaData: ClimaData = null;
let _climaTimestamp = 0;
const CLIMA_CACHE_TTL = 3 * 60 * 1000; // 3 minutes

const listeners: Set<(data: ClimaData) => void> = new Set();

export function getClimaData(): ClimaData {
  if (_climaData && Date.now() - _climaTimestamp < CLIMA_CACHE_TTL) {
    return _climaData;
  }
  return null;
}

export function setClimaData(data: ClimaData): void {
  _climaData = data;
  _climaTimestamp = Date.now();
  listeners.forEach(fn => fn(data));
}

export function subscribeClimaData(fn: (data: ClimaData) => void): () => void {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

// Simple HTML sanitization for innerHTML usage
export function escapeHtml(str: string | number | undefined | null): string {
  if (str == null) return '';
  const s = String(str);
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

// Safe innerHTML template helper
export function safeHtml(strings: TemplateStringsArray, ...values: any[]): string {
  return strings.reduce((acc, str, i) => {
    const val = values[i - 1];
    return acc + str + (val != null ? escapeHtml(val) : '');
  }, '');
}