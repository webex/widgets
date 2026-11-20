---
description: Full lifecycle - fetch JIRA tickets, create worktrees, implement fixes, create PRs, poll review
argument-hint: "[TICKET-ID...]"
---

# Fix Tickets Command

## Description
Fetch JIRA tickets, create isolated worktrees in `/tmp/claude-widgets/`, and implement fixes. Replaces the monolithic `/bug-fix` command.

**Key principle:** This command orchestrates the full lifecycle — from ticket selection through implementation, PR creation, and review polling. It leverages superpowers skills for structured workflows.

## Arguments
- Optional: ticket IDs (e.g., `/fix-tickets CAI-1234 CAI-5678`)
- If no tickets specified, fetches "In Progress" tickets from JIRA

## Skills Integration

Before starting, invoke these skills at the appropriate workflow steps:

| Skill | When to Invoke | Purpose |
|-------|---------------|---------|
| `superpowers:using-git-worktrees` | Step 3 (worktree creation) | Safe worktree setup with smart directory selection |
| `superpowers:dispatching-parallel-agents` | Step 6 (spawning workers) | Parallel agent orchestration pattern |
| `superpowers:test-driven-development` | Passed to subagents via prompt | TDD methodology for implementation |
| `superpowers:systematic-debugging` | Passed to subagents via prompt | Root cause analysis before fixing |
| `superpowers:verification-before-completion` | Step 7 (collecting results) | Verify fixes before claiming success |
| `commit-commands:commit-push-pr` | Step 8 (PR creation) | Commit, push, and open PR |
| `code-review:code-review` | Step 9 (review polling) | Review PR quality before submission |
| `loop` | Step 9 (review polling) | Recurring review status checks |
| `superpowers:finishing-a-development-branch` | Step 10 (completion) | Guide merge/cleanup decisions |

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

**Invoke `superpowers:using-git-worktrees` skill** before creating worktrees. Follow the skill's safety verification and smart directory selection patterns.

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

Also fetch Triager's analysis if available (look for "Triager Analysis" in comments).

### Step 6: Spawn Parallel ticket-worker Agents

**Invoke `superpowers:dispatching-parallel-agents` skill** before spawning agents. Follow the skill's pattern for parallel task orchestration.

Launch ALL workers in a **single message** with multiple `Task()` calls for true parallel execution.

**Important:** Pass the full JIRA ticket details AND methodology instructions in the prompt — the subagent cannot access Jira or invoke skills.

```
Task({
  subagent_type: "ticket-worker",
  description: "Fix ticket {TICKET_ID}",
  prompt: `You are a ticket-worker agent. Follow the instructions in .claude/agents/cypher/ticket-worker.md.

TICKET_ID: {TICKET_ID}
WORKTREE_PATH: /tmp/claude-widgets/{TICKET_ID}
REPO_ROOT: {absolute path to main repo}

## JIRA Ticket Details (pre-fetched — do NOT attempt to call Jira APIs)

Summary: {ticket summary}
Type: {Bug/Story/Task}
Description: {full ticket description}
Labels: {labels}
Priority: {priority}

## Triager's Fix Suggestion (if available)

{Triager's analysis comment content, or "No triager analysis available — use systematic debugging to identify root cause."}

Dependencies are already installed and packages are already built in the worktree.

Read .claude/agents/cypher/ticket-worker.md for your full workflow. Use systematic debugging to understand the root cause, apply TDD (write failing test first, then implement fix), verify all tests pass, stage changes (NO commit), and return result JSON.`,
  run_in_background: true
})
```

**Fallback:** If the subagent fails due to permission issues, do the implementation work directly in the main conversation following the ticket-worker.md workflow manually.

### Step 7: Collect and Verify Results

**Invoke `superpowers:verification-before-completion` skill** before accepting results as successful.

Wait for all background agents to complete. For each worker result:

1. Parse the JSON result
2. **Verify the fix actually works** — don't trust agent claims blindly:
   ```bash
   cd /tmp/claude-widgets/{TICKET_ID}
   git diff --cached --stat          # confirm files are staged
   yarn workspace @webex/{pkg} test:unit  # re-run tests to confirm they pass
   ```
3. If verification fails, either retry the fix manually or mark as failed

### Step 8: Create PRs for Successful Fixes

**Invoke `commit-commands:commit-push-pr` skill** for each successful fix. Follow the skill's workflow for commit message formatting and PR creation.

For each verified fix, do this directly in the main conversation (NOT in a subagent):

**Read the PR template:**
```bash
cat /tmp/claude-widgets/{TICKET_ID}/.github/PULL_REQUEST_TEMPLATE.md
```

**Commit:**
```bash
cd /tmp/claude-widgets/{TICKET_ID}
git commit -m "$(cat <<'EOF'
{changeType}({scope}): {summary}

{Detailed description from ticket/Triager's analysis}

{TICKET_ID}
EOF
)"
```

**Push:**
```bash
cd /tmp/claude-widgets/{TICKET_ID}
git push -u origin {TICKET_ID}
```

If push fails (branch exists with different history), ask user before force-pushing.

**Invoke `code-review:code-review` skill** to self-review the changes before creating the PR. Address any critical issues found.

**Create draft PR:**
```bash
cd /tmp/claude-widgets/{TICKET_ID}
gh pr create \
  --repo webex/widgets \
  --base next \
  --draft \
  --title "{changeType}({scope}): {summary}" \
  --body "$(cat <<'PREOF'
# COMPLETES
https://jira-eng-sjc12.cisco.com/jira/browse/{TICKET_ID}

## This pull request addresses

{Context from JIRA ticket description}

## by making the following changes

{Summary from worker agent result + Triager analysis}

### Change Type

- [{x if fix}] Bug fix (non-breaking change which fixes an issue)
- [{x if feat}] New feature (non-breaking change which adds functionality)
- [ ] Breaking change (fix or feature that would cause existing functionality to change)
- [ ] Documentation update
- [ ] Tooling change
- [ ] Internal code refactor

## The following scenarios were tested

- [ ] The testing is done with the amplify link
- [x] Unit tests added/updated and passing

## The GAI Coding Policy And Copyright Annotation Best Practices ##

- [ ] GAI was not used (or, no additional notation is required)
- [ ] Code was generated entirely by GAI
- [x] GAI was used to create a draft that was subsequently customized or modified
- [ ] Coder created a draft manually that was non-substantively modified by GAI (e.g., refactoring was performed by GAI on manually written code)
- [x] Tool used for AI assistance (GitHub Copilot / Other - specify)
  - [ ] Github Copilot
  - [x] Other - Claude Code
- [x] This PR is related to
  - [{x if feat}] Feature
  - [{x if fix}] Defect fix
  - [ ] Tech Debt
  - [ ] Automation

### Checklist before merging

- [x] I have not skipped any automated checks
- [x] All existing and new tests passed
- [ ] I have updated the testing document
- [ ] I have tested the functionality with amplify link

---

Make sure to have followed the [contributing guidelines](https://github.com/webex/webex-js-sdk/blob/master/CONTRIBUTING.md#submitting-a-pull-request) before submitting.
PREOF
)"
```

**Post PR link on Jira:**
```
mcp__jira__call_jira_rest_api(
  endpoint="/issue/{TICKET_ID}/comment",
  method="POST",
  data={"body": "PR: {prUrl}"}
)
```

**Add label:**
```
mcp__jira__add_labels(issue_key="{TICKET_ID}", labels=["fixing"])
```

### Step 9: Review Polling (optional)

If the user wants to monitor PR reviews, **invoke the `loop` skill** to set up recurring review checks.

Example: `/loop 5m` to check review status every 5 minutes.

For manual review polling (or when loop triggers):

```bash
gh pr view {PR_NUMBER} --repo webex/widgets --json reviews,reviewRequests,state
```

**If changes requested:**
1. Read review comments:
   ```bash
   gh api repos/webex/widgets/pulls/{PR_NUMBER}/reviews
   gh api repos/webex/widgets/pulls/{PR_NUMBER}/comments
   ```
2. Address each review comment (edit code in worktree, run tests)
3. **Invoke `superpowers:verification-before-completion`** before pushing review fixes
4. Commit and push:
   ```bash
   cd /tmp/claude-widgets/{TICKET_ID}
   git add {changed files}
   git commit -m "{changeType}({scope}): address review feedback

   {TICKET_ID}"
   git push
   ```
5. Report what was addressed

**If approved:**
1. Confirm with user before merging
2. If confirmed: `gh pr merge {PR_NUMBER} --repo webex/widgets --squash`
3. Add Jira label: `mcp__jira__add_labels(issue_key="{TICKET_ID}", labels=["fixed"])`
4. Offer worktree cleanup

**If no reviews yet:**
- Report: "PR #{PR_NUMBER} is waiting for reviews."
- Suggest: "Use `/loop 5m /fix-tickets {TICKET_ID}` to auto-poll for reviews."

### Step 10: Present Summary

**Invoke `superpowers:finishing-a-development-branch` skill** to guide the user on next steps for each completed ticket.

Display a table:

```
## Fix Session Results

| Ticket | Status | Type | Scope | Files Changed | Tests | PR |
|--------|--------|------|-------|---------------|-------|----|
| CAI-1234 | success | fix | task | 3 | 5 added, all passing | #640 (draft) |
| CAI-5678 | failed | feat | store | - | error: ... | - |

### Next Steps
- Review changes: `cd /tmp/claude-widgets/CAI-1234 && git diff`
- Check review status: `/fix-tickets CAI-1234` (enters review polling)
- Auto-poll reviews: `/loop 5m /fix-tickets CAI-1234`
- Review PR quality: `/review-pr 640`
- Clean up: `/cleanup-worktrees`
```

## Safety Rules

- NEVER force push without explicit user confirmation
- NEVER merge without approval AND user confirmation
- NEVER auto-approve PRs
- NEVER delete worktrees without user confirmation
- NEVER proceed without user selection when multiple tickets are available
- NEVER target any base branch other than `next` unless user specifies
- NEVER include Co-Authored-By AI references unless user explicitly requests it
- Always use `/tmp/claude-widgets/` as the worktree base directory
- Always create PRs as drafts unless user specifies otherwise
- Always verify fixes (run tests) before claiming success
