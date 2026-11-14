<template>
  <div v-if="isDis">
  <div class="page-wrapper" @click="handleEditGlobalClick">
    <!-- Single scroll page: display + content + actions (no section tabs, no top icon) -->
    <div class="form-block-wrapper">
      <AppForm class="form" :model-value="form" ref="ruleForm">
        <div class="editor-paper">
          <EditorBasicGroup
            :show-group-titles="showEditorGroupTitles"
            :is-edit-mode="isEditMode"
            :config-name="configName"
            :validate-field="customerBlurValidate"
          />
          <EditorSourceGroup
            v-if="editType === 'subs'"
            :show-group-titles="showEditorGroupTitles"
            :validate-field="customerBlurValidate"
            @fullscreen="isDis = false"
          />
          <EditorCollectionGroup
            v-else-if="editType === 'collections'"
            :show-group-titles="showEditorGroupTitles"
            :is-init="isInit"
          />
        </div>
      </AppForm>
    </div>

    <!-- 节点操作 — same page, continuous scroll -->
    <div class="editor-tab-content editor-actions-content">
      <CommonBlock
        v-if="appearanceSetting.editorCommonDisplayMode !== 'hidden'"
        :default-folded="appearanceSetting.editorCommonDisplayMode === 'collapsed'"
      />
      <ActionBlock
        ref="actionBlockRef"
        :checked="actionsChecked"
        :list="actionsList"
        @updateCustomNameModeFlag="updateCustomNameModeFlag"
        @addAction="addAction"
        @deleteAction="deleteAction"
        @toggleAction="toggleAction"
      />
    </div>
  </div>

  <EditorFooterBar :busy="isSubmitting" @compare="compare" @submit="submit" />
</div>
<div v-else style="width: 100%;max-height: 95dvh;">
    <button class="cimg-button" @click="isDis = true">
      <font-awesome-icon icon="fa-solid fa-minimize" />
      {{ $t(`editorPage.subConfig.basic.url.tips.fullScreenEditCancel`) }}
    </button>
    <CodeEditor />
  </div>
  <CompareTable
    v-if="compareTableIsVisible"
    :name="configName"
    :compareData="compareData"
    :showRefresh="true"
    @closeCompare="closeCompare"
    @refresh="refreshCompare"
  />
</template>

<script lang="ts" setup>
import { storeToRefs } from "pinia";
import { computed, defineAsyncComponent, provide, reactive } from "vue";
import { useRoute } from "vue-router";

import { useUnsavedChanges } from "@/hooks/useUnsavedChanges";
import { useSettingsStore } from "@/store/settings";
import ActionBlock from "@/views/editor/ActionBlock.vue";
import CommonBlock from "@/views/editor/CommonBlock.vue";
import CodeEditor from "@/views/editor/components/CodeEditor.vue";
import EditorFooterBar from "@/views/editor/components/EditorFooterBar.vue";
import EditorBasicGroup from "@/views/editor/EditorBasicGroup.vue";
import EditorCollectionGroup from "@/views/editor/EditorCollectionGroup.vue";
import EditorSourceGroup from "@/views/editor/EditorSourceGroup.vue";
import { useEditorActions } from "@/views/editor/composables/useEditorActions";
import { useEditorCompare } from "@/views/editor/composables/useEditorCompare";
import { useEditorFormModel } from "@/views/editor/composables/useEditorFormModel";
import { useEditorFullscreen } from "@/views/editor/composables/useEditorFullscreen";
import { useEditorSubmit } from "@/views/editor/composables/useEditorSubmit";
import { useEditorValidation } from "@/views/editor/composables/useEditorValidation";
import {
  LOCAL_CONTENT_PREVIEW_KEY,
  useLocalContentPreview,
} from "@/views/editor/composables/useLocalContentPreview";

/* Compare is a full-screen overlay; keep its code out of the editor chunk. */
const CompareTable = defineAsyncComponent(() => import("@/views/CompareTable.vue"));

const route = useRoute();
const editType = route.params.editType as string;
const configName = route.params.id as string;

const settingsStore = useSettingsStore();
const { appearanceSetting } = storeToRefs(settingsStore);

const padding = "env(safe-area-inset-bottom)";

const form = reactive<any>({
  name: "",
  displayName: "",
  form: "",
  remark: "",
  ignoreFailedRemoteSub: false,
  passThroughUA: false,
  icon: "",
  // Public SVG avatars stay colored (no desaturate filter)
  isIconColor: true,
  process: [],
  /* Saved back as-is: a disabled record must not come back to life on edit. */
  enabled: true,
});
provide("form", form);

const {
  actionsChecked,
  actionsList,
  actionBlockRef,
  addAction,
  deleteAction,
  toggleAction,
  loadActions,
  updateCustomNameModeFlag,
  handleEditGlobalClick,
  toProcess,
} = useEditorActions(form);

const {
  ruleForm,
  validateForm,
  validateField: customerBlurValidate,
  focusValidationErrorTab,
} = useEditorValidation();

const { isInit, isEditMode } = useEditorFormModel({
  form,
  editType,
  configName,
  loadActions,
  onLoaded: () => markClean(),
});

const { markClean } = useUnsavedChanges({
  sources: () => [form, actionsChecked, actionsList],
  isReady: isInit,
});

const localPreview = useLocalContentPreview({ form, toProcess });
provide(LOCAL_CONTENT_PREVIEW_KEY, localPreview);

const {
  compareTableIsVisible,
  compareData,
  compare,
  refreshCompare,
  closeCompare,
} = useEditorCompare({
  form,
  editType,
  actionsChecked,
  toProcess,
  validateForm,
});

const { isSubmitting, submit } = useEditorSubmit({
  form,
  editType,
  configName,
  isEditMode,
  actionsChecked,
  toProcess,
  validateForm,
  focusValidationErrorTab,
  localPreview,
  markClean,
});

const { isDis } = useEditorFullscreen();

/** 编辑页分组: always shows the section titles, edit-only hides them while
 *  creating, disabled never shows them. */
const showEditorGroupTitles = computed(() => {
  const mode = appearanceSetting.value.editorGroupingMode || "always";
  if (mode === "disabled") return false;
  if (mode === "edit-only") return isEditMode.value;
  return true;
});
</script>

<style scoped>
.page-wrapper {
  /* Width follows .page-body (home max-width + padding) — no extra max-width */
  padding: 0 0 calc(v-bind("padding") + 108px) 0;
  width: 100%;
  max-width: none;
  margin: 0;
  box-sizing: border-box;

  /* One paper for all field groups; a hairline separates the sections */
  &:deep(.editor-paper) {
    background: var(--card-color);
    border: 1px solid var(--divider-color);
    border-radius: var(--radius-lg);
    margin-bottom: var(--space-3);
    overflow: hidden;
  }

  &:deep(.editor-group + .editor-group) {
    border-top: 1px solid var(--divider-color);
  }

  &:deep(.editor-group .app-form-item) {
    align-items: center;
    padding: 12px var(--card-gutter);
    margin-bottom: 0;
    border: 0;
    border-radius: 0;
    background: transparent;
    box-shadow: none;
    grid-template-columns: 96px minmax(0, 1fr);
  }

  /* Label-less rows (the node editor) own the full card width */
  &:deep(.editor-group .app-form-item.has-no-label) {
    grid-template-columns: minmax(0, 1fr);
  }

  &:deep(.editor-group .app-form-item + .app-form-item) {
    border-top: 1px solid var(--divider-color);
  }

  /* Keep the focus ring inside the card */
  &:deep(.editor-group .app-form-item:focus-within) {
    box-shadow: inset 0 0 0 2px var(--focus-ring-color);
  }

  &:deep(.editor-group .app-form-item__label) {
    min-width: 0;
    max-width: none;
    margin-right: var(--space-3);
    padding: 0;
    line-height: 1.35;
    font-size: 13px;
  }

  &:deep(.editor-group .app-form-item__error) {
    grid-column: 2;
  }

  /* Phones: label above the control — no wrapped labels, full-width inputs.
     The 16px gutter stays so these rows line up with the other cards. */
  @media screen and (max-width: 599px) {
    &:deep(.editor-group .app-form-item) {
      grid-template-columns: minmax(0, 1fr);
      gap: 6px 0;
    }

    &:deep(.editor-group .app-form-item__label) {
      margin-right: 0;
    }

    &:deep(.editor-group .app-form-item__error) {
      grid-column: 1;
    }

    &:deep(.editor-group .radio-wrapper) {
      justify-content: flex-start;
    }
  }
}

.form-block-wrapper {
  position: relative;

  &:deep(.app-form-item__label) {
    width: auto;
  }
  &:deep(.picker-trigger__value) {
    margin-left: 8px;
  }
}
</style>
