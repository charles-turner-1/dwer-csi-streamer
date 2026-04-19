<template>
  <div class="container mx-auto px-6 pt-6">
    <div
      id="hero"
      class="max-w-2xl mx-auto mt-12 mb-10 p-6 rounded-2xl bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700"
    >
      <div class="flex justify-center mb-5">
        <a
          href="https://www.wa.gov.au/organisation/department-of-water-and-environmental-regulation/climate-science-initiative-and-wa-climate-projections"
          target="_blank"
          rel="noopener noreferrer"
        >
          <img
            src="@/assets/logos/csi_logo.png"
            alt="Climate Science Initiative WA"
            class="h-40 object-contain dark:bg-white dark:rounded dark:p-1"
          />
        </a>
      </div>
      <div
        class="text-xl sm:text-2xl font-semibold text-gray-600 dark:text-white mb-2"
      >
        Zarr Data Streamer
      </div>
      <p class="text-gray-500 dark:text-gray-400 text-sm leading-relaxed">
        A serverless tool for streaming scientific datasets directly from the
        cloud, for exploration and engagement.
      </p>
    </div>

    <div
      class="max-w-2xl mx-auto my-10 p-5 rounded-2xl bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-sm text-gray-600 dark:text-gray-300 space-y-2"
    >
      <h2
        class="text-sm font-semibold text-gray-700 dark:text-gray-200 uppercase tracking-wide mb-3"
      >
        Acknowledgements
      </h2>

      <div class="flex flex-wrap justify-center items-center gap-6 py-4">
        <a
          href="https://www.der.wa.gov.au"
          target="_blank"
          rel="noopener noreferrer"
          class="flex items-center"
        >
          <img
            src="@/assets/logos/DWER-Logo.png"
            alt="Department of Water and Environmental Regulation"
            class="h-12 object-contain dark:bg-white dark:rounded dark:p-1"
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
            class="h-12 object-contain dark:bg-white dark:rounded dark:p-1"
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
            class="h-12 object-contain dark:bg-white dark:rounded dark:p-1"
          />
        </a>
      </div>

      <p>
        This dataset is a collaboration between
        <a
          href="https://www.murdoch.edu.au"
          target="_blank"
          rel="noopener noreferrer"
          class="text-blue-600 dark:text-blue-400 hover:underline"
          >Murdoch University</a
        >
        and the
        <a
          href="https://www.der.wa.gov.au"
          target="_blank"
          rel="noopener noreferrer"
          class="text-blue-600 dark:text-blue-400 hover:underline"
          >WA Department of Water and Environmental Regulation (DWER)</a
        >.
      </p>
      <p>
        Compute and storage infrastructure is provided by the
        <a
          href="https://pawsey.org.au"
          target="_blank"
          rel="noopener noreferrer"
          class="text-blue-600 dark:text-blue-400 hover:underline"
          >Pawsey Supercomputing Research Centre</a
        >.
      </p>
      <p class="font-semibold">
        Note: this is not yet an official product of any of these organisations,
        simply a proof of concept, demonstrating the potential of these
        approaches for data sharing and exploration.
      </p>

      <div
        class="border-t border-gray-200 dark:border-gray-600 pt-3 mt-1 flex flex-wrap items-center gap-3"
      >
        <span class="text-xs text-gray-400 dark:text-gray-500"
          >Visualisation tooling developed in collaboration with ACCESS-NRI
        </span>
        <a
          href="https://www.access-nri.org.au"
          target="_blank"
          rel="noopener noreferrer"
        >
          <img
            src="@/assets/logos/ACCESS-logo.svg"
            alt="ACCESS-NRI"
            class="h-10 object-contain opacity-80"
          />
        </a>
      </div>
    </div>

    <div class="max-w-2xl mx-auto flex flex-col gap-4">
      <LinkCard
        v-for="card in linkCards"
        :key="card.href"
        :href="card.href"
        :name="card.name"
        :description="card.description"
        :icons="card.icons"
      />
    </div>

    <div class="max-w-2xl mx-auto mt-4 space-y-6 pb-12">
      <!-- What it can do -->
      <div
        class="p-5 rounded-2xl bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-sm text-gray-600 dark:text-gray-300 space-y-3 leading-relaxed"
      >
        <h2
          class="text-sm font-semibold text-gray-700 dark:text-gray-200 uppercase tracking-wide mb-3"
        >
          What it can do
        </h2>
        <p>
          Climate model output is large, and traditionally doing anything useful
          with it has meant either getting an account on an HPC system, or
          sitting through a multi-gigabyte download — before writing a single
          line of code. Neither is great if a scientist, policy analyst, or
          curious member of the public just wants to see what the data looks
          like, or what the results mean for them.
        </p>
        <p>
          This tool lets you explore climate datasets
          <strong>directly in the browser</strong> — no download, no login, no
          Python environment to configure. Select a variable, scroll through 40+
          years of monthly output, and the relevant data streams on demand from
          Pawsey's object storage. You never pull more than the slice you're
          actually looking at, making real time exploration viable for the first
          time ever.
        </p>
        <p>
          The goal is to lower the barrier to engagement with research outputs:
          making it easier for collaborators to sanity-check model runs, for
          stakeholders to explore projections, and for the public to connect
          with the science — without needing to involve software/data engineers,
          learn to code, or get access to special infrastructure.
        </p>
      </div>

      <!-- Technical details -->
      <div
        class="p-5 rounded-2xl bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-sm text-gray-600 dark:text-gray-300 space-y-3 leading-relaxed"
      >
        <h2
          class="text-sm font-semibold text-gray-700 dark:text-gray-200 uppercase tracking-wide mb-3"
        >
          Technical details
        </h2>
        <p>
          The key insight is that the original NetCDF files never need to move
          or be converted. Instead,
          <a
            href="https://virtualizarr.readthedocs.io/"
            target="_blank"
            rel="noopener noreferrer"
            class="text-blue-600 dark:text-blue-400 hover:underline"
            >VirtualiZarr</a
          >
          reads the internal structure of each file — where each variable's
          chunks live on disk, their byte offsets and lengths — and builds a
          lightweight <em>virtual</em> Zarr store. Nothing is copied or
          duplicated; you end up with a reference catalogue that says "chunk
          <code>[t,y,x]</code> of <code>tasmax</code> is bytes
          171,279,300–172,408,502 of this file on S3". The catalogue for the
          entire SWWA dataset fits in a small JSON file — a trivial overhead
          compared to the data itself.
        </p>
        <p>
          That JSON is written in
          <a
            href="https://fsspec.github.io/kerchunk/"
            target="_blank"
            rel="noopener noreferrer"
            class="text-blue-600 dark:text-blue-400 hover:underline"
            >Kerchunk</a
          >
          reference format, a simple spec that maps Zarr chunk keys to
          <code>[url, offset, length]</code> triples. Any Zarr-aware client that
          can issue HTTP range requests can consume it directly — no special
          server required.
        </p>
        <p>
          In the browser,
          <a
            href="https://github.com/manzt/zarrita.js"
            target="_blank"
            rel="noopener noreferrer"
            class="text-blue-600 dark:text-blue-400 hover:underline"
            >zarrita.js</a
          >
          handles Zarr I/O backed by a range-request store. When you move the
          time slider, it resolves which chunks are needed, fires off a handful
          of HTTP <code>Range</code> requests to the object storage endpoint,
          decompresses the data in-browser using a WASM codec, and passes the
          result to the map renderer. A single monthly field for the SWWA domain
          requires only a few hundred kilobytes of compressed data — fetched on
          demand from an archive that is orders of magnitude larger.
        </p>
        <p>
          The architecture is completely <strong>serverless</strong>: there is
          no backend, no tiling service, and no bespoke data pipeline running on
          a VM. The only infrastructure is the object storage bucket (which
          already exists for model output) and this static site.
        </p>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import LinkCard from "./LinkCard.vue";

const linkCards = [
  {
    href: "/view-data",
    name: "DWER Climate Science Initiative",
    description:
      "Explore WRF regional climate model output (maximum and minimum temperatures, rainfall) streamed directly from Pawsey Acacia — no download required.",
    icons: ["vi-file-type-python", "vi-file-type-vue"],
  },
  {
    href: "/access-model",
    name: "Proof of Concept: ACCESS Model Datasets",
    description:
      "Interactively explore climate model output streamed directly from Pawsey Acacia object storage. Same architecture, bigger datasets, less polish.",
    icons: ["vi-file-type-python", "vi-file-type-vue"],
  },
];
</script>
