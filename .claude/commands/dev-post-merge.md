# Dev Post-Merge Command

## Description

Generate post-merge artifacts after PR merge: usage spec, microservices-delta.md, troubleshooting delta.

## Arguments

- Required: ticket ID (e.g., `/dev-post-merge CAI-1234`)

## Prerequisites

- PR merged to `next`
- Label `dev-merged` (apply if not present)

## Workflow

### Step 1: Gather Merge Context

```bash
# PR diff vs next (adjust branch as needed)
gh pr view {PR_NUMBER} --json url,mergeCommit,files
```

Read spec.md from worktree or Jira attachment.

### Step 2: Spawn Post-Merge Agent

Agent: `.claude/agents/post-merge.md`

Pass: TICKET_ID, PR URL, merge SHA, diff summary, spec.md.

### Step 3: Jira Updates

- Label ticket `dev-merged`
- Label Security epic ticket `sec-input-ready`
- Post post-merge JSON comment with artifact paths

```
mcp__jira__add_labels(issueKey="{TICKET_ID}", labels=["dev-merged"])
```

### Step 4: Security Workflow (Manual/Webhook)

Trigger org Security AI workflow if webhook URL configured — document in team runbook.

Parent does NOT implement Corona/Lambda — interface only.

### Step 5: Handoff

Notify Beta/GTM teams with artifact links per org process.

## Reference

[05-post-merge.md](../../ai-docs/templates/development-phase/05-post-merge.md)
