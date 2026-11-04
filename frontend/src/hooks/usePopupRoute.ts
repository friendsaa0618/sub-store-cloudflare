import { useEventListener } from "@vueuse/core";
import type { Ref } from "vue";
import { watch } from "vue";

import {
  isPopupHistoryState,
  pushPopupHistoryState,
} from "@/utils/popupHistory";

export const usePopupRoute = (
  popupController: Ref<boolean>,
  options?: { rewindOnClose?: boolean },
) => {
  /** Did we push the history entry that opened this popup? */
  let pushedByUs = false;
  /** Our own history.back() is in flight; ignore the popstate it fires. */
  let rewindInFlight = false;

  // 监听打开弹窗，添加一条路由记录
  watch(popupController, (open) => {
    if (open) {
      if (!isPopupHistoryState()) {
        pushPopupHistoryState();
        pushedByUs = true;
      }
      return;
    }

    // Closed by the UI rather than by Back. Rewind the entry we pushed so the
    // Back button still leaves the page; the compare overlay does its own
    // router.back(), so only opt-in components rewind here.
    if (
      options?.rewindOnClose &&
      pushedByUs &&
      isPopupHistoryState()
    ) {
      pushedByUs = false;
      rewindInFlight = true;
      window.history.back();
    }
  });

  // 监听浏览器的 popstate 事件关闭弹窗
  useEventListener(window, "popstate", (event) => {
    if (rewindInFlight) {
      rewindInFlight = false;
      return;
    }

    if (!popupController.value) return;

    if (isPopupHistoryState((event as PopStateEvent).state ?? {})) return;

    pushedByUs = false;
    popupController.value = false;
  });
};