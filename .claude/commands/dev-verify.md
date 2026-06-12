# Dev Verify Command

## Description

Verification phase: build, lint, E2E. Parent runs commands; may spawn E2E-focused subagent for Playwright test authoring.

## Arguments

- Required: ticket ID (e.g., `/dev-verify CAI-1234`)

## Skills Integration

| Skill | When | Purpose |
|-------|------|---------|
| `superpowers:verification-before-completion` | Before PR path | Evidence before assertions |

## Workflow

### Step 1: Unit + Build

```bash
cd /tmp/claude-widgets/{TICKET_ID}
yarn build:dev
yarn workspace @webex/{SCOPE} test:unit
yarn workspace @webex/{SCOPE} test:styles
```

STOP on failure → return to `/dev-implement`.

### Step 2: E2E (If Required per spec.md)

If test plan requires E2E:

1. Spawn subagent with playwright template guidance to add/update tests
2. Parent runs:

```bash
yarn test:e2e
# or targeted suite
```

Document waiver in Jira if skipped with human approval.

### Step 3: Spec Drift (If ai-docs Changed)

Run `/spec-drift-changed` if implementation updated ai-docs.

### Step 4: Proceed

On success → suggest `/dev-review {TICKET_ID}`.

## Reference

[03-verification.md](../../ai-docs/templates/development-phase/03-verification.md)
