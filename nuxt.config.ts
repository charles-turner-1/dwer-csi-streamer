import { execSync } from "child_process";

// Get git commit SHA for deployment tracking (replaces the old Vite
// __GIT_COMMIT_SHA__ / __BUILD_TIME__ defines, now surfaced via runtimeConfig).
const getGitCommitSha = () => {
  try {
    return execSync("git rev-parse HEAD").toString().trim();
  } catch {
    return "unknown";
  }
};

const baseURL =
  process.env.NODE_ENV === "production" ? "/dwer-csi-streamer/" : "/";

// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  compatibilityDate: "2025-07-15",
  devtools: { enabled: true },
  modules: ["@nuxt/ui", "@nuxt/content", "@posthog/nuxt"],
  css: ["~/assets/css/main.css"],
  app: {
    baseURL,
    head: {
      title: "Zarr Data Streamer",
      titleTemplate: "%s · Zarr Data Streamer",
      // Use the ACCESS-NRI logo (in public/) as the favicon. Prefixed with the
      // base URL so it resolves correctly under the GitHub Pages subpath.
      link: [
        {
          rel: "icon",
          type: "image/svg+xml",
          href: `${baseURL}ACCESS-logo.svg`,
        },
      ],
    },
  },
  runtimeConfig: {
    public: {
      gitCommitSha: getGitCommitSha(),
      buildTime: new Date().toISOString(),
    },
  },
  posthogConfig: {
    publicKey: process.env.NUXT_PUBLIC_POSTHOG_KEY,
    host: process.env.NUXT_PUBLIC_POSTHOG_HOST,
    clientConfig: {
      // Match the previous posthog-js init: in-memory persistence, no automatic
      // pageview capture (handled manually in plugins/posthog-pageview.client.ts).
      persistence: "memory",
      capture_pageview: false,
      capture_pageleave: true,
    },
  },
  content: {
    build: {
      markdown: {
        highlight: {
          theme: {
            default: "github-light",
            dark: "github-dark",
          },
          langs: ["js", "ts", "vue", "json", "yaml", "bash", "python"],
        },
      },
    },
  },
});
