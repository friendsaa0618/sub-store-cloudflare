<template>
  <div class="admin-token-panel empty-state-wrapper">
    <AppEmpty style="padding: 32px 30px">
      <template #image>
        <img class="empty-state-image" :src="logoRedIcon" alt="" />
      </template>
      <template #description>
        <h3>{{ $t(`subPage.loadFailed.title`) }}</h3>
        <p>{{ $t(`subPage.loadFailed.desc`) }}</p>
      </template>
    </AppEmpty>

    <form class="load-failed-form" @submit.prevent="saveTokenAndRetry">
      <label for="admin-token-input">{{ $t(`subPage.loadFailed.tokenLabel`) }}</label>
      <input
        id="admin-token-input"
        v-model="adminToken"
        type="password"
        autocomplete="current-password"
        :placeholder="$t(`subPage.loadFailed.tokenPlaceholder`)"
        spellcheck="false"
        :disabled="isSubmitting"
      />
      <AppButton
        native-type="submit"
        type="primary"
        :disabled="!adminToken.trim() || isSubmitting"
        :loading="isSubmitting"
      >
        {{ $t(`subPage.loadFailed.saveAndRetry`) }}
      </AppButton>
    </form>

    <div class="load-failed-actions">
      <AppButton plain :disabled="isSubmitting" @click="retry">
        <font-awesome-icon icon="fa-solid fa-arrow-rotate-right" aria-hidden="true" />
        {{ $t(`subPage.loadFailed.btn`) }}
      </AppButton>
      <a
        href="https://github.com/realchendahuang/sub-store-cloudflare/blob/main/docs/deployment.md"
        target="_blank"
        rel="noreferrer"
      >
        {{ $t(`subPage.loadFailed.doc`) }}
        <font-awesome-icon icon="fa-solid fa-arrow-up-right-from-square" />
      </a>
    </div>
  </div>
</template>

<script lang="ts" setup>
import { ref } from "vue";

import logoRedIcon from "@/assets/icons/logo-red.png";
import { getStoredAdminToken, setStoredAdminToken } from "@/utils/adminToken";
import { initStores } from "@/utils/initApp";

const adminToken = ref(getStoredAdminToken());
const isSubmitting = ref(false);

const retry = async () => {
  if (isSubmitting.value) return;
  isSubmitting.value = true;
  try {
    // Only show refresh notify when the user explicitly retries.
    await initStores(true, true, true);
  } finally {
    isSubmitting.value = false;
  }
};

const saveTokenAndRetry = async () => {
  if (isSubmitting.value) return;
  setStoredAdminToken(adminToken.value);
  adminToken.value = getStoredAdminToken();
  await retry();
};
</script>

<style scoped>
.admin-token-panel {
  width: 100%;
  min-height: 50vh;
  padding: 12px 0 24px;
  display: flex;
  flex-direction: column;
  align-items: center;
  /* `safe center` keeps the mark clear of the fixed nav when the form is taller
     than the min-height; browsers without it keep plain centering. */
  justify-content: center;
  justify-content: safe center;
  box-sizing: border-box;
}

.empty-state-image {
  width: 96px;
  height: 96px;
  object-fit: contain;
}

.load-failed-form {
  width: min(100%, 420px);
  display: grid;
  gap: 10px;
  padding: 0 20px;
  box-sizing: border-box;

  & label {
    color: var(--second-text-color);
    font-size: 13px;
  }

  & input {
    width: 100%;
    box-sizing: border-box;
    border: 1px solid var(--divider-color);
    border-radius: 10px;
    background: var(--card-color);
    color: var(--primary-text-color);
    padding: 12px 14px;
    font-size: 14px;
    outline: none;

    &:focus,
    &:focus-visible {
      border-color: var(--primary-color);
      box-shadow: 0 0 0 2px var(--focus-ring-color, rgba(0, 0, 0, 0.06));
    }

    &:disabled {
      opacity: 0.7;
    }
  }
}

.load-failed-actions {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 18px;
  margin-top: 14px;

  & a {
    color: var(--primary-color);
    font-size: 14px;
  }
}
</style>
