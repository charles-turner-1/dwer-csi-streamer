<template>
  <div class="container mx-auto mt-10 p-3 sm:p-6">
    <div
      id="header"
      class="rounded-2xl bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 p-6 mb-6"
    >
      <div class="flex justify-center mb-5">
        <a
          href="https://www.wa.gov.au/organisation/department-of-water-and-environmental-regulation/climate-science-initiative-and-wa-climate-projections"
          target="_blank"
          rel="noopener noreferrer"
        >
          <img
            src="~/assets/logos/csi_logo.png"
            alt="Climate Science Initiative WA"
            class="h-32 object-contain dark:bg-white dark:rounded dark:p-1"
          />
        </a>
      </div>

      <p class="text-sm text-gray-500 dark:text-gray-400 mb-4">
        WRF-based regional climate model output (ERA5-driven, CORDEX SWWA
        domain) streamed directly from
        <a
          href="https://pawsey.org.au/systems/acacia/"
          target="_blank"
          rel="noopener noreferrer"
          class="text-blue-600 dark:text-blue-400 hover:underline"
          >Pawsey Acacia</a
        >
        object storage. Variables are on a rotated-pole 4km grid (279 × 364) at
        monthly frequency, 492 time steps (1980–2021).
      </p>

      <div class="flex flex-wrap justify-center items-center gap-6 pt-2">
        <a
          href="https://www.der.wa.gov.au"
          target="_blank"
          rel="noopener noreferrer"
          class="flex items-center"
        >
          <img
            src="~/assets/logos/DWER-Logo.png"
            alt="Department of Water and Environmental Regulation"
            class="h-10 object-contain dark:bg-white dark:rounded dark:p-1"
          />
        </a>
        <a
          href="https://www.murdoch.edu.au"
          target="_blank"
          rel="noopener noreferrer"
          class="flex items-center"
        >
          <img
            src="~/assets/logos/Murdoch_University_extended_logo.png"
            alt="Murdoch University"
            class="h-10 object-contain dark:bg-white dark:rounded dark:p-1"
          />
        </a>
        <a
          href="https://pawsey.org.au"
          target="_blank"
          rel="noopener noreferrer"
          class="flex items-center"
        >
          <img
            src="~/assets/logos/pawsey_logo1.png"
            alt="Pawsey Supercomputing Research Centre"
            class="h-10 object-contain dark:bg-white dark:rounded dark:p-1"
          />
        </a>
      </div>
    </div>

    <div
      class="mt-4 rounded-2xl bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 overflow-hidden relative"
      :class="{ 'blur-lg': isLoading }"
    >
      <Transition
        enter-active-class="transition-opacity duration-150"
        enter-from-class="opacity-0"
        enter-to-class="opacity-100"
        leave-active-class="transition-opacity duration-300"
        leave-from-class="opacity-100"
        leave-to-class="opacity-0"
      >
        <div
          v-if="isLoading"
          class="absolute inset-0 z-20 flex items-center justify-center pointer-events-none"
        >
          <div class="loader"></div>
        </div>
      </Transition>

      <!-- Mobile: variable dropdown -->
      <div class="sm:hidden px-4 pt-4 mb-3">
        <USelect
          v-model="activeTab"
          :items="tabOptions"
          value-key="value"
          class="w-full"
        />
      </div>

      <!-- Desktop: tab bar -->
      <div class="hidden sm:block px-4 pt-2">
        <UTabs
          v-model="activeTab"
          :items="tabItems"
          :content="false"
          color="primary"
        />
      </div>

      <!-- Map for the active variable -->
      <div class="p-4">
        <ClientOnly>
          <ZarrDirectMap
            :key="activeVariable.varName"
            :source="STORE_URL_TILES"
            :var-name="activeVariable.varName"
            :time-steps="492"
            :clim="activeVariable.clim"
            :spatial-dims="SWWA_SPATIAL_DIMS"
            :colormap="activeVariable.colormap"
            :clim-unit="activeVariable.climUnit"
            :fill-value="1e20"
            :proj4="SWWA_PROJ4"
            :bounds="SWWA_BOUNDS"
            :unit-converter="activeVariable.unitConverter"
          />
        </ClientOnly>
      </div>

      <div class="border-t border-gray-200 dark:border-gray-700 px-6 py-6">
        <ClientOnly>
          <WhatAboutMe :source="STORE_URL_TIMES" :variable="activeVariable" />
        </ClientOnly>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { TabsItem } from "@nuxt/ui";
import {
  SWWA_SPATIAL_DIMS,
  SWWA_PROJ4,
  SWWA_BOUNDS,
} from "~/composables/useZarrDirectMap";
import {
  CLIMATE_VARIABLES,
  getClimateVariableConfig,
  type ClimateVariableConfig,
  type ClimateVariableName,
} from "~/config/climateVariables";

useSeoMeta({
  title: "View the Data",
  description:
    "Explore WRF regional climate model output (temperatures, rainfall) streamed directly from Pawsey Acacia object storage.",
});

const activeTab = ref<ClimateVariableName>("tasmax");
const isLoading = ref(false);
let loadingTimer: ReturnType<typeof setTimeout> | null = null;

watch(activeTab, () => {
  if (loadingTimer) clearTimeout(loadingTimer);
  isLoading.value = true;
  loadingTimer = setTimeout(() => {
    isLoading.value = false;
  }, 300);
});

const variables = CLIMATE_VARIABLES;

const activeVariable = computed<ClimateVariableConfig>(() =>
  getClimateVariableConfig(activeTab.value),
);

const tabItems = variables.map<TabsItem>(({ varName, label }) => ({
  value: varName,
  label,
}));

const tabOptions = variables.map(({ varName, label }) => ({
  value: varName,
  label,
}));

const STORE_URL_TILES =
  "https://projects.pawsey.org.au/dwer-zarr-store/data.zarr";
const STORE_URL_TIMES =
  "https://projects.pawsey.org.au/dwer-zarr-store-rechunked/data.zarr";
</script>

<style scoped>
@keyframes spin {
  from {
    transform: rotate(0deg);
  }
  to {
    transform: rotate(360deg);
  }
}

.loader {
  width: 100px;
  height: 100px;
  border: 3px solid rgba(0, 0, 0, 0.1);
  border-top-color: #3b82f6;
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
}

.dark .loader {
  border-color: rgba(255, 255, 255, 0.1);
  border-top-color: #60a5fa;
}
</style>
