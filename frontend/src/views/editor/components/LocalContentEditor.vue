<template>
  <AppFormItem :label="undefined" prop="content">
    <div class="local-content-toolbar">
      <button type="button" class="toolbar-btn" @click="emit('fullscreen')">
        <font-awesome-icon icon="fa-solid fa-maximize" />
        <span>{{ $t(`editorPage.subConfig.basic.url.tips.fullScreenEdit`) }}</span>
      </button>
      <input type="file" ref="fileInput" @change="fileChange" style="display: none">
      <button type="button" class="toolbar-btn" @click="upload">
        <font-awesome-icon icon="fa-solid fa-cloud-arrow-up" />
        <span>{{ $t(`editorPage.subConfig.basic.url.tips.importFromFile`) }}</span>
      </button>
      <button
        type="button"
        class="toolbar-btn"
        :disabled="loading || !hasContent"
        @click="validate()"
      >
        <font-awesome-icon icon="fa-solid fa-check" />
        <span>{{ loading ? $t(`editorPage.subConfig.basic.content.validation.checking`) : $t(`editorPage.subConfig.basic.content.validation.action`) }}</span>
      </button>
      <button
        type="button"
        class="toolbar-btn toolbar-btn--ghost"
        :aria-label="$t(`editorPage.subConfig.basic.url.tips.label`)"
        @click="contentTips"
      >
        <font-awesome-icon icon="fa-solid fa-circle-question" />
      </button>
    </div>
    <div
      v-if="summary"
      class="local-preview-summary"
      :class="`is-${summary.status}`"
    >
      <div class="summary-title">
        <font-awesome-icon :icon="summary.status === 'success' ? 'fa-solid fa-check' : 'fa-solid fa-circle-xmark'" />
        <span>{{ summary.title }}</span>
      </div>
      <div v-if="summary.detail" class="summary-detail">
        {{ summary.detail }}
      </div>
      <div v-if="typeBadges.length > 0" class="summary-types">
        <AppTag v-for="item in typeBadges" :key="item">
          {{ item }}
        </AppTag>
      </div>
    </div>
    <div class="local-content-editor">
      <CodeEditor />
    </div>
  </AppFormItem>
</template>

<script setup lang="ts">
import { computed, inject, ref } from "vue";
import { useI18n } from "vue-i18n";

import CodeEditor from "@/views/editor/components/CodeEditor.vue";
import {
  LOCAL_CONTENT_PREVIEW_KEY,
} from "@/views/editor/composables/useLocalContentPreview";
import { showDialog } from "@/utils/dialog";

const emit = defineEmits<{
  (e: "fullscreen"): void;
}>();

const { t } = useI18n();
const { loading, summary, typeBadges, content, validate, importFile } =
  inject(LOCAL_CONTENT_PREVIEW_KEY)!;

const fileInput = ref<HTMLInputElement | null>(null);
const hasContent = computed(() => Boolean(content.value.trim()));

const upload = () => {
  try {
    fileInput.value?.click();
  } catch (e) {
    console.error(e);
  }
};

const fileChange = (event: Event) => {
  const input = event.target as HTMLInputElement;
  const file = input.files?.[0];
  if (!file) return;
  void importFile(file);
  /* Allow importing the same file again after a failed validation. */
  input.value = "";
};

const contentTips = () => {
  showDialog({
    title: t('editorPage.subConfig.basic.content.tips.title'),
    content: t('editorPage.subConfig.basic.content.tips.content'),
    okText: 'OK',
    noCancelBtn: true,
  });
};
</script>

<style scoped>
.local-content-toolbar {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 6px;
  margin-bottom: 8px;
}

.local-content-editor {
  max-height: 60vh;
  overflow: auto;
}

.toolbar-btn {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  height: 30px;
  padding: 0 10px;
  border: 1px solid var(--divider-color);
  border-radius: var(--radius-full);
  background: var(--background-color);
  color: var(--second-text-color);
  font-size: 12px;
  font-weight: 500;
  cursor: pointer;
  transition: transform 140ms ease-out, background-color 160ms ease, border-color 160ms ease, color 160ms ease;

  & svg {
    width: 12px;
    height: 12px;
  }

  @media (hover: hover) and (pointer: fine) {
    &:hover:not(:disabled) {
      color: var(--primary-color);
      border-color: color-mix(in srgb, var(--primary-color) 28%, transparent);
      background: color-mix(in srgb, var(--primary-color) 8%, transparent);
    }
  }

  &:active:not(:disabled) {
    transform: scale(0.97);
  }

  &:disabled {
    opacity: 0.45;
    cursor: not-allowed;
  }
}

.toolbar-btn--ghost {
  width: 30px;
  padding: 0;
  justify-content: center;
  border-color: transparent;
  background: transparent;
}

.local-preview-summary {
  margin: 10px 0 12px;
  padding: 10px 12px;
  border-radius: var(--item-card-radios);
  border: 1px solid var(--divider-color);
  background: var(--card-color);
  color: var(--second-text-color);
  font-size: 12px;

  &.is-success {
    border-color: color-mix(in srgb, var(--primary-color) 35%, var(--divider-color));

    & .summary-title {
      color: var(--primary-color);
    }
  }

  &.is-danger {
    border-color: color-mix(in srgb, var(--danger-color) 35%, var(--divider-color));

    & .summary-title {
      color: var(--danger-color);
    }
  }

  & .summary-title {
    display: flex;
    align-items: center;
    gap: 6px;
    font-weight: 600;
  }

  & .summary-detail {
    margin-top: 6px;
    overflow-wrap: anywhere;
  }

  & .summary-types {
    display: flex;
    flex-wrap: wrap;
    gap: 6px;
    margin-top: 8px;
  }
}
</style>
