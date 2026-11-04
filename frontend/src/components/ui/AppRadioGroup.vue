<template>
  <div
    class="app-radio-group"
    :class="direction === 'horizontal' ? 'is-horizontal' : ''"
    role="radiogroup"
  >
    <slot />
  </div>
</template>

<script setup lang="ts">
import { provide, useId } from "vue";
import { RADIO_GROUP_KEY, type RadioGroupContext } from "./context";

const props = withDefaults(
  defineProps<{
    modelValue?: string | number;
    direction?: "horizontal" | "vertical";
    disabled?: boolean;
  }>(),
  {
    direction: "horizontal",
  },
);

const emit = defineEmits<{
  (e: "update:modelValue", value: string | number): void;
}>();

const context: RadioGroupContext = {
  /* Per-instance id: a module counter would restart inside every setup(). */
  name: `app-radio-group-${useId()}`,
  get value() {
    return props.modelValue;
  },
  get isDisabled() {
    return Boolean(props.disabled);
  },
  select: (value: string | number) => {
    emit("update:modelValue", value);
  },
};

provide(RADIO_GROUP_KEY, context);
</script>

<style scoped>
.app-radio-group {
  display: flex;
  flex-wrap: wrap;
  gap: 8px 16px;
  min-width: 0;

  &.is-horizontal {
    flex-direction: row;
    align-items: center;
  }
}
</style>
