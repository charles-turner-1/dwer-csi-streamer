import { describe, it, expect, vi, beforeEach } from "vitest";
import { mount } from "@vue/test-utils";
import { ref } from "vue";
import ZarrDirectMap from "@/components/ZarrDirectMap.vue";
import { kelvinToCelsius } from "@/utils/unitConversion";
import { useZarrDirectMap } from "@/composables/useZarrDirectMap";

// ---------------------------------------------------------------------------
// Mock composable — we test ZarrDirectMap's UI logic in isolation
// ---------------------------------------------------------------------------

const mockSetClim = vi.fn();
const mockOnTimeChange = vi.fn();
const mockOnOpacityChange = vi.fn();

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
};

vi.mock("@/composables/useZarrDirectMap", () => ({
  useZarrDirectMap: vi.fn(() => mockState),
}));

vi.mock("@/composables/usePosthog", () => ({
  usePosthog: vi.fn(() => ({ capture: vi.fn() })),
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

function mountComponent(propsOverride = {}) {
  return mount(ZarrDirectMap, {
    props: { ...defaultProps, ...propsOverride },
    global: {
      stubs: {
        // Stub PrimeVue InputNumber to a plain input so we can trigger events
        InputNumber: {
          template: `<input data-testid="input-number" :value="modelValue" @input="$emit('update:modelValue', +$event.target.value)" />`,
          props: ["modelValue"],
          emits: ["update:modelValue"],
        },
      },
    },
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
    it("renders a time range slider", () => {
      const wrapper = mountComponent();
      const sliders = wrapper.findAll("input[type='range']");
      expect(sliders.length).toBeGreaterThanOrEqual(1);
    });

    it("renders an opacity range slider", () => {
      const wrapper = mountComponent();
      const sliders = wrapper.findAll("input[type='range']");
      expect(sliders.length).toBeGreaterThanOrEqual(2);
    });

    it("renders the Reset button", () => {
      const wrapper = mountComponent();
      const buttons = wrapper.findAll("button");
      const resetBtn = buttons.find((b) => b.text() === "Reset");
      expect(resetBtn).toBeDefined();
    });
  });

  describe("time label", () => {
    it("shows fallback 'N / total' when timeDates is null", () => {
      mockState.timeIndex.value = 0;
      const wrapper = mountComponent();
      expect(wrapper.text()).toContain("1 / 5");
    });

    it("shows the real date string when timeDates is loaded", () => {
      mockState.timeDates.value = [
        "Jan 1980",
        "Feb 1980",
        "Mar 1980",
        "Apr 1980",
        "May 1980",
      ];
      mockState.timeIndex.value = 0;
      const wrapper = mountComponent();
      expect(wrapper.text()).toContain("Jan 1980");
    });

    it("shows the correct date for the current timeIndex", () => {
      mockState.timeDates.value = [
        "Jan 1980",
        "Feb 1980",
        "Mar 1980",
        "Apr 1980",
        "May 1980",
      ];
      mockState.timeIndex.value = 3;
      const wrapper = mountComponent();
      expect(wrapper.text()).toContain("Apr 1980");
    });
  });

  describe("loading overlay", () => {
    it("is hidden when loading=false", () => {
      const wrapper = mountComponent();
      expect(wrapper.text()).not.toContain("Fetching chunks");
      expect(wrapper.text()).not.toContain("Loading metadata");
    });

    it("shows 'Fetching chunks…' when loading=true and chunks=true", () => {
      mockState.loadingState.value = {
        loading: true,
        metadata: true,
        chunks: true,
        error: null,
      };
      const wrapper = mountComponent();
      expect(wrapper.text()).toContain("Fetching chunks");
    });

    it("shows 'Loading metadata…' when loading=true and chunks=false", () => {
      mockState.loadingState.value = {
        loading: true,
        metadata: true,
        chunks: false,
        error: null,
      };
      const wrapper = mountComponent();
      expect(wrapper.text()).toContain("Loading metadata");
    });
  });

  describe("error overlay", () => {
    it("is hidden when there is no error", () => {
      const wrapper = mountComponent();
      expect(wrapper.text()).not.toContain("Something went wrong");
    });

    it("shows the error message when loadingState.error is set", () => {
      mockState.loadingState.value = {
        loading: false,
        metadata: false,
        chunks: false,
        error: new Error("Network timeout"),
      };
      const wrapper = mountComponent();
      expect(wrapper.text()).toContain("Network timeout");
    });
  });

  describe("climState initialisation", () => {
    it("initialises lower and upper from props.clim", () => {
      const wrapper = mountComponent({ clim: [270, 310] as [number, number] });
      expect(wrapper.text()).toContain("270");
      expect(wrapper.text()).toContain("310");
    });
  });

  describe("reset button", () => {
    it("calls setClim with original props.clim values", async () => {
      const wrapper = mountComponent({ clim: [280, 325] as [number, number] });
      const resetBtn = wrapper
        .findAll("button")
        .find((b) => b.text() === "Reset")!;
      await resetBtn.trigger("click");
      expect(mockSetClim).toHaveBeenCalledWith([280, 325]);
    });
  });

  describe("time slider interaction", () => {
    it("calls onTimeChange when slider value changes", async () => {
      const wrapper = mountComponent();
      const slider = wrapper.find("input[type='range']");
      await slider.trigger("input");
      expect(mockOnTimeChange).toHaveBeenCalled();
    });
  });

  describe("unitConverter prop wiring", () => {
    it("passes unitConverter prop as 10th arg to useZarrDirectMap", () => {
      mountComponent({ unitConverter: kelvinToCelsius });
      const lastArg = vi.mocked(useZarrDirectMap).mock.calls[0]?.[9];
      expect(lastArg).toStrictEqual(kelvinToCelsius);
    });

    it("passes undefined as 10th arg when no unitConverter provided", () => {
      mountComponent();
      const lastArg = vi.mocked(useZarrDirectMap).mock.calls[0]?.[9];
      expect(lastArg).toBeUndefined();
    });
  });
});
