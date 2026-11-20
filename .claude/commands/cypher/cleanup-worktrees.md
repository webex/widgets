---
description: List, inspect, and remove worktrees created by /fix-tickets in /tmp/claude-widgets/
---

# Cleanup Worktrees Command

## Description
List, inspect, and remove worktrees created by `/fix-tickets` in `/tmp/claude-widgets/`.

## Arguments
- None (interactive)

## Workflow

### Step 1: List Worktrees

```bash
# List all claude-widgets worktrees
ls -d /tmp/claude-widgets/*/ 2>/dev/null

# Cross-reference with git worktree list
git worktree list
```

If no worktrees found in `/tmp/claude-widgets/`, inform the user and stop.

### Step 2: Show Status for Each Worktree

For each worktree found, display:

```bash
cd /tmp/claude-widgets/{TICKET_ID}

# Uncommitted changes?
git status --short

# Unpushed commits?
git log --oneline origin/{TICKET_ID}..HEAD 2>/dev/null || echo "(no remote branch)"

# Open PR?
gh pr list --head {TICKET_ID} --repo webex/widgets --json number,title,state 2>/dev/null
```

Present a summary table:

```
## Worktrees in /tmp/claude-widgets/

| Ticket | Uncommitted | Unpushed | PR Status |
|--------|-------------|----------|-----------|
| CAI-1234 | none | none | #456 (open) |
| CAI-5678 | 2 files | 1 commit | none |
| CAI-9012 | none | none | #457 (merged) |
```

### Step 3: User Selects Which to Remove

Use `AskUserQuestion` with `multiSelect: true`:
- Each worktree as an option with its status as description
- If a worktree has uncommitted changes or unpushed commits, add a warning in the description

### Step 4: Remove Selected Worktrees

For each selected worktree:

**If it has uncommitted changes or unpushed commits:**
- Extra confirmation: "Worktree {TICKET_ID} has uncommitted changes. Are you sure you want to remove it? This cannot be undone."

**Remove:**
```bash
git worktree remove --force /tmp/claude-widgets/{TICKET_ID}
git branch -d {TICKET_ID} 2>/dev/null  # delete branch if fully merged
```

If `git branch -d` fails (branch not fully merged), ask the user:
- "Branch {TICKET_ID} is not fully merged. Force delete it?"
  - Yes → `git branch -D {TICKET_ID}`
  - No → keep the branch

Report what was cleaned up.

## Safety Rules

- NEVER remove a worktree without user selection
- NEVER force-remove worktrees with uncommitted changes without extra confirmation
- NEVER force-delete branches without asking
- Always show status before removal so user can make informed decisions
