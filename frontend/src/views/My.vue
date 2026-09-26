<template>
  <div class="my-page-wrapper">
    <!-- Profile + backup actions (merged; no redundant backup-only card) -->
    <section class="profile-block">
      <div class="profile-top">
        <span class="runtime-pill">{{ env.runtime || env.backend || "Cloudflare" }}</span>
      </div>
      <div class="info">
        <div class="avatar-wrapper">
          <nut-avatar
            size="56"
            bg-color="var(--card-color)"
            :url="icon"
            class="auto-reverse"
          />
          <div class="name">
            <p class="title">{{ appName }}</p>
            <p class="des">
              <span class="des-line1">{{ t("myPage.profile.desc") }}</span>
              <span class="des-line2">{{ env.storage || "D1" }} · v{{ env.version || "-" }}</span>
            </p>
          </div>
        </div>
        <div class="actions">
          <input ref="fileInput" type="file" accept="application/json,.json" @change="restoreFromFile" />
          <nut-button plain type="primary" size="small" :loading="restoreIsLoading" @click="selectBackupFile">
            <font-awesome-icon v-if="!restoreIsLoading" icon="fa-solid fa-cloud-arrow-up" />
            {{ t("myPage.backup.restore") }}
          </nut-button>
          <nut-button type="primary" size="small" :loading="exportIsLoading" @click="exportBackup">
            <font-awesome-icon v-if="!exportIsLoading" icon="fa-solid fa-cloud-arrow-down" />
            {{ t("myPage.backup.export") }}
          </nut-button>
        </div>
      </div>
      <p class="profile-note">{{ t("myPage.backup.desc") }}</p>
    </section>

    <!-- Templates -->
    <section class="settings-section">
      <header class="section-header">
        <div class="section-header__text">
          <h2 class="section-header__title">{{ t("myPage.templates.title") }}</h2>
        </div>
        <div class="section-header__actions">
          <input ref="templateFileInput" type="file" accept="application/json,.json,.yaml,.yml,text/yaml" @change="importTemplateFromFile" />
          <button
            type="button"
            class="section-action-btn"
            :disabled="templateImporting"
            :title="t('myPage.templates.importFile')"
            @click="selectTemplateFile"
          >
            <font-awesome-icon icon="fa-solid fa-file-import" />
          </button>
          <button
            type="button"
            class="section-action-btn is-primary"
            :disabled="templateImporting"
            :title="t('myPage.templates.create')"
            @click="openTemplateImport"
          >
            <font-awesome-icon icon="fa-solid fa-plus" />
          </button>
        </div>
      </header>

      <div v-if="loadingTemplates" class="template-card-list">
        <div class="template-card skeleton-card skeleton-pulse">
          <div class="skeleton-content">
            <div class="skeleton-line title"></div>
            <div class="skeleton-line sub"></div>
          </div>
        </div>
        <div class="template-card skeleton-card skeleton-pulse">
          <div class="skeleton-content">
            <div class="skeleton-line title"></div>
            <div class="skeleton-line sub"></div>
          </div>
        </div>
      </div>

      <div v-else class="template-card-list">
        <div v-for="template in templates" :key="template.name" class="template-card">
          <div class="template-info">
            <div class="template-header-line">
              <span class="template-title">{{ template.displayName || template.name }}</span>
              <span
                class="template-kind-pill"
                :class="template.readonly ? 'is-builtin' : 'is-custom'"
              >
                {{ template.readonly ? t("myPage.templates.builtIn") : t("myPage.templates.custom") }}
              </span>
            </div>
            <span class="template-target-pill">
              {{ getTargetLabel(template.target || "mihomo") }}
            </span>
          </div>
          <div class="template-actions">
            <nut-button v-if="!template.readonly" plain type="primary" size="mini" @click="openTemplateEdit(template)">
              {{ t("myPage.btn.edit") }}
            </nut-button>
            <nut-button v-if="!template.readonly" plain type="danger" size="mini" @click="deleteCustomTemplate(template.name)">
              {{ t("myPage.btn.delete") }}
            </nut-button>
          </div>
        </div>
      </div>
    </section>

    <!-- Request Settings -->
    <section class="settings-section">
      <header
        class="section-header section-header--clickable"
        @click="requestEditing ? cancelRequestEdit() : startRequestEdit()"
      >
        <div class="section-header__text">
          <h2 class="section-header__title">{{ t("myPage.request.title") }}</h2>
          <p v-if="!requestEditing" class="section-header__desc">{{ requestSummary }}</p>
        </div>
        <div class="section-header__actions" @click.stop>
          <template v-if="requestEditing">
            <nut-button class="cancel-btn" plain type="info" size="mini" :disabled="requestSaving" @click="cancelRequestEdit">
              <font-awesome-icon icon="fa-solid fa-ban" />
              {{ t("myPage.btn.cancel") }}
            </nut-button>
            <nut-button class="save-btn" type="primary" size="mini" :loading="requestSaving" @click="saveRequestSettings">
              <font-awesome-icon v-if="!requestSaving" icon="fa-solid fa-floppy-disk" />
              {{ t("myPage.btn.save") }}
            </nut-button>
          </template>
          <font-awesome-icon
            v-else
            class="section-chevron"
            icon="fa-solid fa-angle-right"
          />
        </div>
      </header>

      <div v-if="requestEditing" class="settings-form-card">
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
              :placeholder="t('myPage.request.defaultTimeout')"
            />
          </div>

          <div class="form-field-group">
            <label class="form-field-label">{{ t("myPage.request.backendRequestConcurrency") }}</label>
            <input
              v-model="requestForm.backendRequestConcurrency"
              class="settings-input"
              type="number"
              :placeholder="t('myPage.request.backendRequestConcurrency')"
            />
          </div>

          <div class="form-field-group">
            <label class="form-field-label">{{ t("myPage.request.backendRequestConcurrencyWaitTime") }}</label>
            <input
              v-model="requestForm.backendRequestConcurrencyWaitTime"
              class="settings-input"
              type="number"
              :placeholder="t('myPage.request.backendRequestConcurrencyWaitTime')"
            />
          </div>

          <div class="form-field-group">
            <label class="form-field-label">{{ t("myPage.request.remoteCacheTtl") }}</label>
            <input
              v-model="requestForm.remoteCacheTtl"
              class="settings-input"
              type="number"
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
            <nut-switch v-model="requestForm.remoteCacheStaleOnError" />
          </div>
        </div>
      </div>
    </section>

    <!-- Template editor: desktop modal · mobile bottom sheet -->
    <nut-popup
      v-model:visible="templateImportVisible"
      :position="templatePopupPosition"
      :pop-class="templatePopupClass"
      :round="!isDesktop"
      closeable
      close-icon-position="top-right"
      :style="templatePopupStyle"
    >
      <div class="template-import-panel">
        <div v-if="!isDesktop" class="preview-sheet-handle" aria-hidden="true" />
        <h2>{{ templateEditingId ? t("myPage.templates.editTitle") : t("myPage.templates.importTitle") }}</h2>
        <nut-input class="input" v-model.trim="templateForm.id" :placeholder="t('myPage.templates.idPlaceholder')" input-align="left" :disabled="Boolean(templateEditingId)" />
        <nut-input class="input" v-model.trim="templateForm.name" :placeholder="t('myPage.templates.namePlaceholder')" input-align="left" />
        <nut-cell class="template-target-trigger" @click="openTemplateTargetPicker">
          <view class="nut-cell__title">{{ t("myPage.templates.target") }}</view>
          <view class="nut-cell__value">
            <nut-input
              :model-value="templateTargetLabel"
              :border="false"
              readonly
              input-align="right"
              right-icon="rect-right"
              @click-right-icon.stop="openTemplateTargetPicker"
            />
          </view>
        </nut-cell>
        <div class="template-content-editor">
          <CmView v-if="templateImportVisible" :is-read-only="false" id="TemplateEditor" />
        </div>
        <nut-button block type="primary" :loading="templateImporting" @click="saveTemplate">
          {{ t("myPage.templates.save") }}
        </nut-button>
      </div>
    </nut-popup>
    <DesktopPicker
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
import { Dialog } from "@nutui/nutui";
import { useMediaQuery } from "@vueuse/core";
import { useI18n } from "vue-i18n";

import { useCloudflareApi } from "@/api/app";
import DesktopPicker from "@/components/DesktopPicker.vue";
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
  Dialog({
    title: t("myPage.templates.deleteTitle"),
    content: t("myPage.templates.deleteContent", { name }),
    popClass: "auto-dialog",
    okText: t("myPage.btn.delete"),
    cancelText: t("myPage.btn.cancel"),
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

  Dialog({
    title: t("myPage.backup.restoreTitle"),
    content: t("myPage.backup.restoreContent"),
    popClass: "auto-dialog",
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

<style lang="scss" scoped>
.my-page-wrapper {
  min-height: 100%;
  padding: 0;
  display: flex;
  flex-direction: column;
  align-items: stretch;
  gap: var(--space-5);
  animation: fadeIn 0.28s cubic-bezier(0.4, 0, 0.2, 1);
}

/* Quiet section headers — same language as home / tools */
.section-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  min-height: 36px;
  padding: 0 2px 0 4px;
  color: var(--comment-text-color);

  &--clickable {
    cursor: pointer;
    -webkit-user-select: none;
    user-select: none;
  }
}

.section-header__title {
  margin: 0;
  font-size: 13px;
  font-weight: 600;
  letter-spacing: -0.01em;
  color: var(--comment-text-color);
  line-height: 1.2;
}

.section-header__desc {
  margin: 4px 0 0;
  font-size: 12px;
  line-height: 1.45;
  color: var(--lowest-text-color, var(--comment-text-color));
}

.section-header__actions {
  display: flex;
  align-items: center;
  gap: 6px;
  flex-shrink: 0;

  input {
    display: none;
  }
}

.section-action-btn {
  width: 28px;
  height: 28px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border: 1px solid transparent;
  border-radius: 50%;
  background: transparent;
  color: var(--second-text-color);
  cursor: pointer;
  transition: transform 160ms cubic-bezier(0.23, 1, 0.32, 1),
    background-color 200ms ease, color 200ms ease, border-color 200ms ease;

  svg {
    width: 13px;
    height: 13px;
    font-size: 13px;
  }

  @media (hover: hover) and (pointer: fine) {
    &:hover:not(:disabled) {
      color: var(--primary-color);
      background: color-mix(in srgb, var(--primary-color) 10%, transparent);
      border-color: color-mix(in srgb, var(--primary-color) 18%, transparent);
    }
  }

  &:active:not(:disabled) {
    transform: scale(0.94);
  }

  &:disabled {
    opacity: 0.45;
    cursor: not-allowed;
  }

  &.is-primary {
    color: var(--primary-color);
  }
}

.section-chevron {
  width: 12px;
  height: 12px;
  font-size: 12px;
  opacity: 0.55;
  color: var(--comment-text-color);
}

.settings-section {
  display: flex;
  flex-direction: column;
  gap: 8px;
  min-width: 0;
}

.profile-block {
  width: 100%;
  box-sizing: border-box;
  padding: 14px 16px 12px;
  border-radius: var(--radius-lg, var(--item-card-radios));
  background: var(--card-color);
  border: 1px solid var(--divider-color);

  .profile-top {
    display: flex;
    align-items: center;
    gap: 8px;
  }

  .runtime-pill {
    margin: 0;
    padding: 3px 10px;
    flex-shrink: 0;
    font-size: 12px;
    font-weight: 500;
    user-select: none;
    border-radius: 9999px;
    background: color-mix(in srgb, var(--primary-color) 8%, transparent);
    border: 1px solid color-mix(in srgb, var(--primary-color) 18%, transparent);
    color: var(--primary-color);
  }

  .info {
    width: 100%;
    margin: 0;
    padding: 12px 0 0;
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: var(--space-3);
  }

  .avatar-wrapper {
    min-width: 0;
    max-width: 64%;
    display: flex;
    align-items: center;

    :deep(.nut-avatar) {
      background: var(--card-color);
      flex-shrink: 0;
    }
  }

  .name {
    min-width: 0;
    margin-left: 12px;
    display: flex;
    flex-direction: column;
  }

  .title {
    margin: 0;
    overflow: hidden;
    color: var(--primary-text-color);
    font-size: 16px;
    font-weight: 600;
    letter-spacing: -0.015em;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .des {
    margin-top: 4px;
    display: flex;
    flex-direction: column;
    color: var(--comment-text-color);
    font-size: 12px;
    font-weight: normal;
    line-height: 1.45;
  }

  .actions {
    margin-left: 8px;
    display: flex;
    flex-direction: column;
    flex-shrink: 0;
    gap: 8px;

    input {
      display: none;
    }

    svg {
      margin-right: 4px;
    }

    .nut-button {
      width: 108px;
      padding: 0 10px;
    }

    .nut-button--plain {
      background: transparent;
    }
  }

  .profile-note {
    margin: 12px 0 0;
    padding-top: 10px;
    border-top: 1px solid var(--divider-color);
    color: var(--comment-text-color);
    font-size: 12px;
    line-height: 1.5;
  }
}

.template-card-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.template-card {
  min-height: 48px;
  padding: 12px 14px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--space-3);
  border-radius: var(--radius-lg, var(--item-card-radios));
  background: var(--card-color);
  border: 1px solid var(--divider-color);
  transition: transform 140ms ease-out, border-color 160ms ease, background-color 160ms ease;

  @media (hover: hover) and (pointer: fine) {
    &:hover {
      border-color: color-mix(in srgb, var(--primary-color) 22%, transparent);
      background: color-mix(in srgb, var(--primary-color) 4%, var(--card-color));
    }
  }

  &:active {
    transform: scale(0.99);
  }

  .template-info {
    min-width: 0;
    flex: 1;
    display: flex;
    flex-direction: column;
    gap: 4px;
  }

  .template-header-line {
    display: flex;
    align-items: center;
    gap: 8px;
    min-width: 0;
  }

  .template-title {
    font-size: 14px;
    font-weight: 600;
    color: var(--primary-text-color);
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .template-kind-pill {
    flex-shrink: 0;
    padding: 1px 8px;
    border-radius: 9999px;
    font-size: 11px;
    font-weight: 500;
    line-height: 1.4;

    &.is-custom {
      color: var(--primary-color);
      background: color-mix(in srgb, var(--primary-color) 10%, transparent);
      border: 1px solid color-mix(in srgb, var(--primary-color) 20%, transparent);
    }

    &.is-builtin {
      color: var(--comment-text-color);
      background: color-mix(in srgb, var(--comment-text-color) 8%, transparent);
      border: 1px solid var(--divider-color);
    }
  }

  .template-target-pill {
    font-size: 12px;
    color: var(--comment-text-color);
  }

  .template-actions {
    display: flex;
    align-items: center;
    gap: 8px;
    flex-shrink: 0;
  }
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
  border-radius: 9999px;
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

  h2 {
    margin: 0 28px 4px 0;
    font-size: 15px;
    font-weight: 600;
    letter-spacing: -0.015em;
    color: var(--primary-text-color);
  }
}

.template-target-trigger {
  box-shadow: none;
  border-radius: var(--item-card-radios);
  background: var(--background-color);
}

.template-content-editor {
  flex: 1;
  min-height: 200px;
  border: 1px solid var(--divider-color);
  border-radius: var(--item-card-radios);
  background: var(--background-color);
  overflow: auto;

  :deep(.cmviewRef) {
    min-height: 200px;
  }

  :deep(.cm-editor) {
    min-height: 200px;
  }
}

.settings-form-card {
  border-radius: var(--radius-lg, var(--item-card-radios));
  background: var(--card-color);
  border: 1px solid var(--divider-color);
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

  &--full {
    grid-column: 1 / -1;
  }
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

  .toggle-card-title {
    font-size: var(--text-sm);
    font-weight: 500;
    color: var(--primary-text-color);
  }
}

@media screen and (max-width: 430px) {
  .profile-block {
    .info {
      align-items: flex-start;
      flex-wrap: wrap;
    }

    .avatar-wrapper {
      max-width: 100%;
    }

    .actions {
      width: 100%;
      flex-direction: row;
      margin-left: 0;
      margin-top: 8px;

      .nut-button {
        flex: 1;
        width: auto;
      }
    }
  }

  .template-card {
    align-items: flex-start;
    flex-direction: column;
  }

  .template-actions {
    width: 100%;
    justify-content: flex-end;
  }
}
</style>
