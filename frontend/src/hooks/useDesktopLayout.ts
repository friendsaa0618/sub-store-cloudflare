import { computed } from "vue";
import { useMediaQuery } from "@vueuse/core";

import { useSettingsStore } from "@/store/settings";
import { SIDEBAR_BREAKPOINT } from "@/store/system";

/**
 * "Desktop layout" means a wide viewport, unless the user asked for the narrow
 * (phone) layout on wide screens — that setting used to be stored and ignored.
 */
export const useDesktopLayout = () => {
  const isWideViewport = useMediaQuery(`(min-width: ${SIDEBAR_BREAKPOINT}px)`);
  const settingsStore = useSettingsStore();

  return computed(
    () => isWideViewport.value && !settingsStore.appearanceSetting.useNarrowModeOnWideScreen,
  );
};
