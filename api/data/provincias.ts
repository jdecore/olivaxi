export const PROVINCIAS = [
  { nombre: "Jaén", lat: 37.77, lon: -3.79 },
  { nombre: "Córdoba", lat: 37.88, lon: -4.78 },
  { nombre: "Sevilla", lat: 37.38, lon: -5.97 },
  { nombre: "Granada", lat: 37.18, lon: -3.6 },
  { nombre: "Málaga", lat: 36.72, lon: -4.42 },
  { nombre: "Badajoz", lat: 38.87, lon: -6.97 },
  { nombre: "Toledo", lat: 39.86, lon: -4.02 },
  { nombre: "Ciudad Real", lat: 38.98, lon: -3.92 },
  { nombre: "Almería", lat: 36.83, lon: -2.46 },
  { nombre: "Huelva", lat: 37.26, lon: -6.94 },
] as const;

export type Provincia = typeof PROVINCIAS[number];