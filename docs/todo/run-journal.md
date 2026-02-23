# Run Journal

> Append-only memory for each VA Auto-Pilot cycle.
> Keep reusable knowledge in `Codebase Signals`, append cycle notes under `Entries`.

## Codebase Signals
- Add reusable patterns and gotchas here.

## Entries
## 2026-02-23T00:00:00.000Z - AP-001
- Summary: Initialized run journal.
- Files: `docs/todo/run-journal.md`
- Signals:
  - Keep this log append-only; never rewrite old entries.
---

## 2026-02-23T18:16:27.919Z - parallel-runner
- Summary: synchronized 1 parallel track(s) before quality gates.
- Primary Task: AP-001
- Tracks: AP-001:TIMEOUT
- Files:
  - `/Users/vadaski/vadaski/Code/auto-pilot/.va-auto-pilot/parallel-runs/AP-001.log`
- Note: exit-0 moves task to Review; manager agent must still run multi-perspective review and acceptance gates.
---

## 2026-02-23T18:16:35.705Z - parallel-runner
- Summary: synchronized 1 parallel track(s) before quality gates.
- Primary Task: AP-001
- Tracks: AP-001:TIMEOUT
- Files:
  - `/Users/vadaski/vadaski/Code/auto-pilot/.va-auto-pilot/parallel-runs/AP-001.log`
- Note: exit-0 moves task to Review; manager agent must still run multi-perspective review and acceptance gates.
---

## 2026-02-23T18:28:25.081Z - AP-001
- Summary: Upgraded Multi-Perspective Review section in va-auto-pilot-protocol.md. Two independent AI cross-reviews (adversarial adopter, protocol designer) each found 3 CRITICALs — all 6 resolved: anchor identification guard added, confidence replaced with concrete completion condition, 3-cycle iteration cap added, bounded stall procedure, perspective count heuristic, re-review = full set. Template synced. validate-distribution passed.
- Files: `docs/operations/va-auto-pilot-protocol.md`, `templates/docs/operations/va-auto-pilot-protocol.md`, `docs/todo/human-board.md`
- Signals:
  - multi-perspective review must use anchor+constraint grounding before selecting perspectives
  - completion condition must be concrete and checkable not vague confidence
  - all review loops must have bounded iteration caps
---

## 2026-02-23T18:54:44.849Z - AP-002
- Summary: Fixed parseArgv boolean flag regression: bool flag followed by non-flag token now throws instead of silently dropping the value. e.g. --json false now gives a clear error. Mirrored to templates/scripts/lib/sprint-utils.mjs. All gates passed.
- Files: `scripts/lib/sprint-utils.mjs`, `templates/scripts/lib/sprint-utils.mjs`
- Signals:
  - parseArgv boolean flag guard: reject non-flag token after bool flag with explicit error
  - never allow silent value drops in arg parsers
---

## 2026-02-23T18:54:53.575Z - AP-003
- Summary: Added sprint-board.mjs add command: auto-assigns next sequential ID (AP-NNN), requires --title and --priority, supports --source and --depends-on. nextTaskId() escapes regex special chars in projectPrefix to prevent injection. printHelp updated. Both scripts/sprint-board.mjs and templates/scripts/sprint-board.mjs updated identically. All gates passed.
- Files: `scripts/sprint-board.mjs`, `templates/scripts/sprint-board.mjs`
- Signals:
  - sprint-board add command: use normalizeTask for all new tasks to ensure schema consistency
  - escape regex metacharacters when building dynamic RegExp from user-supplied strings
  - always mirror scripts/ changes to templates/ counterpart
---

## 2026-02-23T19:06:31.523Z - AP-004
- Summary: cli-flow test entry
---

## 2026-02-23T19:06:45.207Z - AP-004
- Summary: cli-flow test entry
---

## 2026-02-23T19:10:47.479Z - AP-004
- Summary: Added 41-test unit suite (node:test) covering all pure functions in sprint-utils.mjs and sprint-board.mjs CLI surface. Added check:units to package.json and check:all pipeline. Tests use isolated tmp dirs; no real state files touched.
- Files: `scripts/test-units.mjs`, `package.json`
- Signals:
  - node:test is available in Node>=20 with no extra deps; use spawnSync for CLI-level tests; always use writeTmpState() for isolated state in unit tests
---

## 2026-02-23T19:10:53.790Z - AP-005
- Summary: Replaced hand-rolled YAML line parser in readSprintPathsFromConfig with yaml.parse(). Moved yaml from devDependencies to dependencies (it is a runtime import). stripYamlValue kept as exported compat utility. Templates mirrored. All 41 unit tests still pass.
- Files: `scripts/lib/sprint-utils.mjs`, `templates/scripts/lib/sprint-utils.mjs`, `package.json`
- Signals:
  - yaml package must be in dependencies not devDependencies when used in runtime scripts; keep stripYamlValue as compat export when removing internal use
---

## 2026-02-23T19:11:01.495Z - AP-006
- Summary: Added test-flows/sprint-board-cli.yaml (9 CLI flows covering add, update, journal, next, summary, --help, error cases) and scripts/test-cli-flows.mjs runner. Flows with isolated_state/isolated_journal get tmp copies of real files to prevent state pollution. check:cli-flows added to check:all.
- Files: `test-flows/sprint-board-cli.yaml`, `scripts/test-cli-flows.mjs`, `package.json`
- Signals:
  - CLI flow tests must use isolated_state to avoid polluting real sprint state; test-cli-flows.mjs skips chat-based flows (session:/turns:) transparently; cwd must be repo root
---

## 2026-02-23T19:11:07.411Z - AP-007
- Summary: Renamed docs/human-out-of-the-loop.md to docs/human-on-the-loop.md. Updated title and all occurrences of backtick-quoted term inside doc. Updated README.md and README.zh.md references. Old file deleted.
- Files: `docs/human-on-the-loop.md`, `README.md`, `README.zh.md`
- Signals:
  - human-on-the-loop is the correct framing: human supervises the loop but does not step into it; the old term implied human removal which is wrong
---

## 2026-02-23T19:23:55.804Z - AP-008
- Summary: Eliminated templates/scripts/ dual-copy. bin/va-auto-pilot.mjs init now copies scripts verbatim from the package's own scripts/ directory (single source of truth). validate-distribution.mjs mirror equality section removed; requiredFiles list pruned to remove templates/scripts/* entries. 41/41 unit tests, 18/18 CLI flow MUSTs, validate:distribution all pass. Init smoke test confirmed correct script output. Dry-run path verified. Multi-perspective review (Correctness Auditor + CLI Consumer): no critical findings.
- Files: `bin/va-auto-pilot.mjs`, `scripts/validate-distribution.mjs`, `templates/scripts/ (deleted)`
---
