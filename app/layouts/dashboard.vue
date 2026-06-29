<script setup lang="ts">
import type { NavigationMenuItem } from "@nuxt/ui";

// Dashboard layout: keeps the site-wide top header + navigation (as on every
// other page) and hosts a UDashboardGroup below it for page-level sidebar/panel
// content. The group's default `fixed inset-0` base is overridden to `!static
// flex-1` so it fills the space under the header instead of the whole viewport.
const route = useRoute();

const items = computed<NavigationMenuItem[]>(() => [
  { label: "About this project", to: "/", active: route.path === "/" },
  {
    label: "View the Data",
    to: "/view-data",
    active: route.path === "/view-data",
  },
  { label: "Blog", to: "/blog", active: route.path.startsWith("/blog") },
]);
</script>

<template>
  <div class="flex flex-col h-svh bg-default text-default">
    <UHeader title="Zarr Data Streamer">
      <UNavigationMenu :items="items" />
      <template #right>
        <div class="flex items-center gap-4">
          <GitCommit />
        </div>
      </template>
      <template #body>
        <UNavigationMenu :items="items" orientation="vertical" class="mx-2.5" />
      </template>
    </UHeader>
    <UDashboardGroup class="!static flex-1 min-h-0">
      <slot />
    </UDashboardGroup>
  </div>
</template>
