# Plan: DwerCsi Page — Direct Zarr v3 Map

## Overview

Add an interactive map page at `/dwer-csi` that streams data directly from the Zarr v3 store at
`https://projects.pawsey.org.au/dwer-zarr-store/data.zarr` — no kerchunk reference file required.
Uses `@carbonplan/zarr-layer` (already a project dependency) with its native `source` URL +
`zarrVersion: 3` path, paralleling the existing `useZarrMap`/`ZarrMap` composable+component pair
used for the Access Model PoC page.

---

## Dataset facts (from zarr.json consolidated metadata)

| Property | Value |
|---|---|
| URL | `https://projects.pawsey.org.au/dwer-zarr-store/data.zarr` |
| Zarr format | v3 |
| Codecs | `bytes` (little-endian) + `zstd` — no shuffle, no blosc |
| Variables | `tasmax`, `tasmin`, `pr` |
| Shape | `[492, 279, 364]` (time × rlat × rlon) |
| Chunk shape | `[1, 279, 364]` — one full spatial slab per time step |
| Grid dims | `rlat` (279), `rlon` (364) — **rotated pole grid** |
| True lat/lon | 2D arrays `lat`/`lon` (279×364) keyed on rlat/rlon — for reference only |
| Grid mapping | `rotated_latitude_longitude` |
| North pole lat | 60.31° |
| North pole lon | 147.63° |
| `tasmax` units | K — Daily Maximum Near-Surface Air Temperature |
| `tasmin` units | K — Daily Minimum Near-Surface Air Temperature |
| `pr` units | kg m⁻² s⁻¹ — Precipitation Flux |
| `tasmax` fill | `1e20` (`missing_value`) |
| `tasmin` fill | `1e20` |
| `pr` fill | `1e20` |

---

## Implementation Steps

### Phase 1 — New composable: `src/composables/useZarrDirectMap.ts`

Create alongside `useZarrMap.ts`. Key differences from the existing composable:

- Accept `source: string` (URL) instead of `refSpec`
- Pass `source` + `zarrVersion: 3` to `ZarrLayer` — no `ReferenceStore`, no `buildStore()`, no URL rewriting
- No `ShuffleCodec` registration (store uses only `bytes` + `zstd`, both built into zarrita)
- Accept `proj4: string` and `bounds: [number, number, number, number]` as params and forward to `ZarrLayer`
- `spatialDimensions` passed in as param (not hardcoded)
- Otherwise identical lifecycle: `mapContainer` ref, `onMounted`/`onUnmounted`, `timeIndex`, `opacity`, `loadingState`, `colourbarStyle`, `setClim`

Signature:
```ts
export function useZarrDirectMap(
  source: string,
  varName: string,
  timeSteps: number,
  clim: [number, number],
  proj4String: string,
  bounds: [number, number, number, number],
  spatialDims: { lat: string; lon: string },
  units?: 'C' | 'K',
  fillValue?: number,
)
```

### Phase 2 — New display component: `src/components/ZarrDirectMap.vue`

Props mirror `useZarrDirectMap` params. Template identical to `ZarrMap.vue`:
- Time-step range slider (1 → N display, 0-based v-model)
- Opacity slider
- Map `<div>` with `mapContainer` ref
- Loading spinner overlay
- Error overlay
- Colourbar with min/max `InputNumber` controls (PrimeVue) and Reset button
- Wrap slider/clim events with 1 s debounce PostHog captures (events: `zarr_map_time_changed`, `zarr_map_opacity_changed`, `zarr_map_clim_changed`, `zarr_map_loaded`, `zarr_map_error`)

Colourbar labels should show `°C` for units `C`, `K` for units `K`, and appropriate units for `pr`.

### Phase 3 — Replace DwerCsi stub: `src/components/DwerCsi.vue`

Replace the "Coming soon." placeholder entirely. Structure:

- Page header ("DWER Climate Science Initiative") + back-to-home link (preserve existing markup)
- Brief description paragraph referencing WA-CSI / Murdoch / DWER
- PrimeVue `<Tabs>` (same import pattern as `ZarrDataStreamer.vue`) with three tabs:

| Tab label | `varName` | `clim` | `units` |
|---|---|---|---|
| Max Temperature | `tasmax` | `[280, 325]` | `K` |
| Min Temperature | `tasmin` | `[270, 310]` | `K` |
| Precipitation | `pr` | `[0, 0.0001]` | — (raw) |

Each tab renders `<ZarrDirectMap>` with shared props:
```
source = "https://projects.pawsey.org.au/dwer-zarr-store/data.zarr"
:timeSteps="492"
:proj4="SWWA_PROJ4"
:bounds="SWWA_BOUNDS"
:spatialDims="{ lat: 'rlat', lon: 'rlon' }"
:fillValue="1e20"
```

Define `SWWA_PROJ4` and `SWWA_BOUNDS` as `<script setup>` constants.

### Phase 4 — Home page: `src/components/Home.vue`

Minor: update the `/dwer-csi` `LinkCard` description to remove any "coming soon" wording and replace with a brief description of the WA CSI dataset.

---

## Key Technical Values

### proj4 string (rotated pole → geographic WGS84)

```
+proj=ob_tran +o_proj=longlat +o_lon_p=-32.37 +o_lat_p=60.31 +a=6371229 +no_defs
```

Derived from: `o_lon_p = grid_north_pole_longitude − 180 = 147.63 − 180 = −32.37`, `o_lat_p = grid_north_pole_latitude = 60.31`. The `a=6371229` matches the WRF sphere radius used by CORDEX.

### bounds

Need `rlat` and `rlon` array min/max (edge bounds in rotated-degree units, not center-to-center).
Fetch at implementation time:
- `GET https://projects.pawsey.org.au/dwer-zarr-store/data.zarr/rlat/0`
- `GET https://projects.pawsey.org.au/dwer-zarr-store/data.zarr/rlon/0`

Decode the 1D float64 arrays and use `[min(rlon), min(rlat), max(rlon), max(rlat)]`.

---

## Files to Create / Modify

| File | Action |
|---|---|
| `src/composables/useZarrDirectMap.ts` | Create |
| `src/components/ZarrDirectMap.vue` | Create |
| `src/components/DwerCsi.vue` | Replace (full rewrite) |
| `src/components/Home.vue` | Minor edit (LinkCard description) |
| `src/router/index.ts` | No change needed |

---

## Verification Checklist

1. `npm run dev` → `/dwer-csi` loads without errors
2. All three tabs display `<ZarrDirectMap>` correctly
3. Time slider steps through all 492 time steps; loading spinner appears during fetch
4. Data visually renders over SW Western Australia (roughly 110–120°E, 28–35°S)
5. If the map renders in the wrong region, adjust `o_lon_p` by ±180° in the proj4 string
6. Clim controls update the colour scale; Reset reverts to defaults
7. PostHog events fire on time change, opacity change, clim change
8. Browser network tab: chunk requests target `projects.pawsey.org.au`
9. No TypeScript errors (`npm run type-check`)

---

## Decisions

- **No new route**: replace the existing `/dwer-csi` stub rather than adding a new route
- **No ReferenceStore**: use `ZarrLayer`'s native `source` URL path (Zarr v3, no kerchunk)
- **No codec registration**: `bytes` + `zstd` are built into zarrita — no custom codec needed
- **`pr` included** in first pass alongside `tasmax`/`tasmin`
- **Separate composable** (`useZarrDirectMap`) rather than extending `useZarrMap` — keeps kerchunk and direct-URL paths cleanly separated
