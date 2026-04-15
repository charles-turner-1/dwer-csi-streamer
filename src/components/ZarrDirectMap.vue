<template>
  <div>
    <!-- Controls -->
    <div class="flex flex-wrap items-center gap-4 mb-4">
      <div class="flex items-center gap-3 flex-1 min-w-[220px]">
        <label
          class="text-sm font-medium text-gray-700 dark:text-gray-300 whitespace-nowrap"
        >
          Time step:
          <span class="font-mono text-blue-600 dark:text-blue-400">
            <template v-if="timeDates">{{ timeDates[timeIndex] }}</template>
            <template v-else>{{ timeIndex + 1 }} / {{ timeSteps }}</template>
          </span>
        </label>
        <input
          type="range"
          min="0"
          :max="timeSteps - 1"
          v-model.number="timeIndex"
          @input="onTimeChange"
          class="flex-1 accent-blue-600"
        />
      </div>
      <div class="flex items-center gap-2">
        <label class="text-sm font-medium text-gray-700 dark:text-gray-300"
          >Opacity:</label
        >
        <input
          type="range"
          min="0"
          max="100"
          v-model.number="opacity"
          @input="onOpacityChange"
          class="w-24 accent-blue-600"
        />
      </div>
    </div>

    <!-- Map -->
    <div class="relative">
      <div
        :ref="zarrMap.mapContainer"
        class="w-full rounded-lg overflow-hidden border border-gray-200 dark:border-gray-700"
        style="height: 480px"
      ></div>
      <div
        v-if="loadingState.loading"
        class="absolute top-3 left-3 flex items-center gap-2 text-xs text-white bg-black/50 backdrop-blur-sm rounded px-2 py-1 pointer-events-none"
      >
        <i class="pi pi-spin pi-spinner"></i>
        <span>{{
          loadingState.chunks ? "Fetching chunks…" : "Loading metadata…"
        }}</span>
      </div>
      <div
        v-if="loadingState.error"
        class="absolute top-3 left-3 flex items-center gap-2 text-xs text-white bg-red-600/80 backdrop-blur-sm rounded px-2 py-1 pointer-events-none"
      >
        <i class="pi pi-exclamation-triangle"></i>
        <span>{{ loadingState.error.message }}</span>
      </div>
    </div>

    <!-- Colourbar + CLim controls -->
    <div class="mt-3 space-y-2">
      <div
        class="flex items-center gap-3 text-xs text-gray-500 dark:text-gray-400"
      >
        <span class="w-16 text-right font-mono"
          >{{ climState.lower }}{{ climUnit }}</span
        >
        <div class="flex-1 h-3 rounded" :style="colourbarStyle"></div>
        <span class="w-16 font-mono">{{ climState.upper }}{{ climUnit }}</span>
      </div>
      <div class="flex items-center gap-4">
        <div class="flex items-center gap-2 flex-1">
          <label
            class="text-xs text-gray-500 dark:text-gray-400 whitespace-nowrap"
            >Min</label
          >
          <InputNumber
            v-model="climState.lower"
            :min="props.clim[0] - climRange"
            :max="climState.upper - climStep"
            :step="climStep"
            :minFractionDigits="climFractionDigits"
            :maxFractionDigits="climFractionDigits"
            showButtons
            :suffix="climUnit"
            size="small"
            class="flex-1"
            @update:modelValue="onClimChange"
          />
        </div>
        <div class="flex items-center gap-2 flex-1">
          <label
            class="text-xs text-gray-500 dark:text-gray-400 whitespace-nowrap"
            >Max</label
          >
          <InputNumber
            v-model="climState.upper"
            :min="climState.lower + climStep"
            :max="props.clim[1] + climRange"
            :step="climStep"
            :minFractionDigits="climFractionDigits"
            :maxFractionDigits="climFractionDigits"
            showButtons
            :suffix="climUnit"
            size="small"
            class="flex-1"
            @update:modelValue="onClimChange"
          />
        </div>
        <button
          @click="resetClim"
          class="text-xs text-gray-400 dark:text-gray-500 hover:text-blue-600 dark:hover:text-blue-400 transition-colors whitespace-nowrap"
        >
          Reset
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { reactive, computed, watch } from "vue";
import "maplibre-gl/dist/maplibre-gl.css";
import { useZarrDirectMap } from "@/composables/useZarrDirectMap";
import type { UnitConverter } from "@/utils/unitConversion";
import InputNumber from "primevue/inputnumber";
import { usePosthog } from "@/composables/usePosthog";

const { capture } = usePosthog();

const props = defineProps<{
  source: string;
  varName: string;
  timeSteps: number;
  clim: [number, number];
  spatialDims: { lat: string; lon: string };
  colormap: string[];
  climUnit?: string;
  fillValue?: number;
  proj4?: string;
  bounds?: [number, number, number, number];
  unitConverter?: UnitConverter;
}>();

const climState = reactive({
  lower: props.clim[0],
  upper: props.clim[1],
});

// Derive step and decimal places from the initial clim range so that
// small-magnitude variables (e.g. precipitation ~0–0.0001) are still
// adjustable accurately without hardcoding temperature-scale defaults.
const climRange = computed(() => Math.abs(props.clim[1] - props.clim[0]));
const climStep = computed(() => Math.max(climRange.value / 100, 1e-7));
const climFractionDigits = computed(() =>
  Math.min(7, Math.max(0, Math.ceil(-Math.log10(climStep.value)))),
);

const climUnit = props.climUnit ?? "";

const zarrMap = useZarrDirectMap(
  props.source,
  props.varName,
  props.timeSteps,
  props.clim,
  props.spatialDims,
  props.colormap,
  props.fillValue,
  props.proj4,
  props.bounds,
  props.unitConverter,
);
const {
  timeIndex,
  timeSteps,
  timeDates,
  opacity,
  loadingState,
  colourbarStyle,
  onTimeChange: _onTimeChange,
  onOpacityChange: _onOpacityChange,
} = zarrMap;

// Track map load and errors
watch(
  () => loadingState.value.loading,
  (loading, wasLoading) => {
    if (wasLoading && !loading) {
      if (loadingState.value.error) {
        capture("zarr_map_error", {
          var_name: props.varName,
          message: loadingState.value.error.message,
        });
      } else {
        capture("zarr_map_loaded", { var_name: props.varName });
      }
    }
  },
);

let timeDebounce: ReturnType<typeof setTimeout> | null = null;
function onTimeChange() {
  _onTimeChange();
  if (timeDebounce) clearTimeout(timeDebounce);
  timeDebounce = setTimeout(() => {
    capture("zarr_map_time_changed", {
      var_name: props.varName,
      time_index: timeIndex.value,
    });
  }, 1000);
}

let opacityDebounce: ReturnType<typeof setTimeout> | null = null;
function onOpacityChange() {
  _onOpacityChange();
  if (opacityDebounce) clearTimeout(opacityDebounce);
  opacityDebounce = setTimeout(() => {
    capture("zarr_map_opacity_changed", {
      var_name: props.varName,
      opacity: opacity.value,
    });
  }, 1000);
}

function onClimChange() {
  zarrMap.setClim([climState.lower, climState.upper]);
  capture("zarr_map_clim_changed", {
    var_name: props.varName,
    lower: climState.lower,
    upper: climState.upper,
  });
}

function resetClim() {
  climState.lower = props.clim[0];
  climState.upper = props.clim[1];
  zarrMap.setClim([climState.lower, climState.upper]);
  capture("zarr_map_clim_reset", { var_name: props.varName });
}
</script>
