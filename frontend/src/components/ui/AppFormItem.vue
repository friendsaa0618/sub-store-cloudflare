<template>
  <div
    class="app-form-item"
    :class="{ 'is-error': error, 'has-no-label': !hasLabel }"
  >
    <label v-if="hasLabel" class="app-form-item__label">
      <span v-if="required" class="app-form-item__required" aria-hidden="true">*</span>
      <slot name="label">{{ label }}</slot>
    </label>
    <div class="app-form-item__body">
      <slot />
    </div>
    <p v-if="error" class="app-form-item__error" role="alert">{{ error }}</p>
  </div>
</template>

<script setup lang="ts">
import { computed, inject, onBeforeUnmount, onMounted, ref, useSlots } from "vue";
import { FORM_KEY } from "./context";

export type FormRule = {
  required?: boolean;
  message?: string;
  validator?: (value: unknown) => boolean | Promise<boolean>;
};

type FormContext = {
  model?: Record<string, unknown>;
  register: (item: unknown) => void;
  unregister: (item: unknown) => void;
};

const props = withDefaults(
  defineProps<{
    label?: string;
    prop?: string;
    required?: boolean;
    rules?: FormRule[];
  }>(),
  {
    rules: () => [],
  },
);

const slots = useSlots();
const form = inject<FormContext | null>(FORM_KEY, null);
const error = ref("");
const hasLabel = computed(() => Boolean(slots.label || props.label));

const isEmpty = (value: unknown) => {
  if (value === undefined || value === null) {
    return true;
  }
  if (typeof value === "string") {
    return value.trim() === "";
  }
  if (Array.isArray(value)) {
    return value.length === 0;
  }
  return false;
};

const validate = async () => {
  const value = props.prop ? form?.model?.[props.prop] : undefined;
  const rules = props.rules || [];
  error.value = "";

  if (props.required && rules.length === 0 && isEmpty(value)) {
    error.value = props.label || "";
    return { valid: false, message: error.value, prop: props.prop };
  }

  for (const rule of rules) {
    if (rule.required && isEmpty(value)) {
      error.value = rule.message || "";
      return { valid: false, message: error.value, prop: props.prop };
    }
    if (typeof rule.validator === "function") {
      const passed = await rule.validator(value);
      if (!passed) {
        error.value = rule.message || "";
        return { valid: false, message: error.value, prop: props.prop };
      }
    }
  }

  return { valid: true, prop: props.prop };
};

const instance = { prop: props.prop, validate };

onMounted(() => form?.register(instance));
onBeforeUnmount(() => form?.unregister(instance));

defineExpose({ validate, clearValidate: () => (error.value = "") });
</script>

<style scoped>
.app-form-item {
  display: grid;
  grid-template-columns: auto minmax(0, 1fr);
  align-items: center;
  gap: 0 8px;
  box-sizing: border-box;
  min-height: 0;
  margin-bottom: 8px;
  padding: 10px 12px;
  border: 1px solid var(--divider-color);
  border-radius: var(--radius-lg);
  background: var(--card-color);
  color: var(--primary-text-color);
  transition:
    border-color 0.2s ease,
    box-shadow 0.2s ease;

  &:focus-within {
    border-color: var(--primary-color);
    box-shadow: 0 0 0 2px var(--focus-ring-color);
  }

  &.is-error {
    border-color: var(--danger-color);
  }

  &.has-no-label {
    grid-template-columns: minmax(0, 1fr);

    & .app-form-item__error {
      grid-column: 1;
    }
  }
}

.app-form-item__label {
  display: inline-flex;
  align-items: center;
  gap: 2px;
  width: auto;
  min-width: 4.5em;
  max-width: 7.5em;
  margin: 0;
  padding: 0;
  color: var(--comment-text-color);
  font-size: 13px;
  line-height: 1.35;
}

.app-form-item__required {
  color: var(--danger-color);
}

.app-form-item__body {
  min-width: 0;
  font-size: var(--text-base);
}

.app-form-item__error {
  grid-column: 2;
  margin: 4px 0 0;
  color: var(--danger-color);
  font-size: 12px;
  line-height: 1.4;
}
</style>
