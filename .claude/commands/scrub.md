# Scrub Command

## Description
Evaluate bug tickets for completeness and AI-readiness. Classifies each ticket and posts findings as Jira comments.

**Pipeline stage 1 of 3:** Scrub → Triage → Fix

## Arguments
- Optional: ticket IDs (e.g., `/scrub CAI-1234 CAI-5678`)
- If no tickets specified, fetches open bugs from JIRA

## Skills Integration

| Skill | When to Invoke | Purpose |
|-------|---------------|---------|
| `superpowers:dispatching-parallel-agents` | Step 3 (spawning scrubbers) | Parallel agent orchestration pattern |

## Workflow

### Step 1: Resolve Tickets

**If ticket IDs provided as arguments:**
- Fetch each ticket using `mcp__jira__call_jira_rest_api`:
  - endpoint: `/issue/{ticketId}`, method: `GET`
- Validate each ticket exists

**If no ticket IDs provided:**
- Query JIRA for open bugs:
  ```
  mcp__jira__call_jira_rest_api(
    endpoint="/search",
    method="GET",
    params={
      "jql": "project = CAI AND issuetype = Bug AND status in (Open, \"To Do\", \"In Progress\") AND labels not in (scrubbed, dolater, followup) ORDER BY priority DESC, created DESC",
      "fields": "summary,issuetype,priority,labels,status,description,comment,assignee,reporter"
    }
  )
  ```
- If no tickets found, inform the user and stop
- If 5+ tickets found, present selection UI using `AskUserQuestion` with `multiSelect: true`

### Step 2: Fetch Full Ticket Details

For each ticket, fetch complete details including comments:
```
mcp__jira__call_jira_rest_api(endpoint="/issue/{TICKET_ID}", method="GET")
```

Extract: summary, description, type, comments, labels, priority, assignee, reporter.

### Step 3: Spawn Parallel Scrubber Agents

**Invoke `superpowers:dispatching-parallel-agents` skill** before spawning agents. Follow the skill's pattern for parallel task orchestration.

Launch ALL scrubbers in a **single message** with multiple `Agent()` calls for true parallel execution.

**Important:** Pass the full JIRA ticket details in the prompt — the subagent cannot access Jira.

```
Agent({
  subagent_type: "general-purpose",
  model: "haiku",
  description: "Scrub ticket {TICKET_ID}",
  prompt: `You are a scrubber agent. Follow the instructions in .claude/agents/scrubber.md.

TICKET_ID: {TICKET_ID}

## JIRA Ticket Details (pre-fetched — do NOT attempt to call Jira APIs)

Summary: {ticket summary}
Type: {Bug/Story/Task}
Priority: {priority}
Status: {status}
Assignee: {assignee}
Reporter: {reporter}
Labels: {labels}
Description:
{full ticket description}

Comments:
{all comments}

Read .claude/agents/scrubber.md for your full workflow. Evaluate this ticket and return result JSON.`,
  run_in_background: true
})
```

### Step 4: Post Jira Comments

For each completed scrubber, parse the result JSON and:

1. Post the `jiraComment` on the ticket:
   ```
   mcp__jira__call_jira_rest_api(
     endpoint="/issue/{TICKET_ID}/comment",
     method="POST",
     data={"body": "{jiraComment from result}"}
   )
   ```

2. Add the classification label to the ticket:
   ```
   mcp__jira__add_labels(
     issue_key="{TICKET_ID}",
     labels=["scrubbed", "{classification}"]
   )
   ```

### Step 5: Present Summary

Display a results table:

```
## Scrub Results

| Ticket | Classification | Layer | Pattern | Confidence | Action |
|--------|---------------|-------|---------|------------|--------|
| CAI-1234 | prioritize | hook | missing cleanup | high | Comment posted, ready for /triage |
| CAI-5678 | followup | unknown | - | - | Asked reporter for repro steps |
| CAI-9012 | dolater | cross-cutting | - | - | Flagged for human review |

### Next Steps
- Triage prioritized tickets: `/triage CAI-1234`
- Or triage all prioritized: `/triage`
```

## Safety Rules

- NEVER modify any code or files
- NEVER change ticket status — only add comments and labels
- NEVER auto-assign tickets
- Always show results before posting Jira comments (use `say` for status updates)
