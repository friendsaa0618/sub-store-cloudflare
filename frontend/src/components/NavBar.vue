<template>
  <div class="nav-bar-wrapper">
    <nav
      class="nav-bar"
      :class="{ 'is-desktop': isDesktop, 'is-secondary': isNeedBack }"
    >
      <div class="nav-bar__left">
        <!-- Secondary: back + compact page title (home tabs stay in center) -->
        <template v-if="isNeedBack">
          <button
            type="button"
            class="nav-btn nav-btn--leading"
            :aria-label="t('navBar.actions.back')"
            :title="t('navBar.actions.back')"
            @click.stop="back"
          >
            <font-awesome-icon
              class="nav-btn__icon"
              icon="fa-solid fa-arrow-left"
              aria-hidden="true"
            />
          </button>
          <h1
            v-if="currentTitle"
            class="nav-back-title"
            :title="currentTitle"
          >
            {{ currentTitle }}
          </h1>
        </template>
        <a
          v-else
          class="app-brand"
          href="/"
          :aria-label="t('navBar.brand.home')"
          @click.stop.prevent="router.push('/')"
        >
          <img
            class="app-brand__logo"
            :src="brandLogo"
            alt=""
            width="20"
            height="20"
          />
          <span class="app-brand__name" translate="no">Sub Store</span>
        </a>
      </div>

      <!-- Primary tabs always visible — including on secondary pages -->
      <div class="nav-bar__center">
        <div class="nav-segmented-control" role="navigation" aria-label="Sub Store">
          <router-link
            v-for="item in navTabs"
            :key="item.path"
            :to="item.path"
            class="nav-segmented-item"
            :class="{ 'is-active': isTabActive(item.path) }"
          >
            <font-awesome-icon :icon="item.icon" class="nav-segmented-item__icon" aria-hidden="true" />
            <span class="nav-segmented-item__label">{{ item.label }}</span>
          </router-link>
        </div>
      </div>

      <div class="nav-bar__right">
        <button
          v-if="showRefreshButton"
          type="button"
          class="nav-btn"
          :aria-label="t('navBar.actions.refresh')"
          :title="t('navBar.actions.refresh')"
          @click.stop="refresh"
        >
          <font-awesome-icon
            class="nav-btn__icon"
            icon="fa-solid fa-arrow-rotate-right"
            aria-hidden="true"
          />
        </button>
        <LanguageSwitcherButton variant="icon" />
        <button
          type="button"
          class="nav-btn"
          :aria-label="themeActionLabel"
          :title="themeActionLabel"
          @click.stop="toggleTheme"
        >
          <font-awesome-icon
            class="nav-btn__icon"
            :icon="themeActionIcon"
            aria-hidden="true"
          />
        </button>
      </div>
    </nav>
  </div>
</template>

<script lang="ts" setup>
import { useMediaQuery } from "@vueuse/core";
import { storeToRefs } from "pinia";
import { computed, onMounted } from "vue";
import { useI18n } from "vue-i18n";
import { useRoute, useRouter } from "vue-router";

import brandLogo from "@/assets/icons/logo.png";
import LanguageSwitcherButton from "@/components/LanguageSwitcherButton.vue";
import { useSettingsStore } from "@/store/settings";
import { SIDEBAR_BREAKPOINT, useSystemStore } from "@/store/system";
import { initStores } from "@/utils/initApp";

const { t } = useI18n();
const router = useRouter();
const route = useRoute();
const systemStore = useSystemStore();
const settingsStore = useSettingsStore();
const { appearanceSetting } = storeToRefs(settingsStore);
const { navBarHeight, navBartop } = storeToRefs(systemStore);

const isDesktop = useMediaQuery(`(min-width: ${SIDEBAR_BREAKPOINT}px)`);

onMounted(() => {
  systemStore.initSystemState();
});

const isNeedBack = computed(() => {
  return route.meta.needNavBack ?? false;
});

const navTabs = computed(() => [
  { path: "/subs", label: t("tabBar.sub"), icon: "fa-solid fa-link" },
  { path: "/tools", label: t("tabBar.tools"), icon: "fa-solid fa-sliders" },
  { path: "/my", label: t("tabBar.my"), icon: "fa-solid fa-gear" },
]);

/** Editor lives under subscriptions — keep 订阅 active on secondary edit routes. */
const isTabActive = (path: string) => {
  if (route.path === path) return true;
  if (path === "/subs" && route.path.startsWith("/edit/")) return true;
  return false;
};

const currentTitle = computed(() => {
  if (route.meta.title === "subEditor") {
    const isCollection = route.params.editType === "collections";
    const isCreate = route.params.id === "UNTITLED";
    const titleKey = isCollection
      ? (isCreate ? "collectionCreate" : "collectionEdit")
      : (isCreate ? "sourceCreate" : "sourceEdit");
    return t(`navBar.pagesTitle.${titleKey}`);
  }

  const metaTitle = route.meta.title;
  return metaTitle ? t(`navBar.pagesTitle.${metaTitle}`) : undefined;
});

const showRefreshButton = computed(() => {
  return !isNeedBack.value && !appearanceSetting.value.showFloatingRefreshButton;
});

const back = () => {
  if (!isNeedBack.value) return;

  try {
    if (router.options.history.state.back) {
      router.back();
    } else {
      router.push("/");
    }
  } catch {
    router.push("/");
  }
};

const refresh = async () => {
  if (["/preview"].includes(route.path)) {
    window.location.reload();
    return;
  }
  // Explicit user refresh: loading + success toasts handled inside initStores.
  await initStores(true, true, true);
};

const isDarkTheme = computed(() => {
  if (settingsStore.theme?.auto) {
    return window.matchMedia("(prefers-color-scheme: dark)").matches;
  }
  const name = settingsStore.theme?.name || "light";
  return ["dark", "pureblack", "darkblue", "monokai"].includes(name);
});

/** Cycle: System (auto) → Light → Dark → System */
const themeMode = computed<"auto" | "light" | "dark">(() => {
  if (settingsStore.theme?.auto) return "auto";
  return isDarkTheme.value ? "dark" : "light";
});

const themeActionIcon = computed(() => {
  if (themeMode.value === "auto") return "fa-solid fa-circle-half-stroke";
  if (themeMode.value === "dark") return "fa-solid fa-sun";
  return "fa-solid fa-moon";
});

const themeActionLabel = computed(() => {
  if (themeMode.value === "auto") return t("navBar.actions.themeAuto");
  if (themeMode.value === "dark") return t("navBar.actions.themeDark");
  return t("navBar.actions.themeLight");
});

const toggleTheme = async () => {
  const current = settingsStore.theme || {
    auto: true,
    name: "light",
    dark: "dark",
    light: "light",
  };
  let next;
  if (current.auto) {
    // System → fixed Light
    next = { ...current, auto: false, name: "light" as const };
  } else if (!isDarkTheme.value) {
    // Light → fixed Dark
    next = { ...current, auto: false, name: "dark" as const };
  } else {
    // Dark → System (follow device)
    next = { ...current, auto: true, name: current.light || "light" };
  }
  settingsStore.theme = next as any;
  await settingsStore.changeTheme({ theme: next as any });
};
</script>

<style lang="scss" scoped>
/*
 * Full-bleed fixed top bar.
 * Height is hardcoded to 56px (with CSS-var override from the store) so the
 * layout cannot collapse if Vue style-bindings fail to inject.
 */
.nav-bar-wrapper {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  z-index: 20;
  width: 100%;
  /* 56px content row + notch/status safe-area (mobile) */
  height: calc(56px + env(safe-area-inset-top, 0px));
  min-height: calc(56px + env(safe-area-inset-top, 0px));
  padding-top: env(safe-area-inset-top, 0px);
  box-sizing: border-box;
  background: var(--nav-bar-color, #fff);
  border-bottom: 1px solid var(--divider-color, rgba(0, 0, 0, 0.08));
  backdrop-filter: blur(16px);
  -webkit-backdrop-filter: blur(16px);
}

/*
 * Single horizontal row: logo | tabs | actions.
 * max-width matches .page-body so left/right edges align with the list.
 */
.nav-bar {
  display: flex !important;
  flex-direction: row !important;
  flex-wrap: nowrap !important;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  box-sizing: border-box;
  width: 100%;
  max-width: $content-max-width;
  height: 56px;
  margin-left: auto;
  margin-right: auto;
  padding-top: 0;
  padding-top: v-bind(navBartop);
  padding-right: 12px;
  padding-bottom: 0;
  padding-left: 12px;
  overflow: visible;

  @media screen and (min-width: $breakpoint-md) {
    gap: 12px;
    padding-left: 24px;
    padding-right: 24px;
  }

  &__left,
  &__right,
  &__center {
    display: flex !important;
    flex-direction: row !important;
    flex-wrap: nowrap !important;
    align-items: center;
    min-width: 0;
  }

  &__left,
  &__right {
    gap: 4px;
    flex: 0 0 auto;

    @media screen and (min-width: $breakpoint-md) {
      gap: 6px;
    }
  }

  &__center {
    justify-content: center;
    flex: 1 1 auto;
    min-width: 0;
  }

  /* Secondary: keep left cluster compact so center tabs stay usable */
  &.is-secondary {
    .nav-bar__left {
      max-width: min(38vw, 180px);
    }
  }
}

.app-brand {
  display: flex;
  flex-direction: row;
  align-items: center;
  gap: 8px;
  cursor: pointer;
  user-select: none;
  /* Expand hit area for touch */
  min-height: 40px;
  padding: 4px 2px;

  &__logo {
    display: block;
    width: 20px;
    height: 20px;
    flex-shrink: 0;
    object-fit: contain;
  }

  &__name {
    font-size: 14px;
    font-weight: 600;
    letter-spacing: -0.015em;
    color: var(--primary-text-color);
    white-space: nowrap;

    /* Free space for segmented tabs on narrow phones */
    @media screen and (max-width: 480px) {
      display: none;
    }
  }
}

/* Compact title next to back on secondary pages */
.nav-back-title {
  margin: 0;
  min-width: 0;
  max-width: 100%;
  font-size: 13px;
  font-weight: 600;
  letter-spacing: -0.015em;
  color: var(--primary-text-color);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;

  @media screen and (max-width: 400px) {
    display: none;
  }
}

.nav-segmented-control {
  display: inline-flex;
  flex-direction: row;
  flex-wrap: nowrap;
  align-items: center;
  max-width: 100%;
  padding: 3px;
  border-radius: 9999px;
  background: rgba(148, 163, 184, 0.08);
  border: 1px solid var(--divider-color);
  gap: 2px;
}

.nav-segmented-item {
  display: inline-flex;
  flex-direction: row;
  align-items: center;
  justify-content: center;
  gap: 6px;
  /* Comfortable touch targets on mobile */
  min-height: 32px;
  padding: 6px 12px;
  border: 0;
  border-radius: 9999px;
  background: transparent;
  color: var(--second-text-color);
  font-size: 13px;
  font-weight: 500;
  text-decoration: none;
  cursor: pointer;
  white-space: nowrap;
  transition: transform 160ms cubic-bezier(0.23, 1, 0.32, 1), background-color 200ms ease, color 200ms ease, box-shadow 200ms ease;

  &:focus {
    outline: none;
  }

  &:focus-visible {
    box-shadow: 0 0 0 2px var(--focus-ring-color);
  }

  @media screen and (min-width: $breakpoint-md) {
    min-height: 0;
    padding: 4px 14px;
  }

  /* Icon-only tabs under ~420px — same control, denser */
  @media screen and (max-width: 420px) {
    min-width: 40px;
    padding: 6px 10px;
    gap: 0;

    .nav-segmented-item__label {
      display: none;
    }

    .nav-segmented-item__icon {
      font-size: 14px;
    }
  }

  @media (hover: hover) and (pointer: fine) {
    &:hover:not(.is-active) {
      color: var(--primary-text-color);
      background: rgba(148, 163, 184, 0.12);
    }
  }

  &:active {
    transform: scale(0.96);
  }

  &.is-active {
    background: var(--card-color);
    color: var(--primary-text-color);
    font-weight: 600;
    box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1), 0 1px 2px rgba(0, 0, 0, 0.06);
  }

  &__icon {
    font-size: 12px;
  }
}

.nav-btn {
  width: 40px;
  height: 40px;
  box-sizing: border-box;
  padding: 0;
  border: 0;
  margin: 0;
  background: transparent;
  border-radius: 50%;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  color: var(--second-text-color);

  @media screen and (min-width: $breakpoint-md) {
    width: 32px;
    height: 32px;
  }
  cursor: pointer;
  flex-shrink: 0;
  transition: transform 160ms cubic-bezier(0.23, 1, 0.32, 1), background-color 200ms ease, color 200ms ease;

  @media (hover: hover) and (pointer: fine) {
    &:hover {
      background: rgba(148, 163, 184, 0.15);
      color: var(--primary-text-color);
    }
  }

  &:active {
    transform: scale(0.95);
  }

  &:focus {
    outline: none;
  }

  &:focus-visible {
    outline: none;
    box-shadow: 0 0 0 2px var(--focus-ring-color);
  }

  &__icon {
    width: 14px;
    height: 14px;
    font-size: 14px;
  }
}
</style>
