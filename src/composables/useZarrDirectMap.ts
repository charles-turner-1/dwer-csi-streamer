import { ref, computed, onMounted, onUnmounted } from "vue";
import maplibregl from "maplibre-gl";
import { ZarrLayer, type LoadingState } from "@carbonplan/zarr-layer";
import { FetchStore, root, open, get } from "zarrita";

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
  "#f7fbff",
  "#deebf7",
  "#c6dbef",
  "#9ecae1",
  "#6baed6",
  "#4292c6",
  "#2171b5",
  "#084594",
];

// SWWA CORDEX rotated-pole proj4 string.
// Derived from rotated_pole metadata:
//   grid_north_pole_latitude  = 60.31
//   grid_north_pole_longitude = 147.63
// o_lon_p = grid_north_pole_longitude - 180 = -32.37
export const SWWA_PROJ4 =
  "+proj=ob_tran +o_proj=longlat +o_lon_p=-32.37 +o_lat_p=60.31 +a=6371229 +no_defs";

// Edge bounds [xMin, yMin, xMax, yMax] in rotated-pole degrees.
// Derived from rlat (min=-11.3428, max=-1.5572) and rlon (min=147.6512, max=160.4288).
export const SWWA_BOUNDS: [number, number, number, number] = [
  147.6512, -11.3428, 160.4288, -1.5572,
];

export const SWWA_SPATIAL_DIMS = { lat: "rlat", lon: "rlon" };

async function fetchTimeDates(source: string): Promise<string[]> {
  const store = new FetchStore(source);
  const arr = await open(root(store).resolve("time"), { kind: "array" });
  const chunk = await get(arr);
  const data = chunk.data as Float64Array;
  const base = Date.UTC(1949, 11, 1); // days since 1949-12-01
  return Array.from(data, (v) =>
    new Date(base + v * 86400000).toLocaleString("en-AU", {
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

export function useZarrDirectMap(
  source: string,
  varName: string,
  timeSteps: number,
  initialClim: [number, number],
  spatialDims: { lat: string; lon: string },
  colormap: string[],
  fillValue?: number,
) {
  const mapContainer = ref<HTMLDivElement | null>(null);
  const timeIndex = ref(0);
  const opacity = ref(85);
  const timeDates = ref<string[] | null>(null);
  const loadingState = ref<LoadingState>({
    loading: false,
    metadata: false,
    chunks: false,
    error: null,
  });

  let map: maplibregl.Map | null = null;
  let zarrLayer: ZarrLayer | null = null;

  const colourbarStyle = computed(() => ({
    background: `linear-gradient(to right, ${colormap.join(", ")})`,
  }));

  onMounted(() => {
    fetchTimeDates(source).then((dates) => {
      timeDates.value = dates;
    });
    if (!mapContainer.value) return;

    map = new maplibregl.Map({
      container: mapContainer.value,
      style: {
        version: 8,
        sources: {},
        layers: [
          {
            id: "background",
            type: "background",
            paint: { "background-color": "#1a1a2e" },
          },
        ],
      },
      // Centre on the rlat/rlon coordinate space (rotated-pole degrees).
      // rlat ≈ -11 to -1.5, rlon ≈ 147.6 to 160.4 — data appears here
      // without proj4 reprojection. Once reprojection is working this
      // can be changed to the geographic SW WA centre [116.5, -31].
      center: [154, -6],
      zoom: 3,
    });

    map.addControl(new maplibregl.NavigationControl(), "top-right");

    map.on("load", () => {
      if (!map) return;

      zarrLayer = new ZarrLayer({
        id: varName,
        source,
        variable: varName,
        selector: { time: 0 },
        colormap,
        clim: initialClim,
        opacity: opacity.value / 100,
        zarrVersion: 3,
        spatialDimensions: spatialDims,
        // proj4 and bounds deliberately omitted for now so zarr-layer
        // treats rlat/rlon as plain geographic lat/lon. Data will render
        // in the wrong position (~NE of Australia) but confirms the
        // fetch pipeline works before adding reprojection.
        ...(fillValue !== undefined && { fillValue }),
        onLoadingStateChange: (state) => {
          loadingState.value = state;
        },
      });

      map.addLayer(zarrLayer as unknown as maplibregl.CustomLayerInterface);
    });
  });

  onUnmounted(() => {
    map?.remove();
    map = null;
    zarrLayer = null;
  });

  function onTimeChange() {
    zarrLayer?.setSelector({ time: timeIndex.value });
  }

  function onOpacityChange() {
    zarrLayer?.setOpacity(opacity.value / 100);
  }

  function setClim(clim: [number, number]) {
    zarrLayer?.setClim(clim);
  }

  return {
    mapContainer,
    timeIndex,
    timeSteps,
    timeDates,
    opacity,
    loadingState,
    colourbarStyle,
    onTimeChange,
    onOpacityChange,
    setClim,
  };
}
