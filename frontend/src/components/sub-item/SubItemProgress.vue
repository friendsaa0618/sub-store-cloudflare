<template>
  <div
    class="progress"
    :class="[
      progressColorClass,
      `progress--${progressStyle}`
    ]"
    :style="{ width: progressWidth }"
  ></div>
</template>

<script setup lang="ts">
import { computed } from "vue";

import type { SubItemFlow } from "@/hooks/useSubItemFlow";

const props = defineProps<{
  flow?: SubItemFlow;
  progressStyle: string;
}>();

const progress = computed(() => {
  return typeof props.flow === "object" && props.flow?.progress !== undefined
    ? props.flow.progress
    : undefined;
});
const progressWidth = computed(() => `${(progress.value ?? 0) * 100}%`);

const progressColorClass = computed(() => {
  if (progress.value === undefined) {
    return "progress--green";
  }
  const p = progress.value;
  if (p > 0.5) return "progress--green";
  if (p > 0.2) return "progress--yellow";
  return "progress--orange";
});
</script>

<style scoped>
.progress {
  position: absolute;
  left: 0;
  pointer-events: none;
  z-index: 0;
  transition: width 0.6s cubic-bezier(0.4, 0, 0.2, 1), background 0.6s ease;

  &.progress--background,
  &:not(.progress--bar) {
    top: 0;
    height: 100%;
    border-radius: var(--radius-lg, var(--item-card-radios));
    opacity: 0.18;
  }

  &.progress--bar {
    bottom: 0;
    height: 4px;
    border-bottom-left-radius: var(--radius-lg, var(--item-card-radios));
    border-bottom-right-radius: var(--radius-lg, var(--item-card-radios));
    opacity: 0.85;
  }

  &.progress--green {
    background: linear-gradient(90deg, #10b981 0%, #34d399 100%);
  }

  &.progress--yellow {
    background: linear-gradient(90deg, #eab308 0%, #f59e0b 100%);
  }

  &.progress--orange {
    background: linear-gradient(90deg, #f97316 0%, #ef4444 100%);
  }
}
</style>
