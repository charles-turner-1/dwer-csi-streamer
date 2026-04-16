# proj4js ob_tran Forward/Inverse Asymmetry — Minimal Reproducible Example

## Environment

| Package | Version |
|---------|---------|
| `proj4` | 2.20.8  |
| Node.js | 23.11.0 |

## The CRS

SWWA CORDEX rotated-pole projection, derived from CF `rotated_pole` metadata:

```
+proj=ob_tran +o_proj=longlat +o_lon_p=0 +o_lat_p=60.31 +lon_0=327.63 +a=6371229 +no_defs
```

Parameters:
- `grid_north_pole_latitude = 60.31` → `o_lat_p = 60.31`
- `grid_north_pole_longitude = 147.63` → `lon_0 = 147.63 + 180 = 327.63`

## The Bug

`forward()` (WGS84 → rotated-pole) and `inverse()` (rotated-pole → WGS84) are **not inverses of each other**.

- `inverse()` is correct — stored `rlon`/`rlat` values back-project to the right WGS84 geography.
- `forward()` is wrong — WGS84 points project to rotated-pole coordinates ~52° west of the stored `rlon` range `[147.65, 160.43]`.
- Round-trips are off by a constant **64.74°** in longitude, suggesting `lon_0=327.63` is being applied twice in the forward path.

## Reproduce

Save as `repro.mjs` and run with `node repro.mjs`:

```js
import proj4 from "proj4";

const SWWA =
  "+proj=ob_tran +o_proj=longlat +o_lon_p=0 +o_lat_p=60.31 +lon_0=327.63 +a=6371229 +no_defs";

const p = proj4("EPSG:4326", SWWA);

// Forward: WGS84 → rotated-pole
// Expected output should land inside stored rlon/rlat range [147.65–160.43, -11.34–-1.56]
const wgs84Points = [
  [116, -32],
  [108, -25],
  [122, -37],
];
for (const pt of wgs84Points) {
  const fwd = p.forward(pt);
  const rt = p.inverse(fwd);
  console.log(
    "WGS84:",
    pt,
    "→ forward:",
    fwd.map((v) => +v.toFixed(4)),
    "→ round-trip:",
    rt.map((v) => +v.toFixed(4)),
  );
}

// Inverse: rotated-pole → WGS84
// These are actual stored rlon/rlat corners of the SWWA CORDEX domain
const storedRlonRlat = [
  [154, -6.5],
  [147.65, -11.34],
  [160.43, -1.56],
];
for (const pt of storedRlonRlat) {
  const inv = p.inverse(pt);
  console.log(
    "stored rlon/rlat:",
    pt,
    "→ inverse (WGS84):",
    inv.map((v) => +v.toFixed(4)),
  );
}
```

## Actual Output

```
WGS84: [ 116, -32 ] → forward: [ 102.1034, -30.4611 ] → round-trip: [ 51.26, -32 ]
WGS84: [ 108, -25 ] → forward: [ 90.9087,  -28.5904 ] → round-trip: [ 43.26, -25 ]
WGS84: [ 122, -37 ] → forward: [ 110.1854, -31.6926 ] → round-trip: [ 57.26, -37 ]
stored rlon/rlat: [ 154,    -6.5  ] → inverse (WGS84): [ 116.4485, -32.7285 ]
stored rlon/rlat: [ 147.65, -11.34] → inverse (WGS84): [ 107.4908, -35.5266 ]
stored rlon/rlat: [ 160.43, -1.56 ] → inverse (WGS84): [ 125.0391, -29.3519 ]
```

## Expected Output

`forward([116, -32])` should return approximately `[154, -6.5]` — the stored rotated-pole
coordinates that inverse-project back to that WGS84 point. pyproj (PROJ 9) returns the correct
value for the same string.

## Analysis

The round-trip longitude error is consistently **64.74°** (`116 - 51.26`), which equals
`2 × 32.37°`. Since `lon_0 = 327.63° = -32.37°` (mod 360), this strongly suggests `lon_0`
is being applied twice in the forward path — once correctly and once redundantly.

The `inverse()` direction works correctly (stored domain corners map back to sensible SW WA
geography), which means the rendering shader in `@carbonplan/zarr-layer` displays data in the
right place. However, `ZarrLayer`'s viewport→data-CRS intersection check uses `forward()`,
so it finds zero visible regions when zoomed in and stops fetching new chunks.

## Related

- proj4js issue [#536](https://github.com/proj4js/proj4js/issues/536) — ob_tran + o_proj=longlat bug (reported fixed in v2.20.2 / PR #535, but the asymmetry persists in v2.20.8 for this string)
