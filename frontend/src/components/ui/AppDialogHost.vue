<template>
  <AppPopup
    :visible="dialogState.visible"
    position="center"
    :close-on-click-overlay="dialogState.options.closeOnClickOverlay !== false"
    :z-index="1200"
    pop-class="app-dialog"
    @update:visible="onVisibleChange"
  >
    <div class="app-dialog__body">
      <h2 v-if="dialogState.options.title" class="app-dialog__title">
        {{ dialogState.options.title }}
      </h2>
      <p v-if="dialogState.options.content" class="app-dialog__content">
        {{ dialogState.options.content }}
      </p>
      <div class="app-dialog__actions">
        <AppButton
          v-if="!dialogState.options.noCancelBtn"
          plain
          type="default"
          @click="cancelDialog"
        >
          {{ dialogState.options.cancelText || t("specificWord.cancel") }}
        </AppButton>
        <AppButton
          type="primary"
          :loading="dialogState.loading"
          @click="confirmDialog"
        >
          {{ dialogState.options.okText || t("specificWord.confirm") }}
        </AppButton>
      </div>
    </div>
  </AppPopup>
</template>

<script setup lang="ts">
import AppButton from "./AppButton.vue";
import AppPopup from "./AppPopup.vue";
import {
  cancelDialog,
  confirmDialog,
  dialogState,
  dismissDialog,
} from "@/utils/dialog";
import { useI18n } from "vue-i18n";

const { t } = useI18n();

const onVisibleChange = (visible: boolean) => {
  if (!visible && dialogState.visible) {
    dismissDialog();
  }
};
</script>

<style lang="scss" scoped>
.app-dialog__body {
  display: flex;
  flex-direction: column;
  gap: 12px;
  min-width: min(320px, 78vw);
}

.app-dialog__title {
  margin: 0;
  padding-right: 24px;
  color: var(--primary-text-color);
  font-size: var(--text-md);
  font-weight: 700;
  letter-spacing: -0.01em;
}

.app-dialog__content {
  margin: 0;
  color: var(--second-text-color);
  font-size: var(--text-base);
  line-height: 1.6;
  white-space: pre-wrap;
  word-break: break-word;
}

.app-dialog__actions {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
  margin-top: 4px;
}
</style>
