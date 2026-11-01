<template>
  <div class="app-textarea" :class="{ 'is-disabled': disabled, 'is-readonly': readonly }">
    <textarea
      ref="textareaEl"
      class="app-textarea__control"
      :value="modelValue"
      :rows="rows"
      :placeholder="placeholder"
      :disabled="disabled"
      :readonly="readonly"
      :maxlength="maxlength"
      :style="[autosizeStyle, { textAlign: inputAlign }]"
      @input="onInput"
      @change="emit('change', $event)"
      @blur="emit('blur', $event)"
      @focus="emit('focus', $event)"
    />
    <span v-if="maxlength" class="app-textarea__counter">
      {{ String(modelValue ?? "").length }}/{{ maxlength }}
    </span>
  </div>
</template>

<script setup lang="ts">
import { computed, nextTick, onMounted, ref, watch } from "vue";

const props = withDefaults(
  defineProps<{
    modelValue?: string;
    placeholder?: string;
    rows?: number | string;
    disabled?: boolean;
    readonly?: boolean;
    maxlength?: number | string;
    autosize?: boolean | { minHeight?: number; maxHeight?: number };
    inputAlign?: "left" | "right" | "center";
  }>(),
  {
    modelValue: "",
    rows: 2,
    inputAlign: "left",
  },
);

const emit = defineEmits<{
  (e: "update:modelValue", value: string): void;
  (e: "change", event: Event): void;
  (e: "blur", event: FocusEvent): void;
  (e: "focus", event: FocusEvent): void;
}>();

const textareaEl = ref<HTMLTextAreaElement | null>(null);

const autosizeStyle = computed(() => {
  if (!props.autosize) {
    return undefined;
  }

  const options = typeof props.autosize === "object" ? props.autosize : {};
  const minHeight = options.minHeight ?? Number(props.rows) * 21;
  const maxHeight = options.maxHeight ?? 240;

  return {
    minHeight: `${minHeight}px`,
    maxHeight: `${maxHeight}px`,
    overflowY: "auto" as const,
    resize: "none" as const,
  };
});

const resize = () => {
  const el = textareaEl.value;
  if (!el || !props.autosize) {
    return;
  }

  const options = typeof props.autosize === "object" ? props.autosize : {};
  const minHeight = options.minHeight ?? Number(props.rows) * 21;
  const maxHeight = options.maxHeight ?? 240;

  el.style.height = "auto";
  el.style.height = `${Math.min(maxHeight, Math.max(minHeight, el.scrollHeight))}px`;
};

const onInput = (event: Event) => {
  emit("update:modelValue", (event.target as HTMLTextAreaElement).value);
  resize();
};

watch(
  () => props.modelValue,
  () => nextTick(resize),
);

onMounted(() => nextTick(resize));

defineExpose({
  focus: () => textareaEl.value?.focus(),
  resize,
});
</script>

<style lang="scss" scoped>
.app-textarea {
  position: relative;
  display: flex;
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
    line-height: 1.5;
    resize: vertical;

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

  &__counter {
    position: absolute;
    right: 0;
    bottom: -14px;
    color: var(--lowest-text-color);
    font-size: 11px;
    line-height: 1;
  }

  &.is-disabled,
  &.is-readonly {
    cursor: default;
  }
}
</style>
