import { ref, computed, onMounted, onUnmounted } from "vue";
import maplibregl from "maplibre-gl";
import { ZarrLayer, type LoadingState } from "@carbonplan/zarr-layer";
import ReferenceStore from "@zarrita/storage/ref";
import { registry } from "zarrita";

class ShuffleCodec {
  private elementsize: number;
  kind = "bytes_to_bytes" as const;

  static fromConfig(): ShuffleCodec {
    return new ShuffleCodec();
  }

  constructor({ elementsize = 4 }: { elementsize?: number } = {}) {
    this.elementsize = elementsize;
  }

  async decode(data: Uint8Array): Promise<Uint8Array> {
    const nElements = Math.floor(data.length / this.elementsize);
    const result = new Uint8Array(data.length);
    for (let byte = 0; byte < this.elementsize; byte++)
      for (let i = 0; i < nElements; i++)
        result[i * this.elementsize + byte] = data[byte * nElements + i]!;
    return result;
  }

  encode(): never {
    throw new Error("ShuffleCodec.encode not implemented");
  }
}

registry.set("shuffle", async () => ShuffleCodec);

const PAWSEY_ENDPOINT = "https://projects.pawsey.org.au";
export const CLIM: [number, number] = [-2, 40];

function getTimeSteps(
  refSpec: Record<string, unknown>,
  varName: string,
): number {
  const refs = refSpec.refs as Record<string, unknown>;
  const entry = refs[`${varName}/.zarray`];
  if (typeof entry === "string") {
    const zarray = JSON.parse(entry) as { shape: number[] };
    return zarray.shape[0] ?? 1;
  }
  return 1;
}
export const COLORMAP = [
  "#440154",
  "#31688e",
  "#35b779",
  "#fde725",
  "#f1605d",
  "#d73027",
  "#a50026",
  "#ffffff",
];

function buildStore(refSpec: Record<string, unknown>) {
  const rawRefs = refSpec.refs as Record<string, unknown>;
  const rewrittenRefs: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(rawRefs)) {
    if (
      Array.isArray(v) &&
      typeof v[0] === "string" &&
      v[0].startsWith("s3://")
    ) {
      rewrittenRefs[k] = [
        v[0].replace(/^s3:\/\//, `${PAWSEY_ENDPOINT}/`),
        v[1],
        v[2],
      ];
    } else {
      rewrittenRefs[k] = v;
    }
  }
  return ReferenceStore.fromSpec({ ...refSpec, refs: rewrittenRefs } as Record<
    string,
    unknown
  >);
}

export function useZarrMap(
  refSpec: Record<string, unknown>,
  varName: string,
  latName: string,
  lonName: string,
  units: "C" | "K" = "C",
  fillValue?: number,
) {
  const kelvinOffset = units === "K" ? 273.15 : 0;
  const timeSteps = getTimeSteps(refSpec, varName);
  const mapContainer = ref<HTMLDivElement | null>(null);
  const timeIndex = ref(0);
  const opacity = ref(85);
  const loadingState = ref<LoadingState>({
    loading: false,
    metadata: false,
    chunks: false,
    error: null,
  });

  let map: maplibregl.Map | null = null;
  let zarrLayer: ZarrLayer | null = null;

  const colourbarStyle = computed(() => ({
    background: `linear-gradient(to right, ${COLORMAP.join(", ")})`,
  }));

  onMounted(() => {
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
      center: [0, 0],
      zoom: 1,
    });

    map.addControl(new maplibregl.NavigationControl(), "top-right");

    map.on("load", () => {
      if (!map) return;

      zarrLayer = new ZarrLayer({
        id: varName,
        store: buildStore(refSpec),
        variable: varName,
        selector: { time: 0 },
        colormap: COLORMAP,
        clim: [CLIM[0] + kelvinOffset, CLIM[1] + kelvinOffset],
        opacity: opacity.value / 100,
        zarrVersion: 2,
        spatialDimensions: { lat: latName, lon: lonName },
        bounds: [-180, -90, 180, 90],
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
    zarrLayer?.setClim([clim[0] + kelvinOffset, clim[1] + kelvinOffset]);
  }

  return {
    mapContainer,
    timeIndex,
    timeSteps,
    opacity,
    loadingState,
    colourbarStyle,
    onTimeChange,
    onOpacityChange,
    setClim,
  };
}
