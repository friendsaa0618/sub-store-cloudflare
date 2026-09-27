export const MAX_API_BODY_BYTES = 4 * 1024 * 1024;
export const MAX_REMOTE_SOURCE_URLS = 8;
export const MAX_REMOTE_SOURCE_RESPONSE_BYTES = 2 * 1024 * 1024;
export const MAX_REMOTE_SOURCE_TOTAL_BYTES = 12 * 1024 * 1024;
export const MAX_FLOW_RESPONSE_BYTES = 64 * 1024;
export const MAX_DOH_RESPONSE_BYTES = 64 * 1024;
// Loyalsoldier's `reject` provider is ~5.5 MB of YAML, so rule providers need a
// larger ceiling than remote subscriptions.
export const MAX_RULE_PROVIDER_RESPONSE_BYTES = 8 * 1024 * 1024;
