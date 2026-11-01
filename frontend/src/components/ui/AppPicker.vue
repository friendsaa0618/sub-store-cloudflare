<template>
  <AppPopup
    :visible="visible"
    :position="isDesktop ? 'center' : 'bottom'"
    :round="!isDesktop"
    pop-class="app-picker"
    @update:visible="emit('update:visible', $event)"
  >
    <div class="app-picker__shell">
      <header class="app-picker__header">
        <button type="button" class="app-picker__action" @click="cancel">
          {{ cancelText }}
        </button>
        <h3 class="app-picker__title">{{ title }}</h3>
        <button type="button" class="app-picker__action is-primary" @click="confirm">
          {{ okText }}
        </button>
      </header>
      <ul class="app-picker__list" role="listbox" :aria-label="title">
        <li v-for="option in columns" :key="option.value">
          <button
            type="button"
            class="app-picker__option"
            :class="{ 'is-selected': option.value === selected }"
            role="option"
            :aria-selected="option.value === selected"
            @click="selected = option.value"
          >
            <span class="app-picker__option-text">{{ option.text }}</span>
            <font-awesome-icon
              v-if="option.value === selected"
              icon="fa-solid fa-check"
              aria-hidden="true"
            />
          </button>
        </li>
      </ul>
    </div>
  </AppPopup>
</template>

<script setup lang="ts">
import { useMediaQuery } from "@vueuse/core";
import { ref, watch } from "vue";
import AppPopup from "./AppPopup.vue";

export type PickerOption = {
  text: string;
  value: string;
};

const props = withDefaults(
  defineProps<{
    modelValue?: string[];
    visible?: boolean;
    columns?: PickerOption[];
    title?: string;
    cancelText?: string;
    okText?: string;
  }>(),
  {
    modelValue: () => [],
    visible: false,
    columns: () => [],
    title: "",
    cancelText: "取消",
    okText: "确定",
  },
);

const emit = defineEmits<{
  (e: "update:modelValue", value: string[]): void;
  (e: "update:visible", value: boolean): void;
  (e: "confirm", payload: { selectedValue: string[] }): void;
}>();

const isDesktop = useMediaQuery("(min-width: 768px)");
const selected = ref<string>(props.modelValue[0] ?? "");

watch(
  () => props.visible,
  (visible) => {
    if (visible) {
      selected.value = props.modelValue[0] ?? props.columns[0]?.value ?? "";
    }
  },
);

const cancel = () => {
  emit("update:visible", false);
};

const confirm = () => {
  const selectedValue = [selected.value];
  emit("update:modelValue", selectedValue);
  emit("confirm", { selectedValue });
  emit("update:visible", false);
};
</script>

<style lang="scss" scoped>
.app-picker__shell {
  display: flex;
  flex-direction: column;
  gap: 12px;
  width: min(420px, 86vw);
  max-width: 100%;
}

.app-picker__header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  padding-bottom: 10px;
  border-bottom: 1px solid var(--divider-color);
}

.app-picker__title {
  flex: 1 1 auto;
  margin: 0;
  color: var(--primary-text-color);
  font-size: var(--text-base);
  font-weight: 600;
  text-align: center;
}

.app-picker__action {
  flex: 0 0 auto;
  padding: 4px 6px;
  border: 0;
  background: transparent;
  color: var(--comment-text-color);
  font-size: var(--text-sm);
  cursor: pointer;

  &.is-primary {
    color: var(--primary-color);
    font-weight: 600;
  }

  &:focus-visible {
    outline: none;
    box-shadow: 0 0 0 2px var(--focus-ring-color);
    border-radius: var(--radius-sm);
  }
}

.app-picker__list {
  display: flex;
  flex-direction: column;
  gap: 2px;
  max-height: min(52vh, 420px);
  margin: 0;
  padding: 0;
  overflow-y: auto;
  overscroll-behavior: contain;
  list-style: none;
}

.app-picker__option {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  width: 100%;
  padding: 10px 12px;
  border: 1px solid transparent;
  border-radius: var(--radius-md);
  background: transparent;
  color: var(--second-text-color);
  font-size: var(--text-base);
  text-align: left;
  cursor: pointer;

  &:hover {
    background: var(--divider-color);
  }

  &.is-selected {
    border-color: var(--primary-color);
    background: color-mix(in srgb, var(--primary-color) 10%, transparent);
    color: var(--primary-color);
    font-weight: 500;
  }

  &:focus-visible {
    outline: none;
    box-shadow: 0 0 0 2px var(--focus-ring-color);
  }
}

.app-picker__option-text {
  min-width: 0;
}
</style>
