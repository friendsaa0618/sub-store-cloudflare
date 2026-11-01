import { useCloudflareApi } from "@/api/app";
import { readCachedEnv, writeCachedEnv, useEnvApi } from "@/api/env";
import i18n from "@/locales";
import { useAppNotifyStore } from "@/store/appNotify";
import { useGlobalStore } from "@/store/global";
import { useSettingsStore } from "@/store/settings";
import { useSubsStore } from "@/store/subs";

export const initStores = async (
  needNotify: boolean,
  needFetchFlow: boolean,
  needRefreshCache: boolean
) => {
  const { showNotify } = useAppNotifyStore();
  const globalStore = useGlobalStore();
  const subsStore = useSubsStore();
  const settingsStore = useSettingsStore();

  const { t } = i18n.global;
  let isSucceed = true;
  // Only toast when the caller asks for notify (explicit refresh / token retry).
  // Silent boot uses needNotify=false so page entry stays quiet.
  if (needNotify) {
    showNotify({ title: t("globalNotify.refresh.loading"), type: "primary" });
  }
  globalStore.setLoading(true);
  globalStore.setFetchResult(true);

  // 更新所有数据
  try {
    // 先用上一次的 env 渲染（主题、后端信息），避免首屏干等一次网络往返。
    // 下面拿到的 bootstrap 结果会立刻覆盖它。
    const cachedEnv = readCachedEnv();
    if (cachedEnv?.backend) {
      globalStore.applyEnv(cachedEnv);
    }

    // 一次请求取回 env + settings + sources + collections，替代原先
    // /env → /sources + /collections → /settings 的串行四连。
    try {
      const timeoutMs = localStorage.getItem("timeout")
        ? parseInt(localStorage.getItem("timeout") as string, 10)
        : 3000;
      const timeoutPromise = new Promise<never>((_, reject) => {
        setTimeout(() => {
          reject(new Error("Backend connection timeout"));
        }, timeoutMs);
      });

      const bootPromise = useCloudflareApi().getBootstrap();
      const res = await Promise.race([bootPromise, timeoutPromise]);
      const boot = res?.data?.status === "success" ? res.data.data : null;

      // 检查是否成功获取到后端环境信息
      if (!boot?.env?.backend) {
        console.error("Failed to get backend environment info");
        globalStore.setFetchResult(false);
        isSucceed = false;
        throw new Error("Failed to get backend environment info");
      }

      globalStore.applyEnv(boot.env);
      writeCachedEnv(boot.env);
      subsStore.applySubsData(boot.sources, boot.collections);
      settingsStore.applySettings(boot.settings);
    } catch (bootError) {
      console.error("Error getting backend environment:", bootError);
      globalStore.setFetchResult(false);
      isSucceed = false;
      throw bootError; // 重新抛出异常，中断后续操作
    }

    if (needRefreshCache) {
      const { data } = await useEnvApi().refreshCache();
      if (data.status !== "success") {
        globalStore.setFetchResult(false);
        isSucceed = false;
      }
    }
  } catch (e) {
    console.error("Error initializing stores:", e);
    globalStore.setFetchResult(false);
    subsStore.subs = [];
    subsStore.collections = [];
    isSucceed = false;
  }

  // 发送通知
  if (isSucceed && needNotify) {
    showNotify({ title: t("globalNotify.refresh.succeed"), type: "primary" });
  }

  globalStore.setLoading(false);
  // 更新流量
  if (needFetchFlow) await subsStore.fetchFlows();
};
