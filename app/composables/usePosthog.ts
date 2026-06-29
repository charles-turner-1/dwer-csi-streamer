// Thin wrapper over the @posthog/nuxt module's `usePostHog()` so components keep
// calling `usePosthog().capture(...)` exactly as they did with the old posthog-js
// setup. PostHog itself is initialised by the module (see posthogConfig in
// nuxt.config.ts); on the server `usePostHog()` is unavailable, so capture is a
// no-op there.
export function usePosthog() {
  function capture(event: string, properties?: Record<string, unknown>) {
    if (import.meta.client) {
      usePostHog()?.capture(event, properties);
    }
  }

  return { capture };
}
