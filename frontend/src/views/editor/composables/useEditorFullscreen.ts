import { computed, onBeforeUnmount, onMounted, ref } from "vue";

import { usePopupRoute } from "@/hooks/usePopupRoute";

/**
 * Full-screen source editing: `isDis` switches between the form and the
 * full-screen code editor, Escape leaves the mode, and Back rewinds the popup
 * route instead of leaving the editor.
 */
export const useEditorFullscreen = () => {
  const isDis = ref(true);

  /* 全屏编辑 is a full-screen mode like the compare overlay: Back should leave
     the mode, not the editor. */
  const isFullscreenEditing = computed({
    get: () => !isDis.value,
    set: (value: boolean) => {
      isDis.value = !value;
    },
  });
  usePopupRoute(isFullscreenEditing, { rewindOnClose: true });

  /* Every other overlay closes on Escape; the full-screen editor should too.
     A key CodeMirror already handled (its search panel) is left alone. */
  const onFullscreenEscape = (event: KeyboardEvent) => {
    if (event.key !== "Escape" || isDis.value || event.defaultPrevented) return;
    isDis.value = true;
  };

  onMounted(() => window.addEventListener("keydown", onFullscreenEscape));
  onBeforeUnmount(() => window.removeEventListener("keydown", onFullscreenEscape));

  return { isDis };
};
