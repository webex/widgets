# Triage Command

## Description
Deep-dive into prioritized bugs — reproduce, root-cause, and propose a fix. Read-only analysis, no code changes.

**Pipeline stage 2 of 3:** Scrub → Triage → Fix

## Arguments
- Optional: ticket IDs (e.g., `/triage CAI-1234 CAI-5678`)
- If no tickets specified, fetches bugs labeled `prioritize` from JIRA

## Workflow

### Step 1: Resolve Tickets

**If ticket IDs provided as arguments:**
- Fetch each ticket using `mcp__jira__call_jira_rest_api`:
  - endpoint: `/issue/{ticketId}`, method: `GET`
- Validate each ticket exists

**If no ticket IDs provided:**
- Query JIRA for prioritized bugs:
  ```
  mcp__jira__call_jira_rest_api(
    endpoint="/search",
    method="GET",
    params={
      "jql": "project = CAI AND issuetype = Bug AND labels = prioritize AND labels != triaged ORDER BY priority DESC, created DESC",
      "fields": "summary,issuetype,priority,labels,status,description,comment,assignee"
    }
  )
  ```
- If no tickets found, inform the user and stop
- If 3+ tickets found, present selection UI using `AskUserQuestion` with `multiSelect: true`

### Step 2: Fetch Full Ticket Details

For each ticket, fetch complete details including ALL comments (Scrubber notes are in comments):
```
mcp__jira__call_jira_rest_api(endpoint="/issue/{TICKET_ID}", method="GET")
```

Extract: summary, description, type, all comments (especially Scrubber classification), labels, priority.

### Step 3: Spawn Parallel Triager Agents

Launch ALL triagers in a **single message** with multiple `Agent()` calls for parallel execution.

```
Agent({
  subagent_type: "general-purpose",
  model: "sonnet",
  description: "Triage ticket {TICKET_ID}",
  prompt: `You are a triager agent. Follow the instructions in .claude/agents/triager.md.

TICKET_ID: {TICKET_ID}
REPO_ROOT: {absolute path to main repo}

## JIRA Ticket Details (pre-fetched — do NOT attempt to call Jira APIs)

Summary: {ticket summary}
Type: {Bug/Story/Task}
Priority: {priority}
Status: {status}
Assignee: {assignee}
Labels: {labels}
Description:
{full ticket description}

Comments:
{all comments, including Scrubber's classification}

Read .claude/agents/triager.md for your full workflow. Analyze this bug, identify the root cause, and return a fix suggestion as JSON.`,
  run_in_background: true
})
```

### Step 4: Post Jira Comments

For each completed triager, parse the result JSON and:

1. Post the `jiraComment` on the ticket:
   ```
   mcp__jira__call_jira_rest_api(
     endpoint="/issue/{TICKET_ID}/comment",
     method="POST",
     data={"body": "{jiraComment from result}"}
   )
   ```

2. Add the `triaged` label:
   ```
   mcp__jira__add_labels(
     issue_key="{TICKET_ID}",
     labels=["triaged"]
   )
   ```

### Step 5: Present Summary

Display a results table:

```
## Triage Results

| Ticket | Root Cause | Pattern | Layer | Risk | Confidence | Files |
|--------|-----------|---------|-------|------|------------|-------|
| CAI-1234 | Missing cleanup in useEffect | cleanup | hook | low | high | 2 files |
| CAI-5678 | Observer not wrapped | observer | widget | low | high | 1 file |

### Fix Suggestions

#### CAI-1234
{Brief fix description}
- `src/helper.ts`: Add cleanup return in useEffect
- `tests/helper.test.ts`: Add cleanup test

#### CAI-5678
{Brief fix description}
- `src/widget/index.tsx`: Wrap with observer HOC

### Next Steps
- Fix a specific ticket: `/fix CAI-1234`
- Fix all triaged tickets: `/fix`
```

## Safety Rules

- NEVER modify any code or files — this is read-only analysis
- NEVER create worktrees or branches
- NEVER change ticket status — only add comments and labels
- Always show results summary after triage completes
