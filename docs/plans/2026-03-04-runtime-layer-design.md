# Runtime Layer 重构设计

## 核心目标

把 `execFileSync` 一次性调用变成**可观测、可控制的异步运行时对象**。

## 架构变更

### 1. 新增 `src/lib/agent/runtime.ts` — AgentRuntime + RunHandle

- `RunHandle`：一次 agent 执行的句柄。持有 `ChildProcess` 引用 + EventEmitter，发射 `start`/`stdout`/`stderr`/`complete`/`error`/`timeout` 事件
- `AgentRuntime`：管理所有活跃 RunHandle，提供 `spawn()` → RunHandle、`list()`、`get(runId)`、`cancel(runId)`
- **不提供 spawnSync**，全部 async

### 2. 新增 `src/lib/agent/run-state.ts` — 落盘状态

- 状态文件放在 `.techlead/tasks/{taskId}/runs/{runId}.json`
- **不使用 active.json 索引**，全局活跃 run 通过扫描所有 task 目录下的 runs/ 获取（status=running/pending）
- debounced 写入，每秒最多 1 次
- 进程启动时扫描清理孤儿 run（PID 不存在 → 标记 failed）

### 3. 改造 `src/lib/agent/adapter.ts` — 精简为纯构建层

- 保留：`build*Command`、`parse*Output`、`isAgentAvailable`、`detectAgent`、`createDefaultConfig`
- 删除：`executeAgent`（同步）、`executeAgentAsync`
- 新增：`buildSpawnArgs(config, options)` → `{ cmd, args, input?, env }` 统一结构

### 4. 改造 `src/lib/core/commands.ts` — 全部改 async

- `cmdRun`/`cmdLoop` 改为 async，用 `runtime.spawn()` + `await handle.result()`
- `executePhaseAgent`/`executeAgentWithFallback` 改为 async
- `cli.ts` 的 `.action()` 回调改为 async handler

### 5. 新增 `techlead watch` 命令

- 无参数：列出所有活跃 run（扫描 `.techlead/tasks/*/runs/*.json`）
- `--follow`/`-f`：`fs.watch` 持续刷新
- `--run <runId>`：聚焦特定 run

### 6. 新增 `techlead cancel [runId]` 命令

- 读 run state 获取 PID → SIGTERM（15s）→ SIGKILL
- 更新 run state 为 cancelled

## 设计决策

| 决策 | 选择 | 原因 |
|------|------|------|
| spawnSync 兼容桥梁 | 不提供 | cac 原生支持 async action，一步到位 |
| 状态文件索引 | 只用 runs/ 目录，无 active.json | 单一数据源，无一致性风险 |
| 并发 slot 预留 | 不做 | YAGNI，runs/ 目录天然支持多 run 并存 |
| 运行时状态目录 | .techlead/tasks/{taskId}/runs/ | 与任务数据聚合，语义清晰 |
| 事件模型 | EventEmitter | 零依赖，Node 原生 |
| 进程间通信 | 纯文件系统 | 简单可靠，watch 不需要连接 running 进程 |
| 状态写入频率 | debounced，每秒最多 1 次 | 避免高频 I/O |
