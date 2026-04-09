<template>
  <div class="container mx-auto mt-10 p-6">
    <RouterLink
      to="/"
      class="inline-flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 transition-colors my-4"
    >
      <v-icon name="hi-arrow-left" scale="0.9" />
      Back to Home
    </RouterLink>

    <!-- About accordion -->
    <div
      class="my-6 border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden"
    >
      <button
        class="w-full flex items-center justify-between px-5 py-4 bg-gray-50 dark:bg-gray-800 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors text-left"
        @click="aboutOpen = !aboutOpen"
        :aria-expanded="aboutOpen"
      >
        <span
          class="flex items-center gap-2 font-semibold text-gray-800 dark:text-gray-100"
        >
          <i class="pi pi-info-circle text-blue-500"></i>
          About this tool
        </span>
        <i
          class="pi pi-chevron-down text-gray-400 transition-transform duration-200"
          :class="{ 'rotate-180': aboutOpen }"
        ></i>
      </button>

      <div
        v-show="aboutOpen"
        class="px-5 py-4 bg-white dark:bg-gray-900 text-sm text-gray-600 dark:text-gray-300 space-y-3 leading-relaxed"
      >
        <span
          class="flex items-center gap-2 font-semibold text-gray-600 dark:text-gray-100"
        >
          <i class="pi pi-info-circle text-blue-500"></i>
          Disclaimer: This info was written by Claude Sonnet 4.6. It's mostly
          right (especially the technical bits), but may be subtly misleading.
          At some point, I might come back and rewrite it.
        </span>

        <p>
          Climate model output is large. The ACCESS-OM2-01 run used here
          produces roughly a terabyte of NetCDF files per simulated year, spread
          across thousands of individual files on
          <a
            href="https://pawsey.org.au/systems/acacia/"
            target="_blank"
            rel="noopener noreferrer"
            class="text-blue-600 dark:text-blue-400 hover:underline"
            >Acacia</a
          >
          — Pawsey Supercomputing Centre's object storage. Traditionally, doing
          anything with that data means either being on the HPC cluster
          yourself, or downloading a substantial chunk of it first. Neither
          option is great if you just want to take a quick look.
        </p>
        <p>
          The first step in the pipeline is virtualisation with
          <a
            href="https://virtualizarr.readthedocs.io/"
            target="_blank"
            rel="noopener noreferrer"
            class="text-blue-600 dark:text-blue-400 hover:underline"
            >VirtualiZarr</a
          >. Rather than copying or converting the data, VirtualiZarr reads the
          internal structure of each NetCDF file — where each variable's chunks
          live on disk, their byte offsets and lengths — and builds a
          lightweight <em>virtual</em> Zarr store. Nothing is moved; you end up
          with a reference catalogue that says "chunk <code>[0,0,0]</code> of
          <code>sst_m</code> is bytes 171,279,300–172,408,502 of this file on
          S3". The whole catalogue for 42 months of the global 0.1° CICE sea ice
          run shown here fits in a few-hundred-kilobyte JSON file.
        </p>
        <p>
          That JSON is written out in
          <a
            href="https://fsspec.github.io/kerchunk/"
            target="_blank"
            rel="noopener noreferrer"
            class="text-blue-600 dark:text-blue-400 hover:underline"
            >Kerchunk</a
          >
          reference format — a simple spec that maps Zarr chunk keys to
          <code>[url, offset, length]</code> triples. Any Zarr-aware client that
          knows how to issue HTTP range requests can consume it directly,
          without any special server software. The files themselves never move;
          you're just handing the client a roadmap.
        </p>
        <p>
          In the browser, the reference JSON is loaded and passed to
          <a
            href="https://github.com/manzt/zarrita.js"
            target="_blank"
            rel="noopener noreferrer"
            class="text-blue-600 dark:text-blue-400 hover:underline"
            >zarrita.js</a
          >
          (a TypeScript Zarr implementation) backed by a range-request store.
          When you select a time step, the client works out which chunks are
          needed for that slice, fires off a handful of HTTP
          <code>Range</code> requests to the object storage endpoint,
          decompresses the chunks in-browser using a WASM codec, and renders the
          result. You never download the full dataset — for a single monthly SST
          field at 0.1°, that's pulling around 4–8 MB of compressed chunks out
          of a ~200 GB archive.
        </p>
        <p>
          The result is, again, completely <strong>serverless</strong>: no
          backend, no tiling service, no data pipeline running on a VM
          somewhere. The only infrastructure is the object storage bucket
          (already there for model output) and the static site you're reading
          this on. The main catch is that the S3 bucket needs permissive CORS
          headers — which, at a supercomputing centre, is sometimes easier said
          than done.
        </p>
      </div>
    </div>

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
import { ref } from "vue";
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

const aboutOpen = ref(false);
</script>

<style scoped></style>
