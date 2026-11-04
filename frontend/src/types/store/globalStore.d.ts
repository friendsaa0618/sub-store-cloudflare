interface GlobalStoreState {
  isLoading: boolean;
  isFlowFetching: boolean;
  fetchResult: boolean;
  env: ENV;
  isDockerDeployment: boolean;
  savedPositions: any;
}

interface ENV {
  meta?: any;
  app?: string;
  runtime?: string;
  storage?: string;
  version?: string;
  feature?: any;
  backend?:
    | 'sing-box'
    | 'Stash'
    | 'QX'
    | 'Loon'
    | 'Surge'
    | 'ShadowRocket'
    | 'Egern'
    | 'Clash'
    | 'ClashMeta'
    | 'V2Ray'
    | 'Cloudflare'
    | 'Node';
}
