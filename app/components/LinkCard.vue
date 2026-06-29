<template>
  <NuxtLink
    :to="href"
    :external="external"
    :target="external ? '_blank' : undefined"
    :rel="external ? 'noopener noreferrer' : undefined"
    class="flex flex-col gap-3 px-6 py-5 rounded-2xl bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 group max-w-2xl mx-auto"
  >
    <div class="flex items-center gap-2">
      <UIcon v-for="icon in icons" :key="icon" :name="icon" class="size-5" />
      <span
        class="text-sm font-semibold text-gray-800 dark:text-gray-100 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors"
      >
        {{ name }}
      </span>
    </div>
    <p class="text-xs text-gray-500 dark:text-gray-400 leading-relaxed m-0">
      {{ description }}
    </p>
  </NuxtLink>
</template>

<script setup lang="ts">
defineProps<{
  href: string;
  name: string;
  description: string;
  icons?: string[];
  external?: boolean;
}>();
</script>
