<template>
  <div
    class="app-input"
    :class="[
      `app-input--${inputAlign}`,
      { 'is-disabled': disabled, 'is-readonly': readonly },
    ]"
    @click="emit('click', $event)"
  >
    <span v-if="$slots.left" class="app-input__adornment">
      <slot name="left" />
    </span>
    <input
      :id="id"
      ref="inputEl"
      class="app-input__control"
      :value="modelValue"
      :type="type"
      :name="name"
      :placeholder="placeholder"
      :disabled="disabled"
      :readonly="readonly"
      :maxlength="maxlength"
      :min="min"
      :max="max"
      :step="step"
      :autocomplete="autocomplete"
      :spellcheck="spellcheck"
      :inputmode="inputmode"
      @input="onInput"
      @blur="emit('blur', $event)"
      @focus="emit('focus', $event)"
      @keydown="emit('keydown', $event)"
      @keyup="emit('keyup', $event)"
    />
    <span v-if="$slots.right" class="app-input__adornment">
      <slot name="right" />
    </span>
  </div>
</template>

<script setup lang="ts">
import { ref } from "vue";

const props = withDefaults(
  defineProps<{
    modelValue?: string | number;
    type?: string;
    placeholder?: string;
    disabled?: boolean;
    readonly?: boolean;
    maxlength?: number | string;
    min?: number | string;
    max?: number | string;
    step?: number | string;
    name?: string;
    id?: string;
    autocomplete?: string;
    spellcheck?: boolean | "true" | "false";
    inputmode?: "text" | "decimal" | "numeric" | "tel" | "email" | "url" | "search" | "none";
    inputAlign?: "left" | "right" | "center";
    modelModifiers?: Record<string, boolean>;
  }>(),
  {
    modelValue: "",
    type: "text",
    inputAlign: "left",
    autocomplete: "off",
  },
);

const emit = defineEmits<{
  (e: "update:modelValue", value: string): void;
  (e: "blur", event: FocusEvent): void;
  (e: "focus", event: FocusEvent): void;
  (e: "click", event: MouseEvent): void;
  (e: "keydown", event: KeyboardEvent): void;
  (e: "keyup", event: KeyboardEvent): void;
}>();

const inputEl = ref<HTMLInputElement | null>(null);

const onInput = (event: Event) => {
  let value = (event.target as HTMLInputElement).value;
  if (props.modelModifiers?.trim) {
    value = value.trim();
  }
  emit("update:modelValue", value);
};

defineExpose({
  focus: () => inputEl.value?.focus(),
  blur: () => inputEl.value?.blur(),
});
</script>

<style lang="scss" scoped>
.app-input {
  display: flex;
  align-items: center;
  gap: 6px;
  width: 100%;
  min-width: 0;
  color: var(--second-text-color);

  &__control {
    flex: 1 1 auto;
    width: 100%;
    min-width: 0;
    margin: 0;
    padding: 0;
    border: 0;
    background: transparent;
    color: inherit;
    font-family: inherit;
    font-size: var(--text-base);
    line-height: 20px;
    text-align: left;

    &:focus {
      outline: none;
    }

    &::placeholder {
      color: var(--comment-text-color);
      opacity: 1;
    }

    &:disabled {
      color: var(--lowest-text-color);
      cursor: not-allowed;
      -webkit-text-fill-color: var(--lowest-text-color);
    }
  }

  &--right &__control {
    text-align: right;
  }

  &--center &__control {
    text-align: center;
  }

  &__adornment {
    display: inline-flex;
    align-items: center;
    flex: 0 0 auto;
    color: var(--comment-text-color);
  }

  &.is-disabled,
  &.is-readonly {
    cursor: default;
  }
}
</style>
