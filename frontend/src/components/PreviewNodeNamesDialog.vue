<template>
  <AppPopup
    :visible="true"
    position="center"
    closeable
    pop-class="preview-node-names-dialog"
    @update:visible="emit('close')"
  >
    <div class="preview-node-names-content">
      <h2 class="preview-node-names-title">{{ title }}</h2>
      <p class="preview-node-names-desc">
        {{ t('comparePage.nodeNames.descriptionBefore') }}
        {{ t('comparePage.nodeNames.aiLink') }}
      </p>
      <textarea
        class="preview-node-names-textarea"
        :value="nodeNamesText"
        readonly
      />
      <div class="preview-node-names-footer">
        <AppButton
          size="small"
          plain
          type="primary"
          class="preview-node-names-footer-button"
          @click="copyNodeNames"
        >
          {{ t('comparePage.nodeNames.copyAll') }}
        </AppButton>
        <AppButton
          size="small"
          type="primary"
          class="preview-node-names-footer-button"
          @click="copyPrompt"
        >
          {{ t('comparePage.nodeNames.copyPrompt') }}
        </AppButton>
      </div>
    </div>
  </AppPopup>
</template>

<script lang="ts" setup>
import { notify } from '@/utils/notify';
import { useClipboard } from '@vueuse/core';
import { computed } from 'vue';
import useV3Clipboard from 'vue-clipboard3';
import { useI18n } from 'vue-i18n';
import {
  formatPreviewNodeInfoPrompt,
  formatPreviewNodeNames,
  PreviewNodeInfo,
  PreviewNodeNameSide,
} from '@/utils/previewNodeNames';

const props = defineProps<{
  side: PreviewNodeNameSide;
  nodeInfos: PreviewNodeInfo[];
}>();

const emit = defineEmits(['close']);

const { t } = useI18n();
const { copy, isSupported } = useClipboard();
const { toClipboard: copyFallback } = useV3Clipboard();

const sideLabel = computed(() => {
  return props.side === 'after'
    ? t('comparePage.remain.afterIndicator')
    : t('comparePage.remain.beforeIndicator');
});

const title = computed(() => {
  return t('comparePage.nodeNames.title', { side: sideLabel.value });
});

const nodeNamesText = computed(() => {
  return formatPreviewNodeNames(props.nodeInfos);
});

const promptText = computed(() => {
  return formatPreviewNodeInfoPrompt(props.nodeInfos);
});

const copyText = async (text: string, successText: string) => {
  try {
    if (isSupported) {
      await copy(text);
    } else {
      await copyFallback(text);
    }
    notify({ type: "success", title: successText });
  } catch (e) {
    notify({
      type: 'danger',
      title: t('comparePage.nodeNames.copyFailed', { e: e?.message ?? e }),
    });
  }
};

const copyNodeNames = async () => {
  await copyText(nodeNamesText.value, t('comparePage.nodeNames.copyAllSucceed'));
};

const copyPrompt = async () => {
  await copyText(promptText.value, t('comparePage.nodeNames.copyPromptSucceed'));
};
</script>

<style scoped>
.preview-node-names-content {
  display: flex;
  flex-direction: column;
  gap: 12px;
  width: min(72vw, 520px);
  max-width: 100%;
  color: var(--second-text-color);
}

.preview-node-names-desc {
  margin: 0;
  color: var(--comment-text-color);
  font-size: 13px;
  line-height: 1.6;
  text-align: left;

  & a {
    color: var(--primary-color);
    text-decoration: underline;
  }
}

.preview-node-names-textarea {
  width: 100%;
  height: 220px;
  padding: 10px 12px;
  resize: none;
  border: 1px solid var(--divider-color);
  border-radius: var(--radius-sm);
  outline: none;
  color: var(--primary-text-color);
  background: var(--card-color);
  font-family: inherit;
  font-size: 12px;
  line-height: 1.5;
  white-space: pre;
  overflow: auto;

  &:focus,
  &:focus-visible {
    border-color: var(--primary-color);
    box-shadow: 0 0 0 2px var(--focus-ring-color);
  }
}

.preview-node-names-title {
  margin: 0;
  padding-right: 28px;
  color: var(--primary-text-color);
  font-size: var(--text-md);
  font-weight: 700;
  letter-spacing: -0.01em;
}

.preview-node-names-footer {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
}

.preview-node-names-footer-button {
  min-width: 96px;
}

@media screen and (max-width: 520px) {
  .preview-node-names-content {
    width: 76vw;
  }

  .preview-node-names-textarea {
    height: 180px;
  }
}
</style>
