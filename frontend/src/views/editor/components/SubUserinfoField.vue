<template>
  <AppFormItem prop="subUserinfo">
    <template v-slot:label>
      <EditorFieldLabel @tip="showTips">
        <span>{{ $t(`editorPage.subConfig.basic.subUserinfo.label`) }}</span>
      </EditorFieldLabel>
    </template>
    <AppInput
      v-model.trim="form.subUserinfo"
      :placeholder="
        $t(`editorPage.subConfig.basic.subUserinfo.placeholder`)
      "
    />
  </AppFormItem>
</template>

<script setup lang="ts">
import { inject } from "vue";
import { useI18n } from "vue-i18n";

import EditorFieldLabel from "@/views/editor/components/EditorFieldLabel.vue";
import { showDialog } from "@/utils/dialog";

const { t } = useI18n();
const form = inject<Record<string, any>>("form")!;

const showTips = () => {
  showDialog({
    title: t("editorPage.subConfig.basic.subUserinfo.tips.title"),
    content: t("editorPage.subConfig.basic.subUserinfo.tips.content"),
    okText: 'OK',
    noCancelBtn: true,
  });
};
</script>
