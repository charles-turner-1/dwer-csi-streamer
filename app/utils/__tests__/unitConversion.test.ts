import { describe, it, expect } from "vitest";
import { kelvinToCelsius, precipToMmPerDay } from "~/utils/unitConversion";

// ---------------------------------------------------------------------------
// kelvinToCelsius
// ---------------------------------------------------------------------------

describe("kelvinToCelsius", () => {
  it("toDisplay converts 273.15 K → 0 °C", () => {
    expect(kelvinToCelsius.toDisplay(273.15)).toBeCloseTo(0);
  });

  it("toDisplay converts 373.15 K → 100 °C", () => {
    expect(kelvinToCelsius.toDisplay(373.15)).toBeCloseTo(100);
  });

  it("toRaw converts 0 °C → 273.15 K", () => {
    expect(kelvinToCelsius.toRaw(0)).toBeCloseTo(273.15);
  });

  it("toRaw produces correct K values for typical °C inputs", () => {
    expect(kelvinToCelsius.toRaw(10)).toBeCloseTo(283.15, 2);
    expect(kelvinToCelsius.toRaw(40)).toBeCloseTo(313.15, 2);
    expect(kelvinToCelsius.toRaw(6.85)).toBeCloseTo(280, 1);
    expect(kelvinToCelsius.toRaw(51.85)).toBeCloseTo(325, 1);
  });

  it("round-trips: toDisplay(toRaw(x)) === x", () => {
    const x = 25;
    expect(kelvinToCelsius.toDisplay(kelvinToCelsius.toRaw(x))).toBeCloseTo(x);
  });
});

// ---------------------------------------------------------------------------
// precipToMmPerDay
// ---------------------------------------------------------------------------

describe("precipToMmPerDay", () => {
  it("toDisplay converts 1e-5 kg/m²/s → 0.864 mm/day", () => {
    expect(precipToMmPerDay.toDisplay(1e-5)).toBeCloseTo(0.864);
  });

  it("toDisplay converts 0 → 0", () => {
    expect(precipToMmPerDay.toDisplay(0)).toBe(0);
  });

  it("toRaw converts 8.64 mm/day → 0.0001 kg/m²/s", () => {
    expect(precipToMmPerDay.toRaw(8.64)).toBeCloseTo(0.0001, 6);
  });

  it("toRaw converts 0 → 0", () => {
    expect(precipToMmPerDay.toRaw(0)).toBeCloseTo(0);
  });

  it("round-trips: toRaw(toDisplay(x)) === x", () => {
    const x = 5e-5;
    expect(precipToMmPerDay.toRaw(precipToMmPerDay.toDisplay(x))).toBeCloseTo(
      x,
    );
  });
});
