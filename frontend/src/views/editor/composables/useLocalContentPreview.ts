import { computed, ref, toRaw, watch, type InjectionKey } from "vue";
import { useI18n } from "vue-i18n";

import { useCloudflareApi } from "@/api/app";
import { useAppNotifyStore } from "@/store/appNotify";
import { useCodeStore } from "@/store/codeStore";
import { apiErrorMessage } from "@/utils/apiError";
import { isOversizedImport } from "@/utils/importLimits";

export type LocalPreviewSummary = {
  status: "success" | "danger";
  title: string;
  detail?: string;
  types?: Record<string, number>;
};

type UseLocalContentPreviewOptions = {
  form: Record<string, any>;
  /** Persisted process for the current action rows. */
  toProcess: (process: Process[]) => Process[];
};

const readTextFile = (file: File) => new Promise<string>((resolve, reject) => {
  const reader = new FileReader();
  reader.onload = () => resolve(String(reader.result || ""));
  reader.onerror = () => reject(reader.error || new Error("Failed to read file"));
  reader.readAsText(file);
});

const summarizePreviewNodes = (nodes: any[], unknownType: string) => {
  return nodes.reduce<Record<string, number>>((result, node) => {
    const type = String(node?.type || unknownType);
    result[type] = (result[type] || 0) + 1;
    return result;
  }, {});
};

/**
 * The local-source code editor's content, its validation preview, and the
 * file import that feeds both.
 */
export const useLocalContentPreview = ({
  form,
  toProcess,
}: UseLocalContentPreviewOptions) => {
  const { t } = useI18n();
  const cloudflareApi = useCloudflareApi();
  const { showNotify } = useAppNotifyStore();
  const cmStore = useCodeStore();

  const loading = ref(false);
  const summary = ref<LocalPreviewSummary | null>(null);
  const content = computed(() => String(cmStore.EditCode['SubEditer'] || form.content || ""));
  const typeBadges = computed(() => {
    const types = summary.value?.types || {};
    return Object.entries(types)
      .sort(([left], [right]) => left.localeCompare(right))
      .map(([type, count]) => `${type} × ${count}`);
  });

  watch(
    () => cmStore.EditCode['SubEditer'],
    (newCode) => {
      form.content = newCode;
      summary.value = null;
    },
  );

  const formatPreviewSummary = (nodes: any[]) => {
    const types = summarizePreviewNodes(nodes, t("specificWord.unknownType"));
    const typeText = Object.entries(types)
      .sort(([left], [right]) => left.localeCompare(right))
      .map(([type, count]) => `${type} × ${count}`)
      .join(", ");
    return {
      title: t("editorPage.subConfig.basic.content.validation.success", { count: nodes.length }),
      detail: typeText ? t("editorPage.subConfig.basic.content.validation.detail", { types: typeText }) : "",
      types,
    };
  };

  const validate = async (rawContent = content.value, options?: { notify?: boolean }) => {
    if (form.source !== "local") return false;
    const raw = String(rawContent || "");
    if (!raw.trim()) {
      summary.value = {
        status: "danger",
        title: t("editorPage.subConfig.basic.content.validation.empty"),
      };
      return false;
    }

    loading.value = true;
    try {
      const res = await cloudflareApi.previewItem("sub", {
        ...toRaw(form),
        source: "local",
        content: raw,
        process: toProcess(form.process),
      });
      const responsePayload: any = res?.data;
      const nodes = Array.isArray(responsePayload?.data?.original) ? responsePayload.data.original : [];
      if (responsePayload?.status !== "success" || nodes.length === 0) {
        throw new Error(responsePayload?.error?.message || t("editorPage.subConfig.basic.content.validation.noNodes"));
      }
      const nextSummary = formatPreviewSummary(nodes);
      summary.value = { status: "success", ...nextSummary };
      if (options?.notify) {
        showNotify({
          type: "success",
          title: nextSummary.title,
          content: nextSummary.detail,
        });
      }
      return true;
    } catch (error) {
      const message = apiErrorMessage(error);
      summary.value = {
        status: "danger",
        title: t("editorPage.subConfig.basic.content.validation.failed"),
        detail: message,
      };
      if (options?.notify) {
        showNotify({
          type: "danger",
          title: t("editorPage.subConfig.basic.content.validation.failed"),
          content: message,
        });
      }
      return false;
    } finally {
      loading.value = false;
    }
  };

  const importFile = async (file: File) => {
    if (isOversizedImport(file)) {
      showNotify({ type: "danger", title: t("specificWord.fileTooLarge") });
      return;
    }
    try {
      const nextContent = await readTextFile(file);
      cmStore.setEditCode("SubEditer", nextContent);
      await validate(nextContent, { notify: true });
    } catch (e) {
      showNotify({
        type: "danger",
        title: t("editorPage.subConfig.basic.content.validation.importFailed"),
      });
      console.error(e);
    }
  };

  return { loading, summary, typeBadges, content, validate, importFile };
};

export type LocalContentPreview = ReturnType<typeof useLocalContentPreview>;

/** The editor page owns the preview state so it survives the full-screen swap. */
export const LOCAL_CONTENT_PREVIEW_KEY: InjectionKey<LocalContentPreview> =
  Symbol("local-content-preview");
