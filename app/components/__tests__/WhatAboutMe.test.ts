// @vitest-environment nuxt
import { describe, it, expect, vi, beforeEach } from "vitest";
import { ref } from "vue";
import { mountSuspended } from "@nuxt/test-utils/runtime";
import WhatAboutMe from "~/components/WhatAboutMe.vue";
import { CLIMATE_VARIABLES } from "~/config/climateVariables";

const setVariable = vi.fn();
const refreshForCurrentLocation = vi.fn();

vi.mock("~/composables/useWhatAboutMe", () => ({
  useWhatAboutMe: vi.fn(() => ({
    loading: ref(false),
    error: ref<string | null>(null),
    placeName: ref("Perth"),
    timeSeries: ref<number[] | null>([1, 2, 3]),
    rollingAvg: ref<(number | null)[] | null>([1, 2, 3]),
    trendLine: ref<number[] | null>([1, 2, 3]),
    headline: ref({
      firstMean: 1,
      lastMean: 2,
      delta: 1,
      firstLabel: "1980",
      lastLabel: "2020",
    }),
    timeLabels: ref(["1 Jan 1980", "1 Feb 1980", "1 Mar 1980"]),
    firstDecadeLabel: ref("1980s"),
    lastDecadeLabel: ref("2020s"),
    deltaPositive: ref(true),
    setVariable,
    refreshForCurrentLocation,
    searchByAddress: vi.fn(),
    searchByCoords: vi.fn(),
    searchByLocation: vi.fn(),
    suggestAddresses: vi.fn().mockResolvedValue([]),
  })),
  NominatimSuggestion: {},
}));

vi.mock("vue-chartjs", () => ({
  Line: {
    name: "Line",
    template: '<div data-test="line-chart" />',
  },
}));

const stubs = {
  UInputMenu: true,
  UButton: true,
};

describe("WhatAboutMe", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders copy from the selected variable config", async () => {
    const wrapper = await mountSuspended(WhatAboutMe, {
      props: {
        source: "https://example.com/data.zarr",
        variable: CLIMATE_VARIABLES[2]!,
      },
      global: { stubs },
    });

    expect(wrapper.text()).toContain("precipitation");
    expect(wrapper.text()).toContain("mm/day");
  });

  it("updates composable variable and refreshes when variable prop changes", async () => {
    const wrapper = await mountSuspended(WhatAboutMe, {
      props: {
        source: "https://example.com/data.zarr",
        variable: CLIMATE_VARIABLES[0]!,
      },
      global: { stubs },
    });

    await wrapper.setProps({ variable: CLIMATE_VARIABLES[1]! });

    expect(setVariable).toHaveBeenCalledWith(
      "tasmin",
      CLIMATE_VARIABLES[1]!.unitConverter,
    );
    expect(refreshForCurrentLocation).toHaveBeenCalledTimes(1);
  });
});
