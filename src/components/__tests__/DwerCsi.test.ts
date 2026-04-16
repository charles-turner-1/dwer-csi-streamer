import { describe, it, expect } from "vitest";
import { mount } from "@vue/test-utils";
import { createRouter, createMemoryHistory } from "vue-router";
import DwerCsi from "@/components/DwerCsi.vue";

// Stub PrimeVue Tabs with pass-through wrappers so slot content (ZarrDirectMap) renders.
// Stub ZarrDirectMap itself to prevent maplibre/zarr lifecycle from running.
const tabPassThrough = { template: "<div><slot /></div>" };

const router = createRouter({
  history: createMemoryHistory(),
  routes: [
    { path: "/", component: { template: "<div />" } },
    { path: "/dwer-csi", component: DwerCsi },
  ],
});

function mountDwerCsi() {
  return mount(DwerCsi, {
    global: {
      plugins: [router],
      stubs: {
        "v-icon": true,
        RouterLink: true,
        Tabs: tabPassThrough,
        TabList: tabPassThrough,
        Tab: { template: "<div><slot /></div>", props: ["value"] },
        TabPanels: tabPassThrough,
        TabPanel: { template: "<div><slot /></div>", props: ["value"] },
        Select: true,
        ZarrDirectMap: true,
        WhatAboutMe: true,
      },
    },
  });
}

const STORE_URL = "https://projects.pawsey.org.au/dwer-zarr-store/data.zarr";

describe("DwerCsi", () => {
  it("renders the page heading", () => {
    const wrapper = mountDwerCsi();
    expect(wrapper.find("h1").text()).toContain(
      "DWER Climate Science Initiative",
    );
  });

  it("mentions Pawsey Acacia in the description", () => {
    const wrapper = mountDwerCsi();
    expect(wrapper.text()).toContain("Pawsey Acacia");
  });

  it("renders three ZarrDirectMap stubs", () => {
    const wrapper = mountDwerCsi();
    // mount() uses the explicit global stub for ZarrDirectMap, which renders as 'zarr-direct-map-stub'
    const maps = wrapper.findAll("zarr-direct-map-stub");
    expect(maps).toHaveLength(3);
  });

  it("ZarrDirectMap stubs have varNames tasmax, tasmin, pr", () => {
    const wrapper = mountDwerCsi();
    const maps = wrapper.findAll("zarr-direct-map-stub");
    const varNames = maps.map(
      (m) => m.attributes("varname") ?? m.attributes("var-name"),
    );
    expect(varNames).toContain("tasmax");
    expect(varNames).toContain("tasmin");
    expect(varNames).toContain("pr");
  });

  it("all ZarrDirectMap stubs use the Pawsey store URL", () => {
    const wrapper = mountDwerCsi();
    const maps = wrapper.findAll("zarr-direct-map-stub");
    maps.forEach((m) => {
      expect(m.attributes("source")).toBe(STORE_URL);
    });
  });

  it("all ZarrDirectMap stubs have timeSteps=492", () => {
    const wrapper = mountDwerCsi();
    const maps = wrapper.findAll("zarr-direct-map-stub");
    maps.forEach((m) => {
      expect(m.attributes("timesteps") ?? m.attributes("time-steps")).toBe(
        "492",
      );
    });
  });

  it("tasmax stub has clim [6.85, 51.85] (°C)", () => {
    const wrapper = mountDwerCsi();
    const maps = wrapper.findAll("zarr-direct-map-stub");
    const tasmax = maps.find(
      (m) => (m.attributes("varname") ?? m.attributes("var-name")) === "tasmax",
    )!;
    // clim is serialised as a JSON-like attribute; check both parts are present
    expect(tasmax.attributes("clim") ?? tasmax.html()).toMatch(/6\.85/);
    expect(tasmax.attributes("clim") ?? tasmax.html()).toMatch(/51\.85/);
  });

  it("pr stub has clim containing 8.64 mm/day", () => {
    const wrapper = mountDwerCsi();
    const maps = wrapper.findAll("zarr-direct-map-stub");
    const pr = maps.find(
      (m) => (m.attributes("varname") ?? m.attributes("var-name")) === "pr",
    )!;
    expect(pr.attributes("clim") ?? pr.html()).toMatch(/8\.64/);
  });
});
