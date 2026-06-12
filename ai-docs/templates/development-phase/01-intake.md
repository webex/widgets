# Development Phase — Intake (DoR Gate)

## Purpose

Verify Discovery deliverables before Development starts. Produce normalized `spec.md` and intake JSON for Jira.

---

## Mandatory Pre-Step

Do NOT proceed to planning or code until this checklist passes or human waives specific items in Jira.

---

## Checklist

### 1. Feature SPEC (CAPTURE)

- [ ] Task list present
- [ ] Business use cases documented
- [ ] Acceptance criteria testable

### 2. DoR Deck (Discovery)

- [ ] High-level architecture (component communication)
- [ ] Low-level design (flows, diagrams, or sequence)
- [ ] API details (OpenAPI/Swagger or SDK method list)
- [ ] Error scenarios documented
- [ ] Limitations / blockers listed
- [ ] Open questions resolved OR explicitly deferred with owner
- [ ] Test plan (unit + E2E scope)

### 3. Jira Ticket

- [ ] English description complete
- [ ] Spec delta: Added / Removed / Updated
- [ ] Component scope identified
- [ ] Dependencies linked (Jira links)
- [ ] Epic linked (Dev Epic)

### 4. Raw Data Bundle

- [ ] PF / feature description
- [ ] Design input (Figma, screenshot, or written spec) — required for UI work
- [ ] Repo links identified
- [ ] Control Hub flags / SKU docs if applicable

### 5. Downstream Stubs

- [ ] Security Epic linked (for post-merge delta)
- [ ] Beta Epic linked (for usage spec expectations)

---

## Blockers

If any unchecked item is **required** for this ticket type, record in `blockers[]`:

```json
{
  "item": "API details",
  "reason": "No OpenAPI spec linked",
  "owner": "Discovery",
  "severity": "blocker"
}
```

Post to Jira; do NOT apply `dev-ready`.

---

## On Pass

1. Determine `taskType`: A (new widget) | B (bug) | C (feature) | F (playwright)
2. Determine `scopePackages`: e.g. `["@webex/cc-task"]`
3. Generate `spec.md` from [spec.md.template](./spec.md.template)
4. Create worktree (see [00-master.md](./00-master.md))
5. Apply Jira label `dev-ready`
6. Post intake JSON comment (schema in [development-phase-plan.md](../../harness/development-phase-plan.md) §8.2)

---

## Intake JSON Template

```json
{
  "harness": "development-phase",
  "stage": "intake",
  "ticketId": "CAI-XXXX",
  "dorGate": "pass",
  "blockers": [],
  "specMdPath": "/tmp/claude-widgets/CAI-XXXX/spec.md",
  "worktreePath": "/tmp/claude-widgets/CAI-XXXX",
  "scopePackages": ["@webex/cc-task"],
  "taskType": "C",
  "timestamp": "ISO-8601"
}
```
