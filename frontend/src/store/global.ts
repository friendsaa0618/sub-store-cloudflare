import { defineStore } from 'pinia';
import { useEnvApi } from '@/api/env';

const envApi = useEnvApi();

export const useGlobalStore = defineStore('globalStore', {
  state: (): GlobalStoreState => {
    return {
      isLoading: true,
      isFlowFetching: true,
      fetchResult: false,
      env: {},
      isDockerDeployment: false,
      savedPositions: {},
    };
  },
  getters: {},
  actions: {
    setLoading(isLoading: boolean) {
      this.isLoading = isLoading;
    },
    setFlowFetching(isFlowFetching: boolean) {
      this.isFlowFetching = isFlowFetching;
    },
    setFetchResult(fetchResult: boolean) {
      this.fetchResult = fetchResult;
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
