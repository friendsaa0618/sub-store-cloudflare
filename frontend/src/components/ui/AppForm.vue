<template>
  <div class="app-form">
    <slot />
  </div>
</template>

<script setup lang="ts">
import { provide, ref } from "vue";
import { FORM_KEY } from "./context";

export type FormValidationResult = {
  valid: boolean;
  message?: string;
  prop?: string;
};

type FormItemInstance = {
  prop?: string;
  validate: () => Promise<FormValidationResult>;
};

const props = defineProps<{
  modelValue?: Record<string, unknown>;
}>();

const items = ref<FormItemInstance[]>([]);

const register = (item: FormItemInstance) => {
  if (!items.value.includes(item)) {
    items.value.push(item);
  }
};

const unregister = (item: FormItemInstance) => {
  items.value = items.value.filter((entry) => entry !== item);
};

const validate = async (prop?: string) => {
  const targets = prop
    ? items.value.filter((item) => item.prop === prop)
    : [...items.value];
  const results = await Promise.all(targets.map((item) => item.validate()));
  const errors = results
    .filter((result) => !result.valid)
    .map((result) => ({ prop: result.prop, message: result.message }));

  return { valid: errors.length === 0, errors };
};

provide(FORM_KEY, {
  get model() {
    return props.modelValue;
  },
  register,
  unregister,
});

defineExpose({ validate });
</script>

<style lang="scss" scoped>
.app-form {
  display: flex;
  flex-direction: column;
  min-width: 0;
}
</style>
