# Dev Start Command

## Description

Start Development phase for a Jira ticket: intake gate, worktree setup, spec.md generation, and planning.

**Runs in main conversation** for Jira MCP and worktree setup. Spawns **planner** subagent after intake passes.

## Arguments

- Required: ticket ID (e.g., `/dev-start CAI-1234`)

## Skills Integration

| Skill | When | Purpose |
|-------|------|---------|
| `superpowers:using-git-worktrees` | Worktree creation | Isolated implementation |
| `superpowers:writing-plans` | Before planner spawn | Plan quality gate |

## Workflow

### Step 1: Fetch Jira Ticket

```
mcp__jira__call_jira_rest_api(endpoint="/issue/{TICKET_ID}", method="GET")
```

Fetch linked epic, DoR links, and Discovery comments.

### Step 2: Intake Gate

Follow [ai-docs/templates/development-phase/01-intake.md](../../ai-docs/templates/development-phase/01-intake.md).

If blockers → post Jira comment; STOP.

### Step 3: Worktree

```bash
git worktree add /tmp/claude-widgets/{TICKET_ID} -b {TICKET_ID}
cd /tmp/claude-widgets/{TICKET_ID}
yarn install && yarn build:dev
```

### Step 4: Generate spec.md

Copy [spec.md.template](../../ai-docs/templates/development-phase/spec.md.template) → `spec.md`; fill from DoR + ticket.

### Step 5: Jira Update

- Add label `dev-ready` then `dev-in-progress`
- Post intake JSON comment (see [development-phase-plan.md](../../ai-docs/harness/development-phase-plan.md) §8.2)

```
mcp__jira__add_labels(issueKey="{TICKET_ID}", labels=["dev-ready", "dev-in-progress"])
```

### Step 6: Spawn Planner Agent

Pass: TICKET_ID, WORKTREE_PATH, REPO_ROOT, spec.md content, scope ai-docs paths.

Agent: `.claude/agents/planner.md`

### Step 7: Post Plan to Jira

On planner success → post plan JSON comment with planSummary and filesToTouch.

If `humanApprovalRequired: true` → AskUserQuestion before `/dev-implement`.

## Reference

[development-phase-plan.md](../../ai-docs/harness/development-phase-plan.md)
