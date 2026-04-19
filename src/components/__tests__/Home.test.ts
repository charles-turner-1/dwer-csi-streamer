import { describe, it, expect } from "vitest";
import { mount } from "@vue/test-utils";
import { createRouter, createMemoryHistory } from "vue-router";
import Home from "@/components/Home.vue";
import LinkCard from "@/components/LinkCard.vue";

const router = createRouter({
  history: createMemoryHistory(),
  routes: [
    { path: "/", component: Home },
    { path: "/access-model", component: { template: "<div />" } },
    { path: "/view-data", component: { template: "<div />" } },
  ],
});

function mountHome() {
  return mount(Home, {
    global: {
      plugins: [router],
      stubs: {
        // oh-vue-icons — not relevant to logic
        "v-icon": true,
      },
    },
  });
}

describe("Home", () => {
  it("renders the main heading", () => {
    const wrapper = mountHome();
    const hero = wrapper.find("#hero");
    expect(hero.text()).toContain("Zarr Data Streamer");
  });

  it("renders two LinkCard components", () => {
    const wrapper = mountHome();
    const cards = wrapper.findAllComponents(LinkCard);
    expect(cards).toHaveLength(2);
  });

  it("second LinkCard links to /dwer-csi", () => {
    const wrapper = mountHome();
    const cards = wrapper.findAllComponents(LinkCard);
    expect(cards[0]?.props("href")).toBe("/dwer-csi");
  });

  it("LinkCard names are descriptive", () => {
    const wrapper = mountHome();
    const cards = wrapper.findAllComponents(LinkCard);
    expect(cards[0]?.props("name")).toContain(
      "DWER Climate Science Initiative",
    );
  });

  it("renders the Acknowledgements section", () => {
    const wrapper = mountHome();
    expect(wrapper.text()).toContain("Acknowledgements");
  });

  it("mentions Murdoch University in acknowledgements", () => {
    const wrapper = mountHome();
    expect(wrapper.text()).toContain("Murdoch University");
  });

  it("mentions Pawsey in acknowledgements", () => {
    const wrapper = mountHome();
    expect(wrapper.text()).toContain("Pawsey");
  });
});
