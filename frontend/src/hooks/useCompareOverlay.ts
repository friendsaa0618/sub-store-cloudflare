import { ref } from "vue";
import { useRoute, useRouter } from "vue-router";

import { usePopupRoute } from "@/hooks/usePopupRoute";
import { useGlobalStore } from "@/store/global";

/**
 * Full-screen compare overlay shared by the editor and the list card.
 *
 * The overlay is a popup route: Back closes it instead of leaving the page.
 * Opening it locks the page scroll and remembers where the user was, so
 * closing can put the list back exactly where it was.
 */
export const useCompareOverlay = () => {
  const router = useRouter();
  const route = useRoute();
  const globalStore = useGlobalStore();

  const compareTableIsVisible = ref(false);
  const compareData = ref();
  usePopupRoute(compareTableIsVisible);

  let scrollTop = 0;

  const openComparePanel = () => {
    scrollTop = document.documentElement.scrollTop || document.body.scrollTop;
    globalStore.setSavedPositions(route.path, { left: 0, top: scrollTop });

    document.querySelector("html").style["overflow-y"] = "hidden";
    document.querySelector("html").style.height = "100%";
    document.body.style.height = "100%";
    document.body.style["overflow-y"] = "hidden";
    (document.querySelector("#app") as HTMLElement).style["overflow-y"] = "hidden";
    (document.querySelector("#app") as HTMLElement).style.height = "100%";

    compareTableIsVisible.value = true;
  };

  const closeCompare = () => {
    document.querySelector("html").style["overflow-y"] = "";
    document.querySelector("html").style.height = "";
    document.body.style.height = "";
    document.body.style["overflow-y"] = "";
    (document.querySelector("#app") as HTMLElement).style["overflow-y"] = "";
    (document.querySelector("#app") as HTMLElement).style.height = "";

    compareTableIsVisible.value = false;

    window.scrollTo({
      top: scrollTop,
      behavior: "instant" as any,
    });

    router.back();
  };

  return {
    compareTableIsVisible,
    compareData,
    openComparePanel,
    closeCompare,
  };
};
