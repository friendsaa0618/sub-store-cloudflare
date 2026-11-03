# Changelog

All notable changes to this project will be documented in this file.

This project follows semantic versioning where practical.

## [Unreleased]

### Added

- Added local Playwright visual snapshots for the admin UI (`pnpm run check:visual`) so layout, overlay, and theme regressions can be compared automatically; the set now includes dark-mode settings and editor captures, and `e2e/interactions.spec.ts` covers the subscription fold toggle and the collapsible request-settings form.

### Changed

- The gate's secondary actions (retry, deployment docs) share the form column's left edge instead of centering under it.
- The admin-token field has a show/hide toggle: an eye button inside the field switches it between `password` and `text` (`aria-pressed`, `显示 Token` / `隐藏 Token`), so a pasted token can be checked before submitting.
- The admin-token gate is a centered 460px card instead of a form floating on the page background. It also carries the fixed nav's height itself (routed pages get that offset from `AppLayout`), so the mark no longer sits under the nav and the card centers in the space below it; on short viewports it starts below the nav and the page scrolls.
- The link a scoped share returns is a result card now instead of a clickable URL blob: a success-tinted panel with `链接已创建`, the URL in the mono face, a `复制链接` button, a dismiss button and the `只在这里显示一次，请立即复制。` hint. The block is announced with `role="status"`, and the URL breaks evenly instead of leaving a short first line.
- The editor's `常用配置` palette and the options it configures now share one card instead of chips floating on the page above separate bordered rows. The chips are 32px with the 13px text size, enabled ones are a filled primary pill (instead of an outline that read lighter than the unselected gray), and they expose `aria-pressed` plus hover and focus states.
- The node-action picker in the editor is an even grid of 56px tiles instead of growing flex pills: one long script name used to stretch its whole row, so short tiles sat in a tall empty block and the longest labels wrapped to five lines. Script-backed actions show the script name with the action kind underneath, the paste row spans the grid, and phones get two tiles per row.
- The UI uses the platform faces instead of a bundled webfont: `--font-sans` is the `system-ui` stack (SF Pro on macOS, Segoe UI on Windows) and `--font-mono` is the `ui-monospace` stack (SF Mono, JetBrains Mono, Menlo, Sarasa Mono SC), so Latin and CJK text come from the same family and the code editor matches the rest of the app. The bundled Roboto and JetBrains Mono files (six faces, ~100 KB) are gone, along with the `/fonts/*` cache rule, the Inter-only `cv02`–`cv11` feature settings, and the forced `-webkit-font-smoothing: antialiased`, so text renders with the platform's own weight.
- A subscription card shows at most two tag pills plus a `+N` counter, so the name keeps its space and a long tag run clips instead of pushing the name out of the card.
- The source/collection editor's tag row reads as a form field again: the input, its confirm button, and the tag chips line up on the left under the label, instead of a transparent right-aligned box whose placeholder carried the instructions. The placeholder is shorter so it no longer clips on phones, and the Tools result group gets a little air after the action row.
- Destructive confirmations (delete source/collection, delete template, delete share, purge a recycle-bin entry) now use a red confirm button; `showDialog` takes an optional `okType` for this.
- Toasts use the app surfaces instead of the toast library's colored theme: a card-colored panel with a 1px divider, 12px radius, the status icon and a 3px progress line in the type's color, and a surface that follows `html[data-theme]` in dark mode. The container clears the notch (`env(safe-area-inset-top)`), stays inset and rounded on phones, and the refresh flow now shows one persistent loading toast that is replaced by the result instead of leaving "refreshing" next to "refreshed".
- Every page now shares one layout language (`assets/styles/patterns.css`): a quiet caption row (`section-head`) above a stack of sections, one card recipe (card color, 1px divider, 12px radius, `--card-shadow`), and dense lists as hairline-separated rows inside a single card instead of one bordered card per item. Tools renders shares and the recycle bin as row lists, Settings puts rule templates in one card and the request form under a collapsible caption, the copy panel lists targets as rows, and the subscription editor groups its fields into `基本信息` / `订阅来源` (`组合配置`) cards with an aligned label column that moves labels above controls on phones. Subscription cards drop the hover lift for a border/shadow tint, and the empty state uses a flat numbered list.
- In dark mode the profile card shows the app mark directly on the card surface (the mark is light) instead of on a white plate, and the node-action help button no longer renders as a white square.
- A host listed in `SUB_STORE_PUBLIC_DOWNLOAD_HOSTS` now serves downloads and nothing else: the Worker returns 404 for the SPA, `/api/*` and the service-worker paths, and rejects the ad-hoc `?url=` / `?content=` source override there, so a download token cannot be used as a generic fetch proxy. The SPA routes are listed in `run_worker_first` so the Worker, not the asset fallback, decides what a download-only host answers.
- A deployment behind Cloudflare Access can accept an Access-authenticated request without the admin token: `requireAdmin` verifies the `Cf-Access-Jwt-Assertion` signature against the team's certs (`SUB_STORE_ACCESS_TEAM_DOMAIN`), plus `iss`, `aud` (`SUB_STORE_ACCESS_AUD`) and `exp`, and falls back to the admin token when Access is not configured or the JWT does not verify. Both vars default to empty, so a plain deployment still requires the token.
- The admin UI boots with a single `GET /api/bootstrap` request instead of `/env` → `/sources` + `/collections` → `/settings`. It paints from the cached env snapshot first and lets the bootstrap response replace it, hashed JS/CSS/font/image files are served `immutable` for a year via `_headers` (a warm visit now revalidates only the HTML instead of ten assets), and the unused FontAwesome icons were dropped from the eagerly loaded icon chunk.
- Built-in Mihomo templates now take their rule data from [MetaCubeX/meta-rules-dat](https://github.com/MetaCubeX/meta-rules-dat) instead of the ACL4SSR `.list`, Loyalsoldier `.txt`, and blackmatrix `.yaml` files: `acl4ssr-mihomo`, `acl4ssr-mihomo-no-emoji`, and `ai-streaming-mihomo` use compiled `.mrs` rule sets (`format: mrs`) served from `cdn.jsdelivr.net`, which also fixes the `SteamCN` provider that pointed at a 404 URL. `settings.rulesetCdn` switches the CDN host. The `loyalsoldier-*` templates keep their own lists because `reject`, `direct`, and `tld-not-cn` have no MetaCubeX equivalent.
- The `sing-box` output consumes those same rule sets: `RULE-SET` rules that reference a MetaCubeX provider become remote `.srs` rule sets (`format: binary`, downloaded over a direct route that follows the client's core version) and `GEOIP,<country>` maps to the matching country rule set, so sing-box now follows the template's routing instead of only its groups. Rule sets are emitted once per file, a `REJECT` policy becomes `action: "reject"`, and `settings.rulesetCdn` applies here as well.
- Clash rule providers that sing-box cannot read (the Loyalsoldier presets, custom `.txt` / `.yaml` / `.list` URLs) are converted by the Worker and served as sing-box source rule sets: the profile points at `/download/collection/<id>/ruleset/<provider>?token=<download-token>`, which fetches the provider, translates `payload` YAML or Surge-style lines into sing-box rule items (ports become numbers, `1000-2000` becomes a `port_range`), and caches the result for the provider's `interval`. Mihomo keeps using the upstream lists directly, and sing-box now follows the same routing.
- Removed unused bottom TabBar and SideBar chrome now that navigation lives in the top segmented control.
- The admin UI stylesheet is plain CSS now: the SCSS layer (variable aliases, `@mixin` helpers, `&--modifier` / `&__element` concatenation) became native CSS nesting, `var()` tokens, and flattened modifier selectors. `sass` is gone from both lockfiles, and `build.cssTarget` keeps esbuild flattening the nesting so the emitted CSS targets the same browsers as before.
- Subscription downloads no longer wait on a slow provider: expired remote sources are served from the Cache API while the refresh runs in `waitUntil` (`stale-while-revalidate`), the default `remoteCacheTtl` moved from 300s to 900s, and entries are kept four times longer than their TTL so the stale copy is still there. Static assets are now served by the asset server instead of running the Worker first (`run_worker_first` only covers `/api/*`, `/download/*`, `/sw.js`, `/registerSW.js`), with the security headers mirrored into `_headers`; scanner probes such as `/.env` no longer reach the Worker, and paths the Worker does handle return a plain 404 instead of the SPA shell.

### Fixed

- The subscription card's gutter was an off-scale 9px in simple mode (12px in dual-column, 16px single-column), so on phones the avatar and the action buttons sat only 10px from the card edge. Simple mode now uses `--space-3` (12px) and single-column `--space-4` (16px), and the card stays symmetric left/right.
- On phones the editor's field rows dropped to a 12px gutter while the other cards on the page kept 16px, so the labels and controls sat 4px left of the section cards around them. The 16px gutter now holds at every width (measured inset 17px on all cards at 390px and 320px).
- The editor's node-action cards used a 12px gutter (and the tile grid added another 10px margin), so their header and tiles sat 4–8px right of every other card's content. The action cards and the added-action rows now share the same 16px gutter and 12px group spacing as the rest of the editor.
- The admin-token gate now says why it is still there: a stored token plus a failed boot renders `Token 无效，或接口仍不可达。` under the field (`role="alert"`), instead of leaving the user with an unchanged form after a rejected token. The verdict is derived from the store, so it survives the panel unmounting during a retry.
- A scoped share whose expiry has passed is labelled `已过期` (danger pill) instead of `已启用`, and the row's date is prefixed with `到期`.
- On phones the editor's action row kept all seven controls (rename, help, clone, both switches, delete, drag), which squeezed the action name down to `节点…`. Below 768px the rename, help and clone buttons are hidden — renaming works by tapping the field — so the name stays readable.
- A subscription card whose usage refresh failed without an error type printed `⚠️ undefined`; the line now falls back to the error message and then to the no-flow-info copy.
- The Tools page's empty rows put their icon flush against the label; the icon and text now share a centered flex row with an 8px gap.
- The subscription editor's local-source row no longer collapses into the label column: the editor card's `96px minmax(0, 1fr)` grid overrode `AppFormItem`'s label-less variant, so the node editor and its toolbar were squeezed to 96px and every button wrapped onto its own line. The row spans the card again, the editor and the validation summary sit inside the card padding instead of a `-15px` bleed, and a failed validation reads 「校验失败 / 未解析到有效节点」 instead of the same sentence twice.
- Dialogs, sheets and popovers are teleported to `<body>`, which carried no font stack, so their Latin text fell back to the browser's serif face; the UI stack now lives on `body` instead of only `#app`.
- The code editor's action strip no longer wraps its last icon onto a second row on a 320px screen: the buttons sit in a non-wrapping flex row and shrink to 24px before the row overflows.
- The code editor's status bar no longer shows `NaN MB` for an empty or not-yet-loaded document; `formatLength` rejects non-finite lengths.
- The profile card shows the Sub-Store mark on a Cloudflare deployment instead of the Node.js logo, which the backend icon map reused for `Cloudflare`.
- The admin-token gate no longer slides its mark under the fixed nav on short viewports: the panel centers with `justify-content: safe center` plus padding, so overflowing content starts below the nav instead of above it.
- A solid danger button now uses dark text in dark themes. Those themes define `--danger-color` as a light red for text use, so white on `#F87171` was about 2.4:1.
- Icon-only buttons that had no accessible name now have one: close and refresh on the compare and preview pages, and the template import/create actions on the settings page.
- Loading and progress copy uses `…` instead of `...` in both locales, except the literal `upload=...; download=...; total=...` placeholder.
- Notifications that report success now pass `type: "success"`, so the icon and progress line match the message: copy/clone/refresh in the subscription list, copy in the copy panel, the subscription preview copy and load, and source/collection delete, which was marked `danger`.
- The Tools page's dark-theme select chevron now actually applies. The rule was written as `:global(html[data-theme="dark"]) &` inside a scoped block, and Vue drops everything after `:global(...)`, so it compiled to a `html[data-theme=dark]` rule that painted nothing; the whole selector now sits inside `:global(...)`.
- The `sing-box` output now mirrors the template's `dns.enhanced-mode: fake-ip` and answers A and AAAA with fake addresses from a dual-stack pool (`inet4_range` `198.18.0.0/15`, `inet6_range` `fc00::/18`, overridable with Mihomo's `fake-ip-range` / `fake-ip-range6`). The profile carries the `query_type: ["A", "AAAA"]` DNS rule, `experimental.cache_file` with `store_fakeip` so the address-to-domain mapping survives a client restart, and keeps `route.default_domain_resolver` on the bootstrap resolver so node and rule-set host names never resolve to a fake address. A template that sets another DNS mode keeps the plain resolvers, and `?singboxFakeIp=1|0` overrides the mode per link.
- IP rules keep working under fake-ip, with two paths chosen by the client core version:
  - **1.14+ (SFI/SFA report the core version): DNS-side CN split.** The DNS rules `evaluate` a real lookup first and `respond` with the real addresses when they land in the CN rule set, so those connections never enter fake-ip: the client dials a real address, the template's IP rules match it natively, and the route-level `resolve` action (with its fatal lookups and IP dialing) is not needed at all. Everything else still gets a fake address and is routed by domain, and a failed lookup just falls back to the fake answer instead of breaking the connection.
  - **1.12/1.13: route-level `resolve`.** Those cores reject `evaluate` / `respond` (`unknown DNS rule action: evaluate`), so the profile inserts `{ "action": "resolve", "server": "dns-bootstrap" }` in front of the first rule that needs addresses (`IP-CIDR`, `GEOIP`, `behavior: ipcidr` rule sets).
  - The CN rule set is reused from the template (a MetaCubeX `geoip/cn` provider, or the `geoip-cn` one that `GEOIP,CN` generates) and added as MetaCubeX `geoip/cn.srs` when the template has none. Rules marked `no-resolve` stay literal-only, and `dns.fake-ip-resolve` picks the resolver for both paths (`direct` by default, `proxy`, or `off`).
  - Note that CN IP rules are a safety net either way: only 6 of 30 sampled CN domains resolved to addresses that the MetaCubeX `geoip/cn` list classifies as CN, and the resolver choice did not change that count — the domain rules carry the big sites.
- `sing-box` output now reads the collection's routing template instead of always emitting the built-in `PROXY` / `AUTO` groups: template groups are mirrored as `selector` / `urltest` outbounds (`fallback` / `load-balance` degrade to `selector`, since sing-box 1.13 removed them), `$all` and `filter` expand to the nodes that exist, `PASS` and dangling members are dropped, and `mixed-port` / `allow-lan` land on the `mixed` inbound. Rules that sing-box can express (`DOMAIN`, `DOMAIN-SUFFIX`, `DOMAIN-KEYWORD`, `DOMAIN-REGEX`, `IP-CIDR`, `IP-CIDR6`, `SRC-IP-CIDR`, `DST-PORT`, `SRC-PORT`, `PROCESS-NAME`, `PROCESS-PATH`) are translated and `MATCH` becomes `route.final`; `RULE-SET` / `GEOSITE` / `GEOIP` are skipped because sing-box only accepts `.srs` or source-format rule-sets.
- sing-box output now emits a complete VPN profile: a `tun` inbound with `auto_route`, a DNS section with a proxy resolver plus a direct bootstrap resolver, a `hijack-dns` rule, and `route.default_domain_resolver`. Without a `tun` inbound iOS and Android clients only ran a local proxy, so the VPN indicator never appeared and no traffic was reported. The profile now requires sing-box 1.12+.
- The `sing-box` output no longer triggers the 1.14 migration warning: rule-set downloads switch to `http_clients` + `route.default_http_client` when the requesting client reports a sing-box 1.14+ core (`SFI (sing-box 1.14.2; language zh_CN)`, `SFA (…)`), which also drops `download_detour` from every rule set, while 1.12/1.13 keep the old form because they reject the new fields. The direct outbound that the HTTP client detours to carries `domain_resolver`, since sing-box refuses an empty direct outbound as a detour target. `?singboxHttpClients=1|0` overrides the detection for clients with a rewritten User-Agent.
- Replaced `vite-plugin-svg-icons` with a small first-party sprite plugin (`frontend/plugins/svg-sprite.ts`), which removes the `svg-baker` chain (`postcss@5`, `micromatch@3`, `braces`, `decode-uri-component`) from the build tree; `pnpm audit` now reports no known vulnerabilities in any install root, and the sprite only embeds the icons `<svg-icon>` resolves, trimming the entry bundle from 206 kB to 191 kB (72 kB to 66 kB gzip).
- Upgraded the Cloudflare tooling to the current releases (`wrangler` 4.141.0, `@cloudflare/vitest-pool-workers` 0.22.0, `@cloudflare/workers-types` 5.20260926.1), which brings a `miniflare` that ships patched `sharp` and `undici`, and pinned `sharp` 0.35.4 for the `miniflare` that still declares 0.35.2 exactly.
- Patched the dependency advisories that failed `pnpm run check:audit`: `hono` moves to 4.13.9, `js-yaml` to 4.3.2, and pnpm overrides pin the patched `postcss`, `nanoid`, and `brace-expansion` lines that only ship transitively.
- Bumped build tooling within its existing ranges (`vitest` 4.1.11, `svgo` 2.8.4, `brace-expansion` 2.1.7) to clear the remaining in-range advisories.
- sing-box output no longer emits legacy inbound fields or a WireGuard outbound, so profiles decode on sing-box 1.13+ clients that removed them.
- Repo checks pass again: documentation token snippets use an ESM one-liner instead of CommonJS, and the stale npm `frontend/package-lock.json`, unused `surgeformac_icon.png` asset, and tracked root `.dev.vars.example` are removed.
- Editor save/preview bar no longer covers the common-options and action blocks.
- Settings profile no longer duplicates the nav language switcher.
- Workers Builds install now sees `@playwright/test` in the root lockfile and skips Playwright browser download during deploy.
- Built-in ACL4SSR rule providers now set `format: text` so Mihomo can load `.list` files instead of treating them as YAML.
- Template rendering now drops dangling proxy-group references and uses the first rendered group for an empty-rule fallback MATCH.
- VLESS and trojan share links keep their transport parameters (`type`, `path`, `host`, `serviceName`), so WebSocket, gRPC and HTTP/2 nodes render with their real path and host instead of an empty default. The sing-box output writes them into `transport`, because sing-box only accepts `tcp` / `udp` in `network` and otherwise rejects the whole profile with `decode config: outbounds[n].network: unknown network: ws`.

## [1.1.0] - 2026-07-11

### Added

- Added a guided interactive CLI setup, an explicit empty quick-install mode, and cross-platform deployment token generation.
- Added a first-run admin checklist for Source, Collection, and client-link creation.
- Added five-minute quick-start and upgrade guides for Deploy Button, Agent/CLI, D1 migrations, backup, and rollback.
- Added installer helper tests and a deployment-experience release check.

### Changed

- Rebuilt the Chinese and English README files around a three-step ordinary-user deployment path.
- Non-interactive installs without private setup now stop before deployment instead of risking example source import.
- Deploy Button documentation now explains repository copies, required secrets, and upstream upgrade behavior.

### Security

- Removed the root `.dev.vars.example` that caused Cloudflare's Deploy form to prefill public placeholder values for required Worker Secrets.

## [1.0.0] - 2026-07-11

### Added

- Added JSON5 subscription input, a distinct Surge Mac output target, and structured Snell, SSH, and HTTP/2 CONNECT client-line compatibility.
- Added authenticated one-shot proxy/subscription conversion and Mihomo, Surge, Loon, and Quantumult X rule conversion APIs plus an admin Tools page.
- Added allowlisted remote subscription metadata propagation, hashed Cache API keys, configurable edge-cache TTL, forced refresh, conditional requests, and stale-on-error fallback.
- Added scoped download grants with one-time plaintext tokens, D1-stored SHA-256 hashes, target restrictions, expiration, revocation, and deployment-token compatibility.
- Added a bounded 50-entry recycle bin for deleted sources, collections, custom templates, and scoped download grants.
- Added configurable HTTPS node IP, location, organization, and ASN lookup from the preview node panel.
- Added an upstream compatibility matrix and a D1 migration for the new compatibility resources.

### Changed

- Repositioned the project as a tested Cloudflare-native compatibility edition while keeping Workers Static Assets + Worker API + D1 + Worker Secrets.
- Updated product and Agent boundaries to preserve scoped private links and the bounded recycle bin while continuing to reject public sharing, unbounded archives, runtime scripts, files, artifacts, queues, cron, and persistent logs.
- Download responses now propagate safe subscription metadata and expose a non-sensitive edge-cache status header.

### Verification

- Added rule conversion, JSON5, Surge Mac, response metadata, scoped authorization, and recycle/restore tests.
- Kept the full release gate, dry-run bundle measurement, startup profiling, and deployed smoke verification as release requirements.

## [0.3.0] - 2026-07-11

### Added

- Added build-time JavaScript Filter / Operator support without runtime `eval()` or `new Function()`.
- Added code-owned script metadata at `/api/scripts`, metadata-driven admin UI controls, and two Free-verified built-ins: TLS fingerprint and name regex filter.
- Added gitignored personal script manifests and source directories that the Agent/CLI installer compiles into the Worker registry.
- Added Worker/D1 integration coverage for script metadata, validation, execution, arguments, unavailable scripts, and per-stage limits.

### Changed

- Aligned source and collection validation, immutable IDs, partial updates, and empty-collection membership semantics across the Worker, frontend, installer, and documentation.
- Removed the advertised `surge-mac` target because it had no independent renderer; use `surge` or a supported YAML target instead.

### Documentation

- Documented Free-compatible build-time JavaScript filters and operators, personal deployment steps, upstream compatibility levels, security boundaries, and performance gates.

## [0.2.0] - 2026-07-10

### Added

- Added Workers runtime and D1 migration integration tests for auth, storage restore, downloads, parsers, and payload limits.
- Added a real `wrangler dev` startup smoke test and production dependency audits to the release gate.
- Added bounded readers for API bodies, remote subscriptions, flow metadata, and DoH responses.

### Changed

- Moved built-in routing templates from D1 seed rows into Worker-owned code so template fixes reach existing deployments immediately.
- Removed request-time schema creation and default seeding; D1 migrations are now the only schema path.
- Consolidated the repository into one pnpm workspace and one root lockfile.
- Updated Wrangler, Workers types, Hono, Axios, Vite, Vue tooling, TypeScript, and YAML dependencies.
- Lazy-loaded the settings route and CodeMirror editor, and removed redundant precompression output.
- Updated Wrangler compatibility settings to `2026-07-08` with `nodejs_compat` across all generated and checked configs.

### Security

- Added CSP, frame denial, no-referrer, no-sniff, and permissions-policy response headers.
- Changed unhandled failures to structured server logs plus generic client-facing 500 responses.
- Removed the admin token from the browser URL after ingest and changed backup export to authenticated blob download.
- Stopped the installer from printing private D1 database IDs and strengthened ignored-file privacy verification.

### Documentation

- Documented the new runtime limits, code-owned template model, release checks, and header-authenticated backup export.

## [0.1.1] - 2026-06-28

### Changed

- Removed repository GitHub Actions and Dependabot so the upstream project does not depend on GitHub automation.
- Kept lightweight GitHub issue forms and a pull request template for contributor intake; they do not run CI/CD.
- Clarified that the Cloudflare Deploy Button is the Cloudflare-hosted template import path, while `pnpm run install:cloudflare` is the local Agent/CLI deployment path.
- Updated Worker compatibility dates and documented the Node 22 + pnpm local development baseline.

### Verification

- Local release checks and Wrangler dry-run deployment remain the release gate.

## [0.1.0] - 2026-06-28

### Added

- Cloudflare-native Worker application with Static Assets, Worker API, D1, and Worker Secrets.
- Source and collection management for remote subscription URLs and local node text.
- Node filters for include/exclude, rename, delete-field, dedupe, sort, regex-sort, flag handling, quick options, and DNS resolve workflows.
- Built-in routing templates for Mihomo-compatible YAML output.
- Output targets for Mihomo, Stash, Surge, Surfboard, Loon, Egern, Shadowrocket, Quantumult X, sing-box, v2ray, URI, and JSON.
- Preview, backup/restore, temporary `url` / `content` / `ua` conversion parameters, and subscription usage metadata.
- Deploy to Cloudflare button support with root `wrangler.jsonc`.
- Agent/CLI installer via `pnpm run install:cloudflare`.
- Release checks for Worker/frontend builds, agent setup, deployment config, worker contract, module format, open-source hygiene, and git history privacy.

### Documentation

- Added deployment, AI agent install, architecture, and product-scope documentation.
- Added contributing, support, security, code of conduct, release notes, and local release checks.
