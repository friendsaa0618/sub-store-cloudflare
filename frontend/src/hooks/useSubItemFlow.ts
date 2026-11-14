import dayjs from "dayjs";
import { storeToRefs } from "pinia";
import { computed, toRaw } from "vue";
import { useI18n } from "vue-i18n";

import { useGlobalStore } from "@/store/global";
import { useSettingsStore } from "@/store/settings";
import { useSubsStore } from "@/store/subs";
import { getString } from "@/utils/flowTransfer";

export type SubItemFlow = string | {
  planName?: string;
  appUrl?: string;
  firstLine: string;
  secondLine: string;
  progress?: number;
};

type SubItemFlowProps = {
  type: "sub" | "collection";
  sub?: Sub;
};

/**
 * The flow line, status dot and progress bar of a subscription card. A
 * collection has no flow of its own, so it keeps the neutral online dot.
 */
export const useSubItemFlow = (props: SubItemFlowProps) => {
  const { t } = useI18n();
  const subsStore = useSubsStore();
  const globalStore = useGlobalStore();
  const settingsStore = useSettingsStore();
  const { flows } = storeToRefs(subsStore);
  const { isFlowFetching } = storeToRefs(globalStore);
  const { appearanceSetting } = storeToRefs(settingsStore);

  const flow = computed<SubItemFlow | undefined>(() => {
    if (props.type === "sub" && props.sub) {
      const urlList = Object.keys(flows.value);
      if (props.sub.source === "local" && !props.sub.subUserinfo) return t("subPage.subItem.local");
      if (isFlowFetching.value && !urlList.includes(props.sub.url))
        return t("subPage.subItem.loading");

      const target = toRaw(
        flows.value[props.sub.url] || flows.value[props.sub.name],
      );
      if (!target) {
        return {
          firstLine: t("subPage.subItem.noRecord"),
          secondLine: ``,
        };
      }
      if (!target?.status) {
        return {
          firstLine: t("subPage.subItem.flowError"),
          secondLine: ``,
        };
      }

      if (target.status === "noFlow") {
        return {
          firstLine: t("subPage.subItem.noFlow"),
          secondLine: ``,
        };
      } else if (target.status === "success" && target.data?.usage) {
        let {
          planName,
          appUrl,
          remainingDays,
          expires,
          total,
          usage: { upload, download },
        } = target.data;
        if (target.hideExpire) expires = undefined;
        let progress = 0;
        try {
          progress = 1 - (upload + download) / total;
          progress = Number.parseFloat(progress.toFixed(2));
        } catch (e) {}
        if (!(progress > 0)) {
          progress = 0;
        }
        let secondLine: string;
        if (appearanceSetting.value.isSimpleMode) {
          secondLine = remainingDays
            ? `${remainingDays}${t("subPage.subItem.remainingDaysUnit")}`
            : "";
          const expiresInfo = !expires
            ? ""
            : `${dayjs.unix(expires).format("YYYY-MM-DD HH:mm")}`;
          if (expiresInfo) {
            secondLine = secondLine
              ? `${secondLine} | ${expiresInfo}`
              : expiresInfo;
          }
          return {
            planName,
            appUrl,
            firstLine: `${getString(
              target.showRemaining
                ? total - upload - download
                : upload + download,
              total,
              "B",
            )}`,
            secondLine,
            progress,
          };
        } else {
          secondLine = remainingDays
            ? `${t("subPage.subItem.remainingDays")}${t(
                "specificWord.labelSeparator",
              )}${remainingDays}${t("subPage.subItem.remainingDaysUnit")}`
            : "";
          let expiresInfo = !expires
            ? t("subPage.subItem.noExpiresInfo")
            : `${t("subPage.subItem.expires")}${t(
                "specificWord.labelSeparator",
              )}${dayjs.unix(expires).format("YYYY-MM-DD HH:mm")}`;
          if (target.hideExpire) {
            expiresInfo = "";
          }
          if (expiresInfo) {
            secondLine = secondLine
              ? `${secondLine} | ${expiresInfo}`
              : expiresInfo;
          }
          return {
            planName,
            appUrl,
            firstLine: `${t(
              target.showRemaining
                ? "subPage.subItem.showRemainingFlow"
                : "subPage.subItem.flow",
            )}${t("specificWord.labelSeparator")}${getString(
              target.showRemaining
                ? total - upload - download
                : upload + download,
              total,
              "B",
            )}`,
            secondLine,
            progress,
          };
        }
      } else if (target?.status === "failed") {
        if (target.error.code === "NO_FLOW_INFO") {
          return {
            firstLine: t("subPage.subItem.noFlowInfo"),
            secondLine: ``,
          };
        } else {
          // A failed refresh can arrive without an error type (network error,
          // 401); never print `undefined` in the card.
          const reason = target.error?.type || target.error?.code || "";
          const message = target.error?.message || "";
          return {
            firstLine: reason
              ? `⚠️ ${reason}`
              : message
                ? `⚠️ ${message}`
                : t("subPage.subItem.noFlowInfo"),
            secondLine: reason ? message : ``,
          };
        }
      }
      return {
        firstLine: t("subPage.subItem.noFlowInfo"),
        secondLine: ``,
      };
    }
    return undefined;
  });

  const statusDotClass = computed(() => {
    if (props[props.type]?.enabled === false) return 'is-disabled';
    if (isFlowFetching.value && typeof flow.value === 'string') return 'is-fetching';
    if (typeof flow.value === 'object') {
      if (flow.value.progress !== undefined && flow.value.progress < 0.1) return 'is-warning';
      if (flow.value.firstLine === t("subPage.subItem.flowError")) return 'is-error';
    }
    return 'is-online';
  });

  return { flow, statusDotClass };
};
