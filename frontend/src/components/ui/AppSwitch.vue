<template>
  <label class="app-switch" :class="{ 'is-checked': modelValue, 'is-disabled': disabled }">
    <input
      class="app-switch__input"
      type="checkbox"
      role="switch"
      :checked="modelValue"
      :disabled="disabled"
      @change="onChange"
    />
    <span class="app-switch__track" aria-hidden="true">
      <span class="app-switch__thumb" />
    </span>
  </label>
</template>

<script setup lang="ts">
const props = withDefaults(
  defineProps<{
    modelValue?: boolean;
    disabled?: boolean;
  }>(),
  {
    modelValue: false,
  },
);

const emit = defineEmits<{
  (e: "update:modelValue", value: boolean): void;
  (e: "change", value: boolean): void;
}>();

const onChange = (event: Event) => {
  const value = (event.target as HTMLInputElement).checked;
  emit("update:modelValue", value);
  emit("change", value);
};
</script>

<style scoped>
.app-switch {
  position: relative;
  display: inline-flex;
  align-items: center;
  flex: 0 0 auto;
  width: 44px;
  height: 24px;
  cursor: pointer;

  &.is-disabled {
    cursor: not-allowed;
    opacity: 0.55;
  }
}

.app-switch__input {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  margin: 0;
  opacity: 0;
  cursor: inherit;
}

.app-switch__track {
  position: relative;
  display: block;
  width: 100%;
  height: 100%;
  border-radius: var(--radius-full);
  background: var(--switch-close-background-color, var(--divider-color));
  transition: background-color 0.2s ease;
}

.app-switch__thumb {
  position: absolute;
  top: 2px;
  left: 2px;
  width: 20px;
  height: 20px;
  border-radius: 50%;
  background: #fff;
  box-shadow: 0 1px 3px rgba(15, 23, 42, 0.24);
  transition: transform 0.2s cubic-bezier(0.4, 0, 0.2, 1);
}

.app-switch.is-checked .app-switch__track {
  background: var(--switch-active-background-color, var(--primary-color));
}

.app-switch.is-checked .app-switch__thumb {
  transform: translateX(20px);
}

.app-switch__input:focus-visible + .app-switch__track {
  box-shadow: 0 0 0 2px var(--focus-ring-color);
}

@media (prefers-reduced-motion: reduce) {
  .app-switch__track,
  .app-switch__thumb {
    transition: none;
  }
}
</style>
