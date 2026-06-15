# Dev Implement Command

## Description

TDD implementation phase for a Development harness ticket. Spawns **dev-implementer** subagent.

## Arguments

- Required: ticket ID (e.g., `/dev-implement CAI-1234`)

## Prerequisites

- `/dev-start` completed (worktree, spec.md, plan.md exist)
- Label `dev-in-progress`

## Skills Integration

| Skill | When | Purpose |
|-------|------|---------|
| `superpowers:test-driven-development` | Before spawn | Failing test first |
| `superpowers:systematic-debugging` | Bug taskType B | Root cause before fix |

## Workflow

### Step 1: Validate Worktree

```bash
test -d /tmp/claude-widgets/{TICKET_ID} || echo "NOT_FOUND"
test -f /tmp/claude-widgets/{TICKET_ID}/spec.md
test -f /tmp/claude-widgets/{TICKET_ID}/plan.md
```

### Step 2: Prefetch Context

Read spec.md, plan.md, latest Jira intake/plan comments.

Determine `taskType` and `scopePackages` from intake JSON.

### Step 3: Spawn Dev Implementer

Agent: `.claude/agents/dev-implementer.md`

Pass all context as structured text (no raw Jira MCP in subagent).

### Step 4: Verify Tests (Parent)

```bash
cd /tmp/claude-widgets/{TICKET_ID}
yarn workspace @webex/{SCOPE} test:unit
```

### Step 5: Stage Fallback

If subagent could not stage:

```bash
cd /tmp/claude-widgets/{TICKET_ID}
git add -A
```

### Step 6: Jira Comment

Post implementation JSON from subagent result.

On failure → do not proceed to `/dev-verify`.

## Reference

[02-implementation.md](../../ai-docs/templates/development-phase/02-implementation.md)
