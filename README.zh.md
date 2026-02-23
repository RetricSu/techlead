# VA Auto-Pilot

[English README](./README.md)

VA Auto-Pilot 是一套自治工程执行闭环。

核心理念：**只给最高标准与边界，把路径交给最前沿模型。**

## 设计哲学

- 不自己写细节提示词：只给目标、约束、验收。
- 不自己盯每个 Agent：让管理 Agent 在 CLI 里管理其他 Agent。
- 独立工作流可并发推进，并发策略由管理 Agent 在运行时判断。
- 必须闭环验证：build -> review -> acceptance -> commit。
- 高影响任务优先使用最强模型。
- 用结果和标准评估，而不是用“是否按你给的步骤”评估。

## 你会得到什么

- 可复用 CLI 脚手架：`va-auto-pilot`
- 机器可读状态源：`.va-auto-pilot/sprint-state.json`
- 可读看板投影：`docs/todo/sprint.md`
- 人类控制面：`docs/todo/human-board.md`
- 追加式运行记忆：`docs/todo/run-journal.md`
- 协议文档与启动提示
- 验收流执行器：`scripts/test-runner.ts`

## 快速开始

```bash
# 本地
node ./bin/va-auto-pilot.mjs init .

# npm（发布后）
npx -y va-auto-pilot init .
```

初始化后渲染看板：

```bash
node scripts/sprint-board.mjs render
```

## 指令范式（目标优先，不给步骤）

```text
$va-auto-pilot

目标：
上线 onboarding v2，显著提升激活率。

约束：
- 不改变既有架构边界
- 不引入安全回归
- 关键链路延迟维持在 300ms 内

验收：
- typecheck/lint/test 全通过
- codex review 无阻断问题
- 验收流 MUST 100%，SHOULD >= 80%
```

## 并发推进模型

- 每轮先选一个主任务，同时可并发启动 0 到多个独立轨道。
- 强制门禁是并发轨道的同步屏障。
- 未通过门禁不得推进状态。
- 并发策略由管理 Agent 在实时上下文中决策。
- 默认路径是模型原生并发工具调用。

并发规划命令：

```bash
node scripts/sprint-board.mjs plan --json --max-parallel 3 > .va-auto-pilot/parallel-plan.json
# 由管理 Agent 使用原生并发工具调用执行各轨道
# 状态推进前在门禁处同步
npm run check:all && codex review --uncommitted && npm run validate:distribution
```

实验性辅助器（仅在明确需要时启用）：

```bash
node scripts/va-parallel-runner.mjs spawn --plan-file .va-auto-pilot/parallel-plan.json --agent-cmd "codex exec --task {taskId}"
```

## 分发安装

Codex 安装：

```text
$skill-installer install https://github.com/Vadaski/va-auto-pilot/tree/main/skills/va-auto-pilot
```

Claude Code 安装：

```bash
mkdir -p .claude/commands
curl -fsSL https://raw.githubusercontent.com/Vadaski/va-auto-pilot/main/skills/va-auto-pilot/claude-command.md -o .claude/commands/va-auto-pilot.md
```

## 文档索引

- 协议：`docs/operations/va-auto-pilot-protocol.md`
- 启动提示：`docs/operations/start-va-auto-pilot-prompt.md`
- 分发说明：`docs/operations/distribute-skill.md`
- 理念文章：`docs/human-on-the-loop.md`
- Ralph 对比：`docs/comparisons/va-auto-pilot-vs-ralph.zh.md`

## 官网

`website/` 为独立静态站点，包含：

- 中英切换
- 交互式状态机
- 动画执行演示
- SEO 与 OG 元信息

本地预览：

```bash
cd website
python3 -m http.server 4173
```

## 校验命令

```bash
npm run check:all
npm run validate:distribution
```

## 作者与致谢

- 作者：**Vadaski**、**Codex**
- 致谢：**Claude**、**Vera 项目**

## 许可证

MIT
