<template>
    <!-- Request Settings -->
    <section class="section" :class="{ 'section--collapsed': !requestEditing }">
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
            <label class="form-field-label" for="request-user-agent">{{ t("myPage.request.defaultUserAgent") }}</label>
            <input
              id="request-user-agent"
              v-model="requestForm.defaultUserAgent"
              class="settings-input"
              type="text"
              :placeholder="t('myPage.request.defaultUserAgent')"
            />
          </div>

          <div class="form-field-group">
            <label class="form-field-label" for="request-flow-user-agent">{{ t("myPage.request.defaultFlowUserAgent") }}</label>
            <input
              id="request-flow-user-agent"
              v-model="requestForm.defaultFlowUserAgent"
              class="settings-input"
              type="text"
              :placeholder="t('myPage.request.defaultFlowUserAgent')"
            />
          </div>

          <div class="form-field-group">
            <label class="form-field-label" for="request-timeout">{{ t("myPage.request.defaultTimeout") }}</label>
            <input
              id="request-timeout"
              v-model="requestForm.defaultTimeout"
              class="settings-input"
              type="number"
              min="0"
              :placeholder="t('myPage.request.defaultTimeout')"
            />
          </div>

          <div class="form-field-group">
            <label class="form-field-label" for="request-concurrency">{{ t("myPage.request.backendRequestConcurrency") }}</label>
            <input
              id="request-concurrency"
              v-model="requestForm.backendRequestConcurrency"
              class="settings-input"
              type="number"
              min="0"
              :placeholder="t('myPage.request.backendRequestConcurrency')"
            />
          </div>

          <div class="form-field-group">
            <label class="form-field-label" for="request-concurrency-wait">{{ t("myPage.request.backendRequestConcurrencyWaitTime") }}</label>
            <input
              id="request-concurrency-wait"
              v-model="requestForm.backendRequestConcurrencyWaitTime"
              class="settings-input"
              type="number"
              min="0"
              :placeholder="t('myPage.request.backendRequestConcurrencyWaitTime')"
            />
          </div>

          <div class="form-field-group">
            <label class="form-field-label" for="request-cache-ttl">{{ t("myPage.request.remoteCacheTtl") }}</label>
            <input
              id="request-cache-ttl"
              v-model="requestForm.remoteCacheTtl"
              class="settings-input"
              type="number"
              min="0"
              :placeholder="t('myPage.request.remoteCacheTtl')"
            />
          </div>

          <div class="form-field-group">
            <label class="form-field-label" for="request-output-cache-ttl">{{ t("myPage.request.outputCacheTtl") }}</label>
            <input
              id="request-output-cache-ttl"
              v-model="requestForm.outputCacheTtl"
              class="settings-input"
              type="number"
              min="0"
              max="300"
              :placeholder="t('myPage.request.outputCacheTtl')"
            />
          </div>

          <div class="toggle-card-row">
            <span class="toggle-card-title">{{ t('myPage.request.remoteCacheStaleOnError') }}</span>
            <AppSwitch
              v-model="requestForm.remoteCacheStaleOnError"
              :aria-label="t('myPage.request.remoteCacheStaleOnError')"
            />
          </div>

          <div class="form-field-group form-field-group--full">
            <label class="form-field-label" for="request-node-info">{{ t("myPage.request.nodeInfoApiUrl") }}</label>
            <input
              id="request-node-info"
              v-model="requestForm.nodeInfoApiUrl"
              class="settings-input"
              type="text"
              :placeholder="t('myPage.request.nodeInfoApiUrl')"
            />
          </div>
        </div>
      </div>
    </section>
</template>

<script lang="ts" setup>
import { computed, reactive, ref } from "vue";
import { useI18n } from "vue-i18n";

import { useSettingsStore } from "@/store/settings";

const settingsStore = useSettingsStore();
const { t } = useI18n();

const requestEditing = ref(false);
const requestSaving = ref(false);
const requestForm = reactive({
  defaultUserAgent: "",
  defaultFlowUserAgent: "",
  defaultTimeout: "",
  backendRequestConcurrency: "",
  backendRequestConcurrencyWaitTime: "",
  remoteCacheTtl: "",
  remoteCacheStaleOnError: true,
  outputCacheTtl: "",
  nodeInfoApiUrl: "",
});

const requestSummary = computed(() => {
  const timeoutMs = Number(settingsStore.defaultTimeout) || 30000;
  return t("myPage.request.summary", {
    concurrency: settingsStore.backendRequestConcurrency || "3",
    // Milliseconds are an implementation detail here; the field above keeps the raw value.
    seconds: String(Math.round((timeoutMs / 1000) * 10) / 10),
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
  requestForm.outputCacheTtl = settingsStore.outputCacheTtl || "30";
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
</script>

<style scoped src="./settings-form.css"></style>

<style scoped>
/* Collapsible caption row (request settings) */
.section-head--clickable {
  cursor: pointer;
  padding: 6px;
  margin: -6px;
  border-radius: var(--radius-md);
  -webkit-user-select: none;
  user-select: none;
  transition: background-color 160ms ease;

  @media (hover: hover) and (pointer: fine) {
    &:hover {
      background: color-mix(in srgb, var(--primary-color) 5%, transparent);
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
</style>
