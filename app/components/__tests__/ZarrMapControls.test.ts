// @vitest-environment nuxt
import { describe, it, expect, vi, beforeEach } from "vitest";
import { ref } from "vue";
import { mountSuspended } from "@nuxt/test-utils/runtime";
import ZarrMapControls from "~/components/ZarrMapControls.vue";
import type { useZarrDirectMap } from "~/composables/useZarrDirectMap";

type MapApi = ReturnType<typeof useZarrDirectMap>;

// ---------------------------------------------------------------------------
// Mock "map" object (the useZarrDirectMap return) passed in as a prop.
// ---------------------------------------------------------------------------

const onTimeChange = vi.fn();
const onOpacityChange = vi.fn();
const onClimChange = vi.fn();
const resetClim = vi.fn();
const onProjectionChange = vi.fn();

function makeMap(over: Record<string, unknown> = {}) {
  return {
    timeIndex: ref(0),
    timeSteps: 5,
    timeDates: ref<string[] | null>(null),
    opacity: ref(85),
    projection: ref("globe"),
    climLower: ref(280),
    climUpper: ref(325),
    climDefaults: ref<[number, number]>([280, 325]),
    climRange: ref(45),
    climStep: ref(0.45),
    climFractionDigits: ref(2),
    colourbarStyle: ref({
      background: "linear-gradient(to right, #000, #fff)",
    }),
    climUnit: ref(" K"),
    onTimeChange,
    onOpacityChange,
    onClimChange,
    resetClim,
    onProjectionChange,
    ...over,
  };
}

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

function mountControls(mapOverride = {}) {
  return mountSuspended(ZarrMapControls, {
    // The control component only reads a subset of the composable's return.
    props: { map: makeMap(mapOverride) as unknown as MapApi },
    global: { stubs },
  });
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe("ZarrMapControls", () => {
  describe("rendering", () => {
    it("renders a time range slider", async () => {
      const wrapper = await mountControls();
      const sliders = wrapper.findAll("input[type='range']");
      expect(sliders.length).toBeGreaterThanOrEqual(1);
    });

    it("renders an opacity range slider", async () => {
      const wrapper = await mountControls();
      const sliders = wrapper.findAll("input[type='range']");
      expect(sliders.length).toBeGreaterThanOrEqual(2);
    });

    it("renders the Reset button", async () => {
      const wrapper = await mountControls();
      const buttons = wrapper.findAll("button");
      const resetBtn = buttons.find((b) => b.text().includes("Reset"));
      expect(resetBtn).toBeDefined();
    });
  });

  describe("time label", () => {
    it("shows fallback 'N / total' when timeDates is null", async () => {
      const wrapper = await mountControls();
      expect(wrapper.text()).toContain("1 / 5");
    });

    it("shows the real date string when timeDates is loaded", async () => {
      const wrapper = await mountControls({
        timeDates: ref([
          "Jan 1980",
          "Feb 1980",
          "Mar 1980",
          "Apr 1980",
          "May 1980",
        ]),
        timeIndex: ref(0),
      });
      expect(wrapper.text()).toContain("Jan 1980");
    });

    it("shows the correct date for the current timeIndex", async () => {
      const wrapper = await mountControls({
        timeDates: ref([
          "Jan 1980",
          "Feb 1980",
          "Mar 1980",
          "Apr 1980",
          "May 1980",
        ]),
        timeIndex: ref(3),
      });
      expect(wrapper.text()).toContain("Apr 1980");
    });
  });

  describe("clim display", () => {
    it("shows the lower and upper clim values", async () => {
      const wrapper = await mountControls({
        climLower: ref(270),
        climUpper: ref(310),
      });
      expect(wrapper.text()).toContain("270");
      expect(wrapper.text()).toContain("310");
    });
  });

  describe("reset button", () => {
    it("calls resetClim when clicked", async () => {
      const wrapper = await mountControls();
      const resetBtn = wrapper
        .findAll("button")
        .find((b) => b.text().includes("Reset"))!;
      await resetBtn.trigger("click");
      expect(resetClim).toHaveBeenCalled();
    });
  });

  describe("time slider interaction", () => {
    it("calls onTimeChange when slider value changes", async () => {
      const wrapper = await mountControls();
      const slider = wrapper.find("input[type='range']");
      await slider.trigger("input");
      expect(onTimeChange).toHaveBeenCalled();
    });
  });

  describe("opacity slider interaction", () => {
    it("calls onOpacityChange when the opacity slider changes", async () => {
      const wrapper = await mountControls();
      const sliders = wrapper.findAll("input[type='range']");
      // Second slider is opacity (time is first).
      await sliders[1]!.trigger("input");
      expect(onOpacityChange).toHaveBeenCalled();
    });
  });

  describe("projection select interaction", () => {
    it("calls onProjectionChange when the projection select changes", async () => {
      const wrapper = await mountControls();
      const select = wrapper.find("select");
      await select.trigger("change");
      expect(onProjectionChange).toHaveBeenCalled();
    });
  });

  describe("clim input interaction", () => {
    it("calls onClimChange when the min clim input changes", async () => {
      const wrapper = await mountControls();
      const inputs = wrapper.findAll("input[data-testid='input-number']");
      await inputs[0]!.trigger("input");
      expect(onClimChange).toHaveBeenCalled();
    });

    it("calls onClimChange when the max clim input changes", async () => {
      const wrapper = await mountControls();
      const inputs = wrapper.findAll("input[data-testid='input-number']");
      await inputs[1]!.trigger("input");
      expect(onClimChange).toHaveBeenCalled();
    });
  });
});
