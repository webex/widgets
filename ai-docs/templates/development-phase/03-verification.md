# Development Phase — Verification

## Purpose

Validate implementation beyond unit tests: build, lint, architecture, E2E.

---

## Layer 4 — Unit Tests (Required)

```bash
yarn workspace @webex/{pkg} test:unit
```

All tests in affected packages must pass.

---

## Layer 5 — Build and Lint

```bash
yarn build:dev
yarn workspace @webex/{pkg} test:styles
```

Pre-commit hook runs full `yarn test:unit` + `yarn test:styles` on commit.

---

## Layer 6 — E2E (Per spec.md Test Plan)

### When Required

- User-facing behavior changes
- Cross-widget flows affected
- `spec.md` test plan lists E2E scenarios

### Implementation

1. E2E agent updates tests per [playwright/ai-docs/AGENTS.md](../../../playwright/ai-docs/AGENTS.md)
2. Follow [playwright/02-test-implementation.md](../playwright/02-test-implementation.md)
3. Parent runs:

```bash
yarn test:e2e
# Or targeted: yarn playwright test playwright/tests/{file}.spec.ts
```

### CI

Add PR label `run_e2e` when E2E must run in CI (see `.github/workflows/pull-request.yml`).

### Skip/Waiver

Document in Jira comment with human approval:

- Env constraints (OAuth, lab unavailable)
- Pure unit-testable logic with no UI change

---

## Invoke Skill

`superpowers:verification-before-completion` before proceeding to PR.

---

## Verification Checklist

- [ ] Unit tests green
- [ ] Build succeeds
- [ ] Styles/lint pass
- [ ] E2E green OR waived with approval
- [ ] Spec drift checked if ai-docs changed
- [ ] No console errors in sample apps (manual spot-check if UI)

---

## On Failure

Return to [02-implementation.md](./02-implementation.md) with failure logs in subagent prompt.
