// @vitest-environment nuxt
import { describe, it, expect, vi } from "vitest";
import { mountSuspended } from "@nuxt/test-utils/runtime";

// Mock the composable so the page's lifted useZarrDirectMap() call never spins
// up MapLibre / zarr, while keeping the SWWA_* constants the page imports.
vi.mock("~/composables/useZarrDirectMap", async (importOriginal) => {
  const actual =
    await importOriginal<typeof import("~/composables/useZarrDirectMap")>();
  return {
    ...actual,
    useZarrDirectMap: vi.fn(() => ({})),
  };
});

import ViewData from "~/pages/view-data.vue";
import { useZarrDirectMap } from "~/composables/useZarrDirectMap";
import { CLIMATE_VARIABLES } from "~/config/climateVariables";

const STORE_URL = "https://projects.pawsey.org.au/dwer-zarr-store/data.zarr";
const RECHUNKED_URL =
  "https://projects.pawsey.org.au/dwer-zarr-store-rechunked/data.zarr";

const WhatAboutMeStub = {
  props: ["source", "variable"],
  template:
    '<div data-test="what-about-me" :data-source="source" :data-var="variable?.varName"></div>',
};

// Render dashboard shells as plain slot pass-throughs so the page body mounts
// without needing the full UDashboardGroup runtime context.
const stubs = {
  UDashboardSidebar: {
    template: '<div><slot name="header" /><slot /><slot name="footer" /></div>',
  },
  UDashboardPanel: {
    template: '<div><slot name="header" /><slot name="body" /></div>',
  },
  UDashboardNavbar: { template: "<div><slot /></div>" },
  UDashboardSidebarToggle: true,
  UDashboardSidebarCollapse: true,
  ZarrMapCanvas: true,
  ZarrMapControls: true,
  WhatAboutMe: WhatAboutMeStub,
};

function mountViewData() {
  return mountSuspended(ViewData, { global: { stubs } });
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

  it("drives the map composable with the tiles store and the default (tasmax) variable", async () => {
    await mountViewData();
    const calls = vi.mocked(useZarrDirectMap).mock.calls;
    expect(calls.length).toBeGreaterThanOrEqual(1);
    const [source, variable] = calls[0]!;
    expect(source).toBe(STORE_URL);
    // The variable is passed as a reactive computed of the active config.
    expect((variable as { value: { varName: string } }).value.varName).toBe(
      "tasmax",
    );
  });

  it("passes the rechunked source and active variable to WhatAboutMe", async () => {
    const wrapper = await mountViewData();
    const wam = wrapper.find('[data-test="what-about-me"]');
    expect(wam.attributes("data-source")).toBe(RECHUNKED_URL);
    expect(wam.attributes("data-var")).toBe(CLIMATE_VARIABLES[0]?.varName);
  });
});
