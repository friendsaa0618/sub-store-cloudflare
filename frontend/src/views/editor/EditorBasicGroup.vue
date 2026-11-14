<template>
  <EditorGroup
    :title="$t(`editorPage.subConfig.groups.basic`)"
    :show-title="showGroupTitles"
  >
    <!-- name -->
    <AppFormItem
      required
      :label="$t(`editorPage.subConfig.basic.name.label`)"
      prop="name"
      :rules="nameRules"
    >
      <input
        class="app-input-text"
        data-1p-ignore
        @blur="validateField('name')"
        v-model.trim="form.name"
        :placeholder="$t(`editorPage.subConfig.basic.name.placeholder`)"
        :disabled="isEditMode"
        maxlength="64"
        autocapitalize="none"
        spellcheck="false"
      />
    </AppFormItem>
    <!-- displayName -->
    <AppFormItem
      :label="$t(`editorPage.subConfig.basic.displayName.label`)"
      prop="displayName"
    >
      <input
        class="app-input-text"
        data-1p-ignore
        v-model.trim="form.displayName"
        :placeholder="
          $t(`editorPage.subConfig.basic.displayName.placeholder`)
        "
      />
    </AppFormItem>
    <!-- remark -->
    <AppFormItem
      :label="$t(`editorPage.subConfig.basic.remark.label`)"
      prop="remark"
    >
      <AppTextarea
        v-model="form.remark"
        :placeholder="
          $t(`editorPage.subConfig.basic.remark.placeholder`)
        "
        rows="1"
        :autosize="{ maxHeight: 140 }"
        maxlength="100"
      />
    </AppFormItem>
    <!-- tag: inline input + confirm (no side drawer) -->
    <AppFormItem
      :label="$t(`editorPage.subConfig.basic.tag.label`)"
      prop="tag"
      class="tag-form-item"
    >
      <TagEditor v-model="form.tag" />
    </AppFormItem>
  </EditorGroup>
</template>

<script setup lang="ts">
import { computed, inject } from "vue";
import { useI18n } from "vue-i18n";

import EditorGroup from "@/views/editor/components/EditorGroup.vue";
import TagEditor from "@/views/editor/components/TagEditor.vue";
import { useSubsStore } from "@/store/subs";

const props = defineProps<{
  showGroupTitles: boolean;
  isEditMode: boolean;
  configName: string;
  validateField: (prop: string) => void;
}>();

const { t } = useI18n();
const subsStore = useSubsStore();
const form = inject<Record<string, any>>("form")!;

/* Format is checked by a pattern rule so the message can name the real problem;
   this one only looks for an existing record with the same id. */
const nameValidator = (val: string): Promise<boolean> => {
  return new Promise((resolve) => {
    const nameList = [
      ...subsStore.subs.map((item) => item.name),
      ...subsStore.collections.map((item) => item.name),
    ];
    return resolve(!(nameList.includes(val) && props.configName !== val));
  });
};

const nameRules = computed(() => [
  {
    required: true,
    message: t(`editorPage.subConfig.basic.name.isEmpty`),
  },
  {
    pattern: /^[a-z0-9_-]{1,64}$/,
    message: t(`editorPage.subConfig.basic.name.isInvalid`),
  },
  {
    validator: nameValidator,
    message: t(`editorPage.subConfig.basic.name.isDuplicate`),
  },
]);
</script>

<style scoped>
.tag-form-item {
  align-items: flex-start !important;

  &:deep(.app-form-item__label) {
    padding-top: 6px;
  }
}
</style>
