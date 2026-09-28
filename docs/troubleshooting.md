# 故障排查

先判断你走的是哪条安装路径：

- Cloudflare 官方 Deploy Button。
- `pnpm run install:cloudflare`。
- 手动 Wrangler 部署。
- 本地开发。

不要在 issue 里贴订阅 URL、节点 URI、admin token、download token、私有 D1 database id 或生成的 seed SQL。

## 快速诊断

```bash
pnpm run install:doctor
pnpm run check:release
pnpm run deploy:dry-run
```

如果只想检查 Cloudflare 登录：

```bash
pnpm --dir cloudflare exec wrangler whoami
```

## Deploy Button 的 Secret 已经被填满

正常情况下，`SUB_STORE_ADMIN_TOKEN` 和 `SUB_STORE_PUBLIC_DOWNLOAD_TOKEN` 需要你自己填写两个不同的随机值。

如果输入框出现 `replace-with-...`、`example` 或其他公开固定字符串，不要点击部署。这通常表示部署源仍包含会被 Cloudflare 读取的根目录 `.dev.vars.example`。请确认使用仓库最新版本并提交 issue。

跨平台生成随机值：

```bash
node --input-type=module -e "import {randomBytes} from 'node:crypto'; console.log(randomBytes(32).toString('base64url')); console.log(randomBytes(32).toString('base64url'))"
```

## 没有 Cloudflare 账号

这个项目必须运行在 Cloudflare Workers + D1 上。可以先阅读文档和准备本地配置，但不能完成线上部署。

创建 Cloudflare 账号后运行：

```bash
pnpm --dir cloudflare exec wrangler login
pnpm run install:cloudflare
```

## Agent 不能连接 Cloudflare

如果 Codex、Claude Code 或其他本地 Agent 无法访问 Cloudflare，不要把部署状态写成成功。让 Agent 停在 handoff 状态，并给出恢复命令：

```bash
pnpm --dir cloudflare exec wrangler login
pnpm run install:cloudflare
```

## Wrangler 没登录

现象通常是 `wrangler whoami` 失败，或者创建 D1 / 写 secret / deploy 时要求认证。

处理：

```bash
pnpm --dir cloudflare exec wrangler login
pnpm --dir cloudflare exec wrangler whoami
```

然后重新运行安装：

```bash
pnpm run install:cloudflare
```

## D1 配置错误

现象可能是 migration 失败、Worker 访问 `DB` binding 失败，或 deploy config 检查失败。

处理：

```bash
pnpm run check:deploy-config -- --required
pnpm run deploy:config -- config/agent-setup.local.json cloudflare/wrangler.deploy.local.jsonc --database-id <database-id>
pnpm run migrate:remote
```

确认 `cloudflare/wrangler.deploy.local.jsonc` 是本地文件，不要提交。

## Secret 缺失

线上 Worker 至少需要：

- `SUB_STORE_ADMIN_TOKEN`
- `SUB_STORE_PUBLIC_DOWNLOAD_TOKEN`

重新写入：

```bash
pnpm --dir cloudflare exec wrangler secret put SUB_STORE_ADMIN_TOKEN --config wrangler.deploy.local.jsonc
pnpm --dir cloudflare exec wrangler secret put SUB_STORE_PUBLIC_DOWNLOAD_TOKEN --config wrangler.deploy.local.jsonc
```

## 部署按钮成功但没有订阅源

这是正常行为。Cloudflare Deploy Button 只负责让应用跑起来，不会读取你的本地 `config/agent-setup.local.json`，也不会把订阅源写进 GitHub。

部署完成后用管理界面添加订阅源，或在本地准备 seed 后运行：

```bash
pnpm run seed:validate
pnpm run seed:render
pnpm run seed:remote
```

也可以直接按管理端首次使用卡片完成 Source → Collection → 下载链接。

## CLI 第一次运行时没有 setup 文件

真实交互式终端会打开快速引导。非交互 Agent 环境会创建 `config/agent-setup.local.json` 示例并停止，这是为了避免把示例订阅 URL 部署到生产。

三种继续方式：

```bash
# 编辑真实 Sources / Collections 后继续
pnpm run install:cloudflare

# 明确部署空应用，之后在网页配置
pnpm run install:quick

# 只检查环境
pnpm run install:doctor
```

## 下载链接返回 401

检查链接里是否使用 download token，而不是 admin token：

```text
/download/collection/<collection-id>/mihomo?token=<download-token>
```

管理界面和 `/api/*` 使用 admin token。`/download/*` 使用 download token。

## 输出格式不对

显式指定 target：

```text
/download/collection/<collection-id>/mihomo?token=<download-token>
/download/collection/<collection-id>/sing-box?token=<download-token>
/download/collection/<collection-id>/uri?token=<download-token>
```

不带 target 时，Worker 会按客户端 User-Agent 自动判断，无法识别时默认 Mihomo。

## sing-box 报 legacy inbound fields 或 decode config 错误

`sing-box` 下载链接生成的是 sing-box 1.12+ 的配置格式：入站不再带 `sniff` 字段，而是使用 route 规则动作 `sniff`；WireGuard 节点放在 `endpoints` 而不是 `outbounds`；DNS 服务器使用 1.12 起的新格式（`type` / `server`），并用 `route.default_domain_resolver` 指定解析节点域名的引导 DNS。

sing-box 1.11.0 弃用了这些旧字段，1.13.0 起直接拒绝加载；DNS 服务器的旧格式在 1.14.0 被移除。请把客户端升级到 sing-box 1.12 或更高版本；更旧的客户端会报：

```text
legacy inbound fields are deprecated in sing-box 1.11.0 and removed in sing-box 1.13.0
```

## sing-box 没有 VPN 图标或没有流量统计

下载到的是一份完整的 VPN 配置：包含 `tun` 入站（`auto_route`）和 DNS 配置，因此 iOS / Android 客户端（SFI、SFA、Karing 等）启用后会接管系统流量，状态栏出现 VPN 图标，Dashboard 也会显示上下行速率。

- 移动端由客户端提供 TUN 实现，但**配置里必须有 `tun` 入站**；只有 `mixed` 本地代理的配置不会接管系统流量。
- 桌面端命令行直接运行该配置需要 root / 管理员权限（创建 TUN 需要权限）；图形客户端不需要。

## sing-box 分组和 Mihomo 不一样

`sing-box` 链接使用集合绑定的同一份模板，分组名称、成员顺序、`$all` / `filter` 展开规则都和 Mihomo 链接一致：

- `select` → `selector`，`url-test` → `urltest`，默认选中第一个成员。
- `fallback` / `load-balance` 在 sing-box 1.13 被移除，因此降级成 `selector`。
- `PASS` 和指向已删除分组的成员会被丢弃，否则 sing-box 启动会报 `dependency[...] not found`。
- 模板里的 `mixed-port` / `allow-lan` 会写进 `mixed` 入站。

分流规则现在也会跟过去：模板里引用 MetaCubeX/meta-rules-dat 规则集的 `RULE-SET` 规则会生成远程 `.srs` rule set（从 `cdn.jsdelivr.net` 取，可用 `rulesetCdn` 换源），`GEOIP,<两位国家码>` 会映射到 `geoip/<国家码>.srs`，`MATCH` 变成 `route.final`。其余能直接表达的规则（`DOMAIN`、`DOMAIN-SUFFIX`、`DOMAIN-KEYWORD`、`DOMAIN-REGEX`、`IP-CIDR`、`IP-CIDR6`、`SRC-IP-CIDR`、`DST-PORT`、`SRC-PORT`、`PROCESS-NAME`、`PROCESS-PATH`）会写成 sing-box 的 route 规则。

**Loyalsoldier 这类 Clash 规则集**（`.txt` payload 列表）sing-box 读不了，所以由 Worker 转换后提供：下载链接里的集合 id 和 download token 会拼进 rule set 地址（`/download/collection/<id>/ruleset/<provider>?token=…`），客户端拉取时 Worker 才去上游取列表、转成 sing-box source 格式并缓存（按 provider 的 `interval`）。所以 Mihomo 用 Loyalsoldier 的列表，sing-box 用的是同一份列表转出来的规则集，两边分流一致。

会被跳过的：`GEOSITE`、`IP-ASN`、`SCRIPT` 这类规则，以及没有集合/下载 token 上下文时（例如 `convertSubscriptionContent`）的所有 Clash 规则集。这些流量会走 `route.final` 指向的分组，也就是 Mihomo 里 `MATCH` 对应的那个分组。

如果集合没有绑定模板，`sing-box` 输出回落到内置的 `PROXY` / `AUTO` 分组。

## sing-box 提示 legacy `download_detour` 已弃用

```text
legacy `download_detour` remote rule-set option is deprecated in sing-box 1.14.0 and will be removed in sing-box 1.16.0.
```

1.14 用 route 级的共享 HTTP 客户端取代了每条规则集上的 `download_detour`，而 1.12/1.13 不认新写法（会报 `http_clients: json: unknown field`），所以下载链接会按客户端上报的内核版本自动二选一：`SFI (sing-box 1.14.2; …)`、`SFA (…)` 这类 UA 会被解析，1.14 及以上得到 `http_clients` + `route.default_http_client`，其余（含识别不出的 UA）保持 `download_detour`。

看到这条告警说明客户端拿到的还是旧写法，重新下载配置即可；如果客户端改写了 User-Agent，用 `?singboxHttpClients=1` 强制新写法（旧内核不要用）。

## sing-box 的 DNS 和 Fake-IP

`sing-box` 链接默认跟 Mihomo 模板的 `dns.enhanced-mode: fake-ip` 一致，下发双栈虚拟地址池（`198.18.0.0/15` + `fc00::/18`），A 和 AAAA 都会返回虚拟地址，流量由 tun 接管后按模板规则分流：

```json
"dns": {
  "servers": [
    { "tag": "dns-proxy", "type": "tls", "server": "1.1.1.1", "detour": "🚀 节点选择" },
    { "tag": "dns-bootstrap", "type": "udp", "server": "223.5.5.5" },
    { "tag": "dns-fakeip", "type": "fakeip", "inet4_range": "198.18.0.0/15", "inet6_range": "fc00::/18" }
  ],
  "rules": [{ "query_type": ["A", "AAAA"], "server": "dns-fakeip" }],
  "final": "dns-proxy"
}
```

- 地址池可以用模板里的 `dns.fake-ip-range` / `dns.fake-ip-range6` 换掉。
- 不想要 fake-ip：把模板的 `dns.enhanced-mode` 改成 `redir-host`，或者用 `?singboxFakeIp=0` 只关掉这一份配置（`?singboxFakeIp=1` 反过来强制打开）。
- 报 `missing fakeip record, try enable experimental.cache_file`：配置里少了 `experimental.cache_file`（`store_fakeip`），客户端重启后虚拟地址没法映射回域名。重新下载配置即可，现在的 profile 默认带这个字段。
- 命中虚拟地址的连接会先还原成域名再匹配规则，所以 `ip_cidr`、`geoip` 这类 IP 规则只对直连 IP 生效，域名流量看域名规则；需要 IP 规则也参与匹配时，在模板规则前加 `{ "action": "resolve" }`。

## 节点被过滤掉

先移除包含规则较严格的 `include` 过滤器（例如只匹配指定地区的正则表达式）。保守起步建议只使用：

- `quick` 过滤器（开启清理无效节点等常用属性设置）
- `dedupe` 过滤器（按 `server` 与 `port` 去重）
- `sort` 过滤器（按节点名升序或降序排列）

再逐步增加区域过滤等规则。
