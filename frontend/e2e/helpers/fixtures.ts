/** Deterministic, privacy-safe payloads for visual snapshots. No real URLs or tokens. */

export const ENV_PAYLOAD = {
  app: "Sub-Store Cloudflare",
  backend: "Cloudflare",
  version: "1.1.0",
  runtime: "Cloudflare Workers",
  storage: "D1",
  feature: {
    buildTimeScripts: true,
    proxyConversion: true,
    ruleConversion: true,
    scopedShares: true,
    recycleBin: true,
    nodeInfo: true,
    surgeMac: true,
  },
  meta: {
    cloudflare: {
      env: {
        SUB_STORE_BACKEND_CUSTOM_NAME: "Sub-Store Cloudflare",
        SUB_STORE_DOCKER: "false",
      },
    },
  },
};

export const SETTINGS_PAYLOAD = {
  defaultUserAgent: "clash.meta/v1.19.24",
  defaultFlowUserAgent: "clash.meta/v1.19.24",
  defaultTimeout: "30000",
  backendRequestConcurrency: "3",
  backendRequestConcurrencyWaitTime: "100",
  remoteCacheTtl: "300",
  remoteCacheStaleOnError: true,
  nodeInfoApiUrl: "https://ipwho.is/{ip}",
  theme: { auto: true, name: "light", dark: "dark", light: "light" },
  appearanceSetting: {
    isSimpleMode: true,
    isShowIcon: true,
    isSimpleShowRemark: false,
    isEditorCommon: false,
    manualSubscriptionsDisplayMode: "collapsed",
    editorGroupingMode: "always",
    showFloatingRefreshButton: false,
    showFloatingAddButton: false,
    createItemPosition: "bottom",
    displayPreviewInWebPage: true,
    subProgressStyle: "hidden",
    listPageViewMode: "single-column",
    listPageViewModeInWideScreenNarrowMode: "single-column",
    useNarrowModeOnWideScreen: false,
  },
  appName: "Sub-Store Cloudflare",
};

export const POPULATED_SOURCES = [
  {
    id: "hk-nodes",
    name: "HK Nodes",
    type: "local",
    url: "",
    content: "",
    filters: [],
    enabled: true,
    meta: {
      tag: ["hk"],
      icon: "/logo.png",
      remark: "Visual fixture",
    },
  },
];

export const POPULATED_COLLECTIONS = [
  {
    id: "daily",
    name: "Daily",
    sourceIds: ["hk-nodes"],
    filters: [],
    templateId: "acl4ssr-mihomo",
    ignoreFailed: true,
    enabled: true,
    meta: {
      tag: ["mix"],
      icon: "/logo.png",
    },
  },
];

export const POPULATED_TEMPLATES = [
  {
    id: "acl4ssr-mihomo",
    name: "ACL4SSR",
    target: "mihomo",
    config: {},
    readonly: true,
  },
  {
    id: "custom-lite",
    name: "Custom Lite",
    target: "surge",
    config: {},
    readonly: false,
  },
];

export const POPULATED_SHARES = [
  {
    id: "share-fixture",
    resourceType: "collection",
    resourceId: "daily",
    target: "mihomo",
    enabled: true,
    expiresAt: "2026-12-01T00:00:00.000Z",
  },
];

export const POPULATED_RECYCLE = [
  {
    id: "recycle-fixture",
    resourceType: "source",
    resourceId: "old-source",
    name: "Old Source",
    deletedAt: "2026-01-15T00:00:00.000Z",
  },
];

export type VisualScenario = "populated" | "empty" | "unauthorized";
