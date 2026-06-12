# Dev Review Command

## Description

Standalone cross-verification review without PR creation. Use before `/dev-pr` or after implementation changes.

## Arguments

- Required: ticket ID (e.g., `/dev-review CAI-1234`)

## Skills Integration

| Skill | When | Purpose |
|-------|------|---------|
| `superpowers:requesting-code-review` | Review spawn | Structured review |

## Workflow

### Step 1: Gather Diff

```bash
cd /tmp/claude-widgets/{TICKET_ID}
git diff --cached --stat
git diff --cached
```

### Step 2: Spawn Cross-Verifier

Agent: `.claude/agents/cross-verifier.md`

Pass: spec.md, plan.md, diff, scope ai-docs paths.

### Step 3: Report

Display blockers and suggestions to user.

Post review JSON to Jira comment.

### Step 4: Next Step

- If approved → `/dev-pr {TICKET_ID}`
- If blockers → `/dev-implement {TICKET_ID}`

## Reference

[04-pr-and-review.md](../../ai-docs/templates/development-phase/04-pr-and-review.md)
