<template>
  <div class="container mx-auto mt-10 p-6">
    <RouterLink
      to="/"
      class="inline-flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 transition-colors my-4"
    >
    </RouterLink>

    <h1 class="text-2xl font-bold text-gray-900 dark:text-white mt-2 mb-6">
      Proof of Concept: ACCESS Model Datasets
    </h1>

    <!-- Dataset tabs -->
    <Tabs value="sst01" class="mt-4">
      <TabList>
        <Tab
          value="sst01"
          class="px-5 py-2.5 data-[p-active=false]:bg-slate-50 dark:data-[p-active=false]:bg-slate-700"
          >Sea Surface Temperature: 0.1°</Tab
        >
        <Tab
          value="sst1"
          class="px-5 py-2.5 data-[p-active=false]:bg-slate-50 dark:data-[p-active=false]:bg-slate-700"
          >Sea Surface Temperature: 1°</Tab
        >
        <Tab
          value="atmos"
          class="px-5 py-2.5 data-[p-active=false]:bg-slate-50 dark:data-[p-active=false]:bg-slate-700"
          >Atmospheric Daily</Tab
        >
      </TabList>
      <TabPanels>
        <TabPanel value="sst01">
          <ZarrMap
            :refSpec="ref01deg"
            :varName="'sst_m'"
            :latName="'nj'"
            :lon-name="'ni'"
          />
        </TabPanel>
        <TabPanel value="sst1">
          <ZarrMap
            :refSpec="ref1deg"
            :varName="'sst'"
            :lat-name="'yt_ocean'"
            :lon-name="'xt_ocean'"
            units="K"
            :fillValue="0"
          />
        </TabPanel>
        <TabPanel value="atmos">
          <ZarrMap
            :refSpec="refAtmosDaily"
            :varName="'fld_s03i236'"
            :lat-name="'lat'"
            :lon-name="'lon'"
            units="K"
            :fillValue="1.0000000200408773e20"
          />
        </TabPanel>
      </TabPanels>
    </Tabs>
  </div>
</template>

<script setup lang="ts">
import { RouterLink } from "vue-router";
import ref01deg from "@/assets/ref-01deg.json";
import ref1deg from "@/assets/ref-1deg.json";
import refAtmosDaily from "@/assets/ref-atmos-daily.json";
import Tabs from "primevue/tabs";
import TabList from "primevue/tablist";
import Tab from "primevue/tab";
import TabPanels from "primevue/tabpanels";
import TabPanel from "primevue/tabpanel";
import ZarrMap from "@/components/ZarrMap.vue";
</script>

<style scoped></style>
