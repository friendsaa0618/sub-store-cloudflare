import type {
  AppSettings,
  RoutingTemplate,
  SubscriptionCollection,
  SubscriptionResponseMetadata,
  SubscriptionSource,
  SubscriptionTarget,
} from "../../types";

export type BuildOptions = {
  source?: SubscriptionSource;
  collection?: SubscriptionCollection;
  sources: SubscriptionSource[];
  requestUrl: URL;
  target: SubscriptionTarget;
  template?: RoutingTemplate;
  settings?: AppSettings;
  requestUserAgent?: string;
  forceRefresh?: boolean;
  waitUntil?: (promise: Promise<unknown>) => void;
};

export type InternalBuildOptions = BuildOptions & {
  responseMetadata: Map<string, SubscriptionResponseMetadata>;
};
