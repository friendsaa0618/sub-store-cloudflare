<template>
  <span class="label-with-tip" @click.stop="emit('tip')">
    <span><slot /></span>
    <font-awesome-icon class="label-tip-icon" icon="fa-solid fa-circle-question" />
  </span>
</template>

<script setup lang="ts">
const emit = defineEmits<{
  (e: "tip"): void;
}>();
</script>

<style scoped>
.label-with-tip {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  /* Keep the label on one line once the tip icon shares its box: the label
     column is fixed, and `User-Agent` / `订阅流量信息` wrapped in half. */
  white-space: nowrap;
  cursor: pointer;
  color: var(--comment-text-color);
  font-size: 13px;
}

.label-tip-icon {
  width: 12px;
  height: 12px;
  font-size: 12px;
  color: var(--lowest-text-color);
  flex-shrink: 0;
}
</style>
