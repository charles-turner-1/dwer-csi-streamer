import { defineVitestConfig } from "@nuxt/test-utils/config";

// Composable/util specs run in the lightweight happy-dom environment.
// Component specs opt into the Nuxt environment per-file via:
//   // @vitest-environment nuxt
export default defineVitestConfig({
  test: {
    environment: "happy-dom",
    setupFiles: ["./app/test/setup.ts"],
    coverage: {
      provider: "v8",
      reporter: ["text", "json", "html", "lcov", "cobertura"],
      exclude: [
        "node_modules/",
        ".nuxt/",
        ".output/",
        "python/",
        "app/test/",
        "**/*.spec.ts",
        "**/*.test.ts",
        "**/*.d.ts",
        "nuxt.config.ts",
        "vitest.config.ts",
        "content.config.ts",
      ],
    },
  },
});
