<template>
  <div class="container mx-auto mt-10 p-6">
    <RouterLink
      to="/"
      class="inline-flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 transition-colors my-4"
    >
      <v-icon name="hi-arrow-left" scale="0.9" />
      Back to Home
    </RouterLink>

    <h1 class="text-2xl font-bold text-gray-900 dark:text-white mt-2 mb-6">
      DWER Climate Science Initiative
    </h1>

    <p class="text-gray-500 dark:text-gray-400 text-lg">Coming soon.</p>
  </div>
</template>

<script setup lang="ts">
import { RouterLink } from "vue-router";
</script>
