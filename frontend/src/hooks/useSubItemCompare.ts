import { useI18n } from "vue-i18n";

import { useCloudflareApi } from "@/api/app";
import { useCompareOverlay } from "@/hooks/useCompareOverlay";
import { useSubsStore } from "@/store/subs";
import { dismissNotify, notifyLoading } from "@/utils/notify";

type SubItemCompareProps = {
  type: "sub" | "collection";
  sub?: Sub;
  collection?: Collection;
};

/**
 * Compare panel for a subscription card: load the item's preview data, open
 * the overlay, and reload the latest item before a manual refresh.
 */
export const useSubItemCompare = (
  props: SubItemCompareProps,
  refreshSubFlowsIfNeeded: () => Promise<void>,
) => {
  const { t } = useI18n();
  const cloudflareApi = useCloudflareApi();
  const subsStore = useSubsStore();
  const {
    compareTableIsVisible,
    compareData,
    openComparePanel,
    closeCompare,
  } = useCompareOverlay();

  const name = props[props.type].name;

  const fetchCompareData = async (data?: any) => {
    notifyLoading(t("comparePage.loading"), "compare");
    try {
      const res = await cloudflareApi.previewItem(
        props.type,
        data ?? props.sub ?? props.collection,
      );
      if (res?.data?.status === "success") {
        compareData.value = res.data.data;
      } else {
        compareData.value = null;
      }
    } catch (e) {
      console.error(e);
      compareData.value = null;
    }
    await refreshSubFlowsIfNeeded();

    dismissNotify("compare");
  };

  const compareSub = async () => {
    await fetchCompareData();
    openComparePanel();
  };

  const refreshCompare = async () => {
    try {
      // 重新获取最新订阅/组合订阅信息
      const type = props.type === "collection" ? "collection" : "sub";
      const infoRes = await cloudflareApi.getOne(type, name);
      const latestData = (infoRes?.data?.status === "success" ? infoRes.data.data : null) ?? (props.sub ?? props.collection);
      await fetchCompareData(latestData);
      // 同步更新 store，使进入编辑器时数据一致
      subsStore.setOneData(props.type === "collection" ? "collections" : "subs", name, latestData);
    } catch (e) {
      console.error(e);
      compareData.value = null;
      dismissNotify("compare");
    }
  };

  return {
    compareTableIsVisible,
    compareData,
    compareSub,
    refreshCompare,
    closeCompare,
  };
};
