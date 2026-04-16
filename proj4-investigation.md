# proj4 Round-Trip Failure — Root Cause of Missing Chunk Refetch

## Summary

The chunk refetch only works when sufficiently zoomed out because `ZarrLayer`'s viewport
intersection logic (`getCandidateRegions`) uses a **forward transform** (WGS84 → rotated-pole)
to map the current map viewport into the data's coordinate system. With our current proj4 string,
that forward transform produces coordinates that are completely outside the stored `xyLimits`
range, so zero regions are ever found as visible, and no fetch is triggered.

**The root cause is a bug in proj4js**: for `+proj=ob_tran` combined with a non-zero `lon_0`,
proj4js's `forward()` and `inverse()` methods are **not inverses of each other**. pyproj
(PROJ 9) handles the same string correctly; proj4js does not.

---

## The proj4js Bug

pyproj and proj4js both export the same proj4 string for our rotated-pole CRS:

```
+proj=ob_tran +o_proj=longlat +o_lon_p=0 +o_lat_p=60.31 +lon_0=327.63 +a=6371229 +no_defs
```

**pyproj (correct):**
```
forward([116, -32])  → [153.44, -5.89]   ✓ (lands inside xyLimits [147–160, -11 to -2])
inverse([154, -6.5]) → [116.45, -32.73]  ✓
round-trip:          → [116.00, -32.00]  ✓
```

**proj4js (broken):**
```
forward([116, -32])  → [102.10, -30.46]  ✗ (50° west of xyLimits - no intersection found)
inverse([154, -6.5]) → [116.45, -32.73]  ✓ (inverse happens to be correct)
round-trip:          → [51.26, -32.00]   ✗ (not the original point)
```

The `inverse()` in proj4js works correctly (which is why the data renders in the right place),
but `forward()` is wrong due to how proj4js applies `lon_0` in the `ob_tran` projection.

This exact bug was reported as [proj4js issue #536](https://github.com/proj4js/proj4js/issues/536)
("ob_tran projection does not handle o_proj=longlat properly") and fixed in
[PR #535](https://github.com/proj4js/proj4js/pull/535), released in **v2.20.2** (Nov 19, 2025).

However, we are already running **proj4 v2.20.8** (which includes the fix), and zarr-layer
imports proj4 directly from our `node_modules` (`import proj4 from "proj4"` — not a bundled copy).
So the bug should be fixed in our environment. The `forward()` output we're observing ([102, -30]
for [116, -32]) must therefore be coming from a **different cause** — most likely the proj4 string
itself is not correctly representing the coordinate system, meaning the forward transform is
mathematically computing the right value for that string, but the string does not encode the same
CRS that pyproj derives from the CF metadata.

In other words: **the proj4 string `+lon_0=327.63 +o_lon_p=0` and the pyproj-derived string are
not equivalent in proj4js**, even though pyproj converts the CF CRS to that string. The two
implementations interpret the parameters differently.

---

## Background: what ZarrLayer does

1. When the map moves or the time selector changes, `updateVisibleRegions(map)` is called.
2. It calls `getVisibleRegions(map)`, which gets the current WGS84 map bounds (`west/south/east/north`).
3. Because we pass a `proj4` string, it uses the **proj4 forward transform** (WGS84 → source CRS)
   to project those viewport bounds into the data's native coordinate system, producing candidate
   source-CRS coordinates.
4. It then checks which of those projected coordinates fall inside `xyLimits`
   (`[xMin=147.65, xMax=160.43, yMin=-11.34, yMax=-1.56]` — the stored `rlon`/`rlat` ranges).
5. Any region whose bounds intersect that crop is flagged as visible and fetched.

---

## The problem

Our proj4 string is:

```
+proj=ob_tran +o_proj=longlat +o_lon_p=0 +o_lat_p=60.31 +lon_0=327.63 +a=6371229 +no_defs
```

**Forward transform output for SW WA points:**

| WGS84 input | `p.forward()` output | Expected (= stored rlon/rlat) |
|---|---|---|
| `[116, -32]` | `[102.1, -30.5]` | ≈ `[154, -6.5]` |
| `[108, -25]` | `[90.9, -28.6]` | somewhere in [147–160, -11 to -2] |
| `[122, -37]` | `[110.2, -31.7]` | somewhere in [147–160, -11 to -2] |

The forward output is in the range ~90–110°, while `xyLimits` expects ~147–160°. The entire
SWWA viewport projects to coordinates ~50° west of `xyLimits`, so `getCandidateRegions`
returns zero candidates → `getVisibleRegions` returns `[]` → no fetch.

**Inverse transform works correctly** — the inverse of `[154, -6.5]` gives `[116.4, -32.7]` ✓.
This is why the data renders correctly once loaded: the rendering shader uses the inverse
transform to reproject pixels back to WGS84 for display.

**Round-trip is broken:**

```
p.forward([116, -32])           → [102.1, -30.5]
p.inverse([102.1, -30.5])       → [51.3, -32.0]   ← not [116, -32] ✗
```

This means `forward` and `inverse` are **not inverses of each other** for this proj4 string
in proj4js. The `lon_0=327.63` parameter we added to shift the rendered output into the [147–160]
range is being applied asymmetrically: it corrects the inverse but distorts the forward.

---

## Why it works when sufficiently zoomed out

When zoomed far out, the viewport bounds are very large (e.g. `west=99°, east=134°`). At that
scale the forward-transformed candidates, though offset by ~50°, still happen to overlap with
`xyLimits` just enough due to the large region margin applied by `getCandidateRegions`.
As you zoom in the viewport shrinks, the projected region becomes smaller, and it no longer
overlaps `xyLimits` at all.

---

## What needs fixing

Two options:

### Option A — Fix the proj4 string

Find a single string where `forward` and `inverse` are true inverses **and** the coordinate
range matches stored `rlon`/`rlat` values [147–160, -11 to -2].

Initial testing shows `+o_lon_p=-32.37` (no `lon_0`) gives:
- `forward([116,-32])` → `[95.1, -16.0]` — round-trips correctly but ~55° too low
- `inverse([154,-6.5])` → wrong answer (the stored values don't map back to SWWA)

The stored `rlon` values [147–160] may simply be in a **non-standard offset** rotated-pole
convention used by CORDEX/WRF. If the true mathematical rotated-pole forward gives ~95°,
then the stored arrays were written with a different longitude origin (+52° offset).

### Option B — Change the stored bounds passed to ZarrLayer

If we use the "correct" proj4 string (no `lon_0`) and update `SWWA_BOUNDS` to use the
coordinates that the forward transform actually produces (~[90–110, -32 to -28]), the viewport
intersection would work. The rendering would also need to be consistent.

### Option C — Patch the `rlon`/`rlat` offset

The CORDEX SWWA data stores `rlon` with a ~52° positive shift relative to what proj4js produces.
We could re-derive `SWWA_BOUNDS` from `p.forward()` of the geographic corners of the domain,
rather than from the raw stored array values.

---

## Next step

Determine the actual offset between stored `rlon` values and what `forward()` produces:

```
stored rlon range:   [147.65, 160.43]
forward of SWWA:     [~90,    ~110  ]
offset:              ~52–55°
```

Test whether bounds derived from `p.forward()` of the four geographic corners of the SWWA
domain give the right intersection, while the current `proj4` string inverse still renders
correctly.
