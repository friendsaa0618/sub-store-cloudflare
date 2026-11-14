<template>
  <div class="editor-tab-content editor-group">
    <p v-if="showTitle" class="editor-group__title">{{ title }}</p>
    <slot />
  </div>
</template>

<script setup lang="ts">
defineProps<{
  title: string;
  showTitle: boolean;
}>();
</script>

<style scoped>
.editor-group__title {
  margin: 0;
  padding: 10px var(--space-4) 8px;
  border-bottom: 1px solid var(--divider-color);
  color: var(--comment-text-color);
  font-size: 12px;
  font-weight: 600;
  line-height: 1.3;
  letter-spacing: 0;
}
</style>
