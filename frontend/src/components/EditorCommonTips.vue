<template>
  <button
    type="button"
    class="editor-common-tips-button"
    :aria-label="t('editorPage.commonTips.open')"
    :title="t('editorPage.commonTips.open')"
    @click.stop="openTips"
  >
    <font-awesome-icon icon="fa-solid fa-circle-question" />
  </button>
</template>

<script setup lang="ts">
import { showDialog } from "@/utils/dialog";
import { useI18n } from "vue-i18n";

const { t } = useI18n();

const openTips = () => {
  showDialog({
    title: t("editorPage.commonTips.title"),
    content: t("editorPage.commonTips.content"),
    okText: "OK",
    noCancelBtn: true,
  });
};
</script>

<style lang="scss" scoped>
.editor-common-tips-button {
  flex: 0 0 28px;
  width: 28px;
  height: 28px;
  margin: 0 0 0 auto;
  padding: 0;
  border: 0;
  border-radius: 50%;
  background: transparent;
  color: var(--second-text-color);
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  justify-content: center;

  &:hover {
    color: var(--primary-color);
  }

  &:focus {
    outline: none;
  }

  &:focus-visible {
    color: var(--primary-color);
    box-shadow: 0 0 0 2px var(--focus-ring-color);
  }

  svg {
    width: 14px;
    height: 14px;
  }
}
</style>
