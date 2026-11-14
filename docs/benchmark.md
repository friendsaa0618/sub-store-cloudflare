# 订阅热路径基准测试

`scripts/benchmark-subscription.mjs` 用可重复的本地合成数据测量订阅构建热路径，覆盖从 URI 解析、过滤器处理、节点重命名到 Mihomo YAML 渲染的完整链路。

它不会访问网络，也不会修改生产代码；脚本直接导入 `cloudflare/src/lib/subscription/index.ts`，由 Node 内置的 TypeScript 类型擦除执行，并用一个很小的 resolve hook 补齐 Worker 打包器平时处理的省略扩展名导入。

## 运行

需要 Node 26 和 pnpm 11.7.0，并先完成 `pnpm install`。

```bash
pnpm run bench:subscription
```

默认生成 1,000 和 5,000 个节点，每个场景预热 2 次、测量 5 次。常用参数：

```bash
# 增加测量次数，基线对比建议至少 9 次
pnpm run bench:subscription -- --runs 9

# 只测指定规模，并固定随机种子
pnpm run bench:subscription -- --nodes 1000,5000 --runs 9 --warmup 2 --seed 20261114

# 输出完整 JSON，便于脚本比对
pnpm run bench:subscription -- --json
```

`--json` 只输出 JSON，不会混入脚本注册表生成日志。完整参数见 `pnpm run bench:subscription -- --help`。

## 合成数据

每次运行都会构造两个本地订阅源（约 60% / 40% 拆分），总节点数为请求的规模：

- URI 行混合 `trojan://`、`vless://`、`vmess://` 和 `ss://`。
- 每 8 个节点有一个复用前一个名称，制造源内重名；第二个源复用第一个源前 25% 的名称，制造跨源重名。
- 每 3 个节点带一个 `[1x]` 后缀，由 `delete-field` 过滤掉。
- 每 50 个节点复用前一个 `server:port`，由 `dedupe` 删除，因此默认会移除约 2% 的节点。
- 源级过滤器：`delete-field`、`dedupe`（`server`、`port`）、`regex-sort`（HK、JP、SG、US）。
- 组合级过滤器：`dedupe`（`name`、`server`、`port`）、`sort`。
- 输出目标固定为 `mihomo`，使用内置的 `acl4ssr-mihomo` 模板。

随机数使用固定种子，默认 `20261114`；同一 Node 版本、同一机器上的输入和输出大小应保持一致。

## 测量口径

每个场景先执行预热，然后强制 GC 一次，再连续测量指定次数：

- `buildSubscription`：读取两个本地源，执行源级过滤、组合级过滤、唯一名称处理和模板渲染。
- `convertSubscriptionContent`：对拼接后的内容执行一次性解析、同一组过滤、唯一名称处理和模板渲染。
- 控制台报告 wall `median`、进程 CPU `median`、`min`、`max`、输出大小，以及一次额外运行的堆内存增量。CPU 时间包含 V8 后台 GC/编译线程，可能高于 wall time，但在共享 CPU 上通常比 wall time 更稳定。
- `peak` 是运行后未 GC 的堆增量，`retained` 是 GC 后仍被输出引用的存活堆。
- 内存数字依赖 `--expose-gc`；通过 `pnpm run bench:subscription` 运行时会自动带上该参数。

绝对耗时依赖机器、CPU 频率和当前负载。做回归对比时应在同一台机器上、使用相同参数和 Node 版本运行，并优先比较多次运行的 median，而不是单次结果。

## 基线

记录环境：Node v26.12.1、pnpm 11.7.0、Linux x64、AMD EPYC-v4（Amp orb）。参数：默认种子 `20261114`，预热 2 次，测量 9 次。

| 节点数 | 场景 | wall median | CPU median | wall min–max | 输出 | 存活堆 |
| --- | --- | ---: | ---: | ---: | ---: | ---: |
| 1,000 | `buildSubscription` | 33.67 ms | 41.32 ms | 31.53–52.98 ms | 281.3 KB | +0.50 MB |
| 1,000 | `convertSubscriptionContent` | 34.36 ms | 38.75 ms | 31.53–46.86 ms | 281.2 KB | +0.50 MB |
| 5,000 | `buildSubscription` | 163.79 ms | 195.18 ms | 156.97–188.24 ms | 1.35 MB | +2.64 MB |
| 5,000 | `convertSubscriptionContent` | 159.67 ms | 189.92 ms | 155.31–203.43 ms | 1.35 MB | +2.64 MB |

同一环境重复运行时，wall median 的常见范围约为 34–36 ms（1,000 节点）和 164–177 ms（5,000 节点）；共享 CPU 被其他任务占用时曾观察到约 57 ms / 260 ms。回归比较应在同一时段进行，并同时参考 CPU median。运行期间的堆峰值约为 30 MB（1,000 节点）和 27 MB（5,000 节点），包含尚未回收的临时对象，因此高于存活堆。

## 热点分析

在 5,000 节点、9 次测量的 CPU profile 中，约 71% 的采样落在 `renderMihomoYaml`，其中绝大部分来自 `yaml` 包为每个代理节点构建 Document 树后再序列化；解析约占 13.5%，过滤约占 3.7%。因此优化集中在 YAML 渲染路径：`render/yaml.ts` 直接按块样式写出订阅文档，跳过 `yaml` 包的中间树，同时保留相同的引号/转义规则。解析侧另将 vmess base64 解码从逐字节回调改为直接循环，并让 `stripUndefined` 在无需删除字段时复用原对象。

## 优化后基线

记录环境与基线相同。优化后在 HEAD 基线 worktree 与优化工作区之间交替运行 3 轮，每轮 9 次测量，下表取三轮 median 的中位数；本基准的输出字节数与原基线完全一致。

| 节点数 | 场景 | wall median | CPU median | 优化前 wall | wall 提升 | 峰值堆 |
| --- | --- | ---: | ---: | ---: | ---: | ---: |
| 1,000 | `buildSubscription` | 6.14 ms | 8.23 ms | 34.08 ms | 5.6× | +9.0 MB |
| 1,000 | `convertSubscriptionContent` | 5.57 ms | 6.11 ms | 33.60 ms | 6.0× | +9.0 MB |
| 5,000 | `buildSubscription` | 27.57 ms | 32.86 ms | 166.19 ms | 6.0× | +14.9 MB |
| 5,000 | `convertSubscriptionContent` | 29.15 ms | 31.76 ms | 168.08 ms | 5.8× | +15.9 MB |

优化后 5,000 节点的存活堆仍约为 +2.8 MB；峰值堆从约 27.7 MB 降到约 14.9 MB，说明序列化过程中的临时对象明显减少。
