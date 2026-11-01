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

<style lang="scss" scoped>
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

  &__input {
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

  &__dot {
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

  &__label {
    min-width: 0;
  }

  &.is-checked &__dot {
    border-color: var(--primary-color);
  }

  &.is-checked &__dot::after {
    content: "";
    position: absolute;
    inset: 4px;
    border-radius: 50%;
    background: var(--primary-color);
  }

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

  &__input:focus-visible + &__dot,
  &__input:focus-visible ~ &__dot {
    box-shadow: 0 0 0 2px var(--focus-ring-color);
  }

  &__input:focus-visible ~ &__label {
    text-decoration: underline;
    text-underline-offset: 3px;
  }

  &.is-disabled {
    color: var(--lowest-text-color);
    cursor: not-allowed;
    opacity: 0.6;
  }
}
</style>
