<template>
  <div>
    <h2 class="text-xl font-bold text-gray-900 dark:text-white mb-1">
      What about me?
    </h2>
    <p class="text-sm font-medium text-gray-700 dark:text-gray-300 mb-4">
      Enter your address to see how {{ props.variable.whatAboutMe.introMetric }}
      near you have changed over the past four decades, based on the WRF
      regional climate model.
    </p>

    <!-- Input row -->
    <div class="flex flex-wrap gap-2 mb-4">
      <UInputMenu
        v-model="selected"
        v-model:search-term="searchTerm"
        :items="suggestions"
        :ignore-filter="true"
        label-key="label"
        placeholder="e.g. Perth CBD, Fremantle, Margaret River…"
        class="flex-1 min-w-48"
        :disabled="wam.loading.value"
        @update:search-term="onComplete"
        @keydown.enter="onSearch"
      />
      <UButton
        :disabled="wam.loading.value || !searchTerm.trim()"
        icon="i-lucide-search"
        label="Search"
        @click="onSearch"
      />
      <UButton
        :disabled="wam.loading.value"
        icon="i-lucide-map-pin"
        label="Use my location"
        color="neutral"
        variant="outline"
        class="w-full sm:w-auto"
        @click="onLocate"
      />
    </div>

    <!-- Error banner -->
    <div
      v-if="wam.error.value"
      class="flex items-start gap-2 text-sm text-red-700 dark:text-red-400 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg px-4 py-3 mb-4"
    >
      <UIcon name="i-lucide-triangle-alert" class="mt-0.5 shrink-0" />
      <span>{{ wam.error.value }}</span>
    </div>

    <!-- Loading spinner -->
    <div
      v-if="wam.loading.value"
      class="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400 mb-4"
    >
      <UIcon name="i-lucide-loader-circle" class="animate-spin" />
      <span>Loading climate data…</span>
    </div>

    <!-- Results -->
    <template v-if="wam.headline.value && !wam.loading.value">
      <!-- Headline stat card -->
      <div
        class="rounded-xl bg-blue-50 dark:bg-blue-950/40 border border-blue-100 dark:border-blue-900 px-5 py-4 mb-5"
      >
        <p class="text-sm text-gray-600 dark:text-gray-300 leading-relaxed">
          Near
          <strong class="text-gray-900 dark:text-white">{{
            wam.placeName.value
          }}</strong
          >, the {{ props.variable.whatAboutMe.headlineMetric }} in the
          <strong>{{ wam.lastDecadeLabel.value }}</strong> was
          <span
            class="font-bold text-lg"
            :class="
              wam.deltaPositive.value
                ? 'text-orange-600 dark:text-orange-400'
                : 'text-blue-600 dark:text-blue-400'
            "
            >{{ wam.headline.value.lastMean }}
            {{ props.variable.whatAboutMe.unitLabel }}</span
          >, compared to
          <strong
            >{{ wam.headline.value.firstMean }}
            {{ props.variable.whatAboutMe.unitLabel }}</strong
          >
          in the
          <strong>{{ wam.firstDecadeLabel.value }}</strong
          >.
          <span
            class="font-semibold"
            :class="
              wam.deltaPositive.value
                ? 'text-orange-600 dark:text-orange-400'
                : 'text-blue-600 dark:text-blue-400'
            "
          >
            That's {{ wam.deltaPositive.value ? "+" : ""
            }}{{ wam.headline.value.delta }}
            {{ props.variable.whatAboutMe.unitLabel }} over the period.
          </span>
        </p>
      </div>

      <!-- Chart -->
      <div class="relative">
        <p class="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
          {{ props.variable.whatAboutMe.chartTitleMetric }} near
          <span class="text-blue-600 dark:text-blue-400">{{
            wam.placeName.value
          }}</span>
        </p>
        <Line :data="chartData" :options="chartOptions" />
      </div>
    </template>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch } from "vue";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  type TooltipItem,
} from "chart.js";
import { Line } from "vue-chartjs";
import {
  useWhatAboutMe,
  type NominatimSuggestion,
} from "@/composables/useWhatAboutMe";
import type { ClimateVariableConfig } from "@/config/climateVariables";

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
);

const props = defineProps<{
  source: string;
  variable: ClimateVariableConfig;
}>();

const wam = useWhatAboutMe(
  props.source,
  props.variable.varName,
  props.variable.unitConverter,
);

watch(
  () => props.variable,
  async (variable, previous) => {
    if (variable.varName === previous?.varName) return;
    wam.setVariable(variable.varName, variable.unitConverter);
    await wam.refreshForCurrentLocation();
  },
);

/** Free-text bound to the input. */
const searchTerm = ref("");

/** The suggestion the user has selected from the dropdown, if any. */
const selected = ref<NominatimSuggestion | undefined>(undefined);

/** Populated by Nominatim as the user types. */
const suggestions = ref<NominatimSuggestion[]>([]);

async function onComplete(term: string) {
  if (!term || term.trim().length < 2) {
    suggestions.value = [];
    return;
  }
  suggestions.value = await wam.suggestAddresses(term);
}

/**
 * When the user picks an item from the dropdown, pass pre-resolved coordinates
 * directly to the composable — no second geocode round-trip.
 */
watch(selected, (value) => {
  if (value) {
    wam.searchByCoords(value.lat, value.lon, value.label);
  }
});

/**
 * Called when the user presses Enter or clicks the Search button: fires a
 * free-text geocode of whatever has been typed.
 */
function onSearch() {
  const q = searchTerm.value.trim();
  if (!q) return;
  wam.searchByAddress(q);
}

/** Triggers a browser geolocation lookup via the composable. */
function onLocate() {
  wam.searchByLocation();
}

/**
 * Generates sparse x-axis tick labels: only shows the year every 24 months
 * (i.e. every 2 years) to avoid overcrowding the chart axis.
 * Empty strings are intentional — Chart.js renders no tick for them.
 */
const sparseLabels = computed(() => {
  const labels = wam.timeLabels.value;
  if (!labels) return [];
  return labels.map((label, i) => {
    const isEvenYearJanuary = i % 24 === 0;
    return isEvenYearJanuary ? (label.split(" ").at(-1) ?? "") : "";
  });
});

/** Chart.js dataset config derived from the composable’s reactive time series refs. */
const chartData = computed(() => ({
  labels: sparseLabels.value,
  datasets: [
    {
      label: "Monthly",
      data: wam.timeSeries.value ?? [],
      borderColor: "rgba(148, 163, 184, 0.45)",
      borderWidth: 1,
      pointRadius: 0,
      tension: 0.1,
      order: 3,
    },
    {
      label: "12-month average",
      data: wam.rollingAvg.value ?? [],
      borderColor: "#3b82f6",
      borderWidth: 2.5,
      pointRadius: 0,
      spanGaps: false,
      order: 2,
    },
    {
      label: "Long-term trend",
      data: wam.trendLine.value ?? [],
      borderColor: "#f97316",
      borderWidth: 2,
      borderDash: [8, 4],
      pointRadius: 0,
      order: 1,
    },
  ],
}));

/** Static Chart.js options shared across all renders of this component. */
const chartOptions = computed(() => {
  return {
    responsive: true,
    animation: false as const,
    interaction: { mode: "index" as const, intersect: false },
    plugins: {
      legend: { position: "top" as const },
      tooltip: {
        callbacks: {
          label: (ctx: TooltipItem<"line">) =>
            ctx.parsed.y !== null
              ? `${ctx.dataset.label ?? ""}: ${ctx.parsed.y.toFixed(1)} ${props.variable.whatAboutMe.unitLabel}`
              : "",
        },
      },
    },
    scales: {
      x: {
        ticks: {
          maxRotation: 0,
          autoSkip: false,
        },
      },
      y: {
        title: {
          display: true,
          text: props.variable.whatAboutMe.axisLabel,
        },
      },
    },
  } as const;
});
</script>
