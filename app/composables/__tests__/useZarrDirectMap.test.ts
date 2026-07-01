import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { ref, nextTick } from "vue";

// --- Mock heavy dependencies before importing the composable ---

vi.mock("~/composables/usePosthog", () => ({
  usePosthog: () => ({ capture: vi.fn() }),
}));

vi.mock("maplibre-gl", () => ({
  default: {
    Map: vi.fn().mockImplementation(() => ({
      addControl: vi.fn(),
      on: vi.fn(),
      remove: vi.fn(),
    })),
    NavigationControl: vi.fn(),
  },
}));

vi.mock("@carbonplan/zarr-layer", () => ({
  ZarrLayer: vi.fn().mockImplementation(() => ({
    setSelector: vi.fn(),
    setOpacity: vi.fn(),
    setClim: vi.fn(),
  })),
}));

// useClimateDataset mock — fetchTimeDates now opens the dataset via xarray-ts and
// reads its CF-decoded time axis. The decoding itself is xarray-ts's concern; here
// we control the Date[] it yields and assert our formatting. `undefined` models a
// missing / non-decodable time axis.
let mockTimeDates: Date[] | undefined = [];

vi.mock("~/composables/useClimateDataset", () => ({
  openClimateDataset: vi.fn(() =>
    Promise.resolve({
      coords: { time: { dates: () => mockTimeDates } },
    }),
  ),
}));

// usePosthog is a Nuxt auto-import; provide a stub for the bare happy-dom env.
vi.stubGlobal("usePosthog", () => ({ capture: vi.fn() }));

import {
  fetchTimeDates,
  useZarrDirectMap,
  COLORMAP_TEMP,
  COLORMAP_PRECIP,
  SWWA_SPATIAL_DIMS,
  SWWA_BOUNDS,
  SWWA_PROJ4,
} from "~/composables/useZarrDirectMap";
import type { ClimateVariableConfig } from "~/config/climateVariables";
import type { UnitConverter } from "~/utils/unitConversion";

// Build a ClimateVariableConfig for tests (the composable only reads varName,
// clim, colormap, climUnit and unitConverter).
function makeVar(
  over: Partial<ClimateVariableConfig> = {},
): ClimateVariableConfig {
  return {
    varName: "tasmax",
    label: "Max Temperature",
    clim: [280, 325],
    colormap: COLORMAP_TEMP,
    climUnit: " K",
    unitConverter: undefined as unknown as UnitConverter,
    whatAboutMe: {
      introMetric: "",
      headlineMetric: "",
      chartTitleMetric: "",
      axisLabel: "",
      unitLabel: "",
    },
    ...over,
  };
}

// ---------------------------------------------------------------------------
// Exported constants
// ---------------------------------------------------------------------------

describe("exported constants", () => {
  it("COLORMAP_TEMP has 8 entries, all hex strings", () => {
    expect(COLORMAP_TEMP).toHaveLength(8);
    COLORMAP_TEMP.forEach((c) => expect(c).toMatch(/^#[0-9a-f]{6}$/i));
  });

  it("COLORMAP_PRECIP has 8 entries, all hex strings", () => {
    expect(COLORMAP_PRECIP).toHaveLength(8);
    COLORMAP_PRECIP.forEach((c) => expect(c).toMatch(/^#[0-9a-f]{6}$/i));
  });

  it("SWWA_SPATIAL_DIMS maps lat→rlat and lon→rlon", () => {
    expect(SWWA_SPATIAL_DIMS).toEqual({ lat: "rlat", lon: "rlon" });
  });

  it("SWWA_BOUNDS is a 4-element tuple of numbers", () => {
    expect(SWWA_BOUNDS).toHaveLength(4);
    SWWA_BOUNDS.forEach((v) => expect(typeof v).toBe("number"));
  });

  it("SWWA_PROJ4 is a non-empty string", () => {
    expect(typeof SWWA_PROJ4).toBe("string");
    expect(SWWA_PROJ4.length).toBeGreaterThan(0);
  });
});

// ---------------------------------------------------------------------------
// fetchTimeDates — date-decoding math
// ---------------------------------------------------------------------------

describe("fetchTimeDates", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("formats a decoded Date as a day/short-month/year string in UTC", async () => {
    mockTimeDates = [new Date(Date.UTC(1949, 11, 1))]; // 1 Dec 1949 UTC
    const dates = await fetchTimeDates("https://example.com/store.zarr");
    expect(dates[0]).toContain("1949");
    expect(dates[0]).toContain("Dec");
    expect(dates[0]).toContain("1");
  });

  it("uses the UTC calendar day (near-midnight Date keeps its UTC date)", async () => {
    // 16 Jan 1980 00:00 UTC — must not roll back a day under a local timezone.
    mockTimeDates = [new Date(Date.UTC(1980, 0, 16))];
    const dates = await fetchTimeDates("https://example.com/store.zarr");
    expect(dates[0]).toContain("1980");
    expect(dates[0]).toContain("Jan");
    expect(dates[0]).toContain("16");
  });

  it("returns an array the same length as the decoded dates", async () => {
    mockTimeDates = [
      new Date(Date.UTC(1949, 11, 1)),
      new Date(Date.UTC(1950, 0, 1)),
      new Date(Date.UTC(1950, 1, 1)),
      new Date(Date.UTC(1950, 2, 1)),
    ];
    const dates = await fetchTimeDates("https://example.com/store.zarr");
    expect(dates).toHaveLength(4);
  });

  it("returns an empty array when the time axis is not decodable", async () => {
    mockTimeDates = undefined; // dates() returns undefined for a raw/absent axis
    const dates = await fetchTimeDates("https://example.com/store.zarr");
    expect(dates).toEqual([]);
  });
});

// ---------------------------------------------------------------------------
// useZarrDirectMap composable — initial reactive state
// ---------------------------------------------------------------------------

describe("useZarrDirectMap initial state", () => {
  it("exposes timeIndex=0, opacity=85, timeDates=null on creation", () => {
    const { timeIndex, opacity, timeDates } = useZarrDirectMap(
      "https://example.com/store.zarr",
      makeVar(),
      492,
      { lat: "rlat", lon: "rlon" },
    );
    expect(timeIndex.value).toBe(0);
    expect(opacity.value).toBe(85);
    expect(timeDates.value).toBeNull();
  });

  it("initialises clim from the active variable", () => {
    const { climLower, climUpper } = useZarrDirectMap(
      "https://example.com/store.zarr",
      makeVar({ clim: [6.85, 51.85] }),
      492,
      { lat: "rlat", lon: "rlon" },
    );
    expect(climLower.value).toBe(6.85);
    expect(climUpper.value).toBe(51.85);
  });

  it("timeSteps matches the passed value", () => {
    const { timeSteps } = useZarrDirectMap(
      "https://example.com/store.zarr",
      makeVar(),
      492,
      { lat: "rlat", lon: "rlon" },
    );
    expect(timeSteps).toBe(492);
  });

  it("colourbarStyle gradient contains the active variable's colormap colours", () => {
    const { colourbarStyle } = useZarrDirectMap(
      "https://example.com/store.zarr",
      makeVar({ colormap: COLORMAP_TEMP }),
      492,
      { lat: "rlat", lon: "rlon" },
    );
    const style = colourbarStyle.value;
    expect(style.background).toContain("linear-gradient");
    expect(style.background).toContain(COLORMAP_TEMP[0]);
    expect(style.background).toContain(COLORMAP_TEMP[7]);
  });
});

// ---------------------------------------------------------------------------
// useZarrDirectMap — reacting to a variable change
// ---------------------------------------------------------------------------

describe("useZarrDirectMap reactive variable", () => {
  it("resets clim to the new variable's defaults when the variable changes", async () => {
    const variable = ref(makeVar({ varName: "tasmax", clim: [6.85, 51.85] }));
    const { climLower, climUpper, colourbarStyle } = useZarrDirectMap(
      "https://example.com/store.zarr",
      variable,
      492,
      { lat: "rlat", lon: "rlon" },
    );

    expect(climLower.value).toBe(6.85);

    variable.value = makeVar({
      varName: "pr",
      clim: [0, 8.64],
      colormap: COLORMAP_PRECIP,
    });
    await nextTick();

    expect(climLower.value).toBe(0);
    expect(climUpper.value).toBe(8.64);
    expect(colourbarStyle.value.background).toContain(COLORMAP_PRECIP[0]);
  });
});

// ---------------------------------------------------------------------------
// useZarrDirectMap — unit converter integration
// ---------------------------------------------------------------------------
// Note: ZarrLayer is only constructed once the map mounts (requires a real DOM
// element + map "load"). These tests verify the converter is invoked correctly
// by setClim — the toRaw call is unconditional and happens before the
// null-guarded zarrLayer?.setClim().

describe("useZarrDirectMap with unitConverter", () => {
  it("setClim calls converter.toRaw on both values", () => {
    const converter = {
      toDisplay: vi.fn((k: number) => k - 273.15),
      toRaw: vi.fn((c: number) => c + 273.15),
    };

    const { setClim } = useZarrDirectMap(
      "https://example.com/store.zarr",
      makeVar({ clim: [6.85, 51.85], unitConverter: converter }),
      492,
      { lat: "rlat", lon: "rlon" },
    );

    setClim([10, 40]);

    expect(converter.toRaw).toHaveBeenCalledWith(10);
    expect(converter.toRaw).toHaveBeenCalledWith(40);
  });

  it("setClim does NOT throw when no converter provided", () => {
    const { setClim } = useZarrDirectMap(
      "https://example.com/store.zarr",
      makeVar(),
      492,
      { lat: "rlat", lon: "rlon" },
    );

    expect(() => setClim([285, 320])).not.toThrow();
  });
});

// ---------------------------------------------------------------------------
// useZarrDirectMap — derived computed values
// ---------------------------------------------------------------------------

describe("useZarrDirectMap computed values", () => {
  it("climRange equals |clim[1] - clim[0]|", () => {
    const { climRange } = useZarrDirectMap(
      "https://example.com/store.zarr",
      makeVar({ clim: [280, 325] }),
      492,
      { lat: "rlat", lon: "rlon" },
    );
    expect(climRange.value).toBeCloseTo(45);
  });

  it("climStep is positive", () => {
    const { climStep } = useZarrDirectMap(
      "https://example.com/store.zarr",
      makeVar({ clim: [0, 8.64] }),
      492,
      { lat: "rlat", lon: "rlon" },
    );
    expect(climStep.value).toBeGreaterThan(0);
  });

  it("climFractionDigits is a non-negative integer", () => {
    const { climFractionDigits } = useZarrDirectMap(
      "https://example.com/store.zarr",
      makeVar({ clim: [0, 8.64] }),
      492,
      { lat: "rlat", lon: "rlon" },
    );
    expect(climFractionDigits.value).toBeGreaterThanOrEqual(0);
    expect(Number.isInteger(climFractionDigits.value)).toBe(true);
  });

  it("climDefaults matches the active variable's clim", () => {
    const { climDefaults } = useZarrDirectMap(
      "https://example.com/store.zarr",
      makeVar({ clim: [6.85, 51.85] }),
      492,
      { lat: "rlat", lon: "rlon" },
    );
    expect(climDefaults.value).toEqual([6.85, 51.85]);
  });

  it("climUnit matches the active variable's climUnit", () => {
    const { climUnit } = useZarrDirectMap(
      "https://example.com/store.zarr",
      makeVar({ climUnit: " °C" }),
      492,
      { lat: "rlat", lon: "rlon" },
    );
    expect(climUnit.value).toBe(" °C");
  });
});

// ---------------------------------------------------------------------------
// useZarrDirectMap — handlers before map mounts (zarrLayer is null)
// ---------------------------------------------------------------------------

describe("useZarrDirectMap handlers (no map mounted)", () => {
  it("onTimeChange does not throw", () => {
    const { onTimeChange } = useZarrDirectMap(
      "https://example.com/store.zarr",
      makeVar(),
      492,
      { lat: "rlat", lon: "rlon" },
    );
    expect(() => onTimeChange()).not.toThrow();
  });

  it("onOpacityChange does not throw", () => {
    const { onOpacityChange } = useZarrDirectMap(
      "https://example.com/store.zarr",
      makeVar(),
      492,
      { lat: "rlat", lon: "rlon" },
    );
    expect(() => onOpacityChange()).not.toThrow();
  });

  it("onClimChange does not throw", () => {
    const { onClimChange } = useZarrDirectMap(
      "https://example.com/store.zarr",
      makeVar(),
      492,
      { lat: "rlat", lon: "rlon" },
    );
    expect(() => onClimChange()).not.toThrow();
  });

  it("onProjectionChange does not throw", () => {
    const { onProjectionChange } = useZarrDirectMap(
      "https://example.com/store.zarr",
      makeVar(),
      492,
      { lat: "rlat", lon: "rlon" },
    );
    expect(() => onProjectionChange()).not.toThrow();
  });

  it("resetClim restores climLower and climUpper to the variable's defaults", () => {
    const { climLower, climUpper, resetClim } = useZarrDirectMap(
      "https://example.com/store.zarr",
      makeVar({ clim: [6.85, 51.85] }),
      492,
      { lat: "rlat", lon: "rlon" },
    );

    climLower.value = 10;
    climUpper.value = 40;
    resetClim();

    expect(climLower.value).toBe(6.85);
    expect(climUpper.value).toBe(51.85);
  });
});

// ---------------------------------------------------------------------------
// useZarrDirectMap — debounce callbacks (require fake timers to execute)
// ---------------------------------------------------------------------------

describe("useZarrDirectMap debounce callbacks", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  it("onTimeChange debounce fires after 1 s without throwing", () => {
    const { onTimeChange } = useZarrDirectMap(
      "https://example.com/store.zarr",
      makeVar(),
      492,
      { lat: "rlat", lon: "rlon" },
    );
    onTimeChange();
    expect(() => vi.advanceTimersByTime(1001)).not.toThrow();
  });

  it("onOpacityChange debounce fires after 1 s without throwing", () => {
    const { onOpacityChange } = useZarrDirectMap(
      "https://example.com/store.zarr",
      makeVar(),
      492,
      { lat: "rlat", lon: "rlon" },
    );
    onOpacityChange();
    expect(() => vi.advanceTimersByTime(1001)).not.toThrow();
  });
});

// ---------------------------------------------------------------------------
// useZarrDirectMap — loadingState watch callback
// ---------------------------------------------------------------------------

describe("useZarrDirectMap loadingState watch", () => {
  it("executes the success branch when loading transitions true→false", async () => {
    const { loadingState } = useZarrDirectMap(
      "https://example.com/store.zarr",
      makeVar(),
      492,
      { lat: "rlat", lon: "rlon" },
    );

    loadingState.value = {
      loading: true,
      metadata: true,
      chunks: true,
      error: null,
    };
    await nextTick();
    loadingState.value = {
      loading: false,
      metadata: true,
      chunks: true,
      error: null,
    };
    await nextTick();
    // Watch callback executed the success capture branch without throwing.
  });

  it("executes the error branch when loading settles with an error", async () => {
    const { loadingState } = useZarrDirectMap(
      "https://example.com/store.zarr",
      makeVar(),
      492,
      { lat: "rlat", lon: "rlon" },
    );

    loadingState.value = {
      loading: true,
      metadata: false,
      chunks: false,
      error: null,
    };
    await nextTick();
    loadingState.value = {
      loading: false,
      metadata: false,
      chunks: false,
      error: new Error("fetch failed"),
    };
    await nextTick();
    // Watch callback executed the error capture branch without throwing.
  });
});
