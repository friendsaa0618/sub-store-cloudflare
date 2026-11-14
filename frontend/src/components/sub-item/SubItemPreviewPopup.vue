<template>
  <!-- Desktop: centered modal · Mobile: bottom sheet (no right drawer) -->
  <AppPopup
    :visible="visible"
    :position="previewPopupPosition"
    :pop-class="previewPopupClass"
    :round="!isDesktop"
    closeable
    :panel-style="previewPopupStyle"
    @update:visible="emit('update:visible', $event)"
  >
    <div class="preview-panel-shell">
      <div v-if="!isDesktop" class="preview-sheet-handle" aria-hidden="true" />
      <header class="preview-panel-header">
        <h3 class="preview-panel-title">{{ $t('subPage.previewTitle') }}</h3>
        <p v-if="displayName || name" class="preview-panel-subtitle">
          {{ displayName || name }}
        </p>
      </header>
      <div class="preview-panel-body">
        <PreviewPanel
          v-if="visible"
          :name="name"
          :display-name="displayName"
          :type="type"
          :general="$t('subPage.panel.general')"
          :notify="$t('subPage.copyNotify.succeed')"
          :desc="$t('subPage.panel.tips.desc')"
        />
      </div>
    </div>
  </AppPopup>
</template>

<script setup lang="ts">
import { computed, defineAsyncComponent } from "vue";

/* The panel sits behind v-if, so keep its code out of the /subs entry chunk. */
const PreviewPanel = defineAsyncComponent(() => import("@/components/PreviewPanel.vue"));

const props = defineProps<{
  visible: boolean;
  name: string;
  displayName: string;
  type: "sub" | "collection";
  isDesktop: boolean;
}>();

const emit = defineEmits<{
  (e: "update:visible", value: boolean): void;
}>();

/** Desktop Modal · Mobile Bottom Sheet */
const previewPopupPosition = computed(() => (props.isDesktop ? "center" : "bottom"));
const previewPopupClass = computed(() =>
  props.isDesktop ? "preview-modal-popup" : "preview-sheet-popup",
);
const previewPopupStyle = computed(() => {
  if (props.isDesktop) {
    return {
      /* Wide enough for the two-column target grid, so the list fits without
         scrolling inside the modal. */
      width: "min(560px, 92vw)",
      maxHeight: "min(80vh, 720px)",
      borderRadius: "16px",
      overflow: "hidden",
    };
  }
  return {
    width: "100%",
    /* The fourteen targets fit without scrolling on a standard phone. dvh so
       the sheet's top stays below the URL bar when it is showing. */
    maxHeight: "88dvh",
    borderRadius: "16px 16px 0 0",
    overflow: "hidden",
  };
});
</script>

<style scoped>
/* Preview copy panel shell (lives inside teleported popup) */
.preview-panel-shell {
  display: flex;
  flex-direction: column;
  max-height: inherit;
  min-height: 0;
  box-sizing: border-box;
  background: var(--popup-color, var(--card-color));
  color: var(--primary-text-color);
}

.preview-sheet-handle {
  width: 36px;
  height: 4px;
  margin: 10px auto 0;
  border-radius: var(--radius-full);
  background: color-mix(in srgb, var(--comment-text-color) 28%, transparent);
  flex-shrink: 0;
}

.preview-panel-header {
  flex-shrink: 0;
  padding: 18px 44px 12px 18px;
  border-bottom: 1px solid var(--divider-color);
}

.preview-panel-title {
  margin: 0;
  font-size: 16px;
  font-weight: 650;
  letter-spacing: -0.015em;
  color: var(--primary-text-color);
  line-height: 1.3;
}

.preview-panel-subtitle {
  margin: 4px 0 0;
  font-size: 12px;
  color: var(--comment-text-color);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.preview-panel-body {
  flex: 1 1 auto;
  min-height: 0;
  overflow: auto;
  padding: 12px 16px calc(14px + env(safe-area-inset-bottom));
  -webkit-overflow-scrolling: touch;
}
</style>
