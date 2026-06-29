<template>
  <div class="container mx-auto mt-10 p-6">
    <h1 class="text-2xl font-bold text-gray-900 dark:text-white mt-2 mb-6">
      Proof of Concept: ACCESS Model Datasets
    </h1>

    <!-- Dataset tabs -->
    <UTabs
      v-model="activeTab"
      :items="tabItems"
      :content="false"
      color="primary"
      class="mt-4"
    />

    <div class="mt-4">
      <ClientOnly>
        <ZarrMap
          :key="active.value"
          :ref-spec="active.refSpec"
          :var-name="active.varName"
          :lat-name="active.latName"
          :lon-name="active.lonName"
          :units="active.units"
          :fill-value="active.fillValue"
        />
      </ClientOnly>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { TabsItem } from "@nuxt/ui";
import ref01degJson from "@/assets/ref-01deg.json";
import ref1degJson from "@/assets/ref-1deg.json";

const ref01deg = ref01degJson as Record<string, unknown>;
const ref1deg = ref1degJson as Record<string, unknown>;

interface DatasetTab {
  value: string;
  label: string;
  refSpec: Record<string, unknown>;
  varName: string;
  latName: string;
  lonName: string;
  units?: "C" | "K";
  fillValue?: number;
}

const datasets: DatasetTab[] = [
  {
    value: "sst01",
    label: "Sea Surface Temperature: 0.1°",
    refSpec: ref01deg,
    varName: "sst_m",
    latName: "nj",
    lonName: "ni",
  },
  {
    value: "sst1",
    label: "Sea Surface Temperature: 1°",
    refSpec: ref1deg,
    varName: "sst",
    latName: "yt_ocean",
    lonName: "xt_ocean",
    units: "K",
    fillValue: 0,
  },
];

const activeTab = ref("sst01");

const tabItems = datasets.map<TabsItem>(({ value, label }) => ({
  value,
  label,
}));

const active = computed(
  () => datasets.find((d) => d.value === activeTab.value) ?? datasets[0]!,
);
</script>
