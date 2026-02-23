# VA Auto-Pilot

[中文文档](./README.zh.md)

VA Auto-Pilot is an autonomous engineering operating loop.

It is built on one idea: **set a high bar, define constraints, and let frontier models decide the path**.

## Design Philosophy

- Do not handcraft long implementation prompts. Give objectives, constraints, and acceptance.
- Do not manually orchestrate every agent. Let the manager agent orchestrate CLI agents.
- Let the manager agent choose concurrency dynamically for independent tracks.
- Build a closed-loop verification system: build -> review -> acceptance -> commit.
- Use the strongest model available for high-impact decisions.
- Evaluate outputs by standards and outcomes, not by adherence to your step-by-step plan.

## What You Get

- `va-auto-pilot` CLI scaffold for any repository
- machine-readable sprint state (`.va-auto-pilot/sprint-state.json`)
- generated sprint board (`docs/todo/sprint.md`)
- human override board (`docs/todo/human-board.md`)
- append-only run memory (`docs/todo/run-journal.md`)
- protocol documents and start prompt
- acceptance flow runner (`scripts/test-runner.ts`)

## Quick Start

```bash
# local
node ./bin/va-auto-pilot.mjs init .

# npm (after publish)
npx -y va-auto-pilot init .
```

Render board after initialization:

```bash
node scripts/sprint-board.mjs render
```

## Command Patterns (Goal-first Delegation)

```text
$va-auto-pilot

Objective:
Ship onboarding v2 with measurable activation lift.

Constraints:
- Keep architecture boundaries unchanged.
- No security regressions.
- Keep critical path latency under 300ms.

Acceptance:
- typecheck, lint, tests pass
- codex review reports no blocking findings
- acceptance flow MUST 100%, SHOULD >= 80%
```

## Concurrency Model

- Independent workstreams can run in parallel.
- Synchronization happens at mandatory quality gates.
- State promotion is blocked until required gates pass.
- Concurrency decisions are runtime judgments made by the manager agent.

## Distribution

Codex install:

```text
$skill-installer install https://github.com/Vadaski/va-auto-pilot/tree/main/skills/va-auto-pilot
```

Claude Code install:

```bash
mkdir -p .claude/commands
curl -fsSL https://raw.githubusercontent.com/Vadaski/va-auto-pilot/main/skills/va-auto-pilot/claude-command.md -o .claude/commands/va-auto-pilot.md
```

## Documentation

- Protocol: `docs/operations/va-auto-pilot-protocol.md`
- Start prompt: `docs/operations/start-va-auto-pilot-prompt.md`
- Distribution: `docs/operations/distribute-skill.md`
- Vision article: `docs/human-out-of-the-loop.md`
- Ralph comparison: `docs/comparisons/va-auto-pilot-vs-ralph.en.md`

## Website

`website/` is a standalone static site with:

- bilingual switch (EN / 中文)
- interactive state machine
- animated execution demo
- SEO + OG metadata

Local preview:

```bash
cd website
python3 -m http.server 4173
```

## Verification

```bash
npm run check:all
npm run validate:distribution
```

## Credits

- Authors: **Vadaski**, **Codex**
- Acknowledgements: **Claude**, **Vera project**

## License

MIT
