import { toRaw } from "vue";
import { useI18n } from "vue-i18n";

import { useCloudflareApi } from "@/api/app";
import { useCompareOverlay } from "@/hooks/useCompareOverlay";
import { dismissNotify, notifyLoading } from "@/utils/notify";
import { normalizeTagList } from "@/utils/tagList";

type UseEditorCompareOptions = {
  form: Record<string, any>;
  editType: string;
  actionsChecked: [string | undefined, boolean][];
  /** Persisted process for the current action rows. */
  toProcess: (process: Process[]) => Process[];
  validateForm: () => Promise<boolean>;
};

/**
 * The editor's compare overlay: build the payload a save would send, ask the
 * API for the before/after node lists, and open the full-screen table.
 */
export const useEditorCompare = ({
  form,
  editType,
  actionsChecked,
  toProcess,
  validateForm,
}: UseEditorCompareOptions) => {
  const { t } = useI18n();
  const cloudflareApi = useCloudflareApi();
  const {
    compareTableIsVisible,
    compareData,
    openComparePanel,
    closeCompare,
  } = useCompareOverlay();

  const fetchCompareData = async () => {
    notifyLoading(t("editorPage.subConfig.basic.content.validation.compareLoading"), "compare");
    try {
      const data: any = JSON.parse(JSON.stringify(toRaw(form)));
      data.process = toProcess(data.process);
      if (data.ignoreFailedRemoteSub === "disabled") {
        data.ignoreFailedRemoteSub = false;
      }
      delete data.firstSubFlow;
      delete data.proxy;
      delete data.mergeSources;
      data.tag = [...new Set(normalizeTagList(data.tag))];
      actionsChecked.forEach((item) => {
        if (!item[1]) {
          const index = data.process.findIndex((i) => i.id === item[0]);
          if (index > -1) {
            data.process.splice(index, 1);
          }
        }
      });
      const type = editType === "collections" ? "collection" : "sub";
      const res = await cloudflareApi.previewItem(type, data);
      if (res?.data?.status === "success") {
        compareData.value = res.data.data;
        return true;
      }
    } catch (e) {
      console.error(e);
    } finally {
      dismissNotify("compare");
    }
    /* Keep whatever was on screen: the interceptor already said why it failed,
       and an empty table would read as "every node was filtered out". */
    return false;
  };

  const compare = async () => {
    if (!(await validateForm())) return;
    if (!(await fetchCompareData())) return;
    openComparePanel();
  };

  const refreshCompare = async () => {
    await fetchCompareData();
  };

  return {
    compareTableIsVisible,
    compareData,
    compare,
    refreshCompare,
    closeCompare,
  };
};
