// @vitest-environment nuxt
import { describe, it, expect } from "vitest";
import { mountSuspended } from "@nuxt/test-utils/runtime";
import IndexPage from "@/pages/index.vue";
import LinkCard from "@/components/LinkCard.vue";

function mountHome() {
  return mountSuspended(IndexPage);
}

describe("index page", () => {
  it("renders the main heading", async () => {
    const wrapper = await mountHome();
    const hero = wrapper.find("#hero");
    expect(hero.text()).toContain("Zarr Data Streamer");
  });

  it("renders two LinkCard components", async () => {
    const wrapper = await mountHome();
    const cards = wrapper.findAllComponents(LinkCard);
    expect(cards).toHaveLength(2);
  });

  it("first LinkCard links to /view-data", async () => {
    const wrapper = await mountHome();
    const cards = wrapper.findAllComponents(LinkCard);
    expect(cards[0]?.props("href")).toBe("/view-data");
  });

  it("LinkCard names are descriptive", async () => {
    const wrapper = await mountHome();
    const cards = wrapper.findAllComponents(LinkCard);
    expect(cards[0]?.props("name")).toContain(
      "DWER Climate Science Initiative",
    );
  });

  it("renders the Acknowledgements section", async () => {
    const wrapper = await mountHome();
    expect(wrapper.text()).toContain("Acknowledgements");
  });

  it("mentions Murdoch University in acknowledgements", async () => {
    const wrapper = await mountHome();
    expect(wrapper.text()).toContain("Murdoch University");
  });

  it("mentions Pawsey in acknowledgements", async () => {
    const wrapper = await mountHome();
    expect(wrapper.text()).toContain("Pawsey");
  });
});
