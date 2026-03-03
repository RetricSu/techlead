# TechLead 流程跑通验收标准

> 版本：v0.2.0  
> 生效日期：2026-03-03

## 目标

定义“流程已跑通”的统一判定标准，避免只看日志主观判断成功。

## 最小验收范围

必须至少完成 1 个独立测试任务，从 `backlog` 走到 `done`。

## 验收通过条件（全部必须满足）

1. 任务状态
   - `.techlead/tasks/<task>/task.json` 满足：
   - `status = "done"`
   - `phase = "completed"`
2. 阶段产物
   - `plan/discussion.md`
   - `plan/plan.md`
   - `work-log.md`
   - `review/reviewer-1.md`
   - `test/adversarial-test.md`
3. 质量门禁
   - 在执行完成前触发质量门禁（优先 `pnpm run check:all`）
   - 门禁失败时任务必须留在 `exec`，不能直接进入 `review`
4. 对抗审查与测试
   - `review` 和 `test` 的 verdict 均非 `CRITICAL`
5. 循环停止条件
   - `techlead loop` 能在“任务完成”或“达到停止条件（重试上限/无进展）”时稳定退出

## 推荐本地验收流程

```bash
# 1) 基础健康度
pnpm run test
pnpm run check:all

# 2) 创建并执行一个独立测试任务
node ./dist/cli.js init
node ./dist/cli.js add "smoke: run one full workflow"
node ./dist/cli.js loop --max-cycles 8 --max-no-progress 2

# 3) 验收状态与产物
node ./dist/cli.js status
node ./dist/cli.js list
```

## 验收结果记录建议

每次演练后记录：

- 演练日期（绝对日期）
- 使用的 provider / model
- 是否触发 fallback
- 失败阶段与错误信息
- 下次要修复的前 1~3 项
