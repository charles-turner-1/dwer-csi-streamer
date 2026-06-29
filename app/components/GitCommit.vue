<script setup lang="ts">
const config = useRuntimeConfig();

const commitSha = config.public.gitCommitSha as string;
const buildTime = config.public.buildTime as string;

const shortCommitSha = commitSha ? commitSha.substring(0, 7) : "";
const commitUrl =
  commitSha && commitSha !== "unknown"
    ? `https://github.com/charles-turner-1/dwer-csi-streamer/commit/${commitSha}`
    : "";

const copyCommitSha = async () => {
  if (!commitSha) return;

  try {
    await navigator.clipboard.writeText(commitSha);
  } catch (err) {
    console.error("Failed to copy commit SHA:", err);
  }
};
</script>

<template>
  <UPopover
    v-if="commitSha && commitSha !== 'unknown'"
    mode="hover"
    :content="{ side: 'bottom', align: 'end', sideOffset: 8 }"
  >
    <UButton
      :to="commitUrl"
      target="_blank"
      variant="soft"
      color="success"
      size="sm"
      class="inline-flex items-center font-mono"
    >
      <UIcon name="i-simple-icons-github" class="mr-1" />
      {{ shortCommitSha }}
    </UButton>

    <template #content>
      <div class="p-3 flex flex-col gap-2 min-w-88 max-w-120">
        <div class="text-sm text-gray-900 dark:text-gray-100 break-all">
          <UIcon name="i-simple-icons-github" class="mr-2" />
          <strong>Commit:</strong>
          {{ commitSha }}
        </div>
        <div v-if="buildTime" class="text-xs text-gray-600 dark:text-gray-400">
          <strong>Built:</strong> {{ new Date(buildTime).toLocaleString() }}
        </div>
        <div class="pt-1">
          <UButton
            variant="soft"
            label="Copy SHA"
            icon="i-lucide-copy"
            size="xs"
            @click="copyCommitSha"
          />
        </div>
      </div>
    </template>
  </UPopover>
</template>
