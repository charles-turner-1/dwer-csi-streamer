import { describe, it, expect, vi, beforeEach } from "vitest";

// --- Mock heavy dependencies before importing the composable ---

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

// zarrita mock — controllable per-test via mockGetResult
let mockGetResult: Float64Array = new Float64Array([0]);

vi.mock("zarrita", () => ({
  FetchStore: vi.fn().mockImplementation(() => ({})),
  root: vi.fn().mockReturnValue({ resolve: vi.fn().mockReturnValue({}) }),
  open: vi.fn().mockResolvedValue({}),
  get: vi.fn().mockImplementation(() =>
    Promise.resolve({
      data: mockGetResult,
      shape: [mockGetResult.length],
      stride: [1],
    }),
  ),
}));

import {
  fetchTimeDates,
  useZarrDirectMap,
  COLORMAP_TEMP,
  COLORMAP_PRECIP,
  SWWA_SPATIAL_DIMS,
  SWWA_BOUNDS,
} from "@/composables/useZarrDirectMap";

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
});

// ---------------------------------------------------------------------------
// fetchTimeDates — date-decoding math
// ---------------------------------------------------------------------------

describe("fetchTimeDates", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("decodes value 0.0 to 1 Dec 1949 00:00 UTC", async () => {
    mockGetResult = new Float64Array([0]);
    const dates = await fetchTimeDates("https://example.com/store.zarr");
    // 1949-12-01 UTC
    expect(dates[0]).toContain("1949");
    expect(dates[0]).toContain("Dec");
    expect(dates[0]).toContain("1");
  });

  it("decodes 365 days to 1 Dec 1950 (non-leap year)", async () => {
    mockGetResult = new Float64Array([365]);
    const dates = await fetchTimeDates("https://example.com/store.zarr");
    expect(dates[0]).toContain("1950");
    expect(dates[0]).toContain("Dec");
  });

  it("decodes fractional day to correct date (0.5 days = still 1 Dec 1949 UTC)", async () => {
    // 0.5 days = 12 hours after 1949-12-01 00:00 UTC — still 1 Dec 1949
    mockGetResult = new Float64Array([0.5]);
    const dates = await fetchTimeDates("https://example.com/store.zarr");
    expect(dates[0]).toContain("Dec");
    expect(dates[0]).toContain("1949");
  });

  it("returns an array the same length as the input data", async () => {
    mockGetResult = new Float64Array([0, 31, 59, 90]);
    const dates = await fetchTimeDates("https://example.com/store.zarr");
    expect(dates).toHaveLength(4);
  });

  it("decodes a known monthly offset correctly (Jan 1980 ≈ day 10988)", async () => {
    // Days from 1949-12-01 to 1980-01-16 (mid-month, typical CF centroid)
    // 1980-01-16 UTC:  Date.UTC(1980,0,16) = 317174400000 ms
    // base:            Date.UTC(1949,11,1) = -633830400000 ms  (negative, pre-epoch)
    // diff ms = 317174400000 - (-633830400000) = 951004800000
    // diff days = 951004800000 / 86400000 = 11007
    mockGetResult = new Float64Array([11007]);
    const dates = await fetchTimeDates("https://example.com/store.zarr");
    expect(dates[0]).toContain("1980");
    expect(dates[0]).toContain("Jan");
  });
});

// ---------------------------------------------------------------------------
// useZarrDirectMap composable — initial reactive state
// ---------------------------------------------------------------------------

describe("useZarrDirectMap initial state", () => {
  it("exposes timeIndex=0, opacity=85, timeDates=null on creation", () => {
    // Import the helper inline since it's light
    const { timeIndex, opacity, timeDates } = useZarrDirectMap(
      "https://example.com/store.zarr",
      "tasmax",
      492,
      [280, 325],
      { lat: "rlat", lon: "rlon" },
      COLORMAP_TEMP,
    );
    expect(timeIndex.value).toBe(0);
    expect(opacity.value).toBe(85);
    expect(timeDates.value).toBeNull();
  });

  it("timeSteps matches the passed prop", () => {
    const { timeSteps } = useZarrDirectMap(
      "https://example.com/store.zarr",
      "tasmax",
      492,
      [280, 325],
      { lat: "rlat", lon: "rlon" },
      COLORMAP_TEMP,
    );
    expect(timeSteps).toBe(492);
  });

  it("colourbarStyle gradient contains colormap colours", () => {
    const { colourbarStyle } = useZarrDirectMap(
      "https://example.com/store.zarr",
      "tasmax",
      492,
      [280, 325],
      { lat: "rlat", lon: "rlon" },
      COLORMAP_TEMP,
    );
    const style = colourbarStyle.value;
    expect(style.background).toContain("linear-gradient");
    expect(style.background).toContain(COLORMAP_TEMP[0]);
    expect(style.background).toContain(COLORMAP_TEMP[7]);
  });
});
