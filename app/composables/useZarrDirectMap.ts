import {
  ref,
  computed,
  watch,
  toValue,
  onMounted,
  onUnmounted,
  type MaybeRefOrGetter,
} from "vue";
import maplibregl from "maplibre-gl";
import { ZarrLayer, type LoadingState } from "@carbonplan/zarr-layer";
import { openClimateDataset } from "~/composables/useClimateDataset";
import type { ClimateVariableConfig } from "~/config/climateVariables";

export const COLORMAP_TEMP = [
  "#440154",
  "#31688e",
  "#35b779",
  "#fde725",
  "#f1605d",
  "#d73027",
  "#a50026",
  "#ffffff",
];

export const COLORMAP_PRECIP = [
  "#440154",
  "#472d7b",
  "#3b528b",
  "#2c728e",
  "#21918c",
  "#28ae80",
  "#5ec962",
  "#fde725",
];

// SWWA CORDEX rotated-pole proj4 string.
// Derived from rotated_pole metadata via pyproj:
//   grid_north_pole_latitude  = 60.31  → o_lat_p = 60.31
//   grid_north_pole_longitude = 147.63 → lon_0 = 147.63 + 180 = 327.63, o_lon_p = 0
export const SWWA_PROJ4 =
  "+proj=ob_tran +o_proj=longlat +o_lon_p=0 +o_lat_p=60.31 +lon_0=327.63 +a=6371229 +no_defs";

// Edge bounds [xMin, yMin, xMax, yMax] in rotated-pole degrees.
// Derived from rlat (min=-11.3428, max=-1.5572) and rlon (min=147.6512, max=160.4288).
export const SWWA_BOUNDS: [number, number, number, number] = [
  147.6512, -11.3428, 160.4288, -1.5572,
];

export const SWWA_SPATIAL_DIMS = { lat: "rlat", lon: "rlon" };

// Layer id for the coast outline drawn on top of the data layer. New data layers
// are inserted *below* this so the outline always stays on top.
const COAST_OUTLINE_ID = "coast-outline";

export async function fetchTimeDates(source: string): Promise<string[]> {
  const ds = await openClimateDataset(source);
  // xarray-ts CF-decodes the time axis from its `units`/`calendar` attributes
  // (e.g. "days since 1949-12-01", gregorian), so we no longer hardcode the base.
  const dates = ds.coords.time?.dates() ?? [];
  return dates.map((d) =>
    d.toLocaleString("en-AU", {
      day: "numeric",
      month: "short",
      year: "numeric",
      // Disable hour/day/minute for now.
      // hour: "2-digit",
      // minute: "2-digit",
      // hour12: false,
      timeZone: "UTC",
    }),
  );
}

// Utility: detect if device is mobile (screen width <= 768px)
function isMobileDevice() {
  if (typeof window !== "undefined") {
    return window.matchMedia("(max-width: 768px)").matches;
  }
  return false;
}

export interface UseZarrDirectMapOptions {
  fillValue?: number;
  proj4?: string;
  bounds?: [number, number, number, number];
  initialProjection?: string;
  initZoom?: number;
}

/**
 * Drives a single MapLibre map showing one Zarr variable at a time.
 *
 * The active variable is reactive: when `variable` changes the data layer is
 * swapped *in place* (the map, zoom, pan, projection, time index and opacity are
 * preserved) and the colour range resets to the new variable's defaults. This
 * replaces the old `:key`-based full remount.
 */
export function useZarrDirectMap(
  source: string,
  variable: MaybeRefOrGetter<ClimateVariableConfig>,
  timeSteps: number,
  spatialDims: { lat: string; lon: string },
  options: UseZarrDirectMapOptions = {},
) {
  const { capture } = usePosthog();
  const { fillValue, proj4, bounds, initialProjection = "globe" } = options;

  const mapContainer = ref<HTMLDivElement | null>(null);
  const timeIndex = ref(0);
  const opacity = ref(85);
  const projection = ref(initialProjection);
  const timeDates = ref<string[] | null>(null);
  const loadingState = ref<LoadingState>({
    loading: false,
    metadata: false,
    chunks: false,
    error: null,
  });

  // Colour-range (clim) state, in *display* units. Initialised from the active
  // variable and reset whenever the variable changes.
  const initialVar = toValue(variable);
  const climLower = ref(initialVar.clim[0]);
  const climUpper = ref(initialVar.clim[1]);

  let map: maplibregl.Map | null = null;
  let zarrLayer: ZarrLayer | null = null;
  let currentLayerId: string | null = null;

  const colourbarStyle = computed(() => ({
    background: `linear-gradient(to right, ${toValue(variable).colormap.join(", ")})`,
  }));

  const climUnit = computed(() => toValue(variable).climUnit ?? "");

  // Derive step and decimal places from the active variable's clim range so that
  // small-magnitude variables (e.g. precipitation ~0–8.64) are still adjustable
  // accurately without hardcoding temperature-scale defaults.
  const climDefaults = computed(() => toValue(variable).clim);
  const climRange = computed(() =>
    Math.abs(climDefaults.value[1] - climDefaults.value[0]),
  );
  const climStep = computed(() => Math.max(climRange.value / 100, 1e-7));
  const climFractionDigits = computed(() =>
    Math.min(7, Math.max(0, Math.ceil(-Math.log10(climStep.value)))),
  );

  function toRawClim(clim: [number, number]): [number, number] {
    const { unitConverter } = toValue(variable);
    return unitConverter
      ? [unitConverter.toRaw(clim[0]), unitConverter.toRaw(clim[1])]
      : clim;
  }

  // (Re)build the data layer for the current variable, preserving the current
  // time index and opacity. Inserts below the coast outline when it exists.
  function buildLayer() {
    if (!map) return;
    const v = toValue(variable);

    if (currentLayerId && map.getLayer(currentLayerId)) {
      map.removeLayer(currentLayerId);
    }

    zarrLayer = new ZarrLayer({
      id: v.varName,
      source,
      variable: v.varName,
      selector: { time: timeIndex.value },
      colormap: v.colormap,
      clim: toRawClim([v.clim[0], v.clim[1]]),
      opacity: opacity.value / 100,
      zarrVersion: 3,
      spatialDimensions: spatialDims,
      ...(proj4 !== undefined && { proj4 }),
      ...(bounds !== undefined && { bounds }),
      ...(fillValue !== undefined && { fillValue }),
      onLoadingStateChange: (state) => {
        loadingState.value = state;
      },
    });

    const beforeId = map.getLayer(COAST_OUTLINE_ID)
      ? COAST_OUTLINE_ID
      : undefined;
    map.addLayer(
      zarrLayer as unknown as maplibregl.CustomLayerInterface,
      beforeId,
    );
    currentLayerId = v.varName;
  }

  function initMap(container: HTMLDivElement) {
    map = new maplibregl.Map({
      container,
      style: "https://basemaps.cartocdn.com/gl/positron-gl-style/style.json",
      // Centre on geographic SW WA [116°E, -32°S]
      center: [116, -32],
      zoom: options.initZoom ?? (isMobileDevice() ? 2 : 3),
    });

    map.addControl(new maplibregl.NavigationControl(), "top-right");

    map.on("load", () => {
      if (!map) return;

      buildLayer();

      map.setProjection({
        type: projection.value,
      } as maplibregl.ProjectionSpecification);

      // Coast outlines on top of the data layer — stroke the water polygons
      // already loaded by the Positron style's "carto" vector tile source.
      map.addLayer({
        id: COAST_OUTLINE_ID,
        type: "line",
        source: "carto",
        "source-layer": "water",
        paint: {
          "line-color": "#686868",
          "line-width": 1.5,
        },
      });
    });
  }

  onMounted(() => {
    fetchTimeDates(source).then((dates) => {
      timeDates.value = dates;
    });

    // Initialise the map once the container element is available. Using a watch
    // (rather than reading the ref directly) keeps init robust regardless of
    // when the canvas element mounts.
    watch(
      mapContainer,
      (container) => {
        if (container && !map) initMap(container);
      },
      { immediate: true },
    );
  });

  // Swap the data layer in place when the active variable changes.
  watch(
    () => toValue(variable).varName,
    () => {
      const v = toValue(variable);
      climLower.value = v.clim[0];
      climUpper.value = v.clim[1];
      buildLayer();
    },
  );

  // Capture map load / error once each load settles.
  watch(
    () => loadingState.value.loading,
    (loading, wasLoading) => {
      if (wasLoading && !loading) {
        const varName = toValue(variable).varName;
        if (loadingState.value.error) {
          capture("zarr_map_error", {
            var_name: varName,
            message: loadingState.value.error.message,
          });
        } else {
          capture("zarr_map_loaded", { var_name: varName });
        }
      }
    },
  );

  onUnmounted(() => {
    map?.remove();
    map = null;
    zarrLayer = null;
    currentLayerId = null;
  });

  function setClim(clim: [number, number]) {
    // Convert before the null-guarded call so the unit conversion is applied
    // unconditionally (optional chaining would skip argument evaluation).
    const raw = toRawClim(clim);
    zarrLayer?.setClim(raw);
  }

  function setProjection(type: string) {
    map?.setProjection({ type } as maplibregl.ProjectionSpecification);
  }

  let timeDebounce: ReturnType<typeof setTimeout> | null = null;
  function onTimeChange() {
    zarrLayer?.setSelector({ time: timeIndex.value });
    if (timeDebounce) clearTimeout(timeDebounce);
    timeDebounce = setTimeout(() => {
      capture("zarr_map_time_changed", {
        var_name: toValue(variable).varName,
        time_index: timeIndex.value,
      });
    }, 1000);
  }

  let opacityDebounce: ReturnType<typeof setTimeout> | null = null;
  function onOpacityChange() {
    zarrLayer?.setOpacity(opacity.value / 100);
    if (opacityDebounce) clearTimeout(opacityDebounce);
    opacityDebounce = setTimeout(() => {
      capture("zarr_map_opacity_changed", {
        var_name: toValue(variable).varName,
        opacity: opacity.value,
      });
    }, 1000);
  }

  function onClimChange() {
    setClim([climLower.value, climUpper.value]);
    capture("zarr_map_clim_changed", {
      var_name: toValue(variable).varName,
      lower: climLower.value,
      upper: climUpper.value,
    });
  }

  function resetClim() {
    const v = toValue(variable);
    climLower.value = v.clim[0];
    climUpper.value = v.clim[1];
    setClim([climLower.value, climUpper.value]);
    capture("zarr_map_clim_reset", { var_name: v.varName });
  }

  function onProjectionChange() {
    setProjection(projection.value);
    capture("zarr_map_projection_changed", {
      var_name: toValue(variable).varName,
      projection: projection.value,
    });
  }

  return {
    mapContainer,
    timeIndex,
    timeSteps,
    timeDates,
    opacity,
    projection,
    loadingState,
    climLower,
    climUpper,
    climDefaults,
    climRange,
    climStep,
    climFractionDigits,
    colourbarStyle,
    climUnit,
    onTimeChange,
    onOpacityChange,
    onClimChange,
    resetClim,
    onProjectionChange,
    setClim,
    setProjection,
  };
}
