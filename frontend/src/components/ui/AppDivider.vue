<template>
  <div class="app-divider" :class="{ 'is-dashed': dashed }" role="separator">
    <span v-if="$slots.default" class="app-divider__text"><slot /></span>
  </div>
</template>

<script setup lang="ts">
withDefaults(
  defineProps<{
    dashed?: boolean;
  }>(),
  {
    dashed: false,
  },
);
</script>

<style lang="scss" scoped>
.app-divider {
  display: flex;
  align-items: center;
  gap: 12px;
  width: 100%;
  margin: 12px 0;
  color: var(--comment-text-color);
  font-size: 12px;

  &::before,
  &::after {
    content: "";
    flex: 1 1 auto;
    border-top: 1px solid var(--divider-color);
  }

  &.is-dashed::before,
  &.is-dashed::after {
    border-top-style: dashed;
  }

  &__text {
    flex: 0 0 auto;
    white-space: nowrap;
  }
}
</style>
