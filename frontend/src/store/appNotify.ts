import { defineStore } from "pinia";
import { notify } from "@/utils/notify";

export const useAppNotifyStore = defineStore("appNotify", {
  state: (): AppNotifyStoreState => {
    return {
      navBartop: 0,
    };
  },
  getters: {},
  actions: {
    showNotify(settings: NotifySettings) {
      notify(settings);
    },
  },
});
