import request from '@/api';
import { AxiosPromise, AxiosResponse } from 'axios';

const ENV_CACHE_KEY = 'envCache';
const ENV_CACHE_TTL_MS = 60 * 60 * 1000;

type EnvPayload = Record<string, any>;

/**
 * Last successful env read, so the UI can paint before the network answers.
 * Written by both the boot bootstrap call and `getEnv`.
 */
export const readCachedEnv = (): EnvPayload | null => {
  const raw = localStorage.getItem(ENV_CACHE_KEY);
  if (!raw) return null;

  try {
    const parsed = JSON.parse(raw);
    if (!(parsed?.expiry > Date.now())) return null;
    return parsed?.data?.data?.data ?? null;
  } catch {
    return null;
  }
};

export const writeCachedEnv = (env: EnvPayload) => {
  localStorage.setItem(ENV_CACHE_KEY, JSON.stringify({
    data: { data: { status: 'success', data: env } },
    expiry: Date.now() + ENV_CACHE_TTL_MS,
  }));
};

export function useEnvApi() {
  return {
    getEnv: (options?: { bypassCache?: boolean }): AxiosPromise<MyAxiosRes> => {
      const bypassCache = options?.bypassCache === true;

      if (!bypassCache) {
        const cachedEnv = readCachedEnv();
        if (cachedEnv) {
          const cachedResponse = { data: { status: 'success', data: cachedEnv } } as unknown as AxiosResponse<MyAxiosRes>;
          return Promise.resolve(cachedResponse);
        }
      }

      return request({
        url: '/api/env',
        method: 'get',
      }).then(response => {
        const env = response?.data?.status === 'success' ? response.data.data : null;
        if (env) writeCachedEnv(env);
        return response;
      });
    },
    refreshCache: (): Promise<{ data: SucceedResponse }> => {
      return Promise.resolve({ data: { status: 'success', data: { refreshed: true } } });
    },
  };
}
