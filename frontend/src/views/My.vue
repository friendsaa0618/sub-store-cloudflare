<template>
  <div class="my-page-wrapper page-stack">
    <!-- Profile + backup actions (merged; no redundant backup-only card) -->
    <section class="profile-block surface">
      <div class="info">
        <div class="avatar-wrapper">
          <AppAvatar
            :size="56"
            bg-color="var(--profile-avatar-bg, var(--card-color))"
            :url="icon"
            class="auto-reverse"
          />
          <div class="name">
            <p class="title">{{ appName }}</p>
            <p class="des">
              <span class="des-line1">{{ t("myPage.profile.desc") }}</span>
              <span class="des-line2">
                {{ env.storage || "D1" }}{{ t("specificWord.metaSeparator") }}v{{ env.version || "-" }}
                <span class="pill is-muted">{{ env.runtime || env.backend || "Cloudflare" }}</span>
              </span>
            </p>
          </div>
        </div>
        <div class="actions">
          <input ref="fileInput" type="file" accept="application/json,.json" @change="restoreFromFile" />
          <AppButton plain type="primary" size="small" :loading="restoreIsLoading" @click="selectBackupFile">
            <font-awesome-icon v-if="!restoreIsLoading" icon="fa-solid fa-cloud-arrow-up" />
            {{ t("myPage.backup.restore") }}
          </AppButton>
          <AppButton type="primary" size="small" :loading="exportIsLoading" @click="exportBackup">
            <font-awesome-icon v-if="!exportIsLoading" icon="fa-solid fa-cloud-arrow-down" />
            {{ t("myPage.backup.export") }}
          </AppButton>
        </div>
      </div>
      <p class="profile-note">{{ t("myPage.backup.desc") }}</p>
    </section>

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
              <span class="list-row__title">{{ template.displayName || template.name }}</span>
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

    <!-- Request Settings -->
    <section class="section">
      <header
        class="section-head section-head--clickable"
        role="button"
        tabindex="0"
        :aria-expanded="requestEditing"
        @click="toggleRequestEdit"
        @keydown.enter.prevent="toggleRequestEdit"
        @keydown.space.prevent="toggleRequestEdit"
      >
        <div class="section-head__text">
          <h2 class="section-head__title">{{ t("myPage.request.title") }}</h2>
          <p v-if="!requestEditing" class="section-head__desc">{{ requestSummary }}</p>
        </div>
        <div class="section-head__actions" @click.stop>
          <template v-if="requestEditing">
            <AppButton class="cancel-btn" plain type="info" size="mini" :disabled="requestSaving" @click="cancelRequestEdit">
              <font-awesome-icon icon="fa-solid fa-ban" />
              {{ t("myPage.btn.cancel") }}
            </AppButton>
            <AppButton class="save-btn" type="primary" size="mini" :loading="requestSaving" @click="saveRequestSettings">
              <font-awesome-icon v-if="!requestSaving" icon="fa-solid fa-floppy-disk" />
              {{ t("myPage.btn.save") }}
            </AppButton>
          </template>
          <font-awesome-icon
            v-else
            class="section-chevron"
            icon="fa-solid fa-angle-right"
          />
        </div>
      </header>

      <div v-if="requestEditing" class="surface settings-form-card">
        <div class="settings-form-grid">
          <div class="form-field-group">
            <label class="form-field-label">{{ t("myPage.request.defaultUserAgent") }}</label>
            <input
              v-model="requestForm.defaultUserAgent"
              class="settings-input"
              type="text"
              :placeholder="t('myPage.request.defaultUserAgent')"
            />
          </div>

          <div class="form-field-group">
            <label class="form-field-label">{{ t("myPage.request.defaultFlowUserAgent") }}</label>
            <input
              v-model="requestForm.defaultFlowUserAgent"
              class="settings-input"
              type="text"
              :placeholder="t('myPage.request.defaultFlowUserAgent')"
            />
          </div>

          <div class="form-field-group">
            <label class="form-field-label">{{ t("myPage.request.defaultTimeout") }}</label>
            <input
              v-model="requestForm.defaultTimeout"
              class="settings-input"
              type="number"
              min="0"
              :placeholder="t('myPage.request.defaultTimeout')"
            />
          </div>

          <div class="form-field-group">
            <label class="form-field-label">{{ t("myPage.request.backendRequestConcurrency") }}</label>
            <input
              v-model="requestForm.backendRequestConcurrency"
              class="settings-input"
              type="number"
              min="0"
              :placeholder="t('myPage.request.backendRequestConcurrency')"
            />
          </div>

          <div class="form-field-group">
            <label class="form-field-label">{{ t("myPage.request.backendRequestConcurrencyWaitTime") }}</label>
            <input
              v-model="requestForm.backendRequestConcurrencyWaitTime"
              class="settings-input"
              type="number"
              min="0"
              :placeholder="t('myPage.request.backendRequestConcurrencyWaitTime')"
            />
          </div>

          <div class="form-field-group">
            <label class="form-field-label">{{ t("myPage.request.remoteCacheTtl") }}</label>
            <input
              v-model="requestForm.remoteCacheTtl"
              class="settings-input"
              type="number"
              min="0"
              :placeholder="t('myPage.request.remoteCacheTtl')"
            />
          </div>

          <div class="form-field-group form-field-group--full">
            <label class="form-field-label">{{ t("myPage.request.nodeInfoApiUrl") }}</label>
            <input
              v-model="requestForm.nodeInfoApiUrl"
              class="settings-input"
              type="text"
              :placeholder="t('myPage.request.nodeInfoApiUrl')"
            />
          </div>

          <div class="toggle-card-row form-field-group--full">
            <span class="toggle-card-title">{{ t('myPage.request.remoteCacheStaleOnError') }}</span>
            <AppSwitch v-model="requestForm.remoteCacheStaleOnError" />
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
  </div>
</template>

<script lang="ts" setup>
import { computed, defineAsyncComponent, onMounted, reactive, ref } from "vue";
import { showDialog } from "@/utils/dialog";
import { useMediaQuery } from "@vueuse/core";
import { useI18n } from "vue-i18n";

import { useCloudflareApi } from "@/api/app";
import { useSettingsApi } from "@/api/settings";
import { useBackend } from "@/hooks/useBackend";
import { useAppNotifyStore } from "@/store/appNotify";
import { useCodeStore } from "@/store/codeStore";
import { useSettingsStore } from "@/store/settings";
import { TEMPLATE_TARGET_OPTIONS, getTargetLabel } from "@/constants/subscriptionTargets";

const CmView = defineAsyncComponent(() => import("@/views/editCode/cmView.vue"));

const settingsStore = useSettingsStore();
const settingsApi = useSettingsApi();
const cloudflareApi = useCloudflareApi();
const cmStore = useCodeStore();
const { showNotify } = useAppNotifyStore();
const { t } = useI18n();
const { icon, env } = useBackend();
const TEMPLATE_EDITOR_ID = "TemplateEditor";
const isDesktop = useMediaQuery("(min-width: 768px)");

const fileInput = ref<HTMLInputElement | null>(null);
const templateFileInput = ref<HTMLInputElement | null>(null);
const restoreIsLoading = ref(false);
const exportIsLoading = ref(false);
const requestEditing = ref(false);
const requestSaving = ref(false);
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
    maxHeight: "88vh",
    borderRadius: "16px 16px 0 0",
    overflow: "hidden",
  };
});

const requestForm = reactive({
  defaultUserAgent: "",
  defaultFlowUserAgent: "",
  defaultTimeout: "",
  backendRequestConcurrency: "",
  backendRequestConcurrencyWaitTime: "",
  remoteCacheTtl: "",
  remoteCacheStaleOnError: true,
  nodeInfoApiUrl: "",
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
const appName = computed(() => {
  return env.value?.app
    || env.value?.meta?.cloudflare?.env?.SUB_STORE_BACKEND_CUSTOM_NAME
    || "Sub-Store Cloudflare";
});
const requestSummary = computed(() => {
  return t("myPage.request.summary", {
    concurrency: settingsStore.backendRequestConcurrency || "3",
    timeout: settingsStore.defaultTimeout || "30000",
  });
});

const syncRequestForm = () => {
  requestForm.defaultUserAgent = settingsStore.defaultUserAgent || "";
  requestForm.defaultFlowUserAgent = settingsStore.defaultFlowUserAgent || "";
  requestForm.defaultTimeout = settingsStore.defaultTimeout || "";
  requestForm.backendRequestConcurrency = settingsStore.backendRequestConcurrency || "";
  requestForm.backendRequestConcurrencyWaitTime = settingsStore.backendRequestConcurrencyWaitTime || "";
  requestForm.remoteCacheTtl = settingsStore.remoteCacheTtl || "300";
  requestForm.remoteCacheStaleOnError = settingsStore.remoteCacheStaleOnError !== false;
  requestForm.nodeInfoApiUrl = settingsStore.nodeInfoApiUrl || "https://ipwho.is/{ip}";
};

const startRequestEdit = () => {
  syncRequestForm();
  requestEditing.value = true;
};

const cancelRequestEdit = () => {
  syncRequestForm();
  requestEditing.value = false;
};

const toggleRequestEdit = () => {
  if (requestEditing.value) cancelRequestEdit();
  else startRequestEdit();
};

const saveRequestSettings = async () => {
  requestSaving.value = true;
  try {
    const saved = await settingsStore.changeSettings({ ...requestForm });
    requestEditing.value = !saved;
  } finally {
    requestSaving.value = false;
  }
};

const selectBackupFile = () => {
  fileInput.value?.click();
};

const exportBackup = async () => {
  exportIsLoading.value = true;
  try {
    const response = await settingsApi.downloadBackup();
    const objectUrl = URL.createObjectURL(response.data);
    const anchor = document.createElement("a");
    anchor.href = objectUrl;
    anchor.download = `sub-store-cloudflare-backup-${new Date().toISOString().slice(0, 10)}.json`;
    anchor.click();
    URL.revokeObjectURL(objectUrl);
  } catch (error) {
    showNotify({ type: "danger", title: t("myPage.notify.backup.failedWithError", { e: errorMessage(error) }) });
  } finally {
    exportIsLoading.value = false;
  }
};

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
    if (res?.data?.status !== "success") throw new Error("import failed");
    await fetchTemplates();
    templateImportVisible.value = false;
    templateEditingId.value = "";
    showNotify({ type: "success", title: t("myPage.templates.saveSucceed") });
  } catch (error) {
    showNotify({ type: "danger", title: t("myPage.templates.saveFailed", { e: errorMessage(error) }) });
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

const restoreFromFile = async (event: Event) => {
  const target = event.target as HTMLInputElement;
  const file = target.files?.[0];
  target.value = "";
  if (!file) return;

  showDialog({
    title: t("myPage.backup.restoreTitle"),
    content: t("myPage.backup.restoreContent"),
    okText: t("myPage.backup.restore"),
    cancelText: t("myPage.btn.cancel"),
    closeOnClickOverlay: true,
    onOk: async () => {
      restoreIsLoading.value = true;
      try {
        const content = await file.text();
        const res = await settingsApi.restoreSettings({ content });
        if (res?.data?.status !== "success") throw new Error("restore failed");
        await settingsStore.fetchSettings();
        showNotify({ type: "success", title: t("myPage.notify.restore.succeed") });
      } catch (error) {
        showNotify({ type: "danger", title: t("myPage.notify.restore.failedWithError", { e: errorMessage(error) }) });
      } finally {
        restoreIsLoading.value = false;
      }
    },
  });
};

const errorMessage = (error: unknown) => error instanceof Error ? error.message : String(error);

onMounted(fetchTemplates);
</script>

<style scoped>
.my-page-wrapper {
  min-height: 100%;
  padding: 0;
  animation: fadeIn 0.28s cubic-bezier(0.4, 0, 0.2, 1);
}

/* Collapsible caption row (request settings) */
.section-head--clickable {
  cursor: pointer;
  border-radius: var(--radius-md);
  -webkit-user-select: none;
  user-select: none;

  @media (hover: hover) and (pointer: fine) {
    &:hover .section-head__title {
      color: var(--primary-text-color);
    }
  }

  &:focus {
    outline: none;
  }

  &:focus-visible {
    box-shadow: 0 0 0 2px var(--focus-ring-color);
  }
}

.section-chevron {
  width: 12px;
  height: 12px;
  font-size: 12px;
  opacity: 0.55;
  color: var(--comment-text-color);
}

.profile-block {
  width: 100%;
  box-sizing: border-box;
  padding: var(--card-gutter);

  & .info {
    width: 100%;
    margin: 0;
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: var(--space-3);
  }

  & .avatar-wrapper {
    min-width: 0;
    max-width: 64%;
    display: flex;
    align-items: center;

    &:deep(.app-avatar) {
      background: var(--card-color);
      flex-shrink: 0;
    }
  }

  & .name {
    min-width: 0;
    margin-left: 12px;
    display: flex;
    flex-direction: column;
  }

  & .title {
    margin: 0;
    overflow: hidden;
    color: var(--primary-text-color);
    font-size: 16px;
    font-weight: 600;
    letter-spacing: -0.015em;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  & .des {
    margin-top: 4px;
    display: flex;
    flex-direction: column;
    gap: 4px;
    color: var(--comment-text-color);
    font-size: 12px;
    font-weight: normal;
    line-height: 1.45;
  }

  & .des-line2 {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 6px;
  }

  & .actions {
    margin-left: 8px;
    display: flex;
    flex-direction: row;
    flex-wrap: wrap;
    flex-shrink: 0;
    gap: 8px;

    & input {
      display: none;
    }

    & svg {
      margin-right: 4px;
    }

    & .app-button {
      width: 108px;
      padding: 0 10px;
    }
  }

  & .profile-note {
    margin: 12px 0 0;
    padding-top: 10px;
    border-top: 1px solid var(--divider-color);
    color: var(--comment-text-color);
    font-size: 12px;
    line-height: 1.5;
  }
}

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

.settings-form-card {
  overflow: hidden;
}

.settings-form-grid {
  padding: var(--space-4);
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: var(--space-3);

  @media (max-width: 600px) {
    grid-template-columns: 1fr;
  }
}

.form-field-group {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.form-field-group--full {
  grid-column: 1 / -1;
}

.form-field-label {
  font-size: var(--text-xs);
  font-weight: 600;
  color: var(--second-text-color);
  line-height: 1.3;
  margin: 0;
}

.settings-input {
  box-sizing: border-box;
  width: 100%;
  height: 40px;
  min-height: 40px;
  padding: 0 var(--space-3);
  border-radius: var(--radius-md);
  border: 1px solid var(--divider-color);
  background: var(--background-color);
  color: var(--primary-text-color);
  font-family: var(--font-sans);
  font-size: var(--text-sm);
  transition: border-color 0.2s ease, box-shadow 0.2s ease;

  &:focus {
    border-color: var(--primary-color);
    box-shadow: 0 0 0 2px var(--focus-ring-color);
    outline: none;
  }
}

.toggle-card-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: var(--space-3);
  border-radius: var(--radius-md);
  background: var(--background-color);
  border: 1px solid var(--divider-color);

  & .toggle-card-title {
    font-size: var(--text-sm);
    font-weight: 500;
    color: var(--primary-text-color);
  }
}

@media screen and (max-width: 767px) {
  .profile-block {
    & .info {
      align-items: flex-start;
      flex-wrap: wrap;
    }

    & .avatar-wrapper {
      max-width: 100%;
    }

    & .actions {
      width: 100%;
      flex-direction: row;
      margin-left: 0;
      margin-top: 8px;

      & .app-button {
        flex: 1;
        width: auto;
      }
    }
  }
}

@media screen and (max-width: 430px) {
  .profile-block .actions .app-button {
    flex: 1;
  }
}
</style>
