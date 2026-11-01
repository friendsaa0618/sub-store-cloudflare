<template>
  <button
    type="button"
    class="editor-grouping-tips-button"
    :aria-label="t('editorPage.groupingTips.open')"
    :title="t('editorPage.groupingTips.open')"
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
    title: t("editorPage.groupingTips.title"),
    content: t("editorPage.groupingTips.content"),
    okText: "OK",
    noCancelBtn: true,
  });
};
</script>
