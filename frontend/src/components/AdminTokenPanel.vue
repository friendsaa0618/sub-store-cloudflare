<template>
  <div class="admin-token-panel empty-state-wrapper">
    <div class="admin-token-card">
      <AppEmpty style="padding: 4px 0 20px">
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
      <div class="token-input-row">
        <input
          id="admin-token-input"
          v-model="adminToken"
          :type="showToken ? 'text' : 'password'"
          autocomplete="current-password"
          :placeholder="$t(`subPage.loadFailed.tokenPlaceholder`)"
          spellcheck="false"
          :disabled="isSubmitting"
        />
        <button
          type="button"
          class="token-visibility"
          :aria-label="showToken ? $t(`subPage.loadFailed.hideToken`) : $t(`subPage.loadFailed.showToken`)"
          :title="showToken ? $t(`subPage.loadFailed.hideToken`) : $t(`subPage.loadFailed.showToken`)"
          :aria-pressed="showToken"
          @click="showToken = !showToken"
        >
          <font-awesome-icon
            :icon="showToken ? 'fa-solid fa-eye-slash' : 'fa-solid fa-eye'"
            aria-hidden="true"
          />
        </button>
      </div>
      <p v-if="failed" class="load-failed-error" role="alert">
        {{ $t(`subPage.loadFailed.invalidToken`) }}
      </p>
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
  </div>
</template>

<script lang="ts" setup>
import { computed, ref } from "vue";

import logoRedIcon from "@/assets/icons/logo-red.png";
import { useGlobalStore } from "@/store/global";
import { getStoredAdminToken, setStoredAdminToken } from "@/utils/adminToken";
import { initStores } from "@/utils/initApp";

const globalStore = useGlobalStore();
const adminToken = ref(getStoredAdminToken());
const isSubmitting = ref(false);
const showToken = ref(false);
/**
 * The panel is unmounted while a retry loads, so the verdict cannot live in
 * local state: a token is stored but the boot still has no data, which means
 * the token was rejected or the API is unreachable.
 */
const failed = computed(() => Boolean(adminToken.value.trim()) && !globalStore.fetchResult);

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
  /* One card, centered in the area below the fixed nav. Routed pages get that
     offset from AppLayout; the gate renders outside the router, so it carries
     the nav height itself. */
  flex: 1;
  width: min(100%, 460px);
  margin: 0 auto;
  padding: calc(56px + env(safe-area-inset-top, 0px) + 12px) 0 24px;
  min-height: calc(100vh - 40px);
  min-height: calc(100dvh - 40px);
  display: flex;
  flex-direction: column;
  align-items: stretch;
  /* `safe center` keeps the card clear of the nav when it is taller than the
     available height; browsers without it keep plain centering. */
  justify-content: center;
  justify-content: safe center;
  box-sizing: border-box;
}

.admin-token-card {
  padding: var(--space-5) var(--space-4) var(--space-4);
  border: 1px solid var(--divider-color);
  border-radius: var(--radius-lg);
  background: var(--card-color);
  box-shadow: var(--card-shadow);
}

.empty-state-image {
  width: 96px;
  height: 96px;
  object-fit: contain;
}

.load-failed-form {
  width: 100%;
  display: grid;
  gap: 10px;
  box-sizing: border-box;

  & label {
    color: var(--second-text-color);
    font-size: 13px;
  }

  & .token-input-row {
    position: relative;
    display: flex;
    align-items: center;
  }

  & input {
    width: 100%;
    box-sizing: border-box;
    border: 1px solid var(--divider-color);
    border-radius: 10px;
    background: var(--card-color);
    color: var(--primary-text-color);
    padding: 12px 44px 12px 14px;
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

.token-visibility {
  position: absolute;
  right: 6px;
  top: 50%;
  transform: translateY(-50%);
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  padding: 0;
  border: 0;
  border-radius: var(--radius-sm);
  background: transparent;
  color: var(--second-text-color);
  font-size: 14px;
  cursor: pointer;
  transition: color 160ms ease, background-color 160ms ease;

  &:hover {
    color: var(--primary-text-color);
  }

  &:focus-visible {
    outline: none;
    box-shadow: 0 0 0 2px var(--focus-ring-color);
  }
}

.load-failed-error {
  margin: -2px 0 0;
  color: var(--danger-color);
  font-size: 12px;
  line-height: 1.4;
}

.load-failed-actions {
  display: flex;
  align-items: center;
  /* Same left edge as the label, the field and the submit button */
  justify-content: flex-start;
  gap: var(--space-4);
  margin-top: var(--space-3);

  & a {
    color: var(--primary-color);
    font-size: 14px;
  }
}
</style>
