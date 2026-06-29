<script setup lang="ts">
import type { NavigationMenuItem } from "@nuxt/ui";

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

<!-- Default layout: nuxt-ui header + navigation, replaces the old Header.vue. -->
<template>
  <div class="min-h-screen bg-default text-default flex flex-col">
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
    <UMain>
      <slot />
    </UMain>
  </div>
</template>
