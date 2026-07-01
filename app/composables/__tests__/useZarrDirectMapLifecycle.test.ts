// @vitest-environment nuxt
//
// Tests that need Vue's onMounted / onUnmounted lifecycle hooks must run
// inside a real component. This file mounts a minimal wrapper component so
// that initMap, buildLayer, and the cleanup path all execute.

import { describe, it, expect, vi, beforeEach } from "vitest";
import { ref, defineComponent, nextTick } from "vue";
import { mountSuspended } from "@nuxt/test-utils/runtime";

// ---------------------------------------------------------------------------
// Mocks — declared before any imports that pull in the composable.
// ---------------------------------------------------------------------------

vi.mock("~/composables/usePosthog", () => ({
  usePosthog: () => ({ capture: vi.fn() }),
}));

// onMounted → fetchTimeDates opens the dataset via xarray-ts; stub it so the
// lifecycle tests stay offline.
vi.mock("~/composables/useClimateDataset", () => ({
  openClimateDataset: vi.fn(() =>
    Promise.resolve({
      coords: {
        time: {
          dates: () => [
            new Date(Date.UTC(1949, 11, 1)),
            new Date(Date.UTC(1950, 0, 1)),
          ],
        },
      },
    }),
  ),
}));

vi.mock("@carbonplan/zarr-layer", () => ({
  ZarrLayer: vi.fn().mockImplementation(() => ({
    setSelector: vi.fn(),
    setOpacity: vi.fn(),
    setClim: vi.fn(),
  })),
}));

// Fire the "load" event synchronously so buildLayer runs during initMap.
// Return a truthy value from getLayer so the removeLayer branch is hit when
// the variable changes and the layer is rebuilt.
vi.mock("maplibre-gl", () => ({
  default: {
    Map: vi.fn().mockImplementation(() => ({
      addControl: vi.fn(),
      on: vi.fn().mockImplementation((event: string, cb: () => void) => {
        if (event === "load") cb();
      }),
      getLayer: vi.fn().mockReturnValue({ id: "mock-layer" }),
      removeLayer: vi.fn(),
      addLayer: vi.fn(),
      setProjection: vi.fn(),
      remove: vi.fn(),
    })),
    NavigationControl: vi.fn(),
  },
}));

import {
  useZarrDirectMap,
  COLORMAP_TEMP,
} from "~/composables/useZarrDirectMap";
import type { ClimateVariableConfig } from "~/config/climateVariables";
import type { UnitConverter } from "~/utils/unitConversion";

function makeVar(
  over: Partial<ClimateVariableConfig> = {},
): ClimateVariableConfig {
  return {
    varName: "tasmax",
    label: "Max Temperature",
    clim: [6.85, 51.85],
    colormap: COLORMAP_TEMP,
    climUnit: " °C",
    unitConverter: undefined as unknown as UnitConverter,
    whatAboutMe: {
      introMetric: "",
      headlineMetric: "",
      chartTitleMetric: "",
      axisLabel: "",
      unitLabel: "",
    },
    ...over,
  };
}

// Minimal wrapper that calls useZarrDirectMap in setup and binds the
// container div via a function ref — exactly as ZarrMapCanvas does.
function makeWrapper(variable: { value: ClimateVariableConfig }) {
  return defineComponent({
    setup() {
      const mapApi = useZarrDirectMap(
        "https://example.com/store.zarr",
        variable as ReturnType<typeof ref<ClimateVariableConfig>>,
        492,
        { lat: "rlat", lon: "rlon" },
      );
      function setContainer(el: Element | null) {
        mapApi.mapContainer.value = el as HTMLDivElement | null;
      }
      return { setContainer };
    },
    template:
      '<div><div :ref="setContainer" style="width:100px;height:100px"></div></div>',
  });
}

describe("useZarrDirectMap lifecycle", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("onMounted initialises the map and runs buildLayer via the load event", async () => {
    const variable = ref(makeVar());
    const wrapper = await mountSuspended(makeWrapper(variable));
    expect(wrapper.exists()).toBe(true);

    const { default: maplibregl } = await import("maplibre-gl");
    expect(vi.mocked(maplibregl.Map)).toHaveBeenCalled();

    const { ZarrLayer } = await import("@carbonplan/zarr-layer");
    expect(vi.mocked(ZarrLayer)).toHaveBeenCalled();
  });

  it("swapping the variable triggers buildLayer again (removes old layer, adds new)", async () => {
    const variable = ref(makeVar());
    await mountSuspended(makeWrapper(variable));

    const { ZarrLayer } = await import("@carbonplan/zarr-layer");
    const callsBefore = vi.mocked(ZarrLayer).mock.calls.length;

    variable.value = makeVar({ varName: "pr", clim: [0, 8.64] });
    await nextTick();

    expect(vi.mocked(ZarrLayer).mock.calls.length).toBeGreaterThan(callsBefore);

    const { default: maplibregl } = await import("maplibre-gl");
    const mapInstance = vi.mocked(maplibregl.Map).mock.results[0]?.value;
    expect(mapInstance.removeLayer).toHaveBeenCalled();
  });

  it("onUnmounted calls map.remove() to clean up", async () => {
    const variable = ref(makeVar());
    const wrapper = await mountSuspended(makeWrapper(variable));

    const { default: maplibregl } = await import("maplibre-gl");
    const mapInstance = vi.mocked(maplibregl.Map).mock.results[0]?.value;

    wrapper.unmount();
    await nextTick();

    expect(mapInstance.remove).toHaveBeenCalled();
  });
});
