<template>
  <div class="relative">
    <div
      :ref="setContainer"
      class="w-full rounded-lg overflow-hidden border border-gray-200 dark:border-gray-700 h-[300px] sm:h-[480px]"
    ></div>
    <div
      v-if="loadingState.loading"
      class="absolute top-3 left-3 flex items-center gap-2 text-xs text-white bg-black/50 backdrop-blur-sm rounded px-2 py-1 pointer-events-none"
    >
      <UIcon name="i-lucide-loader-circle" class="animate-spin" />
      <span>{{
        loadingState.chunks ? "Fetching chunks…" : "Loading metadata…"
      }}</span>
    </div>
    <div
      v-if="loadingState.error"
      class="absolute top-3 left-3 flex items-center gap-2 text-xs text-white bg-red-600/80 backdrop-blur-sm rounded px-2 py-1 pointer-events-none"
    >
      <UIcon name="i-lucide-triangle-alert" />
      <span>{{ loadingState.error.message }}</span>
    </div>
  </div>
</template>

<script setup lang="ts">
import "maplibre-gl/dist/maplibre-gl.css";
import type { ComponentPublicInstance } from "vue";
import type { useZarrDirectMap } from "~/composables/useZarrDirectMap";

const props = defineProps<{
  map: ReturnType<typeof useZarrDirectMap>;
}>();

// `loadingState` is read as a value, so destructuring lets the template
// auto-unwrap it (refs nested under a plain prop object aren't unwrapped).
const { loadingState } = props.map;

// Bind the container element to the composable's ref via a function ref — a
// plain `:ref="map.mapContainer"` would be auto-unwrapped and break the binding.
function setContainer(el: Element | ComponentPublicInstance | null) {
  props.map.mapContainer.value = (el as HTMLDivElement | null) ?? null;
}
</script>
