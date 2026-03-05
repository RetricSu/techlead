# Runtime Layer 重构计划

## 核心问题

当前 runtime 层本质上就是一个 `execFileSync` 调用 — 同步阻塞、不可观测、不可中断。`executeAgentAsync` 虽然存在但从未被使用。你无法从另一个终端看到"agent 现在在干嘛"，也无法在它跑偏时介入。

## 目标

把"spawn 一个 agent 进程"从一次性函数调用变成一个**可观测、可控制的运行时对象**。

---

## Steps

### 1. 新增 `src/lib/agent/runtime.ts` — `AgentRuntime` + `RunHandle`

引入两个核心抽象：
- `RunHandle`：代表一次 agent 执行，包含 `runId`、`status`（pending/running/completed/failed/cancelled/timeout）、`startedAt`、`lastActivityAt`、输出缓冲区、取消方法
- `AgentRuntime`：管理所有活跃的 RunHandle，提供 `spawn()` → `RunHandle`、`list()` → 活跃 run 列表、`get(runId)` → 单个 run 状态、`cancel(runId)` → 优雅终止

关键设计：
- `spawn()` 内部用 `child_process.spawn`（不再用 `execFileSync`），返回 `RunHandle`
- `RunHandle` 持有 `ChildProcess` 引用 + EventEmitter，发射结构化事件：`start` / `stdout` / `stderr` / `complete` / `error` / `timeout`
- `RunHandle.result()` 返回 `Promise<AgentResult>`，供需要等待结果的调用方 await
- `RunHandle.output` 是实时累积的输出缓冲区，任何时候可以读取当前进度

### 2. 新增 `src/lib/agent/run-state.ts` — 落盘状态文件

每个 RunHandle 在 `.techlead/runtime/` 下维护一个 JSON 状态文件：

```
.techlead/runtime/
├── active.json          # 当前活跃 run 列表（runId → taskId 映射）
└── runs/
    └── {runId}.json     # 单次执行的实时状态
```

`runs/{runId}.json` 结构：
- `runId`, `taskId`, `phase`, `provider`, `model`
- `status`: pending | running | completed | failed | cancelled | timeout
- `pid`: agent 子进程 PID
- `startedAt`, `lastActivityAt`, `completedAt`
- `outputTail`: 最近 N 行输出（滚动窗口，不是全量）
- `bytesReceived`, `chunksReceived`: 进度指标

这个文件由 RunHandle 在每次收到 stdout/stderr chunk 时原子更新（debounced，不超过每秒 1 次）。另一个终端可以 `cat` 或 `techlead watch` 读取。

进程启动时扫描 `active.json`，清理已死亡的孤儿 run（PID 不存在 → 标记 failed + 写原因）。

### 3. 改造 `src/lib/agent/adapter.ts` — 精简为纯构建层

当前 adapter.ts 混了三件事：命令构建、进程管理、输出解析。重构后：
- **保留**：`buildClaudeCommand`、`buildCodexCommand`、`buildKimiCommand`、`parseClaudeOutput`、`parseCodexOutput`、`parseKimiOutput`、`isAgentAvailable`、`detectAgent`、`createDefaultConfig` — 这些是纯函数，不变
- **删除**：`executeAgent`（同步版）和 `executeAgentAsync` — 进程管理移入 `AgentRuntime.spawn()`
- **新增导出**：`buildSpawnArgs(config, options)` → 返回 `{ cmd, args, input?, env }` 统一结构，供 runtime 消费

这样 adapter 变成纯粹的"知道每种 agent CLI 怎么调"的知识层，不再持有任何进程生命周期代码。

### 4. 改造 `src/lib/core/commands.ts` — 从同步改异步

- `cmdRun` / `cmdLoop` 改为 `async`，内部用 `const handle = runtime.spawn(prompt, config, options)` 拿到 RunHandle，然后 `await handle.result()`
- `executePhaseAgent` 和 `executeAgentWithFallback` 改为 async，逻辑不变，只是 await 而非同步返回
- `src/cli.ts` 的 `.action()` 回调改为 async handler（cac 原生支持）
- 过渡期：提供 `runtime.spawnSync()` 方法作为兼容桥梁，内部 spawn + busy-wait，供不方便改 async 的路径使用（但标记 deprecated）

### 5. 新增 `techlead watch` 命令 — 实时观测

在 `src/cli.ts` 新增 `watch` 命令，做两件事：
- 无参数：读 `.techlead/runtime/active.json`，列出所有活跃 run 的摘要（taskId、phase、已运行时间、最后活动时间、输出尾行）
- `--follow`/`-f`：轮询（或 `fs.watch`）run state 文件，持续刷新输出，类似 `tail -f`
- `--run <runId>`：聚焦到特定 run，显示完整输出缓冲区

这就是"随时查看机器在干嘛"的入口。不需要和 running 进程通信，纯读文件。

### 6. 新增 `techlead cancel [runId]` 命令 — 介入控制

- 读 `runs/{runId}.json` 获取 PID
- 先发 SIGTERM（15s 优雅期），然后 SIGKILL
- 更新 run state 为 cancelled
- 更新 task.json 状态（保持当前 phase，不推进）

如果无参数，取消当前唯一活跃 run。

### 7. 为并发预留 slot 设计（不实现，只留接口）

`AgentRuntime` 构造时接受 `maxConcurrency: number`（默认 1）。`spawn()` 在达到上限时返回排队状态。`active.json` 中用 `slotId` 区分不同 agent。`current.json` 将来演进为 `slots/` 目录，每个 slot 一个指针文件 — 但这步不做，只确保数据结构不堵死这条路。

---

## Verification

- `pnpm build` 无类型错误
- 现有 smoke test 通过（mock `executeAgent` → mock `runtime.spawn().result()`）
- 手动验证：`techlead run` 启动后另一个终端 `cat .techlead/runtime/runs/*.json` 能看到实时状态
- 手动验证：`techlead watch` 输出活跃 run
- 手动验证：`techlead cancel` 能终止正在运行的 agent

---

## Decisions

- **删除 `execFileSync` 路径，不保留同步执行**：同步调用是所有可观测性问题的根源，必须切掉。`spawnSync` wrapper 只作为测试过渡
- **状态文件用 JSON 而非 SQLite/IPC**：保持文件系统范式一致性，跨进程通信纯靠磁盘，简单可靠，`watch` 命令不需要连接到 running 进程
- **debounced 写入而非每 chunk 写入**：避免高频 I/O，每秒最多 1 次状态文件更新
- **RunHandle 用 EventEmitter 而非 Observable**：零依赖，Node 原生，够用
- **不引入 daemon 进程**：`techlead loop` 本身就是长运行进程，加上 `nohup` 或 `pm2` 就够了，不需要自己写 daemon 逻辑
