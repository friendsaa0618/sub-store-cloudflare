import request from '@/api';
import { AxiosPromise, AxiosResponse } from 'axios';
import { fromApiPayload, fromApiTemplate, toApiListType, toApiPayload } from './adapter';

const adaptResponseData = <T = any>(response: AxiosResponse<MyAxiosRes>, adapter: (data: any) => T) => {
  if (response.data?.status === 'success') {
    response.data.data = adapter(response.data.data);
  }
  return response;
};

export function useCloudflareApi() {
  return {
    getBootstrap: (): AxiosPromise<MyAxiosRes> => {
      return request({
        url: '/api/bootstrap',
        method: 'get',
      }).then(response => adaptResponseData(response, data => ({
        env: data?.env,
        settings: data?.settings,
        sources: fromApiPayload('subs', data?.sources ?? []),
        collections: fromApiPayload('collections', data?.collections ?? []),
      })));
    },
    getSources: (): AxiosPromise<MyAxiosRes> => {
      return request({
        url: '/api/sources',
        method: 'get',
      }).then(response => adaptResponseData(response, data => fromApiPayload('subs', data)));
    },
    getCollections: (): AxiosPromise<MyAxiosRes> => {
      return request({
        url: `/api/collections`,
        method: 'get',
      }).then(response => adaptResponseData(response, data => fromApiPayload('collections', data)));
    },
    getTemplates: (): AxiosPromise<MyAxiosRes> => {
      return request({
        url: '/api/templates',
        method: 'get',
      }).then(response => adaptResponseData(response, data => Array.isArray(data) ? data.map(fromApiTemplate) : data));
    },
    getScripts: (): AxiosPromise<MyAxiosRes> => {
      return request({
        url: '/api/scripts',
        method: 'get',
      });
    },
    convertProxies: (data: any): AxiosPromise<MyAxiosRes> => request({ url: '/api/proxy/parse', method: 'post', data }),
    convertRules: (data: any): AxiosPromise<MyAxiosRes> => request({ url: '/api/rule/parse', method: 'post', data }),
    getShares: (): AxiosPromise<MyAxiosRes> => request({ url: '/api/shares', method: 'get' }),
    createShare: (data: any): AxiosPromise<MyAxiosRes> => request({ url: '/api/shares', method: 'post', data }),
    rotateShare: (id: string): AxiosPromise<MyAxiosRes> => request({ url: `/api/shares/${encodeURIComponent(id)}/rotate`, method: 'post' }),
    updateShare: (id: string, data: any): AxiosPromise<MyAxiosRes> => request({ url: `/api/shares/${encodeURIComponent(id)}`, method: 'patch', data }),
    deleteShare: (id: string): AxiosPromise<MyAxiosRes> => request({ url: `/api/shares/${encodeURIComponent(id)}`, method: 'delete' }),
    getRecycleBin: (): AxiosPromise<MyAxiosRes> => request({ url: '/api/recycle-bin', method: 'get' }),
    restoreRecycleEntry: (id: string): AxiosPromise<MyAxiosRes> => request({ url: `/api/recycle-bin/${encodeURIComponent(id)}/restore`, method: 'post' }),
    deleteRecycleEntry: (id: string): AxiosPromise<MyAxiosRes> => request({ url: `/api/recycle-bin/${encodeURIComponent(id)}`, method: 'delete' }),
    getNodeInfo: (data: any): AxiosPromise<MyAxiosRes> => request({ url: '/api/utils/node-info', method: 'post', data }),
    createTemplate: (data: any): AxiosPromise<MyAxiosRes> => {
      return request({
        url: '/api/templates',
        method: 'post',
        data,
      }).then(response => adaptResponseData(response, fromApiTemplate));
    },
    updateTemplate: (name: string, data: any): AxiosPromise<MyAxiosRes> => {
      return request({
        url: `/api/templates/${encodeURIComponent(name)}`,
        method: 'patch',
        data,
      }).then(response => adaptResponseData(response, fromApiTemplate));
    },
    deleteTemplate: (name: string): AxiosPromise<MyAxiosRes> => {
      return request({
        url: `/api/templates/${encodeURIComponent(name)}`,
        method: 'delete',
      });
    },
    getOne: (type: string, name: string): AxiosPromise<MyAxiosRes> => {
      const apiListType = toApiListType(type);
      return request({
        url: `/api/${apiListType}/${encodeURIComponent(name)}`,
        method: 'get',
      }).then(response => adaptResponseData(response, data => fromApiPayload(apiListType, data)));
    },
    downloadSource: (name: string, params?: any): AxiosPromise<MyAxiosRes> => {
      return request({
        url: `/download/source/${encodeURIComponent(name)}`,
        params,
        method: 'get',
      });
    },
    getFlow: (name: string, signal?: AbortSignal): AxiosPromise<MyAxiosRes> => {
      return request({
        url: `/api/source/flow/${encodeURIComponent(name)}`,
        method: 'get',
        signal,
      });
    },
    getDownloadLink: (
      type: 'sub' | 'collection',
      name: string,
      target?: string,
    ): AxiosPromise<MyAxiosRes> => {
      const apiType = type === 'collection' ? 'collection' : 'source';
      return request({
        url: `/api/link/${apiType}/${encodeURIComponent(name)}`,
        method: 'get',
        params: target ? { target } : undefined,
      });
    },
    resetDownloadLink: (
      type: 'sub' | 'collection',
      name: string,
      target?: string,
    ): AxiosPromise<MyAxiosRes> => {
      const apiType = type === 'collection' ? 'collection' : 'source';
      return request({
        url: `/api/link/${apiType}/${encodeURIComponent(name)}/rotate`,
        method: 'post',
        params: target ? { target } : undefined,
      });
    },
    createItem: (
      type: string,
      data: Sub | Collection,
    ): AxiosPromise<MyAxiosRes> => {
      const apiListType = toApiListType(type);
      return request({
        url: `/api/${apiListType}`,
        method: 'post',
        data: toApiPayload(type, data),
      }).then(response => adaptResponseData(response, result => fromApiPayload(apiListType, result)));
    },
    setItemEnabled: (type: string, name: string, enabled: boolean): AxiosPromise<MyAxiosRes> => {
      const apiListType = toApiListType(type);
      return request({
        url: `/api/${apiListType}/${encodeURIComponent(name)}`,
        method: 'patch',
        data: { enabled },
      }).then(response => adaptResponseData(response, result => fromApiPayload(apiListType, result)));
    },
    editItem: (
      type: string,
      name: string,
      data: Sub | Collection
    ): AxiosPromise<MyAxiosRes> => {
      const apiListType = toApiListType(type);
      return request({
        url: `/api/${apiListType}/${encodeURIComponent(name)}`,
        method: 'patch',
        data: toApiPayload(type, data),
      }).then(response => adaptResponseData(response, result => fromApiPayload(apiListType, result)));
    },
    deleteItem: (
      type: string,
      name: string,
      mode?: DeleteMode,
    ): AxiosPromise<MyAxiosRes> => {
      const apiListType = toApiListType(type);
      return request({
        url: `/api/${apiListType}/${encodeURIComponent(name)}`,
        method: 'delete',
        params: mode ? { mode } : undefined,
      });
    },
    previewItem: (
      type: string,
      data: Sub | Collection | any
    ): AxiosPromise<MyAxiosRes> => {
      const apiType = toApiListType(type) === 'collections' ? 'collection' : 'source';
      return request({
        url: `/api/preview/${apiType}`,
        method: 'post',
        data: toApiPayload(type, data),
      });
    },
    sortItems: (
      type: string,
      data: Sub | Collection
    ): AxiosPromise<MyAxiosRes> => {
      const apiListType = toApiListType(type);
      return request({
        url: `/api/${apiListType}`,
        method: 'put',
        data,
      }).then(response => adaptResponseData(response, result => fromApiPayload(apiListType, result)));
    },
    reorderItems: (
      type: string,
      data: Sub | Collection
    ): AxiosPromise<MyAxiosRes> => {
      const apiListType = toApiListType(type);
      return request({
        url: `/api/sort/${apiListType}`,
        method: 'post',
        data,
      }).then(response => adaptResponseData(response, result => fromApiPayload(apiListType, result)));
    },
  };
}
