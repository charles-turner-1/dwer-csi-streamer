# ZarrDataStreamer — implementation notes

## What this does

Renders a MapLibre GL map in `ZarrDataStreamer.vue` that streams SST data directly
from a bundled Kerchunk reference file (`src/assets/ref-01deg.json`) without any
backend. The pipeline is:

```
ref-01deg.json  (Kerchunk/VirtualiZarr reference)
      │
      ▼
ReferenceStore.fromSpec()   (@zarrita/storage/ref)
      │   maps Zarr chunk keys → HTTP Range requests
      ▼
ZarrLayer                   (@carbonplan/zarr-layer)
      │   WebGL custom layer; issues Range GETs, decodes in-browser
      ▼
maplibre-gl Map             (MapLibre GL JS)
```

## Packages used

| Package                  | Role                                                            |
| ------------------------ | --------------------------------------------------------------- |
| `maplibre-gl`            | Map renderer                                                    |
| `@carbonplan/zarr-layer` | WebGL Zarr custom layer for MapLibre/Mapbox                     |
| `zarrita`                | Zarr v2/v3 JS implementation (peer dep of zarr-layer)           |
| `@zarrita/storage`       | Storage backends; we use the `ref` subpath for `ReferenceStore` |

## Dataset

`ref-01deg.json` is a Kerchunk reference catalogue for 42 months of the
ACCESS-OM2-01 CICE 0.1° global sea ice run, stored on Pawsey Acacia (S3).

- Variable rendered: `sst_m` — shape `[42, 2700, 3600]`, chunks `[1, 675, 900]`, `zarr_format: 2`
- Other variables present: `d2`, `ULON`, `ULAT`, `time`, grid dimension scalars
- CLim: `[-2, 30]` °C

## Bumps in the road

### 1. `maplibre` was a security placeholder

`npm add maplibre` installs `maplibre@0.0.1-security` — a blank npm security
holder package. The real package is `maplibre-gl`. Had to:

```bash
npm install maplibre-gl
npm uninstall maplibre
```

### 2. `@` path alias not configured

Vite's `@` alias (`@/assets/...`) isn't set up by default with `@vitejs/plugin-vue`
— it needs an explicit `resolve.alias` in `vite.config.ts`. The dev server threw:

```
@/assets/ref-01deg.json imported but could not be resolved
```

Fix added to `vite.config.ts`:

```ts
import { fileURLToPath, URL } from "node:url";
// ...
resolve: {
  alias: {
    '@': fileURLToPath(new URL('./src', import.meta.url)),
  },
},
```

Also added a JSON wildcard declaration to `src/vite-env.d.ts` so TypeScript
accepts `import refSpec from '@/assets/ref-01deg.json'`:

```ts
declare module "*.json" {
  const value: Record<string, unknown>;
  export default value;
}
```

### 3. `spatialDimensions` required for non-standard dimension names

zarr-layer auto-detects spatial axes from a fixed list: `lat, latitude, y` / `lon, longitude, x`.
The CICE grid uses `nj` (rows, 2700) and `ni` (cols, 3600) — neither matched, so
`dimIndices.lat`/`dimIndices.lon` were `undefined`, causing:

```
Cannot read properties of undefined (reading 'index')
```

Fix: add `spatialDimensions: { lat: 'nj', lon: 'ni' }` to the `ZarrLayer` options.

Note: `TLON`/`TLAT` (T-grid coordinate arrays) are absent from the ref file — only
`ULON`/`ULAT` (U-grid) were virtualised. For correct curvilinear reprojection, the
T-grid coordinate arrays should be included in a future ref rebuild.

### 4. `bounds` required — coordinate arrays contain `NaN` fill values

When zarr-layer tries to infer geographic bounds from the `ULON`/`ULAT` coordinate
arrays, it reads inline chunk data from the kerchunk ref. Those arrays contain
`NaN` as a fill value, which is not valid JSON, so the parse fails:

```
Unexpected token 'N', ..."illValue":NaN,"_ARRA"... is not valid JSON
```

Fix: pass `bounds: [-180, -90, 180, 90]` explicitly (the CICE grid is global).

### 5. Kerchunk refs contain `s3://` URIs — resolved against AWS by default

`ReferenceStore` (and the underlying `fetch_range`) resolves `s3://` URIs against
`https://s3.amazonaws.com`, but the data lives on Pawsey Ceph:

```
https://projects.pawsey.org.au/<bucket>/<key>
```

The ref JSON has `s3://01deg/output.../iceh.....nc` entries.

Fix: rewrite all `s3://` URIs before passing to `fromSpec`:

```ts
v[0].replace(/^s3:\/\//, "https://projects.pawsey.org.au/");
```

i.e. `s3://01deg/...` → `https://projects.pawsey.org.au/01deg/...`.

This also means CORS must be enabled on the Pawsey Ceph bucket endpoint
(`https://projects.pawsey.org.au`), not on an AWS bucket — which is the endpoint
for which CORS headers were actually configured.

## Known limitation / next step

The visualisation will only render data once the Acacia S3 bucket has permissive
CORS headers (`Access-Control-Allow-Origin: *`). Without that, the browser will
block the Range requests. This is a Pawsey infrastructure configuration step,
not a code problem.
