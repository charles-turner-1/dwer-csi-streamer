import { createRouter, createWebHashHistory } from "vue-router";
import { ref } from "vue";
import { posthog } from "@/composables/usePosthog";

const routes = [
  {
    path: "/",
    name: "Home",
    component: () => import("../components/Home.vue"),
    meta: {
      title: "Home",
    },
  },
  {
    path: "/zarr-data-streamer",
    name: "ZarrDataStreamer",
    component: () => import("../components/ZarrDataStreamer.vue"),
    meta: {
      title: "Zarr Data Streamer",
    },
  },
];

const router = createRouter({
  history: createWebHashHistory(),
  routes,
});

// Global loading state for navigation
export const isNavigating = ref(false);

// Set page title and show loading during navigation
router.beforeEach((to, _from, next) => {
  isNavigating.value = true;
  if (to.meta?.title) {
    document.title = to.meta.title as string;
  }
  next();
});

router.afterEach((to) => {
  posthog.capture("$pageview", { path: to.fullPath, name: to.name });
  // Small delay to ensure component is mounted
  setTimeout(() => {
    isNavigating.value = false;
  }, 100);
});

export default router;
