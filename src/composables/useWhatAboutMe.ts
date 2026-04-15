import { ref } from "vue";
import { FetchStore, root, open, get, slice } from "zarrita";
import { fetchTimeDates } from "./useZarrDirectMap";
import { kelvinToCelsius } from "@/utils/unitConversion";

// ─── Constants ────────────────────────────────────────────────────────────────

const NOMINATIM_BASE = "https://nominatim.openstreetmap.org";

const RLON_N = 364;
const RLAT_N = 279;

// Maximum distance (degrees, great-circle approximation) before we consider
// a point outside the model domain.
const MAX_DOMAIN_DISTANCE_DEG = 2.0;

const TOTAL_TIME_STEPS = 492;
const FETCH_BATCH_SIZE = 50;

// Missing-value threshold — the store uses 1e20 for land-mask fill
const FILL_THRESHOLD = 1e19;

// ─── Geocoding helpers ────────────────────────────────────────────────────────

async function geocodeAddress(
  query: string,
): Promise<{ lat: number; lon: number; displayName: string }> {
  const url = new URL(`${NOMINATIM_BASE}/search`);
  url.searchParams.set("q", query);
  url.searchParams.set("format", "json");
  url.searchParams.set("limit", "1");

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
    return (data.display_name as string) ?? `${lat.toFixed(4)}, ${lon.toFixed(4)}`;
  } catch {
    return `${lat.toFixed(4)}, ${lon.toFixed(4)}`;
  }
}

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

interface GridPoint {
  rlatIdx: number;
  rlonIdx: number;
  nearestLat: number;
  nearestLon: number;
}

// Cache the 2D lat/lon coordinate arrays so repeated lookups don't re-fetch.
let latGridCache: Float32Array | null = null;
let lonGridCache: Float32Array | null = null;

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
async function findNearestGridPoint(
  store: FetchStore,
  targetLat: number,
  targetLon: number,
): Promise<GridPoint | null> {
  const { latGrid, lonGrid } = await fetchLatLonGrid(store);

  let bestIdx = 0;
  let bestDist = Infinity;

  for (let i = 0; i < latGrid.length; i++) {
    const dlat = latGrid[i] - targetLat;
    const dlon = lonGrid[i] - targetLon;
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
    nearestLat: latGrid[bestIdx],
    nearestLon: lonGrid[bestIdx],
  };
}

// ─── Statistics ───────────────────────────────────────────────────────────────

// Centred 12-month rolling average. Null where the window is incomplete.
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

// Ordinary least-squares linear regression, ignoring NaN values.
// Returns trend line values at every input index.
function linearTrend(values: number[]): number[] {
  const pts = values
    .map((y, x) => ({ x, y }))
    .filter((p) => !isNaN(p.y));

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

// Average over a slice of the series, skipping NaN.
function meanSlice(values: number[], start: number, end: number): number {
  const slice = values.slice(start, end).filter((v) => !isNaN(v));
  if (!slice.length) return NaN;
  return slice.reduce((a, b) => a + b, 0) / slice.length;
}

// ─── Composable ───────────────────────────────────────────────────────────────

export interface HeadlineStat {
  firstMean: number;
  lastMean: number;
  delta: number;
  firstLabel: string;
  lastLabel: string;
}

export function useWhatAboutMe(source: string) {
  const loading = ref(false);
  const progress = ref(0);
  const error = ref<string | null>(null);
  const placeName = ref<string | null>(null);
  const timeSeries = ref<number[] | null>(null);
  const rollingAvg = ref<(number | null)[] | null>(null);
  const trendLine = ref<number[] | null>(null);
  const headline = ref<HeadlineStat | null>(null);
  const timeLabels = ref<string[] | null>(null);

  async function fetchTimeSeries(lat: number, lon: number, name: string) {
    loading.value = true;
    progress.value = 0;
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

      // 4. Fetch all 492 time steps in throttled batches of 50
      const values = new Array<number>(TOTAL_TIME_STEPS);

      for (
        let batchStart = 0;
        batchStart < TOTAL_TIME_STEPS;
        batchStart += FETCH_BATCH_SIZE
      ) {
        const batchEnd = Math.min(batchStart + FETCH_BATCH_SIZE, TOTAL_TIME_STEPS);

        const batchResults = await Promise.all(
          Array.from({ length: batchEnd - batchStart }, async (_, i) => {
            const t = batchStart + i;
            // Fetch the full time slab at t, extract the point
            const chunk = await get(arr, [
              slice(t, t + 1),
              null,
              null,
            ]);
            const data = chunk.data as Float32Array;
            return data[gridPoint.rlatIdx * RLON_N + gridPoint.rlonIdx];
          }),
        );

        batchResults.forEach((v, i) => {
          values[batchStart + i] = v;
        });
        progress.value = Math.round((batchEnd / TOTAL_TIME_STEPS) * 100);
      }

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
      const lastMean = meanSlice(converted, TOTAL_TIME_STEPS - 120, TOTAL_TIME_STEPS);

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

  return {
    loading,
    progress,
    error,
    placeName,
    timeSeries,
    rollingAvg,
    trendLine,
    headline,
    timeLabels,
    searchByAddress,
    searchByLocation,
  };
}
