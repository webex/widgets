---
description: Commit, push, and create a draft PR for a ticket fixed in a worktree (no subagents)
argument-hint: "<TICKET-ID>"
---

# Submit PR Command

## Description
Create a commit, push, and open a pull request for a ticket that was fixed in a worktree. This is the second step after `/fix-tickets`.

**Key principle:** This command does ALL work directly in the main conversation. It does NOT spawn subagents (they lack MCP/tool access needed for gh CLI and Jira).

## Arguments
- Required: ticket ID (e.g., `/submit-pr CAI-1234`)

## Skills Integration

| Skill | When to Invoke | Purpose |
|-------|---------------|---------|
| `superpowers:verification-before-completion` | Step 2 (showing changes) | Verify staged changes are correct before committing |
| `superpowers:requesting-code-review` | Step 8 (after PR creation) | Self-review changes before requesting human review |

## Workflow

### Step 1: Validate Worktree

Check that the worktree exists and has staged changes:

```bash
# Verify worktree exists
test -d /tmp/claude-widgets/{TICKET_ID} || echo "NOT_FOUND"

# Check for staged changes
cd /tmp/claude-widgets/{TICKET_ID}
git diff --cached --stat
```

- If worktree doesn't exist: inform user and suggest `/fix-tickets {TICKET_ID}` first
- If no staged changes: inform user that there's nothing to submit

### Step 2: Show Changes for Review

**Invoke `superpowers:verification-before-completion` skill** to verify the staged changes are correct and tests pass before proceeding.

Display the diff summary and any unstaged changes:

```bash
cd /tmp/claude-widgets/{TICKET_ID}

# Show staged changes
git diff --cached --stat

# Show detailed diff (abbreviated if very large)
git diff --cached

# Check for unstaged changes that might be missed
git status
```

If there are unstaged changes, ask the user if they want to stage those too before proceeding.

### Step 3: Confirm with User

Use `AskUserQuestion`:
- "Ready to commit, push, and create a PR for {TICKET_ID}. The changes above will be submitted to `origin/{TICKET_ID}` with base branch `next`. Proceed?"
  - **Yes, create PR** — continue
  - **Create as draft PR** — create a draft PR
  - **Let me review first** — stop and let user inspect manually
  - **Stage more changes first** — let user specify additional files

### Step 4: Gather Context

**Read the JIRA ticket** (for PR body context):
```
mcp__jira__call_jira_rest_api(endpoint="/issue/{TICKET_ID}", method="GET")
```

**Inspect the staged diff** to understand what changed:
```bash
cd /tmp/claude-widgets/{TICKET_ID}
git diff --cached --stat
git diff --cached
git log --oneline -5  # check commit style
```

### Step 5: Determine Commit Metadata

From the ticket and diff, derive:
- **type**: `fix` for Bug, `feat` for Story/Feature, `chore` for Task
- **scope**: the package name affected (e.g., `task`, `store`, `cc-components`)
- **description**: concise summary from the ticket title

### Step 6: Create Commit

```bash
cd /tmp/claude-widgets/{TICKET_ID}
git commit -m "$(cat <<'EOF'
{type}({scope}): {description}

{Detailed description of what changed and why}

{TICKET_ID}
EOF
)"
```

**Important:** Do NOT include `Co-Authored-By` lines referencing Claude/AI unless the user explicitly requests it.

### Step 7: Push Branch

```bash
cd /tmp/claude-widgets/{TICKET_ID}
git push -u origin {TICKET_ID}
```

If the push fails (e.g., branch already exists on remote with different history):
- Report the error clearly
- Do NOT force push — ask the user how to proceed

### Step 8: Create Pull Request

Read the PR template first:
```bash
cat /tmp/claude-widgets/{TICKET_ID}/.github/PULL_REQUEST_TEMPLATE.md
```

Then create the PR using `gh pr create`. The PR body MUST follow the repo's template exactly (`.github/PULL_REQUEST_TEMPLATE.md`), including all these sections:

```bash
cd /tmp/claude-widgets/{TICKET_ID}
gh pr create \
  --repo webex/widgets \
  --base next \
  {--draft if user requested draft} \
  --title "{type}({scope}): {description}" \
  --body "$(cat <<'PREOF'
# COMPLETES
https://jira-eng-sjc12.cisco.com/jira/browse/{TICKET_ID}

## This pull request addresses

{Context from JIRA ticket description — what the issue was}

## by making the following changes

{Summary of changes derived from git diff analysis}

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

### Step 9: Self-Review

**Invoke `superpowers:requesting-code-review` skill** to self-review the PR changes before requesting human review.

### Step 10: Report Result

On success:
```
PR created successfully!
- PR: {prUrl}
- Branch: {TICKET_ID} → next
- Commit: {commitHash}

To clean up the worktree later: /cleanup-worktrees
```

On failure:
```
PR creation failed: {error}
The worktree is preserved at /tmp/claude-widgets/{TICKET_ID}
You can inspect and retry manually.
```

## Safety Rules

- NEVER proceed without showing the diff and getting user confirmation
- NEVER force push
- NEVER target any base branch other than `next` unless user specifies
- NEVER auto-merge the PR
- NEVER delete the worktree after PR creation (use `/cleanup-worktrees` for that)
- NEVER include Co-Authored-By AI references unless the user explicitly requests it
- NEVER spawn subagents — do all work directly in the main conversation
