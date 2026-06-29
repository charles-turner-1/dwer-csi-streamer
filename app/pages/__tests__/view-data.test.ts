// @vitest-environment nuxt
import { describe, it, expect } from "vitest";
import { mountSuspended } from "@nuxt/test-utils/runtime";
import ViewData from "@/pages/view-data.vue";
import { CLIMATE_VARIABLES } from "@/config/climateVariables";

const STORE_URL = "https://projects.pawsey.org.au/dwer-zarr-store/data.zarr";
const RECHUNKED_URL =
  "https://projects.pawsey.org.au/dwer-zarr-store-rechunked/data.zarr";

// Stub the heavy map / chart children so maplibre / zarr lifecycles never run.
// The stubs serialise the props we care about into the rendered DOM.
const ZarrDirectMapStub = {
  props: ["source", "varName", "timeSteps", "clim"],
  template:
    '<div data-test="zarr-map" :data-source="source" :data-var="varName" :data-steps="timeSteps" :data-clim="JSON.stringify(clim)"></div>',
};

const WhatAboutMeStub = {
  props: ["source", "variable"],
  template:
    '<div data-test="what-about-me" :data-source="source" :data-var="variable?.varName"></div>',
};

function mountViewData() {
  return mountSuspended(ViewData, {
    global: {
      stubs: {
        ZarrDirectMap: ZarrDirectMapStub,
        WhatAboutMe: WhatAboutMeStub,
      },
    },
  });
}

describe("view-data page", () => {
  it("renders the page heading", async () => {
    const wrapper = await mountViewData();
    expect(wrapper.find("#header").text()).toContain(
      "WRF-based regional climate model output",
    );
  });

  it("mentions Pawsey Acacia in the description", async () => {
    const wrapper = await mountViewData();
    expect(wrapper.text()).toContain("Pawsey Acacia");
  });

  it("renders the active ZarrDirectMap with the default (tasmax) config", async () => {
    const wrapper = await mountViewData();
    const map = wrapper.find('[data-test="zarr-map"]');
    expect(map.exists()).toBe(true);
    expect(map.attributes("data-var")).toBe("tasmax");
    expect(map.attributes("data-source")).toBe(STORE_URL);
    expect(map.attributes("data-steps")).toBe("492");
    expect(map.attributes("data-clim")).toMatch(/6\.85/);
    expect(map.attributes("data-clim")).toMatch(/51\.85/);
  });

  it("passes the rechunked source and active variable to WhatAboutMe", async () => {
    const wrapper = await mountViewData();
    const wam = wrapper.find('[data-test="what-about-me"]');
    expect(wam.attributes("data-source")).toBe(RECHUNKED_URL);
    expect(wam.attributes("data-var")).toBe(CLIMATE_VARIABLES[0]?.varName);
  });
});
