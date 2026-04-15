<template>
  <div class="container mx-auto mt-10 p-6">
    <RouterLink
      to="/"
      class="inline-flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 transition-colors my-4"
    >
      <v-icon name="hi-arrow-left" scale="0.9" />
      Back to Home
    </RouterLink>

    <h1 class="text-2xl font-bold text-gray-900 dark:text-white mt-2 mb-2">
      DWER Climate Science Initiative
    </h1>
    <p class="text-sm text-gray-500 dark:text-gray-400 mb-6">
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

    <Tabs value="tasmax" class="mt-4">
      <TabList>
        <Tab
          value="tasmax"
          class="px-5 py-2.5 data-[p-active=false]:bg-slate-50 dark:data-[p-active=false]:bg-slate-700"
          >Max Temperature</Tab
        >
        <Tab
          value="tasmin"
          class="px-5 py-2.5 data-[p-active=false]:bg-slate-50 dark:data-[p-active=false]:bg-slate-700"
          >Min Temperature</Tab
        >
        <Tab
          value="pr"
          class="px-5 py-2.5 data-[p-active=false]:bg-slate-50 dark:data-[p-active=false]:bg-slate-700"
          >Precipitation</Tab
        >
      </TabList>
      <TabPanels>
        <TabPanel value="tasmax">
          <ZarrDirectMap
            :source="STORE_URL_TILES"
            varName="tasmax"
            :timeSteps="492"
            :clim="[6.85, 51.85]"
            :spatialDims="SWWA_SPATIAL_DIMS"
            :colormap="COLORMAP_TEMP"
            climUnit=" °C"
            :fillValue="1e20"
            :proj4="SWWA_PROJ4"
            :bounds="SWWA_BOUNDS"
            :unitConverter="kelvinToCelsius"
          />
        </TabPanel>
        <TabPanel value="tasmin">
          <ZarrDirectMap
            :source="STORE_URL_TILES"
            varName="tasmin"
            :timeSteps="492"
            :clim="[-3.15, 36.85]"
            :spatialDims="SWWA_SPATIAL_DIMS"
            :colormap="COLORMAP_TEMP"
            climUnit=" °C"
            :fillValue="1e20"
            :proj4="SWWA_PROJ4"
            :bounds="SWWA_BOUNDS"
            :unitConverter="kelvinToCelsius"
          />
        </TabPanel>
        <TabPanel value="pr">
          <ZarrDirectMap
            :source="STORE_URL_TILES"
            varName="pr"
            :timeSteps="492"
            :clim="[0, 8.64]"
            :spatialDims="SWWA_SPATIAL_DIMS"
            :colormap="COLORMAP_PRECIP"
            climUnit=" mm/day"
            :fillValue="1e20"
            :proj4="SWWA_PROJ4"
            :bounds="SWWA_BOUNDS"
            :unitConverter="precipToMmPerDay"
          />
        </TabPanel>
      </TabPanels>
    </Tabs>

    <WhatAboutMe :source="STORE_URL_TIMES" />
  </div>
</template>

<script setup lang="ts">
import { RouterLink } from "vue-router";
import Tabs from "primevue/tabs";
import TabList from "primevue/tablist";
import Tab from "primevue/tab";
import TabPanels from "primevue/tabpanels";
import TabPanel from "primevue/tabpanel";
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

const STORE_URL_TILES =
  "https://projects.pawsey.org.au/dwer-zarr-store/data.zarr";
const STORE_URL_TIMES =
  "https://projects.pawsey.org.au/dwer-zarr-store-rechunked/data.zarr";
</script>
