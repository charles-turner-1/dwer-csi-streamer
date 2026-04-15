import { ref, computed } from "vue";
import { FetchStore, root, open, get, slice } from "zarrita";
import { fetchTimeDates } from "./useZarrDirectMap";
import { kelvinToCelsius } from "@/utils/unitConversion";

// ─── Constants ────────────────────────────────────────────────────────────────

const NOMINATIM_BASE = "https://nominatim.openstreetmap.org";

/** Number of longitude grid columns in the WRF domain (used to convert a flat index to [rlat, rlon]). */
const RLON_N = 364;

/**
 * Maximum great-circle distance (degrees) between a target coordinate and the
 * nearest grid point before the point is considered outside the model domain.
 */
const MAX_DOMAIN_DISTANCE_DEG = 2.0;

/** Total number of monthly time steps in the dataset (41 years × 12 months). */
const TOTAL_TIME_STEPS = 492;

/** Values above this threshold are treated as fill/missing (the store uses 1e20 for its land-mask). */
const FILL_THRESHOLD = 1e19;

// ─── Geocoding helpers ────────────────────────────────────────────────────────

/**
 * A single address suggestion returned by the Nominatim autocomplete search.
 * The `label` is a human-readable short form (first 3 comma-parts of
 * `display_name`) suitable for display in a dropdown.
 */
export interface NominatimSuggestion {
  label: string;
  lat: number;
  lon: number;
}

/**
 * Queries Nominatim for up to 5 Australian address suggestions matching `query`.
 * Returns an empty array on network failure or if the query is too short (<2 chars).
 * Intended to feed an autocomplete dropdown — results are pre-scoped to Australia
 * via `countrycodes=au` to avoid ambiguous matches (e.g. Albany, WA vs Albany, NY).
 */
async function suggestAddresses(
  query: string,
): Promise<NominatimSuggestion[]> {
  if (query.trim().length < 2) return [];
  const url = new URL(`${NOMINATIM_BASE}/search`);
  url.searchParams.set("q", query);
  url.searchParams.set("format", "json");
  url.searchParams.set("limit", "5");
  url.searchParams.set("countrycodes", "au");

  try {
    const res = await fetch(url.toString(), {
      headers: { "Accept-Language": "en" },
    });
    if (!res.ok) return [];
    const data: Array<{ lat: string; lon: string; display_name: string }> =
      await res.json();
    return data.map((item) => ({
      label: item.display_name.split(",").slice(0, 3).join(",").trim(),
      lat: parseFloat(item.lat),
      lon: parseFloat(item.lon),
    }));
  } catch {
    return [];
  }
}

/**
 * Geocodes a free-text address string to coordinates using Nominatim.
 * Scoped to Australia (`countrycodes=au`). Throws if no result is found.
 * Prefer {@link suggestAddresses} + coordinate selection where possible to
 * avoid a second round-trip after the user has already chosen a suggestion.
 */
async function geocodeAddress(
  query: string,
): Promise<{ lat: number; lon: number; displayName: string }> {
  const url = new URL(`${NOMINATIM_BASE}/search`);
  url.searchParams.set("q", query);
  url.searchParams.set("format", "json");
  url.searchParams.set("limit", "1");
  url.searchParams.set("countrycodes", "au");

  const res = await fetch(url.toString(), {
    headers: { "Accept-Language": "en" },
  });
  if (!res.ok) throw new Error("Geocoding request failed");

  const data = await res.json();
  if (!data.length) throw new Error(`No results found for "${query}"`);

  return {
    lat: parseFloat(data[0].lat),
    lon: parseFloat(data[0].lon),
    displayName: data[0].display_name as string,
  };
}

/**
 * Reverse-geocodes a coordinate pair to a human-readable address string using
 * Nominatim. Falls back to a decimal coordinate string on any failure.
 */
async function reverseGeocode(lat: number, lon: number): Promise<string> {
  const url = new URL(`${NOMINATIM_BASE}/reverse`);
  url.searchParams.set("lat", lat.toString());
  url.searchParams.set("lon", lon.toString());
  url.searchParams.set("format", "json");

  try {
    const res = await fetch(url.toString(), {
      headers: { "Accept-Language": "en" },
    });
    if (!res.ok) return `${lat.toFixed(4)}, ${lon.toFixed(4)}`;
    const data = await res.json();
    return (
      (data.display_name as string) ?? `${lat.toFixed(4)}, ${lon.toFixed(4)}`
    );
  } catch {
    return `${lat.toFixed(4)}, ${lon.toFixed(4)}`;
  }
}

/**
 * Wraps the browser Geolocation API in a Promise. Rejects if geolocation is
 * unavailable or the user denies permission.
 */
async function getBrowserLocation(): Promise<{ lat: number; lon: number }> {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      reject(new Error("Geolocation is not supported by this browser"));
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => resolve({ lat: pos.coords.latitude, lon: pos.coords.longitude }),
      (err) => reject(new Error(err.message)),
      { timeout: 10000 },
    );
  });
}

// ─── Grid helpers ─────────────────────────────────────────────────────────────

/**
 * The result of snapping a target coordinate to the nearest WRF grid cell.
 * `rlatIdx` / `rlonIdx` are the row/column indices into the (rlat, rlon)
 * dimensions of the Zarr array; `nearestLat` / `nearestLon` are the actual
 * coordinates of that cell (useful for distance sanity-checks).
 */
interface GridPoint {
  rlatIdx: number;
  rlonIdx: number;
  nearestLat: number;
  nearestLon: number;
}

// Cache the 2D lat/lon coordinate arrays so repeated lookups don't re-fetch.
let latGridCache: Float32Array | null = null;
let lonGridCache: Float32Array | null = null;

/**
 * Fetches the flat 2-D geographic coordinate arrays (`lat`, `lon`) from the
 * Zarr store and caches them in module-level variables so subsequent calls
 * are free. The arrays are stored in row-major order with `RLON_N` columns.
 */
async function fetchLatLonGrid(
  store: FetchStore,
): Promise<{ latGrid: Float32Array; lonGrid: Float32Array }> {
  if (latGridCache && lonGridCache) {
    return { latGrid: latGridCache, lonGrid: lonGridCache };
  }
  const [latArr, lonArr] = await Promise.all([
    open(root(store).resolve("lat"), { kind: "array" }),
    open(root(store).resolve("lon"), { kind: "array" }),
  ]);
  const [latChunk, lonChunk] = await Promise.all([get(latArr), get(lonArr)]);
  latGridCache = latChunk.data as Float32Array;
  lonGridCache = lonChunk.data as Float32Array;
  return { latGrid: latGridCache, lonGrid: lonGridCache };
}

// Find the nearest grid point by minimising squared Euclidean distance over
// the real 2-D lat/lon arrays stored in the Zarr — no projection maths needed.
/**
 * Finds the WRF grid cell closest to (`targetLat`, `targetLon`) by minimising
 * squared Euclidean distance over the real geographic coordinate arrays.
 * Returns `null` if the nearest cell is farther than {@link MAX_DOMAIN_DISTANCE_DEG},
 * indicating the point is outside the model domain.
 */
async function findNearestGridPoint(
  store: FetchStore,
  targetLat: number,
  targetLon: number,
): Promise<GridPoint | null> {
  const { latGrid, lonGrid } = await fetchLatLonGrid(store);

  let bestIdx = 0;
  let bestDist = Infinity;

  for (let i = 0; i < latGrid.length; i++) {
    const dlat = (latGrid[i] ?? 0) - targetLat;
    const dlon = (lonGrid[i] ?? 0) - targetLon;
    const dist = dlat * dlat + dlon * dlon;
    if (dist < bestDist) {
      bestDist = dist;
      bestIdx = i;
    }
  }

  // Reject if the nearest point is too far away (point is outside the domain).
  if (Math.sqrt(bestDist) > MAX_DOMAIN_DISTANCE_DEG) return null;

  const rlatIdx = Math.floor(bestIdx / RLON_N);
  const rlonIdx = bestIdx % RLON_N;

  return {
    rlatIdx,
    rlonIdx,
    nearestLat: latGrid[bestIdx] ?? 0,
    nearestLon: lonGrid[bestIdx] ?? 0,
  };
}

// ─── Statistics ───────────────────────────────────────────────────────────────

/**
 * Computes a centred 12-month rolling average over a monthly time series.
 * Output values within 6 months of either end are `null` because the window
 * is incomplete — this is intentional so the chart line doesn't taper.
 */
function centeredRollingAvg(values: number[]): (number | null)[] {
  const HALF = 6; // 6 months each side = 12-month window
  const result: (number | null)[] = new Array(values.length).fill(null);
  for (let i = HALF; i < values.length - HALF; i++) {
    let sum = 0;
    let count = 0;
    for (let j = i - HALF; j < i + HALF; j++) {
      if (!isNaN(values[j] ?? NaN)) {
        sum += values[j] ?? 0;
        count++;
      }
    }
    result[i] = count > 0 ? sum / count : null;
  }
  return result;
}

/**
 * Fits an ordinary least-squares linear regression to `values`, ignoring NaN
 * entries. Returns the predicted value at every index (i.e. the trend line
 * evaluated over the full time axis), or an array of NaN if fewer than 2
 * valid points exist.
 */
function linearTrend(values: number[]): number[] {
  const pts = values.map((y, x) => ({ x, y })).filter((p) => !isNaN(p.y));

  const n = pts.length;
  if (n < 2) return values.map(() => NaN);

  let sumX = 0,
    sumY = 0,
    sumXY = 0,
    sumX2 = 0;
  for (const { x, y } of pts) {
    sumX += x;
    sumY += y;
    sumXY += x * y;
    sumX2 += x * x;
  }
  const slope = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX);
  const intercept = (sumY - slope * sumX) / n;

  return values.map((_, i) => slope * i + intercept);
}

/**
 * Returns the arithmetic mean of `values[start..end)`, skipping NaN.
 * Returns NaN if the slice contains no valid values.
 */
function meanSlice(values: number[], start: number, end: number): number {
  const slice = values.slice(start, end).filter((v) => !isNaN(v));
  if (!slice.length) return NaN;
  return slice.reduce((a, b) => a + b, 0) / slice.length;
}

// ─── Composable ───────────────────────────────────────────────────────────────

/**
 * Summary statistics comparing the first and last decade of the time series.
 * `firstMean` / `lastMean` are decadal averages in °C; `delta` is the
 * difference (`lastMean − firstMean`). `firstLabel` / `lastLabel` are the
 * starting years of those decades (e.g. `"1980"`, `"2030"`) used in the UI copy.
 */
export interface HeadlineStat {
  firstMean: number;
  lastMean: number;
  delta: number;
  firstLabel: string;
  lastLabel: string;
}

/**
 * Composable that drives the "What about me?" feature.
 *
 * Given a Zarr store URL (`source`), it exposes reactive state and three ways
 * to trigger a lookup:
 * - {@link searchByAddress} — geocodes a free-text string then fetches data
 * - {@link searchByCoords} — skips geocoding when coords are already known (e.g. from autocomplete)
 * - {@link searchByLocation} — uses the browser Geolocation API
 *
 * On success, `timeSeries`, `rollingAvg`, `trendLine`, `headline`, and
 * `timeLabels` are all populated. On failure, `error` is set and data refs
 * remain null.
 */
export function useWhatAboutMe(source: string) {
  const loading = ref(false);
  const error = ref<string | null>(null);
  const placeName = ref<string | null>(null);
  const timeSeries = ref<number[] | null>(null);
  const rollingAvg = ref<(number | null)[] | null>(null);
  const trendLine = ref<number[] | null>(null);
  const headline = ref<HeadlineStat | null>(null);
  const timeLabels = ref<string[] | null>(null);

  /**
   * Core data-fetching routine. Opens the Zarr store, snaps the coordinate to
   * the nearest grid cell, fetches the full `tasmax` time axis for that cell in
   * a single HTTP request, converts K→°C, and computes derived statistics.
   * All reactive state is reset at the start of each call.
   */
  async function fetchTimeSeries(lat: number, lon: number, name: string) {
    loading.value = true;
    error.value = null;
    timeSeries.value = null;
    rollingAvg.value = null;
    trendLine.value = null;
    headline.value = null;
    placeName.value = name;

    try {
      // 1. Open store and fetch time labels + lat/lon grid concurrently
      const store = new FetchStore(source);
      const [dates, gridPoint] = await Promise.all([
        fetchTimeDates(source),
        findNearestGridPoint(store, lat, lon),
      ]);

      if (!gridPoint) {
        error.value =
          "Your location appears to be outside the SWWA model domain — try an address in South-West Western Australia.";
        return;
      }

      timeLabels.value = dates;

      // Extract year strings for decade labelling (e.g. "1 Jan 1980" → "1980")
      // The date strings are locale-formatted "D Mon YYYY"
      const yearOf = (label: string) => label.split(" ").at(-1) ?? "";

      // 3. Open the tasmax array
      const arr = await open(root(store).resolve("tasmax"), { kind: "array" });

      // 4. Single fetch: the store is chunked [492, ~31, ~28] so slicing to
      //    one spatial point pulls the entire time axis in one HTTP request.
      const pointChunk = await get(arr, [
        null,
        slice(gridPoint.rlatIdx, gridPoint.rlatIdx + 1),
        slice(gridPoint.rlonIdx, gridPoint.rlonIdx + 1),
      ]);

      const raw = pointChunk.data as Float32Array;
      const values = Array.from(
        { length: TOTAL_TIME_STEPS },
        (_, i) => raw[i] ?? NaN,
      );

      // 5. Apply unit conversion (K → °C); treat fill values and NaN as NaN
      const converted = values.map((v) =>
        isNaN(v) || v > FILL_THRESHOLD ? NaN : kelvinToCelsius.toDisplay(v),
      );

      // 6. Check that we actually have valid data (land-mask check)
      const validCount = converted.filter((v) => !isNaN(v)).length;
      if (validCount < TOTAL_TIME_STEPS * 0.5) {
        error.value =
          "No land-surface data at this location — it may be over the ocean or outside the model's land mask. Try a nearby inland address.";
        return;
      }

      // 7. Compute statistics
      const rolling = centeredRollingAvg(converted);
      const trend = linearTrend(converted);

      // Decade labels from actual time labels
      const firstLabel = yearOf(dates[0] ?? "Start");
      const lastLabel = yearOf(dates[dates.length - 1] ?? "End");
      const firstMean = meanSlice(converted, 0, 120); // first 10 years (120 months)
      const lastMean = meanSlice(
        converted,
        TOTAL_TIME_STEPS - 120,
        TOTAL_TIME_STEPS,
      );

      timeSeries.value = converted;
      rollingAvg.value = rolling;
      trendLine.value = trend;
      headline.value = {
        firstMean: Math.round(firstMean * 10) / 10,
        lastMean: Math.round(lastMean * 10) / 10,
        delta: Math.round((lastMean - firstMean) * 10) / 10,
        firstLabel,
        lastLabel,
      };
    } catch (e: unknown) {
      error.value =
        e instanceof Error ? e.message : "An unexpected error occurred.";
    } finally {
      loading.value = false;
    }
  }

  /** Geocodes `query` (AU-scoped) then delegates to {@link fetchTimeSeries}. */
  async function searchByAddress(query: string) {
    error.value = null;
    try {
      const { lat, lon, displayName } = await geocodeAddress(query);
      // Take the first 2 comma-separated parts for a concise label
      const shortName = displayName.split(",").slice(0, 2).join(",").trim();
      await fetchTimeSeries(lat, lon, shortName);
    } catch (e: unknown) {
      error.value = e instanceof Error ? e.message : "Geocoding failed.";
      loading.value = false;
    }
  }

  /**
   * Skips geocoding and calls {@link fetchTimeSeries} directly with pre-resolved
   * coordinates. Use this when the user selects a suggestion from the autocomplete
   * dropdown — the coordinates are already known from the Nominatim response.
   */
  async function searchByCoords(
    lat: number,
    lon: number,
    displayName: string,
  ) {
    await fetchTimeSeries(lat, lon, displayName);
  }

  /** Requests the browser's current position, reverse-geocodes it, then delegates to {@link fetchTimeSeries}. */
  async function searchByLocation() {
    error.value = null;
    try {
      const { lat, lon } = await getBrowserLocation();
      const displayName = await reverseGeocode(lat, lon);
      const shortName = displayName.split(",").slice(0, 2).join(",").trim();
      await fetchTimeSeries(lat, lon, shortName);
    } catch (e: unknown) {
      error.value = e instanceof Error ? e.message : "Location access failed.";
      loading.value = false;
    }
  }

  /** `"1980s"` etc — the decade label for the first 10 years of the series. */
  const firstDecadeLabel = computed(() =>
    headline.value ? `${headline.value.firstLabel}s` : "",
  );

  /** `"2020s"` etc — the decade label for the last 10 years of the series. */
  const lastDecadeLabel = computed(() =>
    headline.value ? `${headline.value.lastLabel}s` : "",
  );

  /** `true` when the temperature delta is zero or positive (warming). */
  const deltaPositive = computed(() => (headline.value?.delta ?? 0) >= 0);

  return {
    loading,
    error,
    placeName,
    timeSeries,
    rollingAvg,
    trendLine,
    headline,
    timeLabels,
    firstDecadeLabel,
    lastDecadeLabel,
    deltaPositive,
    searchByAddress,
    searchByCoords,
    searchByLocation,
    suggestAddresses,
  };
}
