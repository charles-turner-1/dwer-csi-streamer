<template>
  <div class="container mx-auto px-6 py-12">
    <div class="text-center mb-12 mt-12">
      <h1 class="text-4xl font-bold text-gray-900 dark:text-white mb-4">
        DWER CSI Streamer
      </h1>
      <p
        class="text-gray-500 dark:text-gray-400 max-w-2xl mx-auto text-lg leading-relaxed"
      >
        A serverless tool for streaming scientific datasets directly to the
        browser from cloud object storage, using Zarr and virtual reference
        filesystems.
      </p>
    </div>

    <div class="flex justify-center">
      <LinkCard
        href="/zarr-data-streamer"
        name="Zarr Data Streamer"
        description="Interactively explore climate model output streamed directly from Pawsey Acacia object storage."
        :icons="['vi-file-type-python', 'vi-file-type-vue']"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import LinkCard from "./LinkCard.vue";
</script>
