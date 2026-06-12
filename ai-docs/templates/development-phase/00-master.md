# Development Phase Harness — Master Orchestrator

## Purpose

Route a Jira dev ticket from Discovery handoff through merge and post-merge artifacts. Tool-agnostic workflow; see [development-phase-plan.md](../../harness/development-phase-plan.md) for architecture.

---

## When to Use

- Jira ticket labeled `discovery-complete` or assigned to Development epic
- DoR artifacts available from Discovery phase
- Workstream: WS-2, WS-3, WS-6, WS-9

---

## Prerequisites

Complete [01-intake.md](./01-intake.md) before any code changes.

---

## Workflow Overview

| Phase | Module | Output |
|-------|--------|--------|
| 0 Intake | [01-intake.md](./01-intake.md) | `spec.md`, label `dev-ready` |
| 1 Plan | Planner agent + Jira comment | `plan.md`, label `dev-in-progress` |
| 2 Implement | [02-implementation.md](./02-implementation.md) | Staged code + UTs |
| 3 Verify | [03-verification.md](./03-verification.md) | E2E green (or waived) |
| 4 PR & Review | [04-pr-and-review.md](./04-pr-and-review.md) | Draft PR, human review |
| 5 Post-merge | [05-post-merge.md](./05-post-merge.md) | Downstream artifacts |

---

## Orchestrator Steps (Parent Agent)

### Step 1: Fetch Context

```
Jira: ticket + epic + linked DoR/Feature SPEC
Confluence: optional design links
```

### Step 2: Intake Gate

Run [01-intake.md](./01-intake.md). Stop if blockers.

### Step 3: Worktree

```bash
git worktree add /tmp/claude-widgets/{TICKET_ID} -b {TICKET_ID}
cd /tmp/claude-widgets/{TICKET_ID}
yarn install && yarn build:dev
```

Invoke `superpowers:using-git-worktrees`.

### Step 4: Generate spec.md

Copy [spec.md.template](./spec.md.template) → `spec.md`; fill from DoR + ticket.

### Step 5: Plan → Implement → Verify → PR

Spawn subagents in order. Pass structured JSON only (no raw MCP dumps).

| Step | Agent | Command (Claude Code) |
|------|-------|----------------------|
| Plan | planner | `/dev-start {TICKET_ID}` |
| Implement | dev-implementer | `/dev-implement {TICKET_ID}` |
| Verify | parent + E2E agent | `/dev-verify {TICKET_ID}` |
| Review | cross-verifier | `/dev-review {TICKET_ID}` |
| PR | git-pr | `/dev-pr {TICKET_ID}` |

### Step 6: Human Merge

Wait for human approval. On merge → `/dev-post-merge {TICKET_ID}`.

---

## Task Type Routing (Widgets Repo)

Map `taskType` in intake JSON to AGENTS.md templates:

| taskType | Template |
|----------|----------|
| A | [new-widget/00-master.md](../new-widget/00-master.md) |
| B | [bug-fix.md](../existing-widget/bug-fix.md) |
| C | [feature-enhancement.md](../existing-widget/feature-enhancement.md) |
| F | [playwright/00-master.md](../playwright/00-master.md) |

Load scope `ai-docs/AGENTS.md` per [AGENTS.md](../../../AGENTS.md) package table.

---

## Exit Conditions

| Outcome | Jira label |
|---------|------------|
| Blocked at intake | `discovery-complete` (comment blockers) |
| PR open | `dev-pr-open` |
| Merged | `dev-merged` |
| Artifacts posted | `sec-input-ready` on Security epic |

---

## Related

- [development-phase-plan.md](../../harness/development-phase-plan.md)
- [guardrails-pr-tdd.md](../../harness/guardrails-pr-tdd.md)
