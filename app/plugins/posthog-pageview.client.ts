// Manual $pageview capture on route change, replicating the old
// router.afterEach behaviour (the module is configured with
// capture_pageview: false in nuxt.config.ts).
export default defineNuxtPlugin(() => {
  const router = useRouter();
  const posthog = usePostHog();

  router.afterEach((to) => {
    posthog?.capture("$pageview", { path: to.fullPath, name: to.name });
  });
});
