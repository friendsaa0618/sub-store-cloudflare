<template>
  <label
    class="app-checkbox"
    :class="[
      { 'is-checked': checked, 'is-disabled': disabled, 'is-indeterminate': indeterminate },
      textPosition === 'left' ? 'has-text-left' : '',
    ]"
  >
    <input
      class="app-checkbox__input"
      type="checkbox"
      :checked="checked"
      :disabled="disabled"
      @change="onChange"
    />
    <span v-if="textPosition === 'left'" class="app-checkbox__label"><slot /></span>
    <span class="app-checkbox__box" aria-hidden="true">
      <font-awesome-icon v-if="indeterminate && !checked" icon="fa-solid fa-minus" />
      <font-awesome-icon v-else-if="checked" icon="fa-solid fa-check" />
    </span>
    <span v-if="textPosition !== 'left'" class="app-checkbox__label"><slot /></span>
  </label>
</template>

<script setup lang="ts">
import { computed, inject } from "vue";
import { CHECKBOX_GROUP_KEY, type CheckboxGroupContext } from "./context";

const props = withDefaults(
  defineProps<{
    modelValue?: boolean;
    label?: string | number;
    disabled?: boolean;
    indeterminate?: boolean;
    textPosition?: "left" | "right";
  }>(),
  {
    modelValue: false,
    textPosition: "right",
  },
);

const emit = defineEmits<{
  (e: "update:modelValue", value: boolean): void;
}>();

const group = inject<CheckboxGroupContext | null>(CHECKBOX_GROUP_KEY, null);

const checked = computed(() => {
  if (group && props.label !== undefined) {
    return group.value.includes(props.label);
  }
  return Boolean(props.modelValue);
});

const disabled = computed(() => Boolean(props.disabled || group?.isDisabled));

const onChange = (event: Event) => {
  const value = (event.target as HTMLInputElement).checked;
  if (group && props.label !== undefined) {
    group.toggle(props.label);
    return;
  }
  emit("update:modelValue", value);
};
</script>

<style scoped>
.app-checkbox {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  min-width: 0;
  color: var(--second-text-color);
  font-size: var(--text-base);
  cursor: pointer;
  user-select: none;

  &.has-text-left {
    flex-direction: row;
  }

  &.is-disabled {
    color: var(--lowest-text-color);
    cursor: not-allowed;
    opacity: 0.6;
  }
}

.app-checkbox__input {
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

.app-checkbox__box {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  flex: 0 0 18px;
  width: 18px;
  height: 18px;
  box-sizing: border-box;
  border: 1px solid var(--divider-color);
  border-radius: var(--radius-sm);
  background: var(--card-color);
  color: var(--background-color);
  font-size: 11px;
  transition:
    background-color 0.15s ease,
    border-color 0.15s ease;
}

.app-checkbox__label {
  min-width: 0;
  line-height: 1.4;
}

.app-checkbox.is-checked .app-checkbox__box,
.app-checkbox.is-indeterminate .app-checkbox__box {
  border-color: var(--primary-color);
  background: var(--primary-color);
  color: var(--background-color);
}

.app-checkbox__input:focus-visible + .app-checkbox__box,
.app-checkbox__input:focus-visible ~ .app-checkbox__box {
  box-shadow: 0 0 0 2px var(--focus-ring-color);
}
</style>
