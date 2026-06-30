// @vitest-environment nuxt
import { describe, it, expect } from "vitest";
import { ref } from "vue";
import { mountSuspended } from "@nuxt/test-utils/runtime";
import ZarrMapCanvas from "~/components/ZarrMapCanvas.vue";
import type { LoadingState } from "@carbonplan/zarr-layer";
import type { useZarrDirectMap } from "~/composables/useZarrDirectMap";

type MapApi = ReturnType<typeof useZarrDirectMap>;

function makeMap(loadingState: LoadingState) {
  return {
    mapContainer: ref<HTMLDivElement | null>(null),
    loadingState: ref(loadingState),
  };
}

function mountCanvas(loadingState: LoadingState) {
  return mountSuspended(ZarrMapCanvas, {
    // The canvas only reads mapContainer + loadingState from the composable.
    props: { map: makeMap(loadingState) as unknown as MapApi },
  });
}

const idle: LoadingState = {
  loading: false,
  metadata: false,
  chunks: false,
  error: null,
};

describe("ZarrMapCanvas", () => {
  describe("loading overlay", () => {
    it("is hidden when loading=false", async () => {
      const wrapper = await mountCanvas(idle);
      expect(wrapper.text()).not.toContain("Fetching chunks");
      expect(wrapper.text()).not.toContain("Loading metadata");
    });

    it("shows 'Fetching chunks…' when loading=true and chunks=true", async () => {
      const wrapper = await mountCanvas({
        loading: true,
        metadata: true,
        chunks: true,
        error: null,
      });
      expect(wrapper.text()).toContain("Fetching chunks");
    });

    it("shows 'Loading metadata…' when loading=true and chunks=false", async () => {
      const wrapper = await mountCanvas({
        loading: true,
        metadata: true,
        chunks: false,
        error: null,
      });
      expect(wrapper.text()).toContain("Loading metadata");
    });
  });

  describe("error overlay", () => {
    it("is hidden when there is no error", async () => {
      const wrapper = await mountCanvas(idle);
      expect(wrapper.text()).not.toContain("Network timeout");
    });

    it("shows the error message when loadingState.error is set", async () => {
      const wrapper = await mountCanvas({
        loading: false,
        metadata: false,
        chunks: false,
        error: new Error("Network timeout"),
      });
      expect(wrapper.text()).toContain("Network timeout");
    });
  });
});
