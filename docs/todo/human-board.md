# Human Board

> Human writes objectives and constraints here.
> VA Auto-Pilot reads this at the start of every cycle.
> Processed items must be marked `[x]`, never deleted.

---

## Instructions (highest priority)
- [x] Sprint 2 dogfood run: use va-auto-pilot itself to develop the next feature sprint. Keep complete journal and sprint records. Design philosophy: maximize delegation to CLI and sub-agents. Manager agents must not implement — they delegate. Codex review found bug in AP-002. AP-003 adds the missing `sprint-board.mjs add` CLI command. Execute both tasks through the full quality loop: implement → review → acceptance → commit → push.
> Processed 2026-02-23: Executing AP-003 (primary, P1) and AP-002 (parallel, P2) concurrently via sub-agent delegation. Both tasks independent. Quality gates enforced: check:all → multi-perspective review → validate:distribution before commit.

[x] 让 Claude code 和 codex 交叉 review 改进，先让他们理解这套哲学，然后进行改进，直到两个都互相挑不出毛病为止，要充分考虑到模型的强大，不要写死各种东西限制它们的发挥，另外多视角这件事我希望不只是我们能定义，而且应该提示模型可以根据当前的需求场景临时定义最需要最合适的视角，不要给予假设和限定，但是在定义视角的时候必须要充分考虑当前的真实约束条件，以及锚点，让合适的视角自然的涌现，一切问题都是分类问题，可分的前提是给予了正确的约束条件，如果锚点对了，问题迎刃而解，如果解决遇到问题，那么就是视角和锚点错了，要换视角，换锚点。这是本项目的设计哲学。写完就推送就好了，最好自己吃自己的狗粮来验证。
> Processed 2026-02-23: Rewrote Multi-Perspective Review in va-auto-pilot-protocol.md. Two independent cross-reviews (adversarial adopter + protocol designer) each found 3 CRITICALs. All 6 CRITICALs resolved: added anchor identification guard, replaced undefined "confidence" with concrete completion condition, bounded review loop with 3-cycle cap, made "change anchor" a bounded procedure ref, added perspective count heuristic, specified re-review = full perspective set. Template synced. Pushed.

真正需要注意的问题
1. sprint-utils.mjs 的 YAML parser 是个定时炸弹
你自己写了个极简 YAML 解析器——只支持单层 section + 2-space 缩进的 key: value。文件顶部的注释也承认了这点。但如果有人在 config.yaml 里用了多行值、引号嵌套、或者不同缩进，会静默失败返回空对象。考虑到这是配置入口，一个 yaml npm 包（你 devDependencies 里已经有了）或至少一个更明确的 parse error 会更安全。
2. templates/ 和 scripts/ 的双份拷贝策略有设计张力
validate-distribution.mjs 里的 mirror check 证明你意识到了这个问题，但根本上这还是个"复制 → 检查 → 手动同步"的工作流。随着文件增多，这会成为负担。考虑让 init 命令直接从 scripts/ 拷贝而非维护独立的 templates/scripts/，或者用 symlink/build step 消除冗余。
3. test-flows 只有一个 feature-smoke.yaml，而且非常骨架化
两个 flow，各一个 turn，断言主要是"不为空"和"不泄露内部信息"。这距离 README 里描述的"MUST 100%, SHOULD >= 80%"的验收体系还差不少内容。验收框架的价值 = 框架本身 × 测试覆盖度，目前后者接近零。
4. "human out of the loop" 的名字比实际系统更激进
读完协议文档就知道，系统设计了大量的人类介入点（human-board 最高优先级、3 次失败停机、架构决策停机、停机条件记录）。实际上这是 "human on the loop"——人类从实时操控变成异步监督。文章第 8 节也说了"不是无监督自治"。但标题的冲击力可能会造成误期待。
5. 没有任何单元测试
sprint-board.mjs 里的环检测、依赖满足判定、并行计划生成、状态转换——这些都是有明确输入输出的纯函数，非常适合单测。目前 check:all 只跑了 --help 和 distribution validation，核心逻辑没有测试覆盖。

## Feedback (to fold into next cycle)
- Add product feedback and bug reports here.

## Direction (long-term)
- Add strategic direction here.
