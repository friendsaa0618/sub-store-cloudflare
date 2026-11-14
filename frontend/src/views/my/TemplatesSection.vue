<template>
    <!-- Templates -->
    <section class="section">
      <header class="section-head">
        <div class="section-head__text">
          <h2 class="section-head__title">{{ t("myPage.templates.title") }}</h2>
        </div>
        <div class="section-head__actions">
          <input ref="templateFileInput" type="file" accept="application/json,.json,.yaml,.yml,text/yaml" @change="importTemplateFromFile" />
          <button
            type="button"
            class="icon-action"
            :disabled="templateImporting"
            :aria-label="t('myPage.templates.importFile')"
            :title="t('myPage.templates.importFile')"
            @click="selectTemplateFile"
          >
            <font-awesome-icon icon="fa-solid fa-file-import" />
          </button>
          <button
            type="button"
            class="icon-action is-primary"
            :disabled="templateImporting"
            :aria-label="t('myPage.templates.create')"
            :title="t('myPage.templates.create')"
            @click="openTemplateImport"
          >
            <font-awesome-icon icon="fa-solid fa-plus" />
          </button>
        </div>
      </header>

      <div v-if="loadingTemplates" class="surface list-rows">
        <div class="list-row skeleton-card skeleton-pulse">
          <div class="skeleton-content">
            <div class="skeleton-line title"></div>
            <div class="skeleton-line sub"></div>
          </div>
        </div>
        <div class="list-row skeleton-card skeleton-pulse">
          <div class="skeleton-content">
            <div class="skeleton-line title"></div>
            <div class="skeleton-line sub"></div>
          </div>
        </div>
      </div>

      <div v-else class="surface list-rows">
        <div v-for="template in templates" :key="template.name" class="list-row">
          <div class="list-row__main">
            <div class="list-row__title-line">
              <span class="list-row__title" :title="template.displayName || template.name">{{ template.displayName || template.name }}</span>
              <span class="pill" :class="template.readonly ? 'is-muted' : 'is-accent'">
                {{ template.readonly ? t("myPage.templates.builtIn") : t("myPage.templates.custom") }}
              </span>
            </div>
            <span class="list-row__meta">{{ getTargetLabel(template.target || "mihomo") }}</span>
          </div>
          <div v-if="!template.readonly" class="list-row__actions">
            <AppButton plain type="primary" size="mini" @click="openTemplateEdit(template)">
              {{ t("myPage.btn.edit") }}
            </AppButton>
            <AppButton plain type="danger" size="mini" @click="deleteCustomTemplate(template.name)">
              {{ t("myPage.btn.delete") }}
            </AppButton>
          </div>
        </div>
      </div>
    </section>

    <!-- Template editor: desktop modal · mobile bottom sheet -->
    <AppPopup
      v-model:visible="templateImportVisible"
      :position="templatePopupPosition"
      :pop-class="templatePopupClass"
      :round="!isDesktop"
      closeable
      :panel-style="templatePopupStyle"
    >
      <div class="template-import-panel">
        <div v-if="!isDesktop" class="preview-sheet-handle" aria-hidden="true" />
        <h2>{{ templateEditingId ? t("myPage.templates.editTitle") : t("myPage.templates.importTitle") }}</h2>
        <AppInput class="input" v-model.trim="templateForm.id" :placeholder="t('myPage.templates.idPlaceholder')" input-align="left" :disabled="Boolean(templateEditingId)" />
        <AppInput class="input" v-model.trim="templateForm.name" :placeholder="t('myPage.templates.namePlaceholder')" input-align="left" />
        <button type="button" class="template-target-trigger" @click="openTemplateTargetPicker">
          <span class="template-target-trigger__label">{{ t("myPage.templates.target") }}</span>
          <span class="template-target-trigger__value">
            {{ templateTargetLabel }}
            <font-awesome-icon icon="fa-solid fa-chevron-right" aria-hidden="true" />
          </span>
        </button>
        <div class="template-content-editor">
          <CmView v-if="templateImportVisible" :is-read-only="false" id="TemplateEditor" />
        </div>
        <AppButton block type="primary" :loading="templateImporting" @click="saveTemplate">
          {{ t("myPage.templates.save") }}
        </AppButton>
      </div>
    </AppPopup>
    <AppPicker
      v-model="selectedTemplateTargetValue"
      v-model:visible="templateTargetPickerVisible"
      :columns="templateTargetColumns"
      :title="t('myPage.templates.targetPickerTitle')"
      :cancel-text="t('myPage.btn.cancel')"
      :ok-text="t('specificWord.confirm')"
      @confirm="handleTemplateTargetConfirm"
    />
</template>

<script lang="ts" setup>
import { computed, defineAsyncComponent, onMounted, reactive, ref } from "vue";
import { useI18n } from "vue-i18n";

import { useCloudflareApi } from "@/api/app";
import { TEMPLATE_TARGET_OPTIONS, getTargetLabel } from "@/constants/subscriptionTargets";
import { useDesktopLayout } from "@/hooks/useDesktopLayout";
import { useAppNotifyStore } from "@/store/appNotify";
import { useCodeStore } from "@/store/codeStore";
import { apiErrorMessage, isHttpError } from "@/utils/apiError";
import { showDialog } from "@/utils/dialog";
import { isOversizedImport } from "@/utils/importLimits";

const CmView = defineAsyncComponent(() => import("@/views/editCode/cmView.vue"));

const cloudflareApi = useCloudflareApi();
const cmStore = useCodeStore();
const { showNotify } = useAppNotifyStore();
const { t } = useI18n();
const TEMPLATE_EDITOR_ID = "TemplateEditor";
const isDesktop = useDesktopLayout();

const templateFileInput = ref<HTMLInputElement | null>(null);
const templateImporting = ref(false);
const templateImportVisible = ref(false);
const templateEditingId = ref("");
const templateTargetPickerVisible = ref(false);
const templates = ref<any[]>([]);
const loadingTemplates = ref(true);

/** Desktop Modal · Mobile Bottom Sheet — same pattern as copy-link panel */
const templatePopupPosition = computed(() => (isDesktop.value ? "center" : "bottom"));
const templatePopupClass = computed(() =>
  isDesktop.value ? "template-modal-popup" : "template-sheet-popup",
);
const templatePopupStyle = computed(() => {
  if (isDesktop.value) {
    return {
      width: "min(560px, 94vw)",
      maxHeight: "min(86vh, 800px)",
      borderRadius: "16px",
      overflow: "hidden",
    };
  }
  return {
    width: "100%",
    maxHeight: "88dvh",
    borderRadius: "16px 16px 0 0",
    overflow: "hidden",
  };
});

const templateForm = reactive({
  id: "",
  name: "",
  target: "mihomo",
});
const selectedTemplateTargetValue = ref<string[]>([]);
const templateTargetColumns = computed(() => {
  return TEMPLATE_TARGET_OPTIONS.map((option) => ({
    text: option.label,
    value: option.value,
  }));
});
const templateTargetLabel = computed(() => {
  return getTargetLabel(templateForm.target);
});

const fetchTemplates = async () => {
  loadingTemplates.value = true;
  try {
    const res = await cloudflareApi.getTemplates();
    if (res?.data?.status === "success" && Array.isArray(res.data.data)) {
      templates.value = res.data.data;
    }
  } catch {
    templates.value = [];
  } finally {
    loadingTemplates.value = false;
  }
};

const selectTemplateFile = () => {
  templateFileInput.value?.click();
};

const openTemplateImport = () => {
  templateEditingId.value = "";
  templateForm.id = "";
  templateForm.name = "";
  templateForm.target = "mihomo";
  cmStore.setEditCode(TEMPLATE_EDITOR_ID, "");
  templateImportVisible.value = true;
};

const openTemplateEdit = (template: any) => {
  templateEditingId.value = template.name;
  templateForm.id = template.name;
  templateForm.name = template.displayName || template.name;
  templateForm.target = template.target || "mihomo";
  cmStore.setEditCode(TEMPLATE_EDITOR_ID, JSON.stringify(template.config || {}, null, 2));
  templateImportVisible.value = true;
};

const importTemplateFromFile = async (event: Event) => {
  const target = event.target as HTMLInputElement;
  const file = target.files?.[0];
  target.value = "";
  if (!file) return;
  if (isOversizedImport(file)) {
    showNotify({ type: "danger", title: t("specificWord.fileTooLarge") });
    return;
  }

  templateEditingId.value = "";
  templateForm.id = file.name.replace(/\.(json|ya?ml)$/i, "").toLowerCase().replace(/[^a-z0-9_-]+/g, "-").replace(/^-+|-+$/g, "");
  templateForm.name = file.name.replace(/\.(json|ya?ml)$/i, "");
  templateForm.target = "mihomo";
  cmStore.setEditCode(TEMPLATE_EDITOR_ID, await file.text());
  templateImportVisible.value = true;
};

const openTemplateTargetPicker = () => {
  selectedTemplateTargetValue.value = [templateForm.target || "mihomo"];
  templateTargetPickerVisible.value = true;
};

const handleTemplateTargetConfirm = ({ selectedValue }) => {
  templateForm.target = selectedValue?.[0] || "mihomo";
  selectedTemplateTargetValue.value = [templateForm.target];
  templateTargetPickerVisible.value = false;
};

const saveTemplate = async () => {
  const content = String(cmStore.EditCode[TEMPLATE_EDITOR_ID] || "");
  if (!templateForm.id || !content.trim()) {
    showNotify({ type: "danger", title: t("myPage.templates.validationRequired") });
    return;
  }

  templateImporting.value = true;
  try {
    const payload = {
      id: templateForm.id,
      name: templateForm.name || templateForm.id,
      target: templateForm.target,
      content,
    };
    const res = templateEditingId.value
      ? await cloudflareApi.updateTemplate(templateEditingId.value, payload)
      : await cloudflareApi.createTemplate(payload);
    if (res?.data?.status !== "success") {
      throw new Error(res?.data?.error?.message || "import failed");
    }
    await fetchTemplates();
    templateImportVisible.value = false;
    templateEditingId.value = "";
    showNotify({ type: "success", title: t("myPage.templates.saveSucceed") });
  } catch (error) {
    /* HTTP failures are reported by the interceptor; this covers the
       "200 but failed" case that never reaches it. */
    if (!isHttpError(error)) {
      showNotify({ type: "danger", title: t("myPage.templates.saveFailed", { e: apiErrorMessage(error) }) });
    }
  } finally {
    templateImporting.value = false;
  }
};

const deleteCustomTemplate = (name: string) => {
  showDialog({
    title: t("myPage.templates.deleteTitle"),
    content: t("myPage.templates.deleteContent", { name }),
    okText: t("myPage.btn.delete"),
    cancelText: t("myPage.btn.cancel"),
    okType: "danger",
    closeOnClickOverlay: true,
    onOk: async () => {
      const res = await cloudflareApi.deleteTemplate(name);
      if (res?.data?.status === "success") {
        await fetchTemplates();
        showNotify({ type: "success", title: t("myPage.templates.deleteSucceed") });
      }
    },
  });
};

onMounted(fetchTemplates);
defineExpose({ refresh: fetchTemplates });
</script>

<style scoped>
.list-row__title-line {
  display: flex;
  align-items: center;
  gap: var(--space-2);
  min-width: 0;
}

.skeleton-card {
  min-height: 48px;
  pointer-events: none;
}

.skeleton-content {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.skeleton-line {
  height: 12px;
  border-radius: var(--radius-sm);
  background: color-mix(in srgb, var(--divider-color) 50%, transparent);

  &.title {
    width: 50%;
    height: 14px;
  }

  &.sub {
    width: 35%;
  }
}

.preview-sheet-handle {
  width: 36px;
  height: 4px;
  margin: 0 auto 4px;
  border-radius: var(--radius-full);
  background: color-mix(in srgb, var(--comment-text-color) 28%, transparent);
  flex-shrink: 0;
}

.template-import-panel {
  box-sizing: border-box;
  max-height: inherit;
  min-height: 0;
  padding: 16px 16px calc(16px + env(safe-area-inset-bottom));
  display: flex;
  flex-direction: column;
  gap: 10px;
  color: var(--second-text-color);
  overflow: auto;

  & h2 {
    margin: 0 28px 4px 0;
    font-size: 15px;
    font-weight: 600;
    letter-spacing: -0.015em;
    color: var(--primary-text-color);
  }
}

.template-import-panel :deep(.app-input) {
  padding: 8px 10px;
  border: 1px solid var(--divider-color);
  border-radius: var(--radius-md);
  background: var(--background-color);
}

.template-target-trigger {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  width: 100%;
  padding: 10px 12px;
  border: 1px solid var(--divider-color);
  border-radius: var(--item-card-radios);
  background: var(--background-color);
  color: var(--second-text-color);
  font-size: var(--text-base);
  text-align: left;
  cursor: pointer;

  &:focus-visible {
    outline: none;
    box-shadow: 0 0 0 2px var(--focus-ring-color);
  }
}

.template-target-trigger__label {
  color: var(--comment-text-color);
  font-size: 13px;
}

.template-target-trigger__value {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  min-width: 0;
  color: var(--second-text-color);
  font-size: 12px;
}

.template-content-editor {
  flex: 1;
  min-height: 200px;
  border: 1px solid var(--divider-color);
  border-radius: var(--item-card-radios);
  background: var(--background-color);
  overflow: auto;

  &:deep(.cmviewRef) {
    min-height: 200px;
  }

  &:deep(.cm-editor) {
    min-height: 200px;
  }
}
</style>
