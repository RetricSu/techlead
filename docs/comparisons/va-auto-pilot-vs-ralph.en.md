# VA Auto-Pilot vs Ralph

This document explains why VA Auto-Pilot exists, where each approach fits, and why goal-first delegation is often superior to manually authored implementation prompts.

## Short Position

- Choose **VA Auto-Pilot** when you care about governance, reproducibility, and quality closure.
- Choose **Ralph-style loops** when you want the fastest low-ceremony iteration on small, well-scoped tasks.

Both are valuable. They optimize for different constraints.

## Core Difference in Design

### Ralph-style loop

- iteration loop driven by a concise task list
- fresh context per cycle
- lightweight memory via log files and git history
- very low setup overhead

### VA Auto-Pilot

- protocol-driven manager loop
- machine-readable sprint state + generated board projection
- explicit human override plane
- mandatory quality gates and stop conditions
- append-only operational memory with reusable signals

## Where VA Auto-Pilot Is Better

- multi-contributor projects where governance matters
- projects with non-trivial risk (security, compliance, architectural drift)
- long-running initiatives where recoverability matters
- teams that need auditable decision traces

## Where Ralph-style Is Better

- solo experiments and short feature spikes
- low-risk repos where speed dominates
- rapid prototyping with minimal ceremony

## Why Goal-First Delegation Beats Manual Step Prompts

Manual step prompts lock you into your own local plan. That plan is usually weaker than the search capability of frontier models.

Goal-first delegation works better when you provide:

- hard constraints
- acceptance criteria
- quality gates

Then let the model optimize the path.

Benefits:

- higher adaptability when the codebase reality differs from assumptions
- less prompt maintenance overhead
- fewer human-induced path constraints
- better exploitation of model planning and tool-use capabilities

## Parallelization Advantage with CLI Agents

When the manager agent can orchestrate CLI agents, concurrency becomes a runtime optimization problem.

- independent tracks can run in parallel
- quality gates act as synchronization barriers
- the system can progress many tracks without losing control

This is especially powerful in large repositories where API, UI, tests, and docs can advance simultaneously before final gate convergence.

## Practical Rule

Do not ask the agent to copy your implementation steps.

Ask it to satisfy your quality bar under constraints, then verify outcomes with deterministic gates.

That is the operational center of VA Auto-Pilot.
