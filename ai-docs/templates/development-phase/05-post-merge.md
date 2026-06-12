# Development Phase — Post-Merge Artifacts

## Purpose

Generate handoff artifacts for Security, Beta, and GTM phases after PR merge.

---

## Trigger

PR merged to `next`; Jira ticket labeled `dev-merged`.

Run `/dev-post-merge {TICKET_ID}` or spawn Post-Merge Agent.

---

## Artifacts

### 1. Usage SPEC (Beta Docs)

**Consumer:** Beta Documentation phase (Phase 4)

**Source template:** [create-agent-md.md](../documentation/create-agent-md.md)

**Content:**

- Public API / props / callbacks added or changed
- Usage examples
- Configuration requirements

Attach to Beta Epic or Confluence per team process.

---

### 2. microservices-delta.md (Security)

**Consumer:** Security & Compliance phase (Phase 3)

**Source template:** [microservices-delta.md.template](./microservices-delta.md.template)

**Inputs:**

- PR diff
- New/changed API endpoints
- New dependencies (from `package.json` changes)
- Data flows affecting PII/auth

Post to Security Epic; label `sec-input-ready`.

**Security AI workflow:** Trigger org webhook/Lambda (Corona BOM pipeline) — interface TBD; document trigger URL in team runbook.

---

### 3. Troubleshooting Guide (TAC TOI / GTM)

**Consumer:** GTM Phase 5 — TAC TOI

Update scope `ai-docs/ARCHITECTURE.md` § Troubleshooting Guide with:

- New failure modes
- Diagnostic steps
- Known limitations from `spec.md`

---

### 4. Jira Comment

Post post-merge JSON (schema in [development-phase-plan.md](../../harness/development-phase-plan.md) §8.2):

```json
{
  "harness": "development-phase",
  "stage": "post-merge",
  "ticketId": "CAI-XXXX",
  "artifacts": {
    "usageSpec": "...",
    "microservicesDelta": "...",
    "troubleshootingGuide": "..."
  },
  "securityWorkflowTriggered": true,
  "timestamp": "ISO-8601"
}
```

---

## Agent

[.claude/agents/post-merge.md](../../../.claude/agents/post-merge.md)

---

## Out of Scope Here

- Publishing to ContentStack (Beta phase)
- Threat Dragon model updates (Security phase)
- Tech Zone article publish (GTM phase)
