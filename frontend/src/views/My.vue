<template>
  <div class="my-page-wrapper settings-page page-stack">
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
            <p class="title" :title="appName">{{ appName }}</p>
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
    <TemplatesSection ref="templatesSection" />
    <AppearanceSection />
    <RequestSettingsSection />
  </div>
</template>

<script lang="ts" setup>
import { computed, ref } from "vue";
import { useI18n } from "vue-i18n";

import { useSettingsApi } from "@/api/settings";
import { useBackend } from "@/hooks/useBackend";
import { useAppNotifyStore } from "@/store/appNotify";
import { useSettingsStore } from "@/store/settings";
import { useSubsStore } from "@/store/subs";
import { apiErrorMessage, isHttpError } from "@/utils/apiError";
import { showDialog } from "@/utils/dialog";
import { isOversizedImport } from "@/utils/importLimits";
import AppearanceSection from "./my/AppearanceSection.vue";
import RequestSettingsSection from "./my/RequestSettingsSection.vue";
import TemplatesSection from "./my/TemplatesSection.vue";

const settingsStore = useSettingsStore();
const subsStore = useSubsStore();
const settingsApi = useSettingsApi();
const { showNotify } = useAppNotifyStore();
const { t } = useI18n();
const { icon, env } = useBackend();

const fileInput = ref<HTMLInputElement | null>(null);
const restoreIsLoading = ref(false);
const exportIsLoading = ref(false);
const templatesSection = ref<{ refresh: () => Promise<void> } | null>(null);

const appName = computed(() => {
  return env.value?.app
    || env.value?.meta?.cloudflare?.env?.SUB_STORE_BACKEND_CUSTOM_NAME
    || "Sub-Store Cloudflare";
});

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
    if (!isHttpError(error)) {
      showNotify({ type: "danger", title: t("myPage.notify.backup.failedWithError", { e: errorMessage(error) }) });
    }
  } finally {
    exportIsLoading.value = false;
  }
};

const restoreFromFile = async (event: Event) => {
  const target = event.target as HTMLInputElement;
  const file = target.files?.[0];
  target.value = "";
  if (!file) return;
  if (isOversizedImport(file)) {
    showNotify({ type: "danger", title: t("specificWord.fileTooLarge") });
    return;
  }

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
        if (res?.data?.status !== "success") {
          throw new Error(res?.data?.error?.message || "restore failed");
        }
        /* A backup carries sources, collections and templates too, so refresh
           everything instead of leaving the lists on their pre-restore data. */
        await Promise.all([
          settingsStore.fetchSettings(),
          subsStore.fetchSubsData(),
          templatesSection.value?.refresh(),
        ]);
        showNotify({ type: "success", title: t("myPage.notify.restore.succeed") });
      } catch (error) {
        if (!isHttpError(error)) {
          showNotify({ type: "danger", title: t("myPage.notify.restore.failedWithError", { e: errorMessage(error) }) });
        }
      } finally {
        restoreIsLoading.value = false;
      }
    },
  });
};

const errorMessage = apiErrorMessage;
</script>

<style scoped>
.my-page-wrapper {
  min-height: 100%;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: var(--space-5);
}

.profile-block {
  width: 100%;
  box-sizing: border-box;
  padding: var(--space-4) var(--space-5);
  box-shadow: var(--card-shadow);

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
    margin-left: 14px;
    display: flex;
    flex-direction: column;
  }

  & .title {
    margin: 0;
    overflow: hidden;
    color: var(--primary-text-color);
    font-size: var(--text-lg);
    font-weight: 650;
    letter-spacing: -0.02em;
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
    margin: 14px 0 0;
    padding-top: 12px;
    border-top: 1px solid var(--divider-color);
    color: var(--comment-text-color);
    font-size: 12px;
    line-height: 1.5;
  }
}

@media screen and (max-width: 767px) {
  .profile-block {
    padding: var(--space-4);

    & .title {
      white-space: normal;
      overflow-wrap: anywhere;
    }

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
