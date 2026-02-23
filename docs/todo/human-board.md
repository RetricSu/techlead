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

[x] 真正需要注意的问题（5 observations）
> Processed 2026-02-23: Converted to sprint backlog via `sprint-board.mjs add`. AP-004 (unit tests, P1), AP-005 (YAML parser, P2), AP-006 (test-flows coverage, P1), AP-007 (naming fix, P3), AP-008 (templates architecture, P2 — architectural decision required before implementation).

## Feedback (to fold into next cycle)
- Add product feedback and bug reports here.

## Direction (long-term)
- Add strategic direction here.
