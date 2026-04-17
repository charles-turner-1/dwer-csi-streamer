<template>
  <div class="container mx-auto mt-10 p-3 sm:p-6">
    <div class="hidden sm:block">
      <RouterLink
        to="/"
        class="inline-flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 transition-colors my-4"
      >
        <v-icon name="hi-arrow-left" scale="0.9" />
        Back to Home
      </RouterLink>
    </div>

    <div
      class="rounded-2xl bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 p-6 mb-6"
    >
      <div class="text-lg sm:text-xl font-bold text-gray-900 dark:text-white mb-2">
        DWER Climate Science Initiative
      </div>
      <p class="text-sm text-gray-500 dark:text-gray-400 mb-4">
        WRF-based regional climate model output (ERA5-driven, CORDEX SWWA domain)
        streamed directly from
        <a
          href="https://pawsey.org.au/systems/acacia/"
          target="_blank"
          rel="noopener noreferrer"
          class="text-blue-600 dark:text-blue-400 hover:underline"
          >Pawsey Acacia</a
        >
        object storage. Variables are on a rotated-pole grid (279 × 364) at
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
            src="@/assets/logos/DWER-Logo.png"
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
            src="@/assets/logos/Murdoch_University_extended_logo.png"
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
            src="@/assets/logos/pawsey_logo1.png"
            alt="Pawsey Supercomputing Research Centre"
            class="h-10 object-contain dark:bg-white dark:rounded dark:p-1"
          />
        </a>
      </div>
    </div>

    <Tabs v-model:value="activeTab" class="mt-4">
      <div class="sm:hidden mb-3">
        <Select
          v-model="activeTab"
          :options="tabOptions"
          optionLabel="label"
          optionValue="value"
          class="w-full"
        />
      </div>
      <div class="hidden sm:block">
        <TabList>
          <Tab
            v-for="v in variables"
            :key="v.varName"
            :value="v.varName"
            class="px-5 py-2.5 data-[p-active=false]:bg-slate-50 dark:data-[p-active=false]:bg-slate-700"
            >{{ v.label }}</Tab
          >
        </TabList>
      </div>

      <TabPanels>
        <TabPanel v-for="v in variables" :key="v.varName" :value="v.varName">
          <ZarrDirectMap
            :source="STORE_URL_TILES"
            :varName="v.varName"
            :timeSteps="492"
            :clim="v.clim"
            :spatialDims="SWWA_SPATIAL_DIMS"
            :colormap="v.colormap"
            :climUnit="v.climUnit"
            :fillValue="1e20"
            :proj4="SWWA_PROJ4"
            :bounds="SWWA_BOUNDS"
            :unitConverter="v.unitConverter"
          />
        </TabPanel>
      </TabPanels>
    </Tabs>

    <WhatAboutMe :source="STORE_URL_TIMES" />
  </div>
</template>

<script setup lang="ts">
import { ref } from "vue";
import { RouterLink } from "vue-router";
import Tabs from "primevue/tabs";
import TabList from "primevue/tablist";
import Tab from "primevue/tab";
import TabPanels from "primevue/tabpanels";
import TabPanel from "primevue/tabpanel";
import Select from "primevue/select";
import ZarrDirectMap from "@/components/ZarrDirectMap.vue";
import WhatAboutMe from "@/components/WhatAboutMe.vue";
import {
  SWWA_SPATIAL_DIMS,
  SWWA_PROJ4,
  SWWA_BOUNDS,
  COLORMAP_TEMP,
  COLORMAP_PRECIP,
} from "@/composables/useZarrDirectMap";
import { kelvinToCelsius, precipToMmPerDay } from "@/utils/unitConversion";

const activeTab = ref("tasmax");

const variables = [
  {
    varName: "tasmax",
    label: "Max Temperature",
    clim: [6.85, 51.85] as [number, number],
    colormap: COLORMAP_TEMP,
    climUnit: " °C",
    unitConverter: kelvinToCelsius,
  },
  {
    varName: "tasmin",
    label: "Min Temperature",
    clim: [-3.15, 36.85] as [number, number],
    colormap: COLORMAP_TEMP,
    climUnit: " °C",
    unitConverter: kelvinToCelsius,
  },
  {
    varName: "pr",
    label: "Precipitation",
    clim: [0, 8.64] as [number, number],
    colormap: COLORMAP_PRECIP,
    climUnit: " mm/day",
    unitConverter: precipToMmPerDay,
  },
];

const tabOptions = variables.map(({ varName, label }) => ({
  value: varName,
  label,
}));

const STORE_URL_TILES =
  "https://projects.pawsey.org.au/dwer-zarr-store/data.zarr";
const STORE_URL_TIMES =
  "https://projects.pawsey.org.au/dwer-zarr-store-rechunked/data.zarr";
</script>
