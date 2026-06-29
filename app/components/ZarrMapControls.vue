<template>
  <div class="space-y-4">
    <!-- Date -->
    <div class="space-y-1">
      <label
        class="text-sm font-medium text-gray-700 dark:text-gray-300 whitespace-nowrap"
      >
        Date:
        <span class="font-mono text-blue-600 dark:text-blue-400">
          <template v-if="timeDates">{{ timeDates[timeIndex] }}</template>
          <template v-else>{{ timeIndex + 1 }} / {{ timeSteps }}</template>
        </span>
      </label>
      <USlider
        v-model="timeIndex"
        :min="0"
        :max="timeSteps - 1"
        @update:model-value="onTimeChange"
        class="py-2"
      />
    </div>

    <!-- Opacity -->
    <div class="space-y-1">
      <label class="text-sm font-medium text-gray-700 dark:text-gray-300"
        >Opacity:</label
      >
      <USlider
        v-model="opacity"
        :min="0"
        :max="100"
        @update:model-value="onOpacityChange"
        class="py-2"
      />
    </div>

    <!-- Projection -->
    <div class="space-y-1">
      <label
        class="text-sm font-medium text-gray-700 dark:text-gray-300 whitespace-nowrap"
        >Projection:</label
      >
      <USelect
        v-model="projection"
        :items="PROJECTION_OPTIONS"
        value-key="value"
        size="sm"
        class="w-full"
        @update:model-value="onProjectionChange"
      />
    </div>

    <!-- Colourbar + clim controls -->
    <div class="space-y-2">
      <div
        class="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400"
      >
        <span class="font-mono">{{ climLower }}{{ climUnit }}</span>
        <div class="flex-1 h-3 rounded" :style="colourbarStyle"></div>
        <span class="font-mono">{{ climUpper }}{{ climUnit }}</span>
      </div>
      <div class="flex items-center gap-2">
        <label
          class="text-xs text-gray-500 dark:text-gray-400 whitespace-nowrap"
          >Min</label
        >
        <UInputNumber
          v-model="climLower"
          :min="climDefaults[0] - climRange"
          :max="climUpper - climStep"
          :step="climStep"
          :format-options="{
            minimumFractionDigits: climFractionDigits,
            maximumFractionDigits: climFractionDigits,
          }"
          size="sm"
          class="flex-1"
          @update:model-value="onClimChange"
        />
      </div>
      <div class="flex items-center gap-2">
        <label
          class="text-xs text-gray-500 dark:text-gray-400 whitespace-nowrap"
          >Max</label
        >
        <UInputNumber
          v-model="climUpper"
          :min="climLower + climStep"
          :max="climDefaults[1] + climRange"
          :step="climStep"
          :format-options="{
            minimumFractionDigits: climFractionDigits,
            maximumFractionDigits: climFractionDigits,
          }"
          size="sm"
          class="flex-1"
          @update:model-value="onClimChange"
        />
      </div>
      <button
        @click="resetClim"
        class="text-xs text-gray-400 dark:text-gray-500 hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
      >
        Reset colour range
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { useZarrDirectMap } from "~/composables/useZarrDirectMap";

const props = defineProps<{
  map: ReturnType<typeof useZarrDirectMap>;
}>();

const PROJECTION_OPTIONS = [
  { label: "Globe", value: "globe" },
  { label: "Mercator", value: "mercator" },
];

// Destructure the composable's refs/handlers so the template auto-unwraps them.
const {
  timeIndex,
  timeSteps,
  timeDates,
  opacity,
  projection,
  climLower,
  climUpper,
  climDefaults,
  climRange,
  climStep,
  climFractionDigits,
  colourbarStyle,
  climUnit,
  onTimeChange,
  onOpacityChange,
  onClimChange,
  resetClim,
  onProjectionChange,
} = props.map;
</script>
