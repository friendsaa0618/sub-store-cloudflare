<template>
  <span
    class="app-tag"
    :class="[`app-tag--${type}`, { 'is-round': round }]"
  >
    <span class="app-tag__text"><slot /></span>
    <button
      v-if="closable"
      type="button"
      class="app-tag__close"
      aria-label="Remove"
      @click.stop="emit('close')"
    >
      <font-awesome-icon icon="fa-solid fa-xmark" aria-hidden="true" />
    </button>
  </span>
</template>

<script setup lang="ts">
withDefaults(
  defineProps<{
    type?: "default" | "primary" | "success" | "danger" | "warning";
    closable?: boolean;
    round?: boolean;
  }>(),
  {
    type: "default",
    round: false,
  },
);

const emit = defineEmits<{ (e: "close"): void }>();
</script>

<style lang="scss" scoped>
.app-tag {
  --app-tag-color: var(--comment-text-color);
  --app-tag-bg: var(--divider-color);

  display: inline-flex;
  align-items: center;
  gap: 4px;
  max-width: 100%;
  padding: 2px 8px;
  border-radius: var(--radius-sm);
  background: var(--app-tag-bg);
  color: var(--app-tag-color);
  font-size: 11px;
  font-weight: 500;
  line-height: 16px;
  vertical-align: middle;

  &--primary {
    --app-tag-color: var(--primary-color);
    --app-tag-bg: color-mix(in srgb, var(--primary-color) 14%, transparent);
  }

  &--success {
    --app-tag-color: var(--succeed-color);
    --app-tag-bg: color-mix(in srgb, var(--succeed-color) 14%, transparent);
  }

  &--danger {
    --app-tag-color: var(--danger-color);
    --app-tag-bg: color-mix(in srgb, var(--danger-color) 14%, transparent);
  }

  &--warning {
    --app-tag-color: var(--warning-color, #d97706);
    --app-tag-bg: color-mix(in srgb, var(--warning-color, #d97706) 14%, transparent);
  }

  &.is-round {
    border-radius: var(--radius-full);
    padding: 2px 10px;
  }

  &__text {
    min-width: 0;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  &__close {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 14px;
    height: 14px;
    margin: 0 -2px 0 0;
    padding: 0;
    border: 0;
    border-radius: 50%;
    background: transparent;
    color: inherit;
    font-size: 9px;
    cursor: pointer;

    &:hover {
      background: color-mix(in srgb, currentColor 18%, transparent);
    }
  }
}
</style>
