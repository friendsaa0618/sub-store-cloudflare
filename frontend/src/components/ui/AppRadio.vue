<template>
  <label
    class="app-radio"
    :class="[
      { 'is-checked': checked, 'is-disabled': disabled },
      shape === 'button' ? 'is-button' : '',
    ]"
  >
    <input
      class="app-radio__input"
      type="radio"
      :checked="checked"
      :disabled="disabled"
      @change="select"
    />
    <span v-if="shape !== 'button'" class="app-radio__dot" aria-hidden="true" />
    <span class="app-radio__label"><slot /></span>
  </label>
</template>

<script setup lang="ts">
import { computed, inject } from "vue";
import { RADIO_GROUP_KEY, type RadioGroupContext } from "./context";

const props = withDefaults(
  defineProps<{
    label: string | number;
    shape?: "round" | "button";
    disabled?: boolean;
  }>(),
  {
    shape: "round",
  },
);

const group = inject<RadioGroupContext | null>(RADIO_GROUP_KEY, null);

const checked = computed(() => group?.value === props.label);
const disabled = computed(() => Boolean(props.disabled || group?.isDisabled));

const select = () => {
  if (disabled.value) {
    return;
  }
  group?.select(props.label);
};
</script>

<style scoped>
.app-radio {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  min-width: 0;
  color: var(--second-text-color);
  font-size: var(--text-base);
  line-height: 1.4;
  cursor: pointer;
  user-select: none;

  &.is-button {
    padding: 5px 10px;
    border: 1px solid transparent;
    border-radius: var(--radius-md);
    background: var(--divider-color);
    transition:
      border-color 0.15s ease,
      background-color 0.15s ease,
      color 0.15s ease;
  }

  &.is-button.is-checked {
    border-color: var(--primary-color);
    background: var(--card-color);
    color: var(--primary-color);
    font-weight: 500;
  }

  &.is-disabled {
    color: var(--lowest-text-color);
    cursor: not-allowed;
    opacity: 0.6;
  }
}

.app-radio__input {
  position: absolute;
  width: 1px;
  height: 1px;
  margin: -1px;
  padding: 0;
  overflow: hidden;
  clip: rect(0 0 0 0);
  white-space: nowrap;
  border: 0;
}

.app-radio__dot {
  position: relative;
  display: inline-flex;
  flex: 0 0 18px;
  width: 18px;
  height: 18px;
  box-sizing: border-box;
  border: 1px solid var(--divider-color);
  border-radius: 50%;
  background: var(--card-color);
  transition:
    border-color 0.15s ease,
    background-color 0.15s ease;
}

.app-radio__label {
  min-width: 0;
}

.app-radio.is-checked .app-radio__dot {
  border-color: var(--primary-color);
}

.app-radio.is-checked .app-radio__dot::after {
  content: "";
  position: absolute;
  inset: 4px;
  border-radius: 50%;
  background: var(--primary-color);
}

.app-radio__input:focus-visible + .app-radio__dot,
.app-radio__input:focus-visible ~ .app-radio__dot {
  box-shadow: 0 0 0 2px var(--focus-ring-color);
}

.app-radio__input:focus-visible ~ .app-radio__label {
  text-decoration: underline;
  text-underline-offset: 3px;
}
</style>
