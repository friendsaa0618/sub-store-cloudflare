import { onBeforeUnmount, onMounted, ref, watch, type Ref } from "vue";
import { onBeforeRouteLeave } from "vue-router";
import { useI18n } from "vue-i18n";

import { showDialog } from "@/utils/dialog";

type UseUnsavedChangesOptions = {
  /** Reactive sources whose deep changes mark the form dirty. */
  sources: () => unknown[];
  /** Loading fills the form; only edits after that count as changes. */
  isReady: Ref<boolean>;
};

/**
 * Tracks unsaved edits and guards both in-app navigation and tab close.
 */
export const useUnsavedChanges = ({ sources, isReady }: UseUnsavedChangesOptions) => {
  const { t } = useI18n();
  const isDirty = ref(false);

  const markClean = () => {
    isDirty.value = false;
  };
  const markDirty = () => {
    if (!isReady.value) return;
    isDirty.value = true;
  };

  watch(sources, () => markDirty(), { deep: true });

  onBeforeRouteLeave(() => {
    if (!isDirty.value) return true;
    return new Promise<boolean>((resolve) => {
      showDialog({
        title: t("editorPage.subConfig.pop.leaveConfirmTitle"),
        content: t("editorPage.subConfig.pop.leaveContent"),
        okText: t("editorPage.subConfig.pop.leaveConfirm"),
        cancelText: t("editorPage.subConfig.pop.leaveCancel"),
        onOk: () => resolve(true),
        onCancel: () => resolve(false),
      });
    });
  });

  const onBeforeUnload = (event: BeforeUnloadEvent) => {
    if (!isDirty.value) return;
    event.preventDefault();
    event.returnValue = "";
  };

  onMounted(() => {
    window.addEventListener("beforeunload", onBeforeUnload);
  });
  onBeforeUnmount(() => {
    window.removeEventListener("beforeunload", onBeforeUnload);
  });

  return { isDirty, markClean, markDirty };
};
