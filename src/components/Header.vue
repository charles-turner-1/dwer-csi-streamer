<template>
  <nav class="sticky top-4 mx-auto z-50 w-auto max-w-4xl mt-4 px-4">
    <div
      class="backdrop-blur-xl bg-white/70 dark:bg-gray-900/70 rounded-2xl shadow-2xl border border-gray-200/50 dark:border-gray-700/50 px-6 py-3"
    >
      <div class="flex items-center justify-between gap-4">
        <!-- Center - Navigation (desktop) -->
        <div class="hidden sm:flex items-center gap-6">
          <RouterLink
            v-for="link in links"
            :key="link.to"
            :to="link.to"
            class="text-sm font-medium text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white transition-colors"
            exact-active-class="!font-bold !text-gray-900 dark:!text-white"
            >{{ link.label }}</RouterLink
          >
        </div>

        <!-- Right - Git Commit + hamburger -->
        <div class="flex items-center gap-3 whitespace-nowrap">
          <GitCommit class="hidden sm:block" />
          <!-- Hamburger (mobile only) -->
          <button
            class="sm:hidden flex flex-col gap-1.5 p-1 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
            @click="menuOpen = !menuOpen"
            aria-label="Toggle menu"
          >
            <span
              class="block w-5 h-0.5 bg-gray-600 dark:bg-gray-300 transition-transform duration-200"
              :class="menuOpen ? 'translate-y-2 rotate-45' : ''"
            />
            <span
              class="block w-5 h-0.5 bg-gray-600 dark:bg-gray-300 transition-opacity duration-200"
              :class="menuOpen ? 'opacity-0' : ''"
            />
            <span
              class="block w-5 h-0.5 bg-gray-600 dark:bg-gray-300 transition-transform duration-200"
              :class="menuOpen ? '-translate-y-2 -rotate-45' : ''"
            />
          </button>
        </div>
      </div>

      <!-- Mobile menu -->
      <Transition name="mobile-menu">
        <div
          v-if="menuOpen"
          class="sm:hidden flex flex-col gap-1 pt-3 mt-3 border-t border-gray-200/60 dark:border-gray-700/60"
        >
          <RouterLink
            v-for="link in links"
            :key="link.to"
            :to="link.to"
            class="text-sm font-medium text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white transition-colors py-2 px-1 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800"
            exact-active-class="!font-bold !text-gray-900 dark:!text-white"
            @click="menuOpen = false"
            >{{ link.label }}</RouterLink
          >
        </div>
      </Transition>
    </div>
  </nav>
</template>

<script setup lang="ts">
import { ref } from "vue";
import { RouterLink } from "vue-router";
import GitCommit from "./GitCommit.vue";

const menuOpen = ref(false);

const links = [
  { to: "/", label: "Home" },
  { to: "/access-model", label: "PoC: ACCESS Model Datasets" },
  { to: "/dwer-csi", label: "DWER Climate Science Initiative" },
];
</script>

<style scoped>
.mobile-menu-enter-active,
.mobile-menu-leave-active {
  transition:
    opacity 0.15s ease,
    transform 0.15s ease;
}
.mobile-menu-enter-from,
.mobile-menu-leave-to {
  opacity: 0;
  transform: translateY(-4px);
}
</style>
