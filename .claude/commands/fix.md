# Fix Command

## Description
Implement bug fixes, create PRs, and handle review feedback. The final stage of the pipeline.

**Pipeline stage 3 of 3:** Scrub → Triage → Fix

## Arguments
- Optional: ticket IDs (e.g., `/fix CAI-1234 CAI-5678`)
- If no tickets specified, fetches bugs labeled `triaged` from JIRA

## Workflow

### Step 1: Resolve Tickets

**If ticket IDs provided as arguments:**
- Fetch each ticket using `mcp__jira__call_jira_rest_api`:
  - endpoint: `/issue/{ticketId}`, method: `GET`
- Validate each ticket exists

**If no ticket IDs provided:**
- Query JIRA for triaged bugs:
  ```
  mcp__jira__call_jira_rest_api(
    endpoint="/search",
    method="GET",
    params={
      "jql": "project = CAI AND issuetype = Bug AND labels = triaged AND labels != fixing AND labels != fixed ORDER BY priority DESC, created DESC",
      "fields": "summary,issuetype,priority,labels,status,description,comment,assignee"
    }
  )
  ```
- If no tickets found, inform the user and stop
- If 3+ tickets found, present selection UI using `AskUserQuestion` with `multiSelect: true`

### Step 2: Check for Existing PRs

For each ticket, check if a PR already exists:
```bash
gh pr list --head {TICKET_ID} --repo webex/widgets --state all --json number,title,state,reviews,reviewRequests
```

- **If PR exists and is open:** Enter review-polling mode (Step 7)
- **If PR exists and is merged:** Skip ticket, inform user it's already done
- **If no PR:** Continue to implementation (Step 3)

### Step 3: Create Worktrees

For each ticket that needs implementation:

```bash
git fetch upstream next
git worktree add /tmp/claude-widgets/{TICKET_ID} -b {TICKET_ID} upstream/next
```

**If worktree already exists:**
- Use `AskUserQuestion`: "Worktree for {TICKET_ID} already exists. Reuse or recreate?"
  - **Reuse**: use existing worktree
  - **Recreate**: `git worktree remove /tmp/claude-widgets/{TICKET_ID} && git branch -D {TICKET_ID}` then create fresh

**If branch exists but no worktree:**
- Delete branch first: `git branch -D {TICKET_ID}` then create worktree

### Step 4: Install Dependencies and Build

For each worktree (run in parallel with `run_in_background: true`):
```bash
cd /tmp/claude-widgets/{TICKET_ID}
corepack enable
yarn install
yarn build:dev
```

This takes 1-2 minutes per worktree.

### Step 5: Fetch Ticket Details and Triager Notes

For each ticket, fetch complete details including Triager's fix suggestion from comments:
```
mcp__jira__call_jira_rest_api(endpoint="/issue/{TICKET_ID}", method="GET")
```

Extract the Triager's analysis comment (look for "**Triager Analysis: FIX SUGGESTION**" in comments).

### Step 6: Spawn Fixer Agents

Launch fixer agents — one per ticket, in parallel, with `run_in_background: true`:

```
Agent({
  subagent_type: "general-purpose",
  model: "sonnet",
  description: "Fix ticket {TICKET_ID}",
  prompt: `You are a fixer agent. Follow the instructions in .claude/agents/fixer.md.

TICKET_ID: {TICKET_ID}
WORKTREE_PATH: /tmp/claude-widgets/{TICKET_ID}
REPO_ROOT: {absolute path to main repo}

## JIRA Ticket Details (pre-fetched — do NOT attempt to call Jira APIs)

Summary: {ticket summary}
Type: {Bug/Story/Task}
Priority: {priority}
Description:
{full ticket description}

## Triager's Fix Suggestion (pre-fetched from Jira comments)

{Triager's analysis comment content}

Dependencies are already installed and packages are already built in the worktree.

Read .claude/agents/fixer.md for your full workflow. Implement the fix, run tests, stage changes (NO commit), and return result JSON.`,
  run_in_background: true
})
```

**Fallback:** If the subagent fails, do the implementation work directly in the main conversation following fixer.md workflow.

### Step 6b: Post-Agent Staging

After each fixer agent completes, verify staging worked:
```bash
cd /tmp/claude-widgets/{TICKET_ID}
git diff --cached --stat
```

If nothing is staged but the agent reported success, manually stage the files it listed:
```bash
cd /tmp/claude-widgets/{TICKET_ID}
git add {files from agent result}
```

### Step 6c: Create Commit and PR

For each successful fix, do this directly in the main conversation (NOT in a subagent):

**Read the PR template:**
```bash
cat /tmp/claude-widgets/{TICKET_ID}/.github/PULL_REQUEST_TEMPLATE.md
```

**Commit:**
```bash
cd /tmp/claude-widgets/{TICKET_ID}
git commit -m "$(cat <<'EOF'
{changeType}({scope}): {summary}

{Detailed description from Triager's analysis}

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

{Summary from fixer agent result + Triager analysis}

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

### Step 7: Review Polling (for tickets with existing PRs)

When `/fix` is called on a ticket that already has an open PR:

```bash
gh pr view {PR_NUMBER} --repo webex/widgets --json reviews,reviewRequests,state
```

**If changes requested:**
1. Ensure worktree exists (recreate if cleaned up):
   ```bash
   if [ ! -d /tmp/claude-widgets/{TICKET_ID} ]; then
     git worktree add /tmp/claude-widgets/{TICKET_ID} {TICKET_ID}
   fi
   ```
2. Read review comments:
   ```bash
   gh api repos/webex/widgets/pulls/{PR_NUMBER}/reviews
   gh api repos/webex/widgets/pulls/{PR_NUMBER}/comments
   ```
3. Address each review comment (edit code in worktree, run tests)
4. Commit and push:
   ```bash
   cd /tmp/claude-widgets/{TICKET_ID}
   git add {changed files}
   git commit -m "{changeType}({scope}): address review feedback

   {TICKET_ID}"
   git push
   ```
4. Report what was addressed

**If approved:**
1. Confirm with user before merging:
   ```
   AskUserQuestion: "PR #{PR_NUMBER} for {TICKET_ID} is approved. Merge via squash?"
   ```
2. If confirmed:
   ```bash
   gh pr merge {PR_NUMBER} --repo webex/widgets --squash
   ```
3. Transition Jira ticket:
   ```
   mcp__jira__add_labels(issue_key="{TICKET_ID}", labels=["fixed"])
   ```
4. Clean up worktree (offer via `AskUserQuestion`)

**If no reviews yet:**
- Report: "PR #{PR_NUMBER} is waiting for reviews. Re-run `/fix {TICKET_ID}` to check again."

### Step 8: Present Summary

```
## Fix Results

| Ticket | Status | Type | Scope | Files | Tests | PR |
|--------|--------|------|-------|-------|-------|----|
| CAI-1234 | success | fix | task | 3 | 5 added | #640 (draft) |
| CAI-5678 | review | fix | store | - | - | #635 (changes requested) |

### Next Steps
- Review PRs on GitHub
- Check review status: `/fix CAI-1234`
- Clean up worktrees: `/cleanup-worktrees`
```

## Safety Rules

- NEVER force push without explicit user confirmation
- NEVER merge without approval AND user confirmation
- NEVER auto-approve PRs
- NEVER delete worktrees without user confirmation
- NEVER target any base branch other than `next` unless user specifies
- NEVER include Co-Authored-By AI references unless user explicitly requests it
- NEVER proceed without user selection when multiple tickets are available
- Always use `/tmp/claude-widgets/` as the worktree base directory
- Always create PRs as drafts unless user specifies otherwise
