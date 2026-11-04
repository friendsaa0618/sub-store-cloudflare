<template>
  <div class="nav-bar-wrapper">
    <nav
      class="nav-bar"
      :class="{ 'is-secondary': isNeedBack }"
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
            :aria-current="isTabActive(item.path) ? 'page' : undefined"
          >
            <font-awesome-icon :icon="item.icon" class="nav-segmented-item__icon" aria-hidden="true" />
            <span class="nav-segmented-item__label">{{ item.label }}</span>
          </router-link>
        </div>
      </div>

      <div class="nav-bar__right">
        <button
          v-if="showListSearch"
          type="button"
          class="nav-btn"
          :class="{ 'is-active': listSearchStore.isSearchOpen }"
          :aria-label="t('navBar.listSearch.open')"
          :title="t('navBar.listSearch.open')"
          :aria-expanded="listSearchStore.isSearchOpen"
          @click.stop="toggleListSearch"
        >
          <font-awesome-icon
            class="nav-btn__icon"
            icon="fa-solid fa-magnifying-glass"
            aria-hidden="true"
          />
        </button>
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
import { storeToRefs } from "pinia";
import { computed, onMounted, watch, watchEffect } from "vue";
import { useI18n } from "vue-i18n";
import { useRoute, useRouter } from "vue-router";

import brandLogo from "@/assets/icons/logo.png";
import LanguageSwitcherButton from "@/components/LanguageSwitcherButton.vue";
import { useListSearchStore } from "@/store/listSearch";
import { getThemeCatalog } from "@/hooks/useThemes";
import { useSettingsStore } from "@/store/settings";
import { SIDEBAR_BREAKPOINT, useSystemStore } from "@/store/system";
import { initStores } from "@/utils/initApp";

const { t } = useI18n();
const router = useRouter();
const route = useRoute();
const systemStore = useSystemStore();
const settingsStore = useSettingsStore();
const listSearchStore = useListSearchStore();
const { appearanceSetting } = storeToRefs(settingsStore);
const { navBarHeight, navBartop } = storeToRefs(systemStore);


/** Search lives on the subscription list only; the route opts in. */
const showListSearch = computed(() => Boolean(route.meta.supportsListSearch));

const toggleListSearch = () => {
  if (listSearchStore.isSearchOpen) {
    listSearchStore.close();
  } else {
    listSearchStore.open(route.path);
  }
};

watch(
  () => route.path,
  (path) => listSearchStore.syncRoute(path, Boolean(route.meta.supportsListSearch)),
);

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

/* The tab, the history entry and the screen-reader announcement all use the
   page title; the router used to reset it to "Sub Store" on every navigation.
   /preview names itself after the subscription, so leave that one alone. */
watchEffect(() => {
  if (route.path === "/preview") return;
  document.title = currentTitle.value ? `${currentTitle.value} - Sub Store` : "Sub Store";
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

/* Kind comes from the theme files, so a new dark theme is not silently treated
   as light here (the old hardcoded list missed 静谧蓝). */
const themeKinds = new Map(getThemeCatalog().map((option) => [option.value, option.kind]));

const isDarkTheme = computed(() => {
  if (settingsStore.theme?.auto) {
    return window.matchMedia("(prefers-color-scheme: dark)").matches;
  }
  return themeKinds.get(settingsStore.theme?.name || "light") === "dark";
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
    /* System → the light theme the user picked in settings, not always the base one. */
    next = { ...current, auto: false, name: current.light || "light" };
  } else if (!isDarkTheme.value) {
    next = { ...current, auto: false, name: current.dark || "dark" };
  } else {
    // Dark → System (follow device)
    next = { ...current, auto: true, name: current.light || "light" };
  }
  settingsStore.theme = next as any;
  await settingsStore.changeTheme({ theme: next as any });
};
</script>

<style scoped>
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
  max-width: 1024px;
  height: 56px;
  margin-left: auto;
  margin-right: auto;
  padding-top: 0;
  padding-top: v-bind(navBartop);
  padding-right: 12px;
  padding-bottom: 0;
  padding-left: 12px;
  overflow: visible;

  @media screen and (min-width: 768px) {
    gap: 12px;
    padding-left: 24px;
    padding-right: 24px;
  }

  /* Secondary: keep left cluster compact so center tabs stay usable */
  &.is-secondary {
    & .nav-bar__left {
      max-width: min(38vw, 180px);
    }
  }
}

.nav-bar__left,
.nav-bar__right,
.nav-bar__center {
  display: flex !important;
  flex-direction: row !important;
  flex-wrap: nowrap !important;
  align-items: center;
  min-width: 0;
}

.nav-bar__left,
.nav-bar__right {
  gap: 4px;
  flex: 0 0 auto;

  @media screen and (min-width: 768px) {
    gap: 6px;
  }
}

.nav-bar__center {
  justify-content: center;
  flex: 1 1 auto;
  min-width: 0;
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
}

.app-brand__logo {
  display: block;
  width: 20px;
  height: 20px;
  flex-shrink: 0;
  object-fit: contain;
}

.app-brand__name {
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
  border-radius: var(--radius-full);
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
  border-radius: var(--radius-full);
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

  @media screen and (min-width: 768px) {
    min-height: 0;
    padding: 4px 14px;
  }

  /* Icon-only tabs under ~420px — same control, denser */
  @media screen and (max-width: 420px) {
    min-width: 40px;
    padding: 6px 10px;
    gap: 0;

    & .nav-segmented-item__label {
      display: none;
    }

    & .nav-segmented-item__icon {
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
}

.nav-segmented-item__icon {
  font-size: 12px;
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

  @media screen and (min-width: 768px) {
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
}

.nav-btn__icon {
  width: 14px;
  height: 14px;
  font-size: 14px;
}
</style>
