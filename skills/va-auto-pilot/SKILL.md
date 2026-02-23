---
name: va-auto-pilot
description: Bootstrap and operate the VA Auto-Pilot engineering loop in any repository. Use when users ask for autonomous delivery flow, sprint/human boards, quality gates, or /va-auto-pilot mode.
metadata:
  version: 2.0.0
---

# VA Auto-Pilot Skill

## Trigger

Use this skill when the user asks to:

- initialize an autonomous engineering workflow
- adopt sprint state machine + human override board
- enforce build/review/acceptance gates
- run a manager-style multi-agent loop
- enable `/va-auto-pilot` operating mode

## Workflow

1. Confirm target repository root (default: current directory).
2. Install scaffold:

```bash
npx -y va-auto-pilot init <target-dir>
```

3. If npm package is unavailable, run fallback bootstrap:

```bash
tmp="$(mktemp -d)"
git clone --depth 1 https://github.com/Vadaski/va-auto-pilot "$tmp/va-auto-pilot"
node "$tmp/va-auto-pilot/bin/va-auto-pilot.mjs" init <target-dir>
```

4. Read and align these files to the target project:

- `.va-auto-pilot/config.yaml`
- `.va-auto-pilot/sprint-state.json`
- `docs/todo/sprint.md`
- `docs/todo/human-board.md`
- `docs/todo/run-journal.md`
- `docs/operations/va-auto-pilot-protocol.md`

5. Ensure quality gates are runnable:

- `qualityGate.buildCommand`
- `qualityGate.reviewCommand`
- `qualityGate.acceptanceTestCommand`

6. Start the loop (single task per cycle):

- read `human-board.md`
- read `run-journal.md` (`Codebase Signals` first)
- resolve next action with `node scripts/sprint-board.mjs next`
- execute current task by objective + constraints (no step-by-step instructions)
- run build/review/acceptance gates
- update state with `node scripts/sprint-board.mjs update ...`
- append memory with `node scripts/sprint-board.mjs journal ...`

## Output Contract

When completing a run, always report:

1. what was scaffolded or changed
2. active gate commands
3. next immediate task from sprint state
4. any stop condition requiring human decision
