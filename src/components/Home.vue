<template>
  <div class="container mx-auto px-6 py-12">
    <div class="text-center mb-12 mt-12">
      <h1 class="text-4xl font-bold text-gray-900 dark:text-white mb-4">
        DWER Climate Science Initiative Zarr Data Streamer
      </h1>
      <p
        class="text-gray-500 dark:text-gray-400 max-w-2xl mx-auto text-lg leading-relaxed"
      >
        A serverless tool for streaming scientific datasets directly to the
        browser from cloud object storage, using Zarr and virtual reference
        filesystems.
      </p>
    </div>

    <div class="flex justify-center gap-4 flex-wrap">
      <LinkCard
        href="/access-model"
        name="PoC: ACCESS Model Datasets"
        description="Interactively explore climate model output streamed directly from Pawsey Acacia object storage."
        :icons="['vi-file-type-python', 'vi-file-type-vue']"
      />
      <LinkCard
        href="/dwer-csi"
        name="DWER Climate Science Initiative"
        description="Stream and visualise DWER CSI datasets directly in the browser."
        :icons="['vi-file-type-python', 'vi-file-type-vue']"
      />
    </div>

    <div class="max-w-2xl mx-auto my-10 p-5 rounded-2xl bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-sm text-gray-600 dark:text-gray-300 space-y-2">
      <h2 class="text-sm font-semibold text-gray-700 dark:text-gray-200 uppercase tracking-wide mb-3">Acknowledgements</h2>
      <p>
        The dataset is a collaboration between
        <a href="https://www.murdoch.edu.au" target="_blank" rel="noopener noreferrer" class="text-blue-600 dark:text-blue-400 hover:underline">Murdoch University</a>
        and the
        <a href="https://www.der.wa.gov.au" target="_blank" rel="noopener noreferrer" class="text-blue-600 dark:text-blue-400 hover:underline">WA Department of Water and Environmental Regulation (DWER)</a>.
      </p>
      <p>
        Compute and storage infrastructure is provided by the
        <a href="https://pawsey.org.au" target="_blank" rel="noopener noreferrer" class="text-blue-600 dark:text-blue-400 hover:underline">Pawsey Supercomputing Research Centre</a>.
      </p>
      <p>
        The browser streaming tooling is being developed and trialed in collaboration with
        <a href="https://www.access-nri.org.au" target="_blank" rel="noopener noreferrer" class="text-blue-600 dark:text-blue-400 hover:underline">ACCESS-NRI</a>.
      </p>
      <p class="font-semibold"> 
        Note: this is not yet an official product of any of these organisations, simply a proof of concept, demonstrating 
        the potential of these approaches for data sharing and exploration.
      </p>
    </div>


    <div class="max-w-2xl mx-auto mt-12 text-sm text-gray-600 dark:text-gray-300 space-y-3 leading-relaxed">
      <h2 class="text-lg font-semibold text-gray-800 dark:text-gray-100 flex items-center gap-2">
        <i class="pi pi-info-circle text-blue-500"></i>
        About this tool
      </h2>
      <p class="flex items-center gap-2 font-semibold text-gray-500 dark:text-gray-400">
        <i class="pi pi-info-circle text-blue-500"></i>
        Disclaimer: This info was written by Claude Sonnet 4.6. It's mostly
        right (especially the generic technical bits), but may be subtly misleading.
        At some point, I will aim to come back and rewrite it.
      </p>

      <p>
        Climate and environmental datasets are large. Reanalysis products like
        ERA5 can run to several petabytes in total, and even a single model run
        is typically spread across hundreds to thousands of large NetCDF files on
        storage systems such as 
        <a
          href="https://pawsey.org.au/systems/acacia/"
          target="_blank"
          rel="noopener noreferrer"
          class="text-blue-600 dark:text-blue-400 hover:underline"
          >Acacia</a
        >
        - Pawsey Supercomputing Centre's object storage. Traditionally, doing
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
        internal structure of each NetCDF file - where each variable's chunks
        live on disk, their byte offsets and lengths - and builds a
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
        reference format - a simple spec that maps Zarr chunk keys to
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
        result. You never download the full dataset - for a single monthly SST
        field at 0.1°, that's pulling around 4–8 MB of compressed chunks out
        of a ~200 GB archive.
      </p>
      <p>
        The result is completely <strong>serverless</strong>: no
        backend, no tiling service, no data pipeline running on a VM
        somewhere. The only infrastructure is the object storage bucket
        (already there for model output) and the static site you're reading
        this on. The main catch is that the S3 bucket needs permissive CORS
        headers - which, at a supercomputing centre, is sometimes easier said
        than done.
      </p>
    </div>
  </div>
</template>

<script setup lang="ts">
import LinkCard from "./LinkCard.vue";
</script>
