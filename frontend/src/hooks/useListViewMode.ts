import { storeToRefs } from "pinia";
import { computed } from "vue";
import { useRoute } from "vue-router";

import { useListPageViewStore } from "@/store/listPageView";
import { useSettingsStore } from "@/store/settings";
import { useSystemStore } from "@/store/system";

// Dual-column once viewport is wide enough for two cards inside the
// centered content column ($content-max-width: 1024px).
export const LIST_VIEW_MODE_BREAKPOINT = 900;

export const useListViewMode = () => {
  const route = useRoute();
  const listPageViewStore = useListPageViewStore();
  const systemStore = useSystemStore();

  const { singleColumnLockRoutePath } = storeToRefs(listPageViewStore);
  const settingsStore = useSettingsStore();
  const { screenWidth } = storeToRefs(systemStore);

  const supportsListViewMode = computed(() => Boolean(route.meta?.supportsListViewMode));
  const isWideListViewport = computed(() => screenWidth.value >= LIST_VIEW_MODE_BREAKPOINT);
  const isListViewModeLockedBySelection = computed(() => {
    return supportsListViewMode.value && isWideListViewport.value && singleColumnLockRoutePath.value === route.path;
  });

  const effectiveListViewMode = computed<ListPageViewMode>(() => {
    if (!supportsListViewMode.value || !isWideListViewport.value || isListViewModeLockedBySelection.value) {
      return "single-column";
    }

    const appearance = settingsStore.appearanceSetting;
    /* Narrow layout on a wide screen leaves no room for two columns. */
    if (appearance.useNarrowModeOnWideScreen) {
      return appearance.listPageViewModeInWideScreenNarrowMode ?? "single-column";
    }

    return appearance.listPageViewMode ?? "dual-column";
  });

  return {
    supportsListViewMode,
    isWideListViewport,
    isListViewModeLockedBySelection,
    effectiveListViewMode,
  };
};
