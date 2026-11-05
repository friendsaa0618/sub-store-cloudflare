<template>
  <div ref="dropdownRef" class="language-dropdown-wrapper">
    <button
      ref="triggerEl"
      type="button"
      aria-haspopup="menu"
      :aria-expanded="isOpen"
      :class="[
        'language-switch-button',
        `language-switch-button--${props.variant}`,
        { 'is-open': isOpen }
      ]"
      :aria-label="t('navBar.langSwitcher.cellTitle')"
      :title="t('navBar.langSwitcher.cellTitle')"
      @click.stop="toggleMenu"
    >
      <font-awesome-icon
        class="language-switch-button__icon"
        icon="fa-solid fa-language"
      />
    </button>

    <div
      v-if="isOpen"
      ref="menuEl"
      class="language-dropdown-menu"
      role="menu"
      @click.stop
      @keydown="onMenuKeydown"
    >
      <button
        v-for="lang in langList"
        :key="lang.key"
        type="button"
        class="language-dropdown-item"
        :class="{ 'is-selected': lang.key === currentLocale }"
        role="menuitem"
        @click="changeLang(lang.key)"
      >
        <span class="language-dropdown-item__label">{{ t(lang.labelKey) }}</span>
        <font-awesome-icon
          v-if="lang.key === currentLocale"
          class="language-dropdown-item__check"
          icon="fa-solid fa-check"
        />
      </button>
    </div>
  </div>
</template>

<script lang="ts" setup>
import { computed, nextTick, onMounted, onUnmounted, ref } from "vue";
import { useI18n } from "vue-i18n";

import {
  SUPPORTED_LOCALES,
  normalizeLocale,
  type SupportedLocale,
} from "@/locales/languages";
import { syncDocumentLang } from "@/locales";

const props = withDefaults(
  defineProps<{
    variant?: "compact" | "icon";
    zIndex?: number | string;
  }>(),
  {
    variant: "compact",
    zIndex: 12000,
  },
);

const { t, locale } = useI18n();
const isOpen = ref(false);
const dropdownRef = ref<HTMLElement | null>(null);
const triggerEl = ref<HTMLElement | null>(null);
const menuEl = ref<HTMLElement | null>(null);
const langList = SUPPORTED_LOCALES;

const currentLocale = computed(() => {
  return normalizeLocale(String(locale.value || ""));
});

const menuItems = () =>
  Array.from(menuEl.value?.querySelectorAll<HTMLElement>("[role=menuitem]") ?? []);

const focusItem = (index: number) => {
  const items = menuItems();
  if (!items.length) return;
  items[(index + items.length) % items.length].focus();
};

const closeMenu = (returnFocus = false) => {
  if (!isOpen.value) return;
  isOpen.value = false;
  if (returnFocus) triggerEl.value?.focus();
};

const toggleMenu = async () => {
  if (isOpen.value) {
    closeMenu(true);
    return;
  }
  isOpen.value = true;
  await nextTick();
  /* Land on the active language so the menu opens where the user is. */
  const current = menuItems().findIndex((el) => el.classList.contains("is-selected"));
  focusItem(current >= 0 ? current : 0);
};

/** Menu-button keys, same as the card menu and the floating add button. */
const onMenuKeydown = (event: KeyboardEvent) => {
  const items = menuItems();
  const current = items.indexOf(document.activeElement as HTMLElement);
  switch (event.key) {
    case "ArrowDown":
      event.preventDefault();
      focusItem(current + 1);
      break;
    case "ArrowUp":
      event.preventDefault();
      focusItem(current - 1);
      break;
    case "Home":
      event.preventDefault();
      focusItem(0);
      break;
    case "End":
      event.preventDefault();
      focusItem(items.length - 1);
      break;
    case "Escape":
      event.preventDefault();
      closeMenu(true);
      break;
    case "Tab":
      closeMenu();
      break;
  }
};

const changeLang = (type: SupportedLocale) => {
  locale.value = type;
  localStorage.setItem("locale", type);
  syncDocumentLang(type);
  closeMenu(true);
};

const handleDocumentClick = (e: MouseEvent) => {
  if (dropdownRef.value && !dropdownRef.value.contains(e.target as Node)) {
    closeMenu();
  }
};

onMounted(() => {
  document.addEventListener("click", handleDocumentClick);
});

onUnmounted(() => {
  document.removeEventListener("click", handleDocumentClick);
});
</script>

<style scoped>
.language-dropdown-wrapper {
  position: relative;
  display: inline-flex;
  align-items: center;
}

.language-switch-button {
  height: 32px;
  box-sizing: border-box;
  border: 1px solid var(--divider-color);
  border-radius: var(--radius-md);
  margin: 0;
  background: var(--card-color);
  color: var(--second-text-color);
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  font-size: 12px;
  line-height: 1;
  white-space: nowrap;
  transition: transform 160ms cubic-bezier(0.23, 1, 0.32, 1), background-color 200ms ease, border-color 200ms ease;

  &:focus {
    outline: none;
  }

  &:focus-visible {
    box-shadow: 0 0 0 2px var(--focus-ring-color);
  }

  &:active {
    transform: scale(0.95);
  }

  &.is-open {
    color: var(--primary-color);
    background: color-mix(in srgb, var(--primary-color) 12%, transparent);
  }
}

.language-switch-button--compact {
  width: 32px;
  padding: 0;
}

.language-switch-button--icon {
  width: 32px;
  height: 32px;
  padding: 0;
  border: 0;
  border-radius: 50%;
  background: transparent;
  color: var(--icon-nav-bar-right);
}

@media (hover: hover) and (pointer: fine) {
  .language-switch-button--icon:hover {
    background: rgba(148, 163, 184, 0.15);
  }
}

.language-switch-button__icon {
  width: 14px;
  height: 14px;
  font-size: 14px;
  color: currentColor;
}

.language-dropdown-menu {
  position: absolute;
  top: calc(100% + 6px);
  right: 0;
  z-index: 200;
  min-width: 150px;
  padding: 4px;
  border-radius: var(--radius-md);
  border: 1px solid var(--divider-color);
  background: var(--card-color);
  box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.25), 0 8px 10px -6px rgba(0, 0, 0, 0.2);
  backdrop-filter: blur(16px);
  transform-origin: top right;
  animation: dropdownFadeIn 150ms cubic-bezier(0.23, 1, 0.32, 1);
}

@keyframes dropdownFadeIn {
  from {
    opacity: 0;
    transform: scale(0.95);
  }
  to {
    opacity: 1;
    transform: scale(1);
  }
}

.language-dropdown-item {
  width: 100%;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 8px 10px;
  border: 0;
  border-radius: var(--radius-sm);
  background: transparent;
  color: var(--primary-text-color);
  font-size: 13px;
  font-weight: 400;
  text-align: left;
  cursor: pointer;
  white-space: nowrap;
  transition: background-color 150ms ease, color 150ms ease;

  @media (hover: hover) and (pointer: fine) {
    &:hover {
      background: rgba(148, 163, 184, 0.12);
    }
  }

  &:active {
    transform: scale(0.98);
  }

  &.is-selected {
    color: var(--primary-color);
    font-weight: 600;
    background: color-mix(in srgb, var(--primary-color) 10%, transparent);
  }
}

.language-dropdown-item__check {
  font-size: 12px;
  color: var(--primary-color);
}
</style>
