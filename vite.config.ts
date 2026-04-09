/// <reference types="vitest" />
import { defineConfig } from "vite";
import vue from "@vitejs/plugin-vue";
import { execSync } from "child_process";
import tailwindcss from "@tailwindcss/vite";
import { fileURLToPath, URL } from "node:url";

// Get git commit SHA
const getGitCommitSha = () => {
  try {
    return execSync("git rev-parse HEAD").toString().trim();
  } catch {
    return "unknown";
  }
};

// https://vite.dev/config/
export default defineConfig({
  base: process.env.NODE_ENV === "production" ? "/personal-homepage/" : "/",
  plugins: [vue(), tailwindcss()],
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./src", import.meta.url)),
    },
  },
  define: {
    __GIT_COMMIT_SHA__: JSON.stringify(getGitCommitSha()),
    __BUILD_TIME__: JSON.stringify(new Date().toISOString()),
  },
  server: {},
  test: {
    globals: true,
    environment: "happy-dom",
    setupFiles: ["./src/test/setup.ts"],
    coverage: {
      provider: "v8",
      reporter: ["text", "json", "html"],
      exclude: [
        "node_modules/",
        "src/test/",
        "**/*.spec.ts",
        "**/*.d.ts",
        "vite.config.ts",
        "tailwind.config.js",
        "postcss.config.js",
        "dist/assets/**",
      ],
    },
  },
});
