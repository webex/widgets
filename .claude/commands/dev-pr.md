# Dev PR Command

## Description

Cross-verification + draft PR creation for Development harness ticket.

Combines review gate and PR submission. Main conversation may spawn **cross-verifier** then **git-pr**, or run verification steps directly.

## Arguments

- Required: ticket ID (e.g., `/dev-pr CAI-1234`)

## Prerequisites

- `/dev-verify` passed
- Staged changes in worktree

## Skills Integration

| Skill | When | Purpose |
|-------|------|---------|
| `superpowers:requesting-code-review` | Before PR | Self/cross review |
| `superpowers:verification-before-completion` | Pre-commit | Final check |
| `superpowers:finishing-a-development-branch` | After PR | Branch hygiene |

## Workflow

### Step 1: Cross-Verification

Spawn `.claude/agents/cross-verifier.md` with diff + spec.md.

If `approved: false` → STOP; fix via `/dev-implement`.

### Step 2: Guardrails

Apply [guardrails-pr-tdd.md](../../ai-docs/harness/guardrails-pr-tdd.md) checklist (PR size, TDD-in-diff).

### Step 3: Confirm with User

AskUserQuestion before PR creation (reuse `/submit-pr` pattern).

### Step 4: Create PR

Option A: Spawn `.claude/agents/git-pr.md`

Option B: Run `/submit-pr {TICKET_ID}` workflow in main conversation

### Step 5: Jira

- Label `dev-pr-open`
- Post PR JSON comment

```
mcp__jira__add_labels(issueKey="{TICKET_ID}", labels=["dev-pr-open"])
```

### Step 6: CI Labels

Remind human to add PR labels `validated` and `run_e2e` if applicable.

## Reference

[04-pr-and-review.md](../../ai-docs/templates/development-phase/04-pr-and-review.md)
