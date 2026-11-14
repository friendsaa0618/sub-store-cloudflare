# Testing and Release Gates

This repository uses local validation instead of GitHub Actions.

## Quick Check

Use this during development:

```bash
pnpm run check
```

It runs Worker and test TypeScript checks plus the frontend locale/build check.

## Release Gate

Use this before publishing or proposing a deployment-sensitive patch:

```bash
pnpm run check:release
pnpm run deploy:dry-run
```

部署体验相关的独立检查：

```bash
pnpm run check:installer
pnpm run check:deploy-experience
```

它们验证 CLI 快速配置生成、URL 校验、默认组合逻辑、Deploy Button Secret 安全默认、root Wrangler bindings、README 快速入口和升级链接。

`check:release` covers:

- Worker TypeScript.
- Worker test TypeScript.
- Workers runtime and D1 migration integration tests.
- Frontend locales and production build.
- Frontend and Worker production dependency audits.
- Real `wrangler dev` startup and response-header smoke testing.
- Agent setup validation.
- Seed SQL rendering.
- Local Wrangler deploy config rendering.
- Worker contract checks.
- Module format checks.
- Documentation link checks.
- Current-file open-source hygiene scan.
- `main` git history privacy scan.

`deploy:dry-run` asks Wrangler to validate the deploy without publishing the Worker.

## Visual Screenshots

Frontend layout snapshots live in `frontend/e2e/`. They mock `/api/*` with fixture data (no Worker, no real tokens or subscription URLs) and compare Chromium screenshots.

```bash
pnpm run check:visual
```

Baselines are Linux Chromium. After an intentional UI change, regenerate them on Linux:

```bash
pnpm run build:frontend
pnpm --dir frontend exec playwright install chromium
pnpm --dir frontend run test:visual:update
```

Do not add these snapshots to `check:release`. Font rasterization differs across macOS / Windows / Linux, so the committed source of truth is Linux Chromium. Run `check:visual` for any admin UI layout, navigation, overlay, or theme change.

## Focused Checks

```bash
pnpm run check:worker
pnpm run check:tests
pnpm run check:audit
pnpm run check:runtime
pnpm run check:scripts
pnpm run check:frontend
pnpm run check:visual
pnpm run check:agent
pnpm run check:installer
pnpm run check:deploy-experience
pnpm run check:worker-contract
pnpm run check:docs
pnpm run check:open-source
pnpm run check:history -- main
```

The Worker tests run through Cloudflare's Vitest integration, apply the real D1 migrations, and dispatch requests to the actual Worker entrypoint. They cover auth, security headers, code-owned built-in templates and scripts, storage restore, download rendering, JSON5 and client-line parsers, rule conversion, remote metadata and Cache API behavior, scoped download grants, recycle/restore, and payload limits. `check:scripts` also generates the registry, performs a Wrangler dry-run bundle, and enforces a 2.5 MiB gzip release budget below the 3 MiB Workers Free limit.

## Subscription Benchmark

订阅热路径的可重复基准测试：

```bash
pnpm run bench:subscription
```

默认覆盖 1,000 和 5,000 个合成节点，测量 `buildSubscription` / `convertSubscriptionContent` 的端到端耗时和内存。参数、数据构造和当前基线见 [benchmark.md](benchmark.md)。

## Deployment Doctor

For Cloudflare install problems:

```bash
pnpm run install:doctor
```

Paste only sanitized output in GitHub issues. Never include subscription URLs, node URIs, admin tokens, download tokens, private D1 database IDs, or generated seed SQL.
