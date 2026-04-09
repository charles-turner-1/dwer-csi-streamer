<template>
  <component
    :is="external ? 'a' : RouterLink"
    v-bind="
      external
        ? { href, target: '_blank', rel: 'noopener noreferrer' }
        : { to: href }
    "
    class="flex flex-col gap-3 px-6 py-5 rounded-2xl bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 group"
  >
    <div class="flex items-center gap-2">
      <v-icon v-for="icon in icons" :key="icon" :name="icon" scale="1.2" />
      <span
        class="text-sm font-semibold text-gray-800 dark:text-gray-100 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors"
      >
        {{ name }}
      </span>
    </div>
    <p class="text-xs text-gray-500 dark:text-gray-400 leading-relaxed m-0">
      {{ description }}
    </p>
  </component>
</template>

<script setup lang="ts">
import { RouterLink } from "vue-router";

defineProps<{
  href: string;
  name: string;
  description: string;
  icons?: string[];
  external?: boolean;
}>();
</script>
