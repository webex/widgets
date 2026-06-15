# Development Phase — Implementation (TDD Loop)

## Purpose

Implement changes per `spec.md` and `plan.md` using test-driven development.

---

## Prerequisites

- Intake passed (`dev-ready`)
- `plan.md` posted to Jira (`dev-in-progress`)
- Scope `ai-docs/AGENTS.md` and `ARCHITECTURE.md` read
- Relevant [patterns](../../patterns/) loaded

---

## Workflow

### 1. Read Inputs

- `spec.md` — acceptance criteria, API, test plan
- `plan.md` — files to touch, risks
- Package ai-docs for scope

### 2. SDK Consultation

Before any SDK usage, consult `contact-centre-sdk-apis/contact-center.json`. Access SDK only via `store.cc.methodName()`.

### 3. TDD Cycle

For each acceptance criterion:

1. **Write failing test** — describe scenario and expected outcome
2. **Run tests** — `yarn workspace @webex/{pkg} test:unit`
3. **Implement minimal code** — Widget → Hook → Component → Store → SDK
4. **Re-run until green**
5. **Refactor** if needed (keep tests green)

Invoke `superpowers:test-driven-development`.

### 4. Architecture Compliance

Verify [AGENTS.md](../../../AGENTS.md) Step 5.5:

- [ ] SDK via store only
- [ ] `observer()` on widgets
- [ ] `runInAction()` for MobX mutations
- [ ] No circular imports
- [ ] ErrorBoundary + withMetrics
- [ ] No PII in logs

### 5. Documentation

If public API changed:

- Update scope `ai-docs/AGENTS.md` and/or `ARCHITECTURE.md`
- Run `/spec-drift-changed` before PR

### 6. Stage Changes

Stage implementation + tests. Return implementation JSON to parent.

---

## Implementation JSON (Subagent Output)

```json
{
  "ticketId": "CAI-XXXX",
  "status": "success|failed",
  "testsAdded": ["packages/.../tests/..."],
  "testsPassing": true,
  "filesChanged": ["..."],
  "aiDocsUpdated": false,
  "error": null
}
```

---

## Loop on Failure

If unit tests fail after implementation → fix in worktree; do not proceed to E2E.

---

## Agent

Claude Code: [.claude/agents/dev-implementer.md](../../../.claude/agents/dev-implementer.md)

Cursor: Task `fixer` or custom prompt with this template.
