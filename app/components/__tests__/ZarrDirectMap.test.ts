// @vitest-environment nuxt
import { describe, it, expect, vi, beforeEach } from "vitest";
import { ref } from "vue";
import { mountSuspended } from "@nuxt/test-utils/runtime";
import ZarrDirectMap from "@/components/ZarrDirectMap.vue";
import { kelvinToCelsius } from "@/utils/unitConversion";
import { useZarrDirectMap } from "@/composables/useZarrDirectMap";

// ---------------------------------------------------------------------------
// Mock composable — we test ZarrDirectMap's UI logic in isolation
// ---------------------------------------------------------------------------

const mockSetClim = vi.fn();
const mockOnTimeChange = vi.fn();
const mockOnOpacityChange = vi.fn();
const mockSetProjection = vi.fn();

const mockState = {
  mapContainer: ref<HTMLDivElement | null>(null),
  timeIndex: ref(0),
  timeSteps: 5,
  timeDates: ref<string[] | null>(null),
  opacity: ref(85),
  loadingState: ref({
    loading: false,
    metadata: false,
    chunks: false,
    error: null as Error | null,
  }),
  colourbarStyle: ref({ background: "linear-gradient(to right, #000, #fff)" }),
  onTimeChange: mockOnTimeChange,
  onOpacityChange: mockOnOpacityChange,
  setClim: mockSetClim,
  setProjection: mockSetProjection,
};

vi.mock("@/composables/useZarrDirectMap", () => ({
  useZarrDirectMap: vi.fn(() => mockState),
  // Re-export the colormap/dimension constants consumed elsewhere so the mock
  // does not break unrelated imports.
  COLORMAP_TEMP: [],
  COLORMAP_PRECIP: [],
  SWWA_SPATIAL_DIMS: { lat: "rlat", lon: "rlon" },
  SWWA_PROJ4: "",
  SWWA_BOUNDS: [0, 0, 0, 0],
}));

// ---------------------------------------------------------------------------
// Default props for mounting
// ---------------------------------------------------------------------------

const defaultProps = {
  source: "https://example.com/store.zarr",
  varName: "tasmax",
  timeSteps: 5,
  clim: [280, 325] as [number, number],
  spatialDims: { lat: "rlat", lon: "rlon" },
  colormap: ["#000000", "#ffffff"],
  climUnit: " K",
};

// Plain-input stubs for the Nuxt UI form controls so DOM queries stay simple.
const stubs = {
  USlider: {
    template: `<input type="range" :value="modelValue" @input="$emit('update:modelValue', +$event.target.value)" />`,
    props: ["modelValue"],
    emits: ["update:modelValue"],
  },
  UInputNumber: {
    template: `<input data-testid="input-number" :value="modelValue" @input="$emit('update:modelValue', +$event.target.value)" />`,
    props: ["modelValue"],
    emits: ["update:modelValue"],
  },
  USelect: {
    template: `<select :value="modelValue" @change="$emit('update:modelValue', $event.target.value)"><slot /></select>`,
    props: ["modelValue", "items"],
    emits: ["update:modelValue"],
  },
};

function mountComponent(propsOverride = {}) {
  return mountSuspended(ZarrDirectMap, {
    props: { ...defaultProps, ...propsOverride },
    global: { stubs },
  });
}

beforeEach(() => {
  vi.clearAllMocks();
  mockState.timeIndex.value = 0;
  mockState.opacity.value = 85;
  mockState.timeDates.value = null;
  mockState.loadingState.value = {
    loading: false,
    metadata: false,
    chunks: false,
    error: null,
  };
});

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("ZarrDirectMap", () => {
  describe("rendering", () => {
    it("renders a time range slider", async () => {
      const wrapper = await mountComponent();
      const sliders = wrapper.findAll("input[type='range']");
      expect(sliders.length).toBeGreaterThanOrEqual(1);
    });

    it("renders an opacity range slider", async () => {
      const wrapper = await mountComponent();
      const sliders = wrapper.findAll("input[type='range']");
      expect(sliders.length).toBeGreaterThanOrEqual(2);
    });

    it("renders the Reset button", async () => {
      const wrapper = await mountComponent();
      const buttons = wrapper.findAll("button");
      const resetBtn = buttons.find((b) => b.text() === "Reset");
      expect(resetBtn).toBeDefined();
    });
  });

  describe("time label", () => {
    it("shows fallback 'N / total' when timeDates is null", async () => {
      mockState.timeIndex.value = 0;
      const wrapper = await mountComponent();
      expect(wrapper.text()).toContain("1 / 5");
    });

    it("shows the real date string when timeDates is loaded", async () => {
      mockState.timeDates.value = [
        "Jan 1980",
        "Feb 1980",
        "Mar 1980",
        "Apr 1980",
        "May 1980",
      ];
      mockState.timeIndex.value = 0;
      const wrapper = await mountComponent();
      expect(wrapper.text()).toContain("Jan 1980");
    });

    it("shows the correct date for the current timeIndex", async () => {
      mockState.timeDates.value = [
        "Jan 1980",
        "Feb 1980",
        "Mar 1980",
        "Apr 1980",
        "May 1980",
      ];
      mockState.timeIndex.value = 3;
      const wrapper = await mountComponent();
      expect(wrapper.text()).toContain("Apr 1980");
    });
  });

  describe("loading overlay", () => {
    it("is hidden when loading=false", async () => {
      const wrapper = await mountComponent();
      expect(wrapper.text()).not.toContain("Fetching chunks");
      expect(wrapper.text()).not.toContain("Loading metadata");
    });

    it("shows 'Fetching chunks…' when loading=true and chunks=true", async () => {
      mockState.loadingState.value = {
        loading: true,
        metadata: true,
        chunks: true,
        error: null,
      };
      const wrapper = await mountComponent();
      expect(wrapper.text()).toContain("Fetching chunks");
    });

    it("shows 'Loading metadata…' when loading=true and chunks=false", async () => {
      mockState.loadingState.value = {
        loading: true,
        metadata: true,
        chunks: false,
        error: null,
      };
      const wrapper = await mountComponent();
      expect(wrapper.text()).toContain("Loading metadata");
    });
  });

  describe("error overlay", () => {
    it("is hidden when there is no error", async () => {
      const wrapper = await mountComponent();
      expect(wrapper.text()).not.toContain("Something went wrong");
    });

    it("shows the error message when loadingState.error is set", async () => {
      mockState.loadingState.value = {
        loading: false,
        metadata: false,
        chunks: false,
        error: new Error("Network timeout"),
      };
      const wrapper = await mountComponent();
      expect(wrapper.text()).toContain("Network timeout");
    });
  });

  describe("climState initialisation", () => {
    it("initialises lower and upper from props.clim", async () => {
      const wrapper = await mountComponent({
        clim: [270, 310] as [number, number],
      });
      expect(wrapper.text()).toContain("270");
      expect(wrapper.text()).toContain("310");
    });
  });

  describe("reset button", () => {
    it("calls setClim with original props.clim values", async () => {
      const wrapper = await mountComponent({
        clim: [280, 325] as [number, number],
      });
      const resetBtn = wrapper
        .findAll("button")
        .find((b) => b.text() === "Reset")!;
      await resetBtn.trigger("click");
      expect(mockSetClim).toHaveBeenCalledWith([280, 325]);
    });
  });

  describe("time slider interaction", () => {
    it("calls onTimeChange when slider value changes", async () => {
      const wrapper = await mountComponent();
      const slider = wrapper.find("input[type='range']");
      await slider.trigger("input");
      expect(mockOnTimeChange).toHaveBeenCalled();
    });
  });

  describe("unitConverter prop wiring", () => {
    it("passes unitConverter prop as 10th arg to useZarrDirectMap", async () => {
      await mountComponent({ unitConverter: kelvinToCelsius });
      const lastArg = vi.mocked(useZarrDirectMap).mock.calls[0]?.[9];
      expect(lastArg).toStrictEqual(kelvinToCelsius);
    });

    it("passes undefined as 10th arg when no unitConverter provided", async () => {
      await mountComponent();
      const lastArg = vi.mocked(useZarrDirectMap).mock.calls[0]?.[9];
      expect(lastArg).toBeUndefined();
    });
  });
});
