# Fix Tickets Command

## Description
Fetch JIRA tickets, create isolated worktrees in `/tmp/claude-widgets/`, and implement fixes. Replaces the monolithic `/bug-fix` command.

**Key principle:** This command implements and stages changes only. It NEVER commits, pushes, or creates PRs. Use `/submit-pr` for that.

## Arguments
- Optional: ticket IDs (e.g., `/fix-tickets CAI-1234 CAI-5678`)
- If no tickets specified, fetches "In Progress" tickets from JIRA

## Workflow

### Step 1: Resolve Tickets

**If ticket IDs provided as arguments:**
- Fetch each ticket using `mcp__jira__call_jira_rest_api`:
  - endpoint: `/issue/{ticketId}`, method: `GET`
- Validate each ticket exists and is accessible
- Skip to Step 3

**If no ticket IDs provided:**
- Query JIRA for in-progress tickets:
  ```
  mcp__jira__call_jira_rest_api(
    endpoint="/search",
    method="GET",
    params={
      "jql": "project = CAI AND status = \"In Progress\" AND assignee = currentUser() ORDER BY priority DESC, created DESC",
      "fields": "summary,issuetype,priority,labels,status"
    }
  )
  ```
- If no tickets found, inform the user and stop
- If only 1 ticket found, confirm with the user and proceed
- If 2+ tickets found, present selection UI (Step 2)

### Step 2: User Selects Tickets (only if fetched from JIRA)

Use `AskUserQuestion` with `multiSelect: true`:
- Each option: `{ticketId} ({type}): {summary}` as label, priority/labels as description
- Let user pick which tickets to fix

### Step 3: Create Worktrees

For each selected ticket:

```bash
# Ensure upstream/next is up to date
git fetch upstream next

# Create worktree in /tmp
git worktree add /tmp/claude-widgets/{TICKET_ID} -b {TICKET_ID} upstream/next
```

**If worktree already exists at that path:**
- Use `AskUserQuestion` to ask: "Worktree for {TICKET_ID} already exists. Reuse existing worktree, or recreate it?"
  - **Reuse**: skip creation, use existing worktree as-is
  - **Recreate**: `git worktree remove /tmp/claude-widgets/{TICKET_ID} && git branch -D {TICKET_ID}` then create fresh

**If branch already exists but no worktree:**
- Delete the branch first: `git branch -D {TICKET_ID}` then create worktree

### Step 4: Install Dependencies and Build

**CRITICAL: Worktrees have no node_modules. You MUST install and build before tests can run.**

```bash
cd /tmp/claude-widgets/{TICKET_ID}
corepack enable        # ensure yarn is available
yarn install           # install all workspace deps
yarn build:dev         # build all packages (needed for tsc + cross-package imports)
```

This step can take 1-2 minutes. It must complete before any test commands will work.

### Step 5: Fetch JIRA Ticket Details (for subagents)

**CRITICAL: Subagents do NOT have access to MCP tools (Jira, etc.). You MUST fetch all ticket details in the main conversation and pass them to the subagent.**

For each ticket, fetch the full details:
```
mcp__jira__call_jira_rest_api(endpoint="/issue/{TICKET_ID}", method="GET")
```

Extract and format: summary, description, type, acceptance criteria, reproduction steps, labels, priority.

### Step 6: Spawn Parallel ticket-worker Agents

Launch ALL workers in a **single message** with multiple `Task()` calls for true parallel execution.

**Important:** Pass the full JIRA ticket details in the prompt — the subagent cannot access Jira.

```
Task({
  subagent_type: "ticket-worker",
  description: "Fix ticket {TICKET_ID}",
  prompt: `You are a ticket-worker agent. Follow the instructions in .claude/agents/ticket-worker.md.

TICKET_ID: {TICKET_ID}
WORKTREE_PATH: /tmp/claude-widgets/{TICKET_ID}
REPO_ROOT: {absolute path to main repo}

## JIRA Ticket Details (pre-fetched — do NOT attempt to call Jira APIs)

Summary: {ticket summary}
Type: {Bug/Story/Task}
Description: {full ticket description}
Labels: {labels}
Priority: {priority}

Dependencies are already installed and packages are already built in the worktree.

Read .claude/agents/ticket-worker.md for your full workflow. Implement the fix, run tests, stage changes (NO commit), and return result JSON.`,
  run_in_background: true
})
```

**Fallback:** If the subagent fails due to permission issues, do the implementation work directly in the main conversation following the ticket-worker.md workflow manually.

### Step 7: Collect Results

Wait for all background agents to complete. Parse the JSON result from each worker.

### Step 8: Present Summary

Display a table:

```
## Fix Session Results

| Ticket | Status | Type | Scope | Files Changed | Tests |
|--------|--------|------|-------|---------------|-------|
| CAI-1234 | success | fix | task | 3 | 5 added, all passing |
| CAI-5678 | failed | feat | store | - | error: ... |

### Next Steps
- Review changes: `cd /tmp/claude-widgets/CAI-1234 && git diff --cached`
- Submit PR: `/submit-pr CAI-1234`
- Clean up: `/cleanup-worktrees`
```

## Safety Rules

- NEVER commit changes — workers only stage (`git add`)
- NEVER push to any remote
- NEVER merge branches
- NEVER delete worktrees without user confirmation
- NEVER proceed without user selection when multiple tickets are available
- Always use `/tmp/claude-widgets/` as the worktree base directory
