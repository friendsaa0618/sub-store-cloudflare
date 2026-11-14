<template>
  <div class="inline-tag-editor">
    <div v-if="selectedEditorTags.length" class="inline-tag-editor__chips">
      <button
        v-for="tagName in selectedEditorTags"
        :key="tagName"
        type="button"
        class="inline-tag-chip is-selected"
        :aria-label="`${$t(`editorPage.subConfig.basic.tag.remove`)} ${tagName}`"
        :title="$t(`editorPage.subConfig.basic.tag.remove`)"
        @click="removeEditorTag(tagName)"
      >
        <span>{{ tagName }}</span>
        <font-awesome-icon icon="fa-solid fa-xmark" class="inline-tag-chip__x" />
      </button>
    </div>
    <div class="inline-tag-editor__row">
      <input
        class="app-input-text inline-tag-editor__input"
        v-model.trim="tagDraft"
        data-1p-ignore
        :placeholder="$t(`editorPage.subConfig.basic.tag.placeholder`)"
        maxlength="30"
        autocapitalize="none"
        spellcheck="false"
        @keydown.enter.prevent="commitTagDraft"
      />
      <button
        type="button"
        class="inline-tag-editor__confirm"
        :disabled="!tagDraft"
        @click="commitTagDraft"
      >
        {{ $t(`editorPage.subConfig.basic.tag.confirm`) }}
      </button>
    </div>
    <div
      v-if="suggestedEditorTags.length"
      class="inline-tag-editor__suggestions"
    >
      <span class="inline-tag-editor__suggestions-label">
        {{ $t(`editorPage.subConfig.basic.tag.suggestions`) }}
      </span>
      <button
        v-for="tagName in suggestedEditorTags"
        :key="tagName"
        type="button"
        class="inline-tag-chip"
        @click="addEditorTag(tagName)"
      >
        {{ tagName }}
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from "vue";

import { useSubsStore } from "@/store/subs";
import { normalizeTagList } from "@/utils/tagList";

const props = defineProps<{
  modelValue?: string;
}>();

const emit = defineEmits<{
  (e: "update:modelValue", value: string): void;
}>();

const subsStore = useSubsStore();
/** Draft for the next tag to commit via Enter / 确认. */
const tagDraft = ref("");

const selectedEditorTags = computed(() => normalizeTagList(props.modelValue));
const syncEditorTags = (list: string[]) => {
  emit("update:modelValue", list.join(", "));
};
const addEditorTag = (raw: string) => {
  const parts = normalizeTagList(raw);
  if (!parts.length) return;
  const next = [...selectedEditorTags.value];
  for (const part of parts) {
    if (!next.includes(part)) next.push(part);
  }
  syncEditorTags(next);
  tagDraft.value = "";
};
const removeEditorTag = (name: string) => {
  syncEditorTags(selectedEditorTags.value.filter((item) => item !== name));
};
const commitTagDraft = () => {
  if (!tagDraft.value) return;
  addEditorTag(tagDraft.value);
};
/** Existing tags from all subs/collections for one-tap reuse (not a side panel). */
const suggestedEditorTags = computed(() => {
  const selected = new Set(selectedEditorTags.value);
  const set = new Set<string>();
  for (const item of subsStore.subs || []) {
    normalizeTagList(item.tag).forEach((tag) => {
      if (!selected.has(tag)) set.add(tag);
    });
  }
  for (const item of subsStore.collections || []) {
    normalizeTagList(item.tag).forEach((tag) => {
      if (!selected.has(tag)) set.add(tag);
    });
  }
  return Array.from(set).slice(0, 12);
});
</script>

<style scoped>
.inline-tag-editor {
  width: 100%;
  display: flex;
  flex-direction: column;
  align-items: stretch;
  gap: 8px;
  min-width: 0;
}

.inline-tag-editor__chips,
.inline-tag-editor__suggestions {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: flex-start;
  gap: 6px;
  width: 100%;
}

.inline-tag-editor__suggestions-label {
  color: var(--comment-text-color);
  font-size: 12px;
}

.inline-tag-editor__row {
  display: flex;
  flex-direction: row;
  align-items: center;
  justify-content: flex-start;
  gap: 8px;
  width: 100%;
  min-width: 0;
}

.inline-tag-editor__input {
  flex: 1 1 auto;
  min-width: 0;
  height: 36px;
  padding: 0 10px;
  text-align: left;
  background: var(--background-color);
  border: 1px solid var(--divider-color);
  outline: none;
  color: var(--primary-text-color);
  font-size: 14px;
  border-radius: var(--radius-md);
  transition: border-color 160ms ease, box-shadow 160ms ease;

  &:focus,
  &:focus-visible {
    outline: none;
    border-color: var(--primary-color);
    box-shadow: 0 0 0 2px var(--focus-ring-color);
  }

  &::placeholder {
    color: var(--lowest-text-color);
  }
}

.inline-tag-editor__confirm {
  flex: 0 0 auto;
  height: 36px;
  padding: 0 14px;
  border: 1px solid var(--divider-color);
  border-radius: var(--radius-md);
  background: var(--card-color, var(--background-color));
  color: var(--primary-color);
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
  transition: transform 140ms ease-out, background-color 160ms ease, opacity 160ms ease;

  &:disabled {
    opacity: 0.4;
    cursor: not-allowed;
    color: var(--second-text-color);
  }

  &:not(:disabled):active {
    transform: scale(0.97);
  }

  @media (hover: hover) and (pointer: fine) {
    &:not(:disabled):hover {
      background: color-mix(in srgb, var(--primary-color) 10%, transparent);
      border-color: color-mix(in srgb, var(--primary-color) 30%, transparent);
    }
  }
}

.inline-tag-chip {
  display: inline-flex;
  flex-direction: row;
  align-items: center;
  gap: 5px;
  max-width: 100%;
  height: 26px;
  padding: 0 10px;
  border: 1px solid var(--divider-color);
  border-radius: var(--radius-full);
  background: var(--background-color);
  color: var(--second-text-color);
  font-size: 12px;
  font-weight: 500;
  cursor: pointer;
  white-space: nowrap;
  transition: transform 140ms ease-out, color 160ms ease, border-color 160ms ease, background-color 160ms ease;

  & span {
    overflow: hidden;
    text-overflow: ellipsis;
  }

  &.is-selected {
    color: var(--primary-color);
    border-color: color-mix(in srgb, var(--primary-color) 40%, transparent);
    background: color-mix(in srgb, var(--primary-color) 8%, transparent);
  }

  @media (hover: hover) and (pointer: fine) {
    &:hover {
      color: var(--primary-color);
      border-color: color-mix(in srgb, var(--primary-color) 35%, transparent);
    }
  }

  &:active {
    transform: scale(0.97);
  }
}

.inline-tag-chip__x {
  width: 10px;
  height: 10px;
  font-size: 10px;
  opacity: 0.7;
}
</style>
