import { computed, toRaw } from "vue";
import { useI18n } from "vue-i18n";
import { useRouter } from "vue-router";

import { useCloudflareApi } from "@/api/app";
import { DOWNLOAD_TARGET_OPTIONS } from "@/constants/subscriptionTargets";
import { useHostAPI } from "@/hooks/useHostAPI";
import { useAppNotifyStore } from "@/store/appNotify";
import { useSubsStore } from "@/store/subs";
import { useAppClipboard } from "@/utils/clipboard";
import { showDialog } from "@/utils/dialog";
import { dismissNotify, notifyLoading } from "@/utils/notify";
import { readQuickTarget } from "@/utils/quickTarget";

type SubItemActionsProps = {
  type: "sub" | "collection";
  sub?: Sub;
  collection?: Collection;
};

/**
 * Card actions: copy/download links, clone, edit, delete, refresh, enable.
 */
export const useSubItemActions = (props: SubItemActionsProps, displayName: string) => {
  const { t } = useI18n();
  const router = useRouter();
  const cloudflareApi = useCloudflareApi();
  const subsStore = useSubsStore();
  const { showNotify } = useAppNotifyStore();
  const { currentUrl: host } = useHostAPI();
  const writeClipboard = useAppClipboard();

  const name = props[props.type]?.name || "";
  const isEnabled = computed(
    () => (props[props.type] as { enabled?: boolean } | undefined)?.enabled !== false,
  );

  const targetLabel = (value: string) =>
    DOWNLOAD_TARGET_OPTIONS.find((option) => option.value === value)?.label || value;

  const resolveDownloadUrl = async (target?: string) => {
    const res = await cloudflareApi.getDownloadLink(props.type, name, target);
    return res?.data?.status === "success" && res.data.data?.url
      ? res.data.data.url
      : `${host.value}/download/${
        props.type === "collection" ? "collection/" : "source/"
      }${encodeURIComponent(name)}`;
  };

  const copyLink = async () => {
    try {
      const quickTarget = readQuickTarget();
      const url = await resolveDownloadUrl(quickTarget);
      await writeClipboard(url);
      /* Name the target when it is not the server default, so a remembered
         choice never copies something the user cannot see. */
      showNotify({
        type: "success",
        title: quickTarget
          ? t("subPage.copyNotify.succeedWithTarget", { target: targetLabel(quickTarget) })
          : t("subPage.copyNotify.succeed"),
      });
    } catch {
      /* Reported by the interceptor. */
    }
  };

  /* Every card link carries its own token, so resetting one card kills only
     the link that was handed out for it. The new token is shown once by the
     API, so copy it right away; the card's copy button returns the same one. */
  const resetLink = () => {
    showDialog({
      title: t("subPage.resetLink.title"),
      content: t("subPage.resetLink.desc", { displayName }),
      cancelText: t("specificWord.cancel"),
      okText: t("subPage.resetLink.confirm"),
      okType: "danger",
      onOk: async () => {
        const response = await cloudflareApi.resetDownloadLink(props.type, name, readQuickTarget());
        const url = response?.data?.status === "success" ? String(response.data.data?.url || "") : "";
        if (url) {
          try {
            await writeClipboard(url);
          } catch {
            /* The copy button can fetch the same new link again. */
          }
        }
        showNotify({ type: "success", title: t("subPage.resetLink.succeed") });
      },
    });
  };

  const openDownload = async () => {
    try {
      window.open(await resolveDownloadUrl(), "_blank");
    } catch {
      /* Reported by the interceptor. */
    }
  };

  const copyConfig = async () => {
    let data: Sub | Collection;
    switch (props.type) {
      case "sub":
        data = JSON.parse(JSON.stringify(toRaw(props.sub)));
        break;
      case "collection":
        data = JSON.parse(JSON.stringify(toRaw(props.collection)));
        break;
    }
    data.name += `-copy-${crypto.randomUUID().slice(0, 8)}`;

    notifyLoading(t("subPage.copyConfigNotify.loading"), "copyConfig");
    try {
      await cloudflareApi.createItem(`${props.type}s`, data);
      await subsStore.fetchSubsData();
      showNotify({ type: "success", title: t("subPage.copyConfigNotify.succeed") });
    } catch {
      /* Reported by the interceptor; the loading toast must not stay behind. */
    } finally {
      dismissNotify("copyConfig");
    }
  };

  const edit = () => {
    router.push(`/edit/${props.type}s/${encodeURIComponent(name)}`);
  };

  /* A source used by a collection cannot be deleted; the server answers 409.
     Say which collections hold it instead of surfacing that error. */
  const collectionsUsingSource = computed(() => {
    if (props.type !== "sub") return [];
    return (subsStore.collections || [])
      .filter((collection) => (collection.subscriptions || []).includes(name))
      .map((collection) => collection.displayName || collection.name);
  });

  const onDeleteConfirm = async () => {
    try {
      await subsStore.deleteItem(props.type, name, "permanent");
    } catch {
      /* Reported by the interceptor; the card stays until the delete succeeds. */
    }
  };

  const remove = () => {
    if (collectionsUsingSource.value.length > 0) {
      showDialog({
        title: t("subPage.deleteItem.blockedTitle"),
        content: t("subPage.deleteItem.blockedDesc", {
          displayName,
          collections: collectionsUsingSource.value.join("、"),
        }),
        noCancelBtn: true,
        okText: t("specificWord.confirm"),
      });
      return;
    }
    showDialog({
      title: t("subPage.deleteItem.title"),
      content: t("subPage.deleteItem.desc", { displayName }),
      cancelText: t("subPage.deleteItem.btn.cancel"),
      okText: t("subPage.deleteItem.btn.confirm"),
      okType: "danger",
      onOk: () => onDeleteConfirm(),
    });
  };

  const refreshSubFlowsIfNeeded = async () => {
    if (!props.sub) return;
    try {
      await subsStore.fetchFlows([props.sub]);
    } catch (e) {
      console.error(e);
    }
  };

  /* The API and the card's status dot already know about `enabled`, but nothing
     in the UI could set it — a source imported as disabled stayed that way. */
  const toggleEnabled = async () => {
    const next = !isEnabled.value;
    try {
      await cloudflareApi.setItemEnabled(props.type, name, next);
      await subsStore.updateOneData(props.type === 'collection' ? 'collections' : 'subs', name);
    } catch {
      /* Reported by the interceptor; the row keeps the server's state. */
    }
  };

  const refresh = async () => {
    notifyLoading(t("globalNotify.refresh.loading"), "refresh");
    let failed = false;
    try {
      await cloudflareApi.downloadSource(name, { noCache: true });
    } catch (e) {
      /* The fetch failed, so "刷新完成" would be a lie. */
      failed = true;
      console.error(e);
    }
    await refreshSubFlowsIfNeeded();
    dismissNotify("refresh");
    /* The interceptor already reported a failed fetch; only claim success when
       it succeeded. */
    if (!failed) showNotify({ type: "success", title: t("globalNotify.refresh.succeed") });
  };

  return {
    isEnabled,
    copyLink,
    resetLink,
    openDownload,
    copyConfig,
    edit,
    remove,
    refresh,
    toggleEnabled,
    refreshSubFlowsIfNeeded,
  };
};
