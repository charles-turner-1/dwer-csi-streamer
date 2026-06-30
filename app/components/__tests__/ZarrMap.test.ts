// @vitest-environment nuxt
import { describe, it, expect, vi } from "vitest";
import { ref } from "vue";
import { mountSuspended } from "@nuxt/test-utils/runtime";

// Prevent MapLibre from actually running — mock the whole composable so no
// real map or zarr fetch is initiated.
vi.mock("~/composables/useZarrMap", () => ({
  useZarrMap: vi.fn(() => ({
    mapContainer: ref<HTMLDivElement | null>(null),
    timeIndex: ref(0),
    timeSteps: 5,
    opacity: ref(85),
    loadingState: ref({
      loading: false,
      metadata: false,
      chunks: false,
      error: null,
    }),
    colourbarStyle: ref({ background: "linear-gradient(to right, #440154, #fde725)" }),
    onTimeChange: vi.fn(),
    onOpacityChange: vi.fn(),
    setClim: vi.fn(),
  })),
  CLIM: [-2, 40] as [number, number],
}));

import ZarrMap from "~/components/ZarrMap.vue";

const stubs = {
  USlider: {
    template: `<input type="range" :value="modelValue" @input="$emit('update:modelValue', +$event.target.value)" />`,
    props: ["modelValue"],
    emits: ["update:modelValue"],
  },
  UInputNumber: {
    template: `<input data-testid="input-number" type="number" :value="modelValue" @input="$emit('update:modelValue', +$event.target.value)" />`,
    props: ["modelValue"],
    emits: ["update:modelValue"],
  },
  UIcon: true,
};

function mountZarrMap(props = {}) {
  return mountSuspended(ZarrMap, {
    props: {
      refSpec: { refs: {} },
      varName: "tasmax",
      latName: "lat",
      lonName: "lon",
      ...props,
    },
    global: { stubs },
  });
}

describe("ZarrMap", () => {
  it("renders without crashing", async () => {
    const wrapper = await mountZarrMap();
    expect(wrapper.exists()).toBe(true);
  });

  it("renders two range sliders (time and opacity)", async () => {
    const wrapper = await mountZarrMap();
    const sliders = wrapper.findAll("input[type='range']");
    expect(sliders.length).toBeGreaterThanOrEqual(2);
  });

  it("shows the time index and step count", async () => {
    const wrapper = await mountZarrMap();
    expect(wrapper.text()).toContain("1 / 5");
  });

  it("renders the Reset button", async () => {
    const wrapper = await mountZarrMap();
    const buttons = wrapper.findAll("button");
    const resetBtn = buttons.find((b) => b.text().includes("Reset"));
    expect(resetBtn).toBeDefined();
  });
});
