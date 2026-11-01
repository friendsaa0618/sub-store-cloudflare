<template>
  <Teleport to="body">
    <dialog
      ref="dialogEl"
      class="app-popup"
      :class="`is-${position}`"
      :style="{ zIndex }"
      @cancel.prevent="requestClose"
      @click="onBackdropClick"
      @close="onNativeClose"
    >
      <div
        class="app-popup__panel"
        :class="[popClass, { 'is-round': round }]"
        :style="panelStyle"
      >
        <button
          v-if="closeable"
          type="button"
          class="app-popup__close"
          :aria-label="t('specificWord.close')"
          @click="requestClose"
        >
          <font-awesome-icon icon="fa-solid fa-xmark" aria-hidden="true" />
        </button>
        <slot />
      </div>
    </dialog>
  </Teleport>
</template>

<script setup lang="ts">
import { nextTick, onBeforeUnmount, ref, watch } from "vue";
import { useI18n } from "vue-i18n";

const props = withDefaults(
  defineProps<{
    visible?: boolean;
    position?: "center" | "bottom";
    round?: boolean;
    closeable?: boolean;
    closeOnClickOverlay?: boolean;
    popClass?: string;
    panelStyle?: Record<string, string> | string;
    zIndex?: number;
  }>(),
  {
    visible: false,
    position: "center",
    closeable: false,
    closeOnClickOverlay: true,
    zIndex: 1100,
  },
);

const emit = defineEmits<{
  (e: "update:visible", value: boolean): void;
  (e: "opened"): void;
  (e: "closed"): void;
}>();

const { t } = useI18n();
const dialogEl = ref<HTMLDialogElement | null>(null);
let lockCount = 0;
let locked = false;

const lockScroll = () => {
  if (locked) {
    return;
  }
  locked = true;
  lockCount += 1;
  if (lockCount === 1) {
    document.documentElement.classList.add("app-scroll-locked");
  }
};

const unlockScroll = () => {
  if (!locked) {
    return;
  }
  locked = false;
  lockCount = Math.max(0, lockCount - 1);
  if (lockCount === 0) {
    document.documentElement.classList.remove("app-scroll-locked");
  }
};

const open = async () => {
  await nextTick();
  const el = dialogEl.value;
  if (!el || el.open) {
    return;
  }
  el.showModal();
  lockScroll();
  emit("opened");
};

const close = () => {
  const el = dialogEl.value;
  if (!el || !el.open) {
    return;
  }
  el.close();
};

const requestClose = () => {
  emit("update:visible", false);
};

const onNativeClose = () => {
  unlockScroll();
  emit("closed");
  if (props.visible) {
    emit("update:visible", false);
  }
};

const onBackdropClick = (event: MouseEvent) => {
  if (!props.closeOnClickOverlay) {
    return;
  }
  if (event.target === dialogEl.value) {
    requestClose();
  }
};

watch(
  () => props.visible,
  (visible) => {
    if (visible) {
      void open();
    } else {
      close();
    }
  },
  { immediate: true },
);

onBeforeUnmount(() => {
  if (dialogEl.value?.open) {
    dialogEl.value.close();
  }
  unlockScroll();
});
</script>

<style>
.app-scroll-locked {
  overflow: hidden;
}

.app-popup {
  position: fixed;
  inset: 0;
  width: 100%;
  height: 100%;
  max-width: none;
  max-height: none;
  margin: 0;
  padding: 0;
  border: 0;
  background: transparent;
  color: var(--primary-text-color);
  overflow: hidden;

  &::backdrop {
    background: rgba(0, 0, 0, 0.5);
    backdrop-filter: blur(var(--overlay-blur)) saturate(180%);
    -webkit-backdrop-filter: blur(var(--overlay-blur)) saturate(180%);
  }
}

.app-popup__panel {
  position: absolute;
  box-sizing: border-box;
  background: var(--popup-color);
  color: var(--primary-text-color);
  border: 1px solid var(--divider-color);
  box-shadow: 0 24px 64px -12px rgba(0, 0, 0, 0.28);
  overflow-y: auto;
  overscroll-behavior: contain;
}

.app-popup.is-center .app-popup__panel {
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  width: min(560px, 94vw);
  max-height: min(86vh, 720px);
  padding: 20px;
  border-radius: var(--radius-lg);
}

.app-popup.is-bottom .app-popup__panel {
  right: 0;
  bottom: 0;
  left: 0;
  width: 100%;
  max-height: 88vh;
  padding: 12px 18px calc(18px + env(safe-area-inset-bottom));
  border-bottom: 0;
  border-radius: var(--radius-lg) var(--radius-lg) 0 0;
  box-shadow: 0 -12px 40px -8px rgba(0, 0, 0, 0.22);
}

.app-popup__close {
  position: absolute;
  top: 12px;
  right: 12px;
  z-index: 1;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 30px;
  height: 30px;
  padding: 0;
  border: 0;
  border-radius: var(--radius-full);
  background: transparent;
  color: var(--comment-text-color);
  font-size: 15px;
  cursor: pointer;

  &:hover {
    background: var(--divider-color);
    color: var(--primary-text-color);
  }

  &:focus-visible {
    outline: none;
    box-shadow: 0 0 0 2px var(--focus-ring-color);
  }
}

@media (prefers-reduced-motion: reduce) {
  .app-popup::backdrop {
    backdrop-filter: none;
    -webkit-backdrop-filter: none;
  }
}
</style>
