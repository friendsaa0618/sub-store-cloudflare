<template>
  <div class="admin-token-panel empty-state-wrapper">
    <div class="admin-token-card">
      <div class="gate-intro">
        <div class="gate-brand">
          <img class="gate-brand__logo" :src="logoIcon" alt="" />
          <span class="gate-brand__status" aria-hidden="true"></span>
        </div>
        <h2 class="gate-title">{{ $t(`subPage.loadFailed.title`) }}</h2>
        <p class="gate-desc">{{ $t(`subPage.loadFailed.desc`) }}</p>
        <a
          class="gate-doc"
          href="https://github.com/realchendahuang/sub-store-cloudflare/blob/main/docs/deployment.md"
          target="_blank"
          rel="noreferrer"
        >
          {{ $t(`subPage.loadFailed.doc`) }}
          <font-awesome-icon icon="fa-solid fa-arrow-up-right-from-square" aria-hidden="true" />
        </a>
      </div>

      <div class="gate-form">
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

          <div class="gate-actions">
            <AppButton
              native-type="submit"
              type="primary"
              :disabled="!adminToken.trim() || isSubmitting"
              :loading="isSubmitting"
            >
              {{ $t(`subPage.loadFailed.saveAndRetry`) }}
            </AppButton>
            <AppButton plain :disabled="isSubmitting" @click="retry">
              <font-awesome-icon icon="fa-solid fa-arrow-rotate-right" aria-hidden="true" />
              {{ $t(`subPage.loadFailed.btn`) }}
            </AppButton>
          </div>
          <p class="gate-hint">{{ $t(`subPage.loadFailed.storageHint`) }}</p>
        </form>
      </div>
    </div>
  </div>
</template>

<script lang="ts" setup>
import { computed, ref } from "vue";

import logoIcon from "@/assets/icons/logo.png";
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
  /* One panel, centered in the area below the fixed nav. Routed pages get that
     offset from AppLayout; the gate renders outside the router, so it carries
     the nav height itself. */
  flex: 1;
  width: min(100%, 820px);
  margin: 0 auto;
  padding: calc(56px + env(safe-area-inset-top, 0px) + 16px) 0 24px;
  min-height: calc(100vh - 40px);
  min-height: calc(100dvh - 40px);
  display: flex;
  flex-direction: column;
  align-items: stretch;
  justify-content: center;
  justify-content: safe center;
  box-sizing: border-box;
}

.admin-token-card {
  display: grid;
  grid-template-columns: minmax(0, 0.9fr) minmax(0, 1.1fr);
  overflow: hidden;
  border: 1px solid var(--divider-color);
  border-radius: var(--radius-lg);
  background: var(--card-color);
  box-shadow: var(--card-shadow-hover);
}

.gate-intro {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  padding: 30px 28px;
  border-right: 1px solid var(--divider-color);
  background: color-mix(in srgb, var(--primary-color) 4%, var(--card-color));
}

.gate-brand {
  position: relative;
  display: inline-flex;
  margin-bottom: 18px;
}

.gate-brand__logo {
  display: block;
  width: 44px;
  height: 44px;
  object-fit: contain;
}

.gate-brand__status {
  position: absolute;
  right: -2px;
  bottom: -2px;
  width: 12px;
  height: 12px;
  border: 2px solid var(--card-color);
  border-radius: 50%;
  background: var(--danger-color);
}

.gate-title {
  margin: 0;
  color: var(--primary-text-color);
  font-size: 22px;
  font-weight: 650;
  letter-spacing: -0.02em;
  line-height: 1.25;
}

.gate-desc {
  max-width: 34ch;
  margin: 8px 0 0;
  color: var(--comment-text-color);
  font-size: var(--text-sm);
  line-height: 1.55;
}

.gate-doc {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  margin-top: auto;
  padding-top: 22px;
  color: var(--primary-color);
  font-size: var(--text-sm);
  font-weight: 600;

  & svg {
    width: 11px;
    height: 11px;
    font-size: 11px;
  }

  &:focus-visible {
    outline: none;
    border-radius: var(--radius-sm);
    box-shadow: 0 0 0 2px var(--focus-ring-color);
  }
}

.gate-form {
  display: flex;
  align-items: center;
  padding: 30px 28px;
}

.load-failed-form {
  width: 100%;
  display: grid;
  gap: 10px;
  box-sizing: border-box;

  & label {
    color: var(--second-text-color);
    font-size: 12px;
    font-weight: 600;
  }

  & .token-input-row {
    position: relative;
    display: flex;
    align-items: center;
  }

  & input {
    width: 100%;
    height: 44px;
    box-sizing: border-box;
    border: 1px solid var(--divider-color);
    border-radius: var(--radius-md);
    background: var(--background-color);
    color: var(--primary-text-color);
    padding: 0 44px 0 14px;
    font-size: var(--text-field);
    outline: none;
    transition: border-color 160ms ease, box-shadow 160ms ease;

    &:focus,
    &:focus-visible {
      border-color: var(--primary-color);
      box-shadow: 0 0 0 2px var(--focus-ring-color);
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

  @media (hover: hover) and (pointer: fine) {
    &:hover {
      color: var(--primary-color);
      background: color-mix(in srgb, var(--primary-color) 8%, transparent);
    }
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

.gate-actions {
  display: flex;
  align-items: center;
  gap: var(--space-2);
  margin-top: 4px;

  & .app-button:first-child {
    flex: 1 1 auto;
  }

  & .app-button:last-child {
    flex: 0 0 auto;
  }
}

.gate-hint {
  margin: 2px 0 0;
  color: var(--comment-text-color);
  font-size: 11px;
  line-height: 1.4;
}

@media screen and (max-width: 700px) {
  .admin-token-panel {
    width: min(100%, 480px);
    padding-top: calc(100px + env(safe-area-inset-top, 0px) + 16px);
  }

  .admin-token-card {
    grid-template-columns: minmax(0, 1fr);
  }

  .gate-intro {
    padding: 24px 22px 20px;
    border-right: 0;
    border-bottom: 1px solid var(--divider-color);
  }

  .gate-brand {
    margin-bottom: 14px;
  }

  .gate-title {
    font-size: 20px;
  }

  .gate-doc {
    padding-top: 16px;
  }

  .gate-form {
    padding: 22px;
  }
}
</style>
