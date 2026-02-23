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
