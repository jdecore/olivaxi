// Shared constants for olivaξ
// Use these instead of hardcoding in multiple files

export const PROVINCIAS = [
  'Jaén', 'Córdoba', 'Sevilla', 'Granada', 'Málaga',
  'Badajoz', 'Toledo', 'Ciudad Real', 'Almería', 'Huelva'
] as const;

export const VARIEDADES = [
  { id: 'cornicabra', nombre: 'Cornicabra' },
  { id: 'picual', nombre: 'Picual' },
  { id: 'arbequina', nombre: 'Arbequina' },
  { id: 'hojiblanca', nombre: 'Hojiblanca' },
  { id: 'manzanilla', nombre: 'Manzanilla' },
  { id: 'empeltre', nombre: 'Empeltre' },
] as const;

// Cache TTLs (in milliseconds)
export const CACHE_TTL = {
  CLIMA: 3 * 60 * 1000,      // 3 minutes (frontend)
  DASHBOARD: 3 * 60 * 1000,  // 3 minutes (frontend)
  SUELO: 5 * 60 * 1000,      // 5 minutes (frontend)
  PLAGAS: 3 * 60 * 1000,     // 3 minutes (frontend)
} as const;

// Crop coefficient for olive trees
export const KC_OLIVO = 0.7;

// API endpoints
export const API_ENDPOINTS = {
  CLIMA: '/api/clima',
  DASHBOARD: '/api/clima/dashboard',
  ALERTAS: '/api/alertas',
  ALERTAS_TIPOS: '/api/alertas/tipos',
  CHAT: '/api/chat',
} as const;
