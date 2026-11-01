<template>
  <button
    :type="nativeType"
    class="app-button"
    :class="[
      `app-button--${type}`,
      `app-button--${size}`,
      {
        'is-plain': plain,
        'is-block': block,
        'is-loading': loading,
        'is-square': shape === 'square',
      },
    ]"
    :disabled="disabled || loading"
  >
    <span v-if="loading" class="app-button__spinner" aria-hidden="true" />
    <span class="app-button__content"><slot /></span>
  </button>
</template>

<script setup lang="ts">
withDefaults(
  defineProps<{
    type?: "default" | "primary" | "success" | "danger" | "info" | "warning";
    size?: "large" | "normal" | "small" | "mini";
    plain?: boolean;
    block?: boolean;
    loading?: boolean;
    disabled?: boolean;
    nativeType?: "button" | "submit" | "reset";
    shape?: "round" | "square";
  }>(),
  {
    type: "default",
    size: "normal",
    nativeType: "button",
    shape: "round",
  },
);
</script>

<style scoped>
.app-button {
  --app-button-color: var(--second-text-color);
  --app-button-bg: var(--card-color);
  --app-button-border: var(--divider-color);

  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  box-sizing: border-box;
  min-width: 0;
  margin: 0;
  padding: 0 14px;
  border: 1px solid var(--app-button-border);
  border-radius: var(--radius-md);
  background: var(--app-button-bg);
  color: var(--app-button-color);
  font-size: var(--text-base);
  font-weight: 500;
  line-height: 1;
  letter-spacing: -0.01em;
  white-space: nowrap;
  cursor: pointer;
  transition:
    transform 0.2s cubic-bezier(0.4, 0, 0.2, 1),
    background-color 0.2s ease,
    border-color 0.2s ease,
    color 0.2s ease,
    opacity 0.2s ease;

  &:active:not(:disabled) {
    transform: scale(0.97);
  }

  &:disabled {
    cursor: not-allowed;
  }

  &:disabled:not(.is-plain) {
    --app-button-color: var(--comment-text-color);
    --app-button-bg: var(--divider-color);
    --app-button-border: var(--divider-color);
    box-shadow: none;
  }

  &:disabled.is-plain {
    opacity: 0.55;
  }

  &:focus-visible {
    outline: none;
    box-shadow: 0 0 0 2px var(--focus-ring-color);
  }

  &.is-plain {
    background: transparent;
    color: var(--app-button-border);

    &.app-button--default {
      color: var(--second-text-color);
    }

    &.app-button--info {
      color: var(--second-text-color);
      border-color: var(--divider-color);
    }
  }

  &.is-block {
    display: flex;
    width: 100%;
  }

  &.is-square {
    border-radius: var(--radius-sm);
  }
}

.app-button--primary {
  --app-button-color: var(--background-color);
  --app-button-bg: var(--primary-color);
  --app-button-border: var(--primary-color);
}

.app-button--success {
  --app-button-color: #fff;
  --app-button-bg: var(--succeed-color);
  --app-button-border: var(--succeed-color);
}

.app-button--danger {
  --app-button-color: #fff;
  --app-button-bg: var(--danger-color);
  --app-button-border: var(--danger-color);
}

/* Dark themes use a light red fill, so a solid danger button needs dark text
   (same inversion the primary button already uses). The whole selector must sit
   inside :global() — Vue drops anything after it in a scoped block. */
:global(html[data-theme="dark"] .app-button--danger) {
  --app-button-color: #18181b;
}

.app-button--warning {
  --app-button-color: #fff;
  --app-button-bg: var(--warning-color, #d97706);
  --app-button-border: var(--warning-color, #d97706);
}

.app-button--info {
  --app-button-color: var(--second-text-color);
  --app-button-bg: var(--divider-color);
  --app-button-border: var(--divider-color);
}

.app-button--large {
  height: 44px;
  padding: 0 20px;
  font-size: var(--text-md);
}

.app-button--normal {
  height: 36px;
}

.app-button--small {
  height: 32px;
  padding: 0 12px;
  font-size: var(--text-sm);
}

.app-button--mini {
  height: 28px;
  padding: 0 10px;
  font-size: var(--text-xs);
}

.app-button__content {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  min-width: 0;
}

.app-button__spinner {
  width: 14px;
  height: 14px;
  flex: 0 0 14px;
  border: 2px solid currentColor;
  border-right-color: transparent;
  border-radius: 50%;
  animation: app-button-spin 0.7s linear infinite;
}

@keyframes app-button-spin {
  to {
    transform: rotate(360deg);
  }
}

@media (prefers-reduced-motion: reduce) {
  .app-button {
    transition: none;

    &:active:not(:disabled) {
      transform: none;
    }
  }

  .app-button__spinner {
    animation-duration: 2s;
  }
}
</style>
