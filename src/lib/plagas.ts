export const PLAGAS_IDS = [
  'mosca',
  'polilla',
  'repilo',
  'xylella',
  'tuberculosis',
  'barrenillo',
  'cochinilla',
  'phytophthora',
  'lepra',
  'verticillium',
] as const;

export const PLAGAS_NOMBRE_POR_ID: Record<string, string> = {
  mosca: 'Mosca del olivo',
  polilla: 'Polilla del olivo',
  repilo: 'Repilo',
  xylella: 'Xylella fastidiosa',
  tuberculosis: 'Tuberculosis del olivo',
  barrenillo: 'Barrenillo',
  cochinilla: 'Cochinilla',
  phytophthora: 'Phytophthora',
  lepra: 'Lepra',
  verticillium: 'Verticillium',
};

export const PLAGAS_ID_POR_NOMBRE: Record<string, string> = {
  'Mosca del olivo': 'mosca',
  'Polilla del olivo (Prays)': 'polilla',
  'Repilo': 'repilo',
  'Xylella fastidiosa': 'xylella',
  'Tuberculosis del olivo': 'tuberculosis',
  'Barrenillo': 'barrenillo',
  'Cochinilla': 'cochinilla',
  'Phytophthora': 'phytophthora',
  'Lepra': 'lepra',
  'Verticillium': 'verticillium',
};
