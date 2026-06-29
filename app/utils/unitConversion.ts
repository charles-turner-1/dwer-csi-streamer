export interface UnitConverter {
  toDisplay(raw: number): number;
  toRaw(display: number): number;
}

/** Kelvin ↔ degrees Celsius */
export const kelvinToCelsius: UnitConverter = {
  toDisplay: (k) => k - 273.15,
  toRaw: (c) => c + 273.15,
};

/** kg m⁻² s⁻¹ ↔ mm/day (multiply/divide by 86 400 s/day) */
export const precipToMmPerDay: UnitConverter = {
  toDisplay: (v) => v * 86400,
  toRaw: (v) => v / 86400,
};
