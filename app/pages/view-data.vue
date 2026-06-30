<template>
  <UDashboardSidebar collapsible resizable :ui="{ root: 'min-h-0' }">
    <template #header>
      <span class="font-semibold text-highlighted">Data controls</span>
    </template>

    <!-- Variable selector -->
    <div>
      <p
        class="px-1.5 mb-1 text-s font-bold uppercase tracking-wide text-muted"
      >
        Variable
      </p>
      <UNavigationMenu :items="variableItems" orientation="vertical" />
    </div>

    <USeparator />

    <!-- Map controls -->
    <ZarrMapControls :map="map" />
  </UDashboardSidebar>

  <UDashboardPanel>
    <template #header>
      <UDashboardNavbar class="h-0">
        <template #leading>
          <UDashboardSidebarToggle />
        </template>
      </UDashboardNavbar>
    </template>

    <template #body>
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
          object storage. Variables are on a rotated-pole 4km grid (279 × 364)
          at monthly frequency, 492 time steps (1980–2021).
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

      <!-- Map for the active variable -->
      <div
        class="rounded-2xl bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 p-4 mb-6"
      >
        <ZarrMapCanvas :map="map" />
      </div>

      <div
        class="rounded-2xl bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 px-6 py-6"
      >
        <ClientOnly>
          <WhatAboutMe :source="STORE_URL_TIMES" :variable="activeVariable" />
        </ClientOnly>
      </div>
    </template>
  </UDashboardPanel>
</template>

<script setup lang="ts">
import type { NavigationMenuItem } from "@nuxt/ui";
import {
  SWWA_SPATIAL_DIMS,
  SWWA_PROJ4,
  SWWA_BOUNDS,
  useZarrDirectMap,
} from "~/composables/useZarrDirectMap";
import {
  CLIMATE_VARIABLES,
  getClimateVariableConfig,
  type ClimateVariableConfig,
  type ClimateVariableName,
} from "~/config/climateVariables";

definePageMeta({ layout: "dashboard" });

useSeoMeta({
  title: "View the Data",
  description:
    "Explore WRF regional climate model output (temperatures, rainfall) streamed directly from Pawsey Acacia object storage.",
});

const activeTab = ref<ClimateVariableName>("tasmax");

const activeVariable = computed<ClimateVariableConfig>(() =>
  getClimateVariableConfig(activeTab.value),
);

const variableItems = computed<NavigationMenuItem[]>(() =>
  CLIMATE_VARIABLES.map(({ varName, label }) => ({
    label,
    active: activeTab.value === varName,
    onSelect: () => {
      activeTab.value = varName;
    },
  })),
);

const STORE_URL_TILES =
  "https://projects.pawsey.org.au/dwer-zarr-store/data.zarr";
const STORE_URL_TIMES =
  "https://projects.pawsey.org.au/dwer-zarr-store-rechunked/data.zarr";

const map = useZarrDirectMap(
  STORE_URL_TILES,
  activeVariable,
  492,
  SWWA_SPATIAL_DIMS,
  { fillValue: 1e20, proj4: SWWA_PROJ4, bounds: SWWA_BOUNDS },
);
</script>
