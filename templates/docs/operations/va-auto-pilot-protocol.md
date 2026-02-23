# VA Auto-Pilot Protocol

> Behavioral specification for autonomous multi-agent project execution.
> Read this before running a VA Auto-Pilot loop.

---

## Core Principles

1. You are the manager of outcomes, not the implementer of steps.
2. `.va-auto-pilot/sprint-state.json` is the machine task source of truth.
3. `docs/todo/sprint.md` is a generated board view (`node scripts/sprint-board.mjs render`).
4. `docs/todo/run-journal.md` is append-only execution memory.
5. Execute one primary task per cycle; optional parallel tracks are allowed when independent.
6. `docs/todo/human-board.md` always overrides automatic decisions.
7. Goal-first delegation: define objective + constraints + acceptance. Do not prescribe implementation steps.
8. CLI-first execution: prefer deterministic commands over manual operations.
9. Frontier model first: use the strongest available model for high-impact tasks.
10. Closed-loop quality is mandatory: build -> review -> acceptance -> commit.

---

## State Machine

```
Backlog -> In Progress -> Review -> Testing -> Done
                 ^                     |
                 +------ Failed <------+
```

### State Semantics

- `Backlog`: not started
- `In Progress`: implementation running
- `Review`: implementation done, quality review pending
- `Testing`: review passed, acceptance tests running
- `Failed`: acceptance failed or blocking issue
- `Done`: all gates passed and committed

---

## Human Board Contract

At the start of each cycle:

1. Read `docs/todo/human-board.md`.
2. Execute unchecked items under `Instructions` immediately.
3. Fold `Feedback` into backlog updates or current task context.
4. Use `Direction` for priority decisions.
5. Mark handled instruction items as `[x]`.

Never delete human-written content.

---

## Operational Memory Contract

At the start of each cycle:

1. Read `docs/todo/run-journal.md`.
2. Check `Codebase Signals` first.
3. Reuse existing signals before inventing new conventions.
4. Append one execution entry at the end of each cycle.

---

## Decision Loop

```
Read human-board.md
  -> unhandled instructions? execute now
Read run-journal.md
Resolve next task via CLI
  -> node scripts/sprint-board.mjs next
  -> optional: node scripts/sprint-board.mjs plan --json --max-parallel 3
  -> has Failed task? fix + retest
  -> has Testing task? run acceptance
  -> has Review task? run review
  -> has In Progress task? continue
  -> has Backlog task? start highest priority
  -> none? mark Sprint Complete and stop
```

### Task Pick Strategy

- Priority order: P0 > P1 > P2 > P3
- Tie-breaker: earliest creation date
- Skip tasks requiring unavailable external resources
- Use CLI output as execution trigger, not manual guesswork

---

## Concurrency Contract

Parallel execution is encouraged when tasks are independent.

Rules:

1. Let the manager agent decide concurrency dynamically at runtime.
2. Parallelize where dependency graph allows; serialize where it does not.
3. Use quality gates as synchronization barriers before state promotion.
4. Never bypass acceptance to "speed up" parallel tracks.
5. Record concurrency decisions and tradeoffs in `run-journal.md`.

When planning concurrency, produce a machine-readable plan:

```json
{
  "primaryTaskId": "{{PROJECT_PREFIX}}-001",
  "parallelTracks": ["{{PROJECT_PREFIX}}-002", "{{PROJECT_PREFIX}}-003"],
  "dependencyGraph": {
    "{{PROJECT_PREFIX}}-001": [],
    "{{PROJECT_PREFIX}}-002": [],
    "{{PROJECT_PREFIX}}-003": ["{{PROJECT_PREFIX}}-002"]
  },
  "syncPoints": ["quality-gates"]
}
```

Execution path preference:

1. Model-native tool orchestration first (no required external runner).
2. Optional deterministic helper: `node scripts/va-parallel-runner.mjs spawn --plan-file ...`.

---

## State Update Contract

Use deterministic updates only:

```bash
node scripts/sprint-board.mjs update --id {{PROJECT_PREFIX}}-001 --state "In Progress"
node scripts/sprint-board.mjs journal --task {{PROJECT_PREFIX}}-001 --summary "what changed"
```

Rules:

1. Do not hand-edit generated rows in `docs/todo/sprint.md`.
2. Update `.va-auto-pilot/sprint-state.json` through CLI whenever possible.
3. Keep `run-journal.md` append-only.

---

## Delegation Contract

Every implementation delegation must include:

1. Task ID and objective
2. Relevant file paths
3. Hard constraints (architecture, security, naming, limits)
4. Completion gates (`{{BUILD_COMMAND}}`)
5. A no-how clause: do not prescribe implementation steps

---

## Quality Gates

### Gate 1: Build and Static Quality

```bash
{{BUILD_COMMAND}}
```

### Gate 2: Code Review

```bash
{{REVIEW_COMMAND}}
```

Review findings policy:

- `CRITICAL` / `BUG` / `VIOLATION`: must fix and re-review
- style-only nits: optional, non-blocking

### Gate 3: Acceptance

```bash
{{TEST_COMMAND}}
```

Pass criteria:

- MUST assertions: 100% pass
- SHOULD assertions: >= 80% pass

---

## Multi-Perspective Review

Run independent reviews from four lenses:

1. `Security Engineer`
2. `QA Engineer`
3. `{{DOMAIN_ROLE_NAME}}`
4. `Architect`

Use this prompt for the domain role:

```
{{DOMAIN_EXPERT_PROMPT}}
```

---

## Commit Policy

Commit immediately after required gates pass.

Rules:

1. One completed task = one commit (parallel tracks commit independently after gates)
2. Stage only task-related files
3. Commit message describes intent
4. Never force push unless explicitly approved
5. Never commit secrets

---

## Stop Conditions

Stop and wait for human when:

1. Backlog is empty
2. Same task failed three times
3. External resources are required
4. High-impact architecture decision is needed
5. Destructive operation is required

Record stop reason in `sprint-state.json` and `run-journal.md`.

---

## Bootstrap Checklist

- [ ] `.va-auto-pilot/sprint-state.json` exists and backlog is populated
- [ ] `docs/todo/sprint.md` can be rendered via `scripts/sprint-board.mjs`
- [ ] `docs/todo/human-board.md` exists
- [ ] `docs/todo/run-journal.md` exists
- [ ] `scripts/test-runner.ts` runs
- [ ] at least one file under `test-flows/`
- [ ] review command is runnable

For public distribution repositories, also verify:

- [ ] `website/` exists and reflects the current protocol
- [ ] `skills/va-auto-pilot/` exists and links are shareable
- [ ] GitHub Pages workflow is present

Once all required items are true, start the loop.
