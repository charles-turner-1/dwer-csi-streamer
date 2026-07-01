import { openDataset, fromHttp, type Dataset } from "xarray-ts";

// Opening a store reads its consolidated metadata and eagerly loads coordinate
// values, so we memoize per-URL: the variable-list enumeration (view-data) and
// the time-axis decoding (useZarrDirectMap.fetchTimeDates) share a single open.
const cache = new Map<string, Promise<Dataset>>();

/** Open (and memoize) a climate zarr v3 store as an xarray-ts {@link Dataset}. */
export function openClimateDataset(url: string): Promise<Dataset> {
  let ds = cache.get(url);
  if (!ds) {
    ds = openDataset(fromHttp(url));
    cache.set(url, ds);
  }
  return ds;
}
