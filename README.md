# DWER CSI Streamer

[![codecov](https://codecov.io/gh/charles-turner-1/dwer-csi-streamer/graph/badge.svg)](https://codecov.io/gh/charles-turner-1/dwer-csi-streamer)

> [!WARNING]
> This package has been scaffolded by Claude. Details may be and probably are incorrect whilst this warning is still here.

A fully serverless, static web application for streaming scientific datasets directly to the browser from cloud object storage. No backend, no tiling service — just HTTP range requests against object storage and in-browser decompression.

Built as a collaboration between [Murdoch University](https://www.murdoch.edu.au), the [WA Department of Water and Environmental Regulation (DWER)](https://www.der.wa.gov.au), and [ACCESS-NRI](https://www.access-nri.org.au), with compute and storage infrastructure provided by the [Pawsey Supercomputing Research Centre](https://pawsey.org.au).

---

## How it works

Large scientific datasets (climate model output, reanalysis products, environmental monitoring data) are stored as NetCDF files on S3-compatible object storage. Rather than copying or converting this data, a lightweight virtual reference catalogue is generated using [VirtualiZarr](https://virtualizarr.readthedocs.io/) — a JSON file mapping Zarr chunk keys to `[url, byte_offset, byte_length]` triples inside the original files.

The browser loads this catalogue and, when a user selects a time step, fires a small number of HTTP `Range` requests to fetch only the required chunks. These are decompressed in-browser via WASM codecs and rendered on an interactive map using [MapLibre GL JS](https://maplibre.org). A full dataset that occupies hundreds of gigabytes on disk may require only a few megabytes of network traffic per view.

The reference catalogue format is [Kerchunk](https://fsspec.github.io/kerchunk/)-compatible; the in-browser Zarr client is [zarrita.js](https://github.com/manzt/zarrita.js) via [@carbonplan/zarr-layer](https://github.com/carbonplan/zarr-layer).

---

## Stack

| Layer              | Technology                                  |
| ------------------ | ------------------------------------------- |
| Frontend framework | Vue 3 + TypeScript                          |
| Build tooling      | Vite + vue-tsc                              |
| UI components      | PrimeVue 4 + Tailwind CSS 4                 |
| Map rendering      | MapLibre GL JS                              |
| Zarr streaming     | zarrita.js + @carbonplan/zarr-layer         |
| State management   | Pinia                                       |
| Analytics          | PostHog                                     |
| Python tooling     | VirtualiZarr, Zarr, Xarray, s3fs (via Pixi) |

---

## Project structure

```
src/
  components/
    ZarrDataStreamer.vue   # PoC: ACCESS Model datasets (COSIMA runs on Pawsey Acacia)
    ZarrMap.vue            # Interactive map component for a single Zarr dataset
    DwerCsi.vue            # DWER CSI dataset viewer (in development)
    Home.vue               # Landing page
    Header.vue             # Navigation bar with git commit badge
    GitCommit.vue          # Build-time commit SHA badge
    LinkCard.vue           # Reusable internal/external link card
  composables/
    useZarrMap.ts          # Core Zarr streaming + map logic
    usePosthog.ts          # PostHog analytics initialisation
  assets/
    ref-01deg.json         # Kerchunk reference: ACCESS-OM2-01 SST @ 0.1°
    ref-1deg.json          # Kerchunk reference: ACCESS-OM2-BGC SST @ 1°
    ref-atmos-daily.json   # Kerchunk reference: ACCESS-OM2 atmospheric daily
  router/index.ts
python/
  pixi.toml                # Pixi environment (VirtualiZarr, Zarr, s3fs, Xarray)
  Notebooks/               # Reference generation notebooks
```

---

## Development

```bash
npm install
npm run dev
```

```bash
npm run build         # type-check + production build
npm run test          # unit tests (Vitest)
npm run test:coverage # unit tests with coverage output
npm run format        # Prettier
```

The Python environment (for generating Kerchunk reference files) uses [Pixi](https://pixi.sh):

```bash
cd python
pixi install
pixi run jupyter lab
```

---

## Deployment

The site is a fully static SPA. Set the `base` path in `vite.config.ts` to match your hosting path (currently `/dwer-csi-streamer/` for GitHub Pages). Deploy the contents of `dist/` to any static host or CDN.

The S3 bucket hosting the NetCDF files must have permissive CORS headers to allow range requests from the browser.

---

  "name": "dwer-csi-streamer",

- Dataset: [Murdoch University](https://www.murdoch.edu.au) × [WA DWER](https://www.der.wa.gov.au)
- Infrastructure: [Pawsey Supercomputing Research Centre](https://pawsey.org.au)
- Streaming tooling: [ACCESS-NRI](https://www.access-nri.org.au)
