# Pre-SDLC-Migration Archive

Snapshot of the repository's AI documentation as it existed **before** migration to the
SDLC-Templates `component-repo` standard (`0.1.0-draft`).

These files are kept for provenance and content recovery only. They are **not** maintained and
**not** part of the live doc set. Do not route agents here.

## What was here

| Original file | Superseded by |
|---|---|
| `root/AGENTS.md` (task-router orchestrator) | root `AGENTS.md` (agent-entry contract) + `ai-docs/SPEC_INDEX.md` (router) |
| `packages/**/ai-docs/AGENTS.md` + `ARCHITECTURE.md` (per-package pairs) | `<module-path>/ai-docs/<module-name>-spec.md` (canonical module spec) |

The task-router workflow content (task types A–F, SDK consultation, pre-step gates) was folded into
the new root `AGENTS.md`, `ai-docs/SPEC_INDEX.md` (Task Routing / Intake Routing), and
`ai-docs/RULES.md`.

Migration date: 2026-06-29.
