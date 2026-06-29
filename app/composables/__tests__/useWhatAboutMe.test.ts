import { describe, it, expect, vi, beforeEach } from "vitest";

// ─── Mock heavy dependencies before importing the composable ──────────────────

// Nominatim fetch — overridden per-test via mockFetchImpl
let mockFetchImpl: (url: string) => Promise<Response> = () =>
  Promise.resolve(new Response(JSON.stringify([]), { status: 200 }));

vi.stubGlobal(
  "fetch",
  vi.fn((url: string) => mockFetchImpl(url)),
);

// zarrita — shapes tweaked per-test via the mutable objects below
let mockLatData = new Float32Array([-32.0]);
let mockLonData = new Float32Array([116.0]);
let mockTasmaxData = new Float32Array(492).fill(300); // 300 K = ~26.85 °C

vi.mock("zarrita", () => ({
  FetchStore: vi.fn().mockImplementation(() => ({})),
  root: vi.fn().mockReturnValue({ resolve: vi.fn((name: string) => name) }),
  open: vi.fn().mockResolvedValue({}),
  get: vi.fn().mockImplementation((_arr: unknown, sel?: unknown) => {
    // fetchLatLonGrid calls get twice (no selector); fetchTimeSeries slice call has a selector
    if (sel) {
      return Promise.resolve({ data: mockTasmaxData });
    }
    // Alternate between lat and lon on successive no-selector calls (cache is cleared per test)
    const callCount = (vi.mocked(get).mock.calls as unknown[]).filter(
      (c) => !(c as unknown[])[1],
    ).length;
    return Promise.resolve({
      data: callCount % 2 === 1 ? mockLatData : mockLonData,
    });
  }),
  slice: vi.fn().mockReturnValue({}),
}));

// fetchTimeDates — return a synthetic 492-label array
vi.mock("~/composables/useZarrDirectMap", () => ({
  fetchTimeDates: vi.fn().mockResolvedValue(
    Array.from({ length: 492 }, (_, i) => {
      const year = 1980 + Math.floor(i / 12);
      const month = i % 12;
      const monthName = [
        "Jan",
        "Feb",
        "Mar",
        "Apr",
        "May",
        "Jun",
        "Jul",
        "Aug",
        "Sep",
        "Oct",
        "Nov",
        "Dec",
      ][month];
      return `1 ${monthName} ${year}`;
    }),
  ),
}));

import { get, open } from "zarrita";
import {
  useWhatAboutMe,
  type NominatimSuggestion,
} from "~/composables/useWhatAboutMe";
import { precipToMmPerDay } from "~/utils/unitConversion";

// ─── Helpers ──────────────────────────────────────────────────────────────────

/** Build a well-formed Nominatim search response. */
function nominatimHit(
  lat: number,
  lon: number,
  displayName = "Perth, Western Australia, Australia",
): Response {
  return new Response(
    JSON.stringify([
      { lat: String(lat), lon: String(lon), display_name: displayName },
    ]),
    { status: 200, headers: { "Content-Type": "application/json" } },
  );
}

/** A 492-element Float32Array of valid tasmax values (300 K each). */
function validTasmaxData() {
  return new Float32Array(492).fill(300);
}

/** Reset lat/lon grid cache by re-assigning module-level via vi mock reset. */
function resetLatLonCache() {
  vi.mocked(get).mockClear();
}

// Perth-ish coordinates — within the domain grid mock
const PERTH_LAT = -32.0;
const PERTH_LON = 116.0;

// ─── suggestAddresses ─────────────────────────────────────────────────────────

describe("suggestAddresses (via composable return)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns empty array for query shorter than 2 chars", async () => {
    const { suggestAddresses } = useWhatAboutMe(
      "https://example.com/store.zarr",
    );
    const results = await suggestAddresses("P");
    expect(results).toEqual([]);
    // fetch should NOT have been called
    expect(vi.mocked(fetch)).not.toHaveBeenCalled();
  });

  it("returns empty array on network failure", async () => {
    mockFetchImpl = () => Promise.reject(new Error("network down"));
    const { suggestAddresses } = useWhatAboutMe(
      "https://example.com/store.zarr",
    );
    const results = await suggestAddresses("Perth");
    expect(results).toEqual([]);
  });

  it("returns empty array on non-OK response", async () => {
    mockFetchImpl = () => Promise.resolve(new Response("", { status: 500 }));
    const { suggestAddresses } = useWhatAboutMe(
      "https://example.com/store.zarr",
    );
    const results = await suggestAddresses("Perth");
    expect(results).toEqual([]);
  });

  it("maps Nominatim items to NominatimSuggestion shape", async () => {
    mockFetchImpl = () =>
      Promise.resolve(
        new Response(
          JSON.stringify([
            {
              lat: "-31.9505",
              lon: "115.8605",
              display_name: "Perth, Western Australia, Australia, Extra, Parts",
            },
          ]),
          { status: 200 },
        ),
      );
    const { suggestAddresses } = useWhatAboutMe(
      "https://example.com/store.zarr",
    );
    const results: NominatimSuggestion[] = await suggestAddresses("Perth");
    expect(results).toHaveLength(1);
    expect(results[0]!.lat).toBeCloseTo(-31.9505);
    expect(results[0]!.lon).toBeCloseTo(115.8605);
    // label should be first 3 comma-parts only
    expect(results[0]!.label).toBe("Perth, Western Australia, Australia");
  });

  it("sends countrycodes=au in the request URL", async () => {
    let capturedUrl = "";
    mockFetchImpl = (url) => {
      capturedUrl = url;
      return Promise.resolve(new Response(JSON.stringify([]), { status: 200 }));
    };
    const { suggestAddresses } = useWhatAboutMe(
      "https://example.com/store.zarr",
    );
    await suggestAddresses("Albany");
    expect(capturedUrl).toContain("countrycodes=au");
  });
});

// ─── searchByAddress ──────────────────────────────────────────────────────────

describe("searchByAddress", () => {
  beforeEach(() => {
    resetLatLonCache();
    mockLatData = new Float32Array([PERTH_LAT]);
    mockLonData = new Float32Array([PERTH_LON]);
    mockTasmaxData = validTasmaxData();
  });

  it("sets error when geocoding returns no results", async () => {
    mockFetchImpl = () =>
      Promise.resolve(new Response(JSON.stringify([]), { status: 200 }));
    const { searchByAddress, error } = useWhatAboutMe(
      "https://example.com/store.zarr",
    );
    await searchByAddress("Nowhere");
    expect(error.value).toContain("No results found");
  });

  it("sets error when geocoding request fails (non-OK)", async () => {
    mockFetchImpl = () => Promise.resolve(new Response("", { status: 503 }));
    const { searchByAddress, error } = useWhatAboutMe(
      "https://example.com/store.zarr",
    );
    await searchByAddress("Perth");
    expect(error.value).toContain("Geocoding");
  });

  it("populates headline and time series on success", async () => {
    mockFetchImpl = () => Promise.resolve(nominatimHit(PERTH_LAT, PERTH_LON));
    const { searchByAddress, headline, timeSeries, loading } = useWhatAboutMe(
      "https://example.com/store.zarr",
    );

    await searchByAddress("Perth");

    expect(loading.value).toBe(false);
    expect(headline.value).not.toBeNull();
    expect(timeSeries.value).toHaveLength(492);
  });

  it("sets placeName from the geocoded display name", async () => {
    mockFetchImpl = () =>
      Promise.resolve(
        nominatimHit(
          PERTH_LAT,
          PERTH_LON,
          "Perth, Western Australia, Australia",
        ),
      );
    const { searchByAddress, placeName } = useWhatAboutMe(
      "https://example.com/store.zarr",
    );
    await searchByAddress("Perth");
    // Should be the first 2 comma-parts
    expect(placeName.value).toBe("Perth, Western Australia");
  });

  it("loading is false after completion", async () => {
    mockFetchImpl = () => Promise.resolve(nominatimHit(PERTH_LAT, PERTH_LON));
    const { searchByAddress, loading } = useWhatAboutMe(
      "https://example.com/store.zarr",
    );
    expect(loading.value).toBe(false);
    const p = searchByAddress("Perth");
    // loading turns true while running — we can't observe mid-flight in this sync-mock setup,
    // but after await it must be false.
    await p;
    expect(loading.value).toBe(false);
  });
});

// ─── searchByCoords ───────────────────────────────────────────────────────────

describe("searchByCoords", () => {
  beforeEach(() => {
    resetLatLonCache();
    mockLatData = new Float32Array([PERTH_LAT]);
    mockLonData = new Float32Array([PERTH_LON]);
    mockTasmaxData = validTasmaxData();
  });

  it("populates headline with the supplied display name", async () => {
    const { searchByCoords, headline, placeName } = useWhatAboutMe(
      "https://example.com/store.zarr",
    );
    await searchByCoords(PERTH_LAT, PERTH_LON, "My Perth");
    expect(headline.value).not.toBeNull();
    expect(placeName.value).toBe("My Perth");
  });

  it("sets an out-of-domain error when coords are far from the grid", async () => {
    // The lat/lon grid cache holds (-32, 116). Search a point 22° away — > MAX_DOMAIN_DISTANCE_DEG.
    const { searchByCoords, error } = useWhatAboutMe(
      "https://example.com/store.zarr",
    );
    await searchByCoords(-10.0, 116.0, "Test");
    expect(error.value).toContain("outside the SWWA model domain");
  });

  it("sets error when all data values are fill (ocean mask)", async () => {
    // All values above FILL_THRESHOLD (1e20)
    mockLatData = new Float32Array([PERTH_LAT]);
    mockLonData = new Float32Array([PERTH_LON]);
    mockTasmaxData = new Float32Array(492).fill(2e20);
    const { searchByCoords, error } = useWhatAboutMe(
      "https://example.com/store.zarr",
    );
    await searchByCoords(PERTH_LAT, PERTH_LON, "Ocean point");
    expect(error.value).toContain("land-surface data");
  });
});

// ─── Derived computeds ────────────────────────────────────────────────────────

describe("firstDecadeLabel / lastDecadeLabel / deltaPositive", () => {
  beforeEach(() => {
    resetLatLonCache();
    mockLatData = new Float32Array([PERTH_LAT]);
    mockLonData = new Float32Array([PERTH_LON]);
    mockTasmaxData = validTasmaxData();
  });

  it("firstDecadeLabel is empty string before any search", () => {
    const { firstDecadeLabel } = useWhatAboutMe(
      "https://example.com/store.zarr",
    );
    expect(firstDecadeLabel.value).toBe("");
  });

  it("lastDecadeLabel is empty string before any search", () => {
    const { lastDecadeLabel } = useWhatAboutMe(
      "https://example.com/store.zarr",
    );
    expect(lastDecadeLabel.value).toBe("");
  });

  it("firstDecadeLabel ends with 's' after a successful search", async () => {
    const { searchByCoords, firstDecadeLabel } = useWhatAboutMe(
      "https://example.com/store.zarr",
    );
    await searchByCoords(PERTH_LAT, PERTH_LON, "Perth");
    expect(firstDecadeLabel.value).toMatch(/\d{4}s/);
  });

  it("lastDecadeLabel ends with 's' after a successful search", async () => {
    const { searchByCoords, lastDecadeLabel } = useWhatAboutMe(
      "https://example.com/store.zarr",
    );
    await searchByCoords(PERTH_LAT, PERTH_LON, "Perth");
    expect(lastDecadeLabel.value).toMatch(/\d{4}s/);
  });

  it("deltaPositive is true when delta >= 0", async () => {
    // All 300 K means delta = 0 → still true
    const { searchByCoords, deltaPositive } = useWhatAboutMe(
      "https://example.com/store.zarr",
    );
    await searchByCoords(PERTH_LAT, PERTH_LON, "Perth");
    expect(deltaPositive.value).toBe(true);
  });

  it("deltaPositive is false when last decade is cooler than first", async () => {
    // First 120 values warmer (310 K), last 120 values cooler (290 K)
    const data = new Float32Array(492).fill(300);
    for (let i = 0; i < 120; i++) data[i] = 310;
    for (let i = 372; i < 492; i++) data[i] = 290;
    mockTasmaxData = data;

    const { searchByCoords, deltaPositive } = useWhatAboutMe(
      "https://example.com/store.zarr",
    );
    await searchByCoords(PERTH_LAT, PERTH_LON, "Perth");
    expect(deltaPositive.value).toBe(false);
  });
});

// ─── HeadlineStat values ──────────────────────────────────────────────────────

describe("headline statistics", () => {
  beforeEach(() => {
    resetLatLonCache();
    mockLatData = new Float32Array([PERTH_LAT]);
    mockLonData = new Float32Array([PERTH_LON]);
  });

  it("firstMean rounded to 1 decimal place", async () => {
    mockTasmaxData = validTasmaxData(); // all 300 K → 26.85 °C before rounding → 26.8 after Math.round
    const { searchByCoords, headline } = useWhatAboutMe(
      "https://example.com/store.zarr",
    );
    await searchByCoords(PERTH_LAT, PERTH_LON, "Perth");
    // 300 − 273.15 = 26.849999… in IEEE 754, Math.round(268.499…)/10 = 26.8
    expect(headline.value!.firstMean).toBe(26.8);
  });

  it("delta is lastMean - firstMean, rounded to 1 dp", async () => {
    mockTasmaxData = validTasmaxData();
    const { searchByCoords, headline } = useWhatAboutMe(
      "https://example.com/store.zarr",
    );
    await searchByCoords(PERTH_LAT, PERTH_LON, "Perth");
    const { firstMean, lastMean, delta } = headline.value!;
    expect(delta).toBeCloseTo(Math.round((lastMean - firstMean) * 10) / 10, 5);
  });

  it("firstLabel is the year of the first time step", async () => {
    mockTasmaxData = validTasmaxData();
    const { searchByCoords, headline } = useWhatAboutMe(
      "https://example.com/store.zarr",
    );
    await searchByCoords(PERTH_LAT, PERTH_LON, "Perth");
    expect(headline.value!.firstLabel).toBe("1980");
  });

  it("lastLabel is the year of the last time step (1980 + 40 = 2020)", async () => {
    // 492 months from Jan 1980 → ends Dec 2020 (index 491 → year 1980 + floor(491/12) = 2020)
    mockTasmaxData = validTasmaxData();
    const { searchByCoords, headline } = useWhatAboutMe(
      "https://example.com/store.zarr",
    );
    await searchByCoords(PERTH_LAT, PERTH_LON, "Perth");
    expect(headline.value!.lastLabel).toBe("2020");
  });
});

// ─── searchByLocation ─────────────────────────────────────────────────────────

describe("searchByLocation", () => {
  beforeEach(() => {
    resetLatLonCache();
    mockLatData = new Float32Array([PERTH_LAT]);
    mockLonData = new Float32Array([PERTH_LON]);
    mockTasmaxData = validTasmaxData();
  });

  it("sets error when geolocation is not available", async () => {
    // Remove geolocation from navigator
    Object.defineProperty(globalThis.navigator, "geolocation", {
      value: undefined,
      configurable: true,
    });
    const { searchByLocation, error } = useWhatAboutMe(
      "https://example.com/store.zarr",
    );
    await searchByLocation();
    expect(error.value).toContain("Geolocation");
  });

  it("sets error when user denies geolocation permission", async () => {
    Object.defineProperty(globalThis.navigator, "geolocation", {
      value: {
        getCurrentPosition: (
          _success: PositionCallback,
          error: PositionErrorCallback,
        ) =>
          error({
            code: 1,
            message: "User denied Geolocation",
          } as GeolocationPositionError),
      },
      configurable: true,
    });
    const { searchByLocation, error } = useWhatAboutMe(
      "https://example.com/store.zarr",
    );
    await searchByLocation();
    expect(error.value).toContain("User denied");
  });

  it("populates headline when geolocation succeeds", async () => {
    Object.defineProperty(globalThis.navigator, "geolocation", {
      value: {
        getCurrentPosition: (success: PositionCallback) =>
          success({
            coords: { latitude: PERTH_LAT, longitude: PERTH_LON },
          } as GeolocationPosition),
      },
      configurable: true,
    });
    // reverse geocode
    mockFetchImpl = () =>
      Promise.resolve(
        new Response(
          JSON.stringify({
            display_name: "Perth, Western Australia, Australia",
          }),
          { status: 200 },
        ),
      );
    const { searchByLocation, headline } = useWhatAboutMe(
      "https://example.com/store.zarr",
    );
    await searchByLocation();
    expect(headline.value).not.toBeNull();
  });

  it("falls back to coordinate string when reverseGeocode fetch throws", async () => {
    Object.defineProperty(globalThis.navigator, "geolocation", {
      value: {
        getCurrentPosition: (success: PositionCallback) =>
          success({
            coords: { latitude: PERTH_LAT, longitude: PERTH_LON },
          } as GeolocationPosition),
      },
      configurable: true,
    });
    // reverse geocode fetch throws — should fall back to "lat, lon" string and still complete
    mockFetchImpl = () => Promise.reject(new Error("network error"));
    const { searchByLocation, placeName } = useWhatAboutMe(
      "https://example.com/store.zarr",
    );
    await searchByLocation();
    // placeName will be the coordinate fallback truncated to 2 parts
    expect(placeName.value).toMatch(/-?\d+\.\d+/);
  });
});

// ─── Generic error branch in fetchTimeSeries ──────────────────────────────────

describe("fetchTimeSeries generic error branch", () => {
  it("sets 'An unexpected error occurred.' when a non-Error value is thrown", async () => {
    resetLatLonCache();
    mockLatData = new Float32Array([PERTH_LAT]);
    mockLonData = new Float32Array([PERTH_LON]);

    // Make zarrita's `open` throw a plain string (not an Error instance)
    const { open } = await import("zarrita");
    vi.mocked(open).mockRejectedValueOnce("something went wrong");

    const { searchByCoords, error } = useWhatAboutMe(
      "https://example.com/store.zarr",
    );
    await searchByCoords(PERTH_LAT, PERTH_LON, "Perth");
    expect(error.value).toBe("An unexpected error occurred.");
  });
});

// ─── Variable selection and refresh behavior ─────────────────────────────────

describe("variable selection", () => {
  beforeEach(() => {
    resetLatLonCache();
    mockLatData = new Float32Array([PERTH_LAT]);
    mockLonData = new Float32Array([PERTH_LON]);
    mockTasmaxData = validTasmaxData();
    vi.mocked(open).mockClear();
  });

  it("fetches the selected variable instead of hardcoded tasmax", async () => {
    const { searchByCoords } = useWhatAboutMe(
      "https://example.com/store.zarr",
      "pr",
      precipToMmPerDay,
    );
    await searchByCoords(PERTH_LAT, PERTH_LON, "Perth");

    expect(
      vi.mocked(open).mock.calls.some(([path]) => String(path) === "pr"),
    ).toBe(true);
  });

  it("updates variable/converter and refreshes at the same location", async () => {
    const wam = useWhatAboutMe("https://example.com/store.zarr");
    await wam.searchByCoords(PERTH_LAT, PERTH_LON, "Perth");

    wam.setVariable("pr", precipToMmPerDay);
    await wam.refreshForCurrentLocation();

    expect(
      vi.mocked(open).mock.calls.some(([path]) => String(path) === "pr"),
    ).toBe(true);
    expect(wam.timeSeries.value?.[0]).toBe(25920000);
  });
});
