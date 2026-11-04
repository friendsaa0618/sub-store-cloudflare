import { defineStore } from 'pinia';
import { useEnvApi } from '@/api/env';

const envApi = useEnvApi();

export const useGlobalStore = defineStore('globalStore', {
  state: (): GlobalStoreState => {
    return {
      subProgressStyle: localStorage.getItem('subProgressStyle') || 'hidden',
      isLoading: true,
      isFlowFetching: true,
      fetchResult: false,
      isDarkMode: false,
      env: {},
      isDockerDeployment: false,
      isSimpleMode: localStorage.getItem('isSimpleMode') === null
        ? true
        : localStorage.getItem('isSimpleMode') === '1',
      isEditorCommon: localStorage.getItem('iseditorCommon') !== '1',
      showFloatingRefreshButton: localStorage.getItem('showFloatingRefreshButton') === '1',
      savedPositions: {},
    };
  },
  getters: {},
  actions: {
    setSubProgressStyle(style: string) {
      if (style && style !== 'hidden') {
        localStorage.setItem('subProgressStyle', style);
      } else {
        localStorage.removeItem('subProgressStyle');
      }
      this.subProgressStyle = style;
    },
    setLoading(isLoading: boolean) {
      this.isLoading = isLoading;
    },
    setFlowFetching(isFlowFetching: boolean) {
      this.isFlowFetching = isFlowFetching;
    },
    setFetchResult(fetchResult: boolean) {
      this.fetchResult = fetchResult;
    },
    setDarkMode(isDarkMode: boolean) {
      this.isDarkMode = isDarkMode;
    },
    setSimpleMode(isSimpleMode: boolean) {
      if (isSimpleMode) {
        localStorage.setItem('isSimpleMode', '1');
      } else {
        localStorage.setItem('isSimpleMode', '0');
      }
      this.isSimpleMode = isSimpleMode;
    },
    setEditorCommon(isEditorCommon: boolean) {
      if (!isEditorCommon) {
        localStorage.setItem('iseditorCommon', '1');
      } else {
        localStorage.removeItem('iseditorCommon');
      }
      this.isEditorCommon = isEditorCommon;
    },
    setShowFloatingRefreshButton(showFloatingRefreshButton: boolean) {
      if (showFloatingRefreshButton) {
        localStorage.setItem('showFloatingRefreshButton', '1');
      } else {
        localStorage.removeItem('showFloatingRefreshButton');
      }
      this.showFloatingRefreshButton = showFloatingRefreshButton;
    },
    async setEnv(options?: { bypassCache?: boolean; strict?: boolean }) {
      const res = await envApi.getEnv({
        bypassCache: options?.bypassCache === true,
      });
      const nextEnv = res?.data?.status === 'success' ? res.data.data : null;
      const applied = this.applyEnv(nextEnv);

      if (!applied && options?.strict) {
        throw new Error('ENV_LOAD_FAILED');
      }

      return applied;
    },
    /** Apply an env payload that was already fetched (bootstrap / cached boot read). */
    applyEnv(env: Record<string, any> | null | undefined) {
      if (!env?.backend) return null;

      this.env = env;

      // 检测是否是Docker部署
      if (this.env?.meta?.node?.env?.SUB_STORE_DOCKER === 'true') {
        this.isDockerDeployment = true;
      }

      return env;
    },
    setDockerDeployment(isDockerDeployment: boolean) {
      this.isDockerDeployment = isDockerDeployment;
    },
    setSavedPositions(key: string, value: any) {
      this.savedPositions[key] = value;
    },
  },
});
