<template>
  <!-- Actions: full strip on desktop; copy + overflow menu on mobile -->
  <div
    class="sub-item-menu"
    :class="{
      'simple-mode': isSimpleMode,
      'is-compact': !isDesktop,
    }"
  >
    <button
      class="sub-item-action sub-item-action--primary"
      :aria-label="$t('subPage.actions.copyLink')"
      :title="$t('subPage.actions.copyLink')"
      @click.stop="emit('copy-link')"
    >
      <font-awesome-icon icon="fa-solid fa-link" />
      <span class="sub-item-action__label">{{ $t('subPage.actions.copyLinkShort') }}</span>
    </button>
    <span class="sub-item-menu__divider" aria-hidden="true"></span>
    <template v-if="isDesktop">
      <button
        class="sub-item-action"
        :aria-label="$t('subPage.actions.openPreview')"
        :title="$t('subPage.actions.openPreview')"
        @click.stop="emit('open-preview')"
      >
        <font-awesome-icon icon="fa-solid fa-eye" />
      </button>
      <button
        class="sub-item-action"
        :aria-label="$t('subPage.actions.edit')"
        :title="$t('subPage.actions.edit')"
        @click.stop="emit('edit')"
      >
        <font-awesome-icon icon="fa-solid fa-pen-to-square" />
      </button>
      <button
        class="sub-item-action"
        :aria-label="$t('subPage.actions.cloneConfig')"
        :title="$t('subPage.actions.cloneConfig')"
        @click.stop="emit('copy-config')"
      >
        <font-awesome-icon icon="fa-solid fa-clone" />
      </button>
      <span class="sub-item-menu__divider" aria-hidden="true"></span>
      <button
        v-if="type === 'sub'"
        class="sub-item-action"
        :aria-label="$t('subPage.actions.refresh')"
        :title="$t('subPage.actions.refresh')"
        @click.stop="emit('refresh')"
      >
        <font-awesome-icon icon="fa-solid fa-arrow-rotate-right" />
      </button>
      <!-- Collections have no refresh of their own. The slot stays reserved so
           the action columns line up from row to row. -->
      <span v-else class="sub-item-action-placeholder" aria-hidden="true"></span>
      <button
        class="sub-item-action"
        :aria-label="$t(isEnabled ? 'subPage.actions.disable' : 'subPage.actions.enable')"
        :title="$t(isEnabled ? 'subPage.actions.disable' : 'subPage.actions.enable')"
        @click.stop="emit('toggle-enabled')"
      >
        <font-awesome-icon :icon="isEnabled ? 'fa-solid fa-toggle-on' : 'fa-solid fa-toggle-off'" />
      </button>
      <button
        class="sub-item-action sub-item-action--danger"
        :aria-label="$t('subPage.actions.delete')"
        :title="$t('subPage.actions.delete')"
        @click.stop="emit('delete')"
      >
        <font-awesome-icon icon="fa-solid fa-trash-can" />
      </button>
    </template>
    <div v-else class="sub-item-overflow" @click.stop>
      <button
        ref="overflowTriggerRef"
        type="button"
        class="sub-item-action"
        :aria-label="$t('navBar.actions.more')"
        :title="$t('navBar.actions.more')"
        aria-haspopup="menu"
        :aria-expanded="overflowMenuOpen"
        @click.stop="toggleOverflowMenu"
      >
        <font-awesome-icon icon="fa-solid fa-ellipsis" />
      </button>
      <!-- Teleport to body so sibling cards / list overflow cannot cover the menu -->
      <Teleport to="body">
        <div
          v-if="overflowMenuOpen"
          ref="overflowMenuEl"
          class="sub-item-overflow-portal"
          :style="overflowMenuStyle"
          role="menu"
          @click.stop
          @keydown="onOverflowMenuKeydown"
        >
          <button
            type="button"
            class="sub-item-overflow__item"
            role="menuitem"
            @click.stop="runOverflowAction(() => emit('open-preview'))"
          >
            <font-awesome-icon icon="fa-solid fa-eye" />
            <span>{{ $t('subPage.actions.openPreview') }}</span>
          </button>
          <button
            type="button"
            class="sub-item-overflow__item"
            role="menuitem"
            @click.stop="runOverflowAction(() => emit('edit'))"
          >
            <font-awesome-icon icon="fa-solid fa-pen-to-square" />
            <span>{{ $t('subPage.actions.edit') }}</span>
          </button>
          <button
            type="button"
            class="sub-item-overflow__item"
            role="menuitem"
            @click.stop="runOverflowAction(() => emit('copy-config'))"
          >
            <font-awesome-icon icon="fa-solid fa-clone" />
            <span>{{ $t('subPage.actions.cloneConfig') }}</span>
          </button>
          <button
            type="button"
            class="sub-item-overflow__item"
            role="menuitem"
            @click.stop="runOverflowAction(() => emit('open-download'))"
          >
            <font-awesome-icon icon="fa-solid fa-file-export" />
            <span>{{ $t('subPage.actions.openDownload') }}</span>
          </button>
          <button
            v-if="type === 'sub'"
            type="button"
            class="sub-item-overflow__item"
            role="menuitem"
            @click.stop="runOverflowAction(() => emit('refresh'))"
          >
            <font-awesome-icon icon="fa-solid fa-arrow-rotate-right" />
            <span>{{ $t('subPage.actions.refresh') }}</span>
          </button>
          <button
            type="button"
            class="sub-item-overflow__item"
            role="menuitem"
            @click.stop="runOverflowAction(() => emit('toggle-enabled'))"
          >
            <font-awesome-icon :icon="isEnabled ? 'fa-solid fa-toggle-on' : 'fa-solid fa-toggle-off'" />
            <span>{{ $t(isEnabled ? 'subPage.actions.disable' : 'subPage.actions.enable') }}</span>
          </button>
          <button
            type="button"
            class="sub-item-overflow__item sub-item-overflow__item--danger"
            role="menuitem"
            @click.stop="runOverflowAction(() => emit('delete'))"
          >
            <font-awesome-icon icon="fa-solid fa-trash-can" />
            <span>{{ $t('subPage.actions.delete') }}</span>
          </button>
        </div>
      </Teleport>
    </div>
  </div>
</template>

<script setup lang="ts">
import { nextTick, onBeforeUnmount, onMounted, ref, type CSSProperties } from "vue";

defineProps<{
  type: "sub" | "collection";
  isDesktop: boolean;
  isSimpleMode: boolean;
  isEnabled: boolean;
}>();

const emit = defineEmits<{
  (e: "copy-link"): void;
  (e: "open-preview"): void;
  (e: "edit"): void;
  (e: "copy-config"): void;
  (e: "open-download"): void;
  (e: "refresh"): void;
  (e: "toggle-enabled"): void;
  (e: "delete"): void;
}>();

/** Mobile: collapse secondary card actions into a compact overflow menu */
const overflowMenuOpen = ref(false);
const overflowTriggerRef = ref<HTMLElement | null>(null);
const overflowMenuEl = ref<HTMLElement | null>(null);
const overflowMenuStyle = ref<CSSProperties>({});

const updateOverflowMenuPosition = () => {
  const el = overflowTriggerRef.value;
  if (!el) return;
  const rect = el.getBoundingClientRect();
  const menuWidth = 176;
  const gap = 6;
  // Prefer below the button; flip above when near the bottom of the viewport
  const spaceBelow = window.innerHeight - rect.bottom;
  const openUpward = spaceBelow < 200 && rect.top > spaceBelow;
  const left = Math.min(
    Math.max(8, rect.right - menuWidth),
    window.innerWidth - menuWidth - 8,
  );
  overflowMenuStyle.value = {
    position: "fixed",
    left: `${left}px`,
    zIndex: 12000,
    ...(openUpward
      ? { bottom: `${window.innerHeight - rect.top + gap}px`, top: "auto" }
      : { top: `${rect.bottom + gap}px`, bottom: "auto" }),
  };
};

const overflowMenuItems = () =>
  Array.from(overflowMenuEl.value?.querySelectorAll<HTMLElement>("[role=menuitem]") ?? []);

const focusOverflowItem = (index: number) => {
  const items = overflowMenuItems();
  if (!items.length) return;
  items[(index + items.length) % items.length].focus();
};

const toggleOverflowMenu = async () => {
  if (overflowMenuOpen.value) {
    closeOverflowMenu(true);
    return;
  }
  overflowMenuOpen.value = true;
  await nextTick();
  updateOverflowMenuPosition();
  /* The menu is teleported to the end of the body, so Tab would leave it
     behind; focus moves in instead. */
  focusOverflowItem(0);
};
const closeOverflowMenu = (returnFocus = false) => {
  if (!overflowMenuOpen.value) return;
  overflowMenuOpen.value = false;
  if (returnFocus) overflowTriggerRef.value?.focus();
};

/** Menu-button keys: arrows walk the items, Escape returns to the trigger. */
const onOverflowMenuKeydown = (event: KeyboardEvent) => {
  const items = overflowMenuItems();
  const current = items.indexOf(document.activeElement as HTMLElement);
  switch (event.key) {
    case "ArrowDown":
      event.preventDefault();
      focusOverflowItem(current + 1);
      break;
    case "ArrowUp":
      event.preventDefault();
      focusOverflowItem(current - 1);
      break;
    case "Home":
      event.preventDefault();
      focusOverflowItem(0);
      break;
    case "End":
      event.preventDefault();
      focusOverflowItem(items.length - 1);
      break;
    case "Escape":
      event.preventDefault();
      closeOverflowMenu(true);
      break;
    case "Tab":
      closeOverflowMenu();
      break;
  }
};
const runOverflowAction = (action: () => void) => {
  closeOverflowMenu();
  action();
};
const onDocumentPointerDown = (event: Event) => {
  if (!overflowMenuOpen.value) return;
  const target = event.target as HTMLElement | null;
  if (
    target?.closest?.(".sub-item-overflow") ||
    target?.closest?.(".sub-item-overflow-portal")
  ) {
    return;
  }
  closeOverflowMenu();
};
const onViewportChange = () => {
  if (!overflowMenuOpen.value) return;
  updateOverflowMenuPosition();
};
onMounted(() => {
  document.addEventListener("pointerdown", onDocumentPointerDown, true);
  window.addEventListener("resize", onViewportChange, { passive: true });
  window.addEventListener("scroll", onViewportChange, { passive: true, capture: true });
});
onBeforeUnmount(() => {
  document.removeEventListener("pointerdown", onDocumentPointerDown, true);
  window.removeEventListener("resize", onViewportChange);
  window.removeEventListener("scroll", onViewportChange, true);
});
</script>

<style scoped>
.sub-item-menu {
  position: relative;
  top: 0;
  padding: 0;
  border-radius: var(--radius-lg, var(--item-card-radios));
  display: flex;
  align-items: center;
  gap: 2px;
  flex-shrink: 0;

  &.simple-mode {
    position: relative;
    top: 0;
  }

  /* Mobile compact: copy + more — larger hit targets */
  &.is-compact {
    gap: 6px;

    & .sub-item-action {
      width: 40px;
      height: 40px;
      border-radius: var(--radius-md);
    }
  }
}

.sub-item-action {
  width: 30px;
  height: 30px;
  padding: 0;
  border: 1px solid transparent;
  border-radius: var(--radius-md);
  background: transparent;
  color: color-mix(in srgb, var(--comment-text-color) 82%, transparent);
  cursor: pointer;
  display: inline-flex;
  justify-content: center;
  align-items: center;
  transition: transform 160ms cubic-bezier(0.23, 1, 0.32, 1), background-color 160ms ease, color 160ms ease, border-color 160ms ease;

  & svg {
    width: 14px;
    height: 14px;
  }

  .sub-item-action__label {
    display: inline;
    font-size: var(--text-xs);
    font-weight: 600;
    line-height: 1;
    white-space: nowrap;
  }

  @media (hover: hover) and (pointer: fine) {
    &:hover {
      background: color-mix(in srgb, var(--primary-color) 8%, transparent);
      color: var(--primary-color);
    }
  }

  &:active {
    transform: scale(0.94);
  }

  /* Copy link: a quiet chip, not a filled button — the only emphasised action */
  &.sub-item-action--primary {
    width: auto;
    padding: 0 10px;
    gap: 6px;
    background: color-mix(in srgb, var(--primary-color) 8%, transparent);
    color: var(--primary-color);
    border-color: color-mix(in srgb, var(--primary-color) 26%, transparent);
  }

  @media (hover: hover) and (pointer: fine) {
    &.sub-item-action--primary:hover {
      background: color-mix(in srgb, var(--primary-color) 14%, transparent);
      border-color: color-mix(in srgb, var(--primary-color) 40%, transparent);
      color: var(--primary-color);
    }
  }

  &.sub-item-action--danger {
    color: var(--comment-text-color);
  }

  @media (hover: hover) and (pointer: fine) {
    &.sub-item-action--danger:hover {
      background: color-mix(in srgb, #ef4444 14%, transparent);
      color: #ef4444;
      border-color: color-mix(in srgb, #ef4444 30%, transparent);
    }
  }
}

.sub-item-menu__divider {
  width: 1px;
  height: 18px;
  flex: 0 0 1px;
  margin: 0 2px;
  background: var(--divider-color);
}

/* Keeps the source/collection action strips in the same columns. */
.sub-item-action-placeholder {
  width: 30px;
  height: 30px;
  flex: 0 0 30px;
}

/* Mobile compact: copy + more — larger hit targets */
.sub-item-menu.is-compact {
  & .sub-item-menu__divider {
    display: none;
  }

  /* The label widens the copy chip; the 40px compact square still sets the
     height and the minimum width. */
  & .sub-item-action--primary {
    width: auto;
    min-width: 40px;
    padding: 0 10px;
  }
}

/* At 320px the label and the title compete for the same row; the title wins.
   The chain icon still says "copy". */
@media screen and (max-width: 360px) {
  .sub-item-action--primary .sub-item-action__label {
    display: none;
  }
}

.sub-item-overflow {
  position: relative;
  display: flex;
  align-items: center;
}
/* Body-teleported overflow menu — lives above list cards */
.sub-item-overflow-portal {
  box-sizing: border-box;
  min-width: 176px;
  padding: 6px;
  border-radius: var(--radius-lg);
  border: 1px solid var(--divider-color);
  background: var(--popup-color, var(--card-color));
  box-shadow: 0 12px 36px rgba(0, 0, 0, 0.22);
  backdrop-filter: blur(12px);
  -webkit-backdrop-filter: blur(12px);
}

.sub-item-overflow__item {
  width: 100%;
  display: flex;
  align-items: center;
  gap: 10px;
  min-height: 40px;
  padding: 8px 12px;
  border: 0;
  border-radius: var(--radius-md);
  background: transparent;
  color: var(--primary-text-color);
  font-size: 13px;
  font-weight: 500;
  text-align: left;
  cursor: pointer;
  white-space: nowrap;
  transition: background-color 0.15s ease, color 0.15s ease;

  & svg {
    width: 14px;
    height: 14px;
    flex-shrink: 0;
    color: var(--comment-text-color);
  }

  &:active {
    background: rgba(148, 163, 184, 0.14);
    transform: none;
  }

  &:focus-visible {
    outline: none;
    box-shadow: 0 0 0 2px var(--focus-ring-color);
  }

  @media (hover: hover) and (pointer: fine) {
    &:hover {
      background: rgba(148, 163, 184, 0.12);
    }
  }
}

.sub-item-overflow__item--danger {
  color: #ef4444;

  & svg {
    color: #ef4444;
  }

  @media (hover: hover) and (pointer: fine) {
    &:hover {
      background: rgba(239, 68, 68, 0.1);
      color: #dc2626;

      & svg {
        color: #dc2626;
      }
    }
  }
}
</style>
