<template>
  <div class="app-checkbox-group" role="group">
    <slot />
  </div>
</template>

<script setup lang="ts">
import { provide } from "vue";
import { CHECKBOX_GROUP_KEY, type CheckboxGroupContext } from "./context";

const props = withDefaults(
  defineProps<{
    modelValue?: (string | number)[];
    disabled?: boolean;
  }>(),
  {
    modelValue: () => [],
  },
);

const emit = defineEmits<{
  (e: "update:modelValue", value: (string | number)[]): void;
}>();

const context: CheckboxGroupContext = {
  get value() {
    return props.modelValue || [];
  },
  get isDisabled() {
    return Boolean(props.disabled);
  },
  toggle: (item: string | number) => {
    const current = props.modelValue || [];
    const next = current.includes(item)
      ? current.filter((entry) => entry !== item)
      : [...current, item];
    emit("update:modelValue", next);
  },
};

provide(CHECKBOX_GROUP_KEY, context);
</script>

<style scoped>
.app-checkbox-group {
  display: flex;
  flex-wrap: wrap;
  gap: 8px 16px;
  min-width: 0;
}
</style>
