# Playwright Validation

## Commands

```bash
# list projects/tests
yarn playwright test --config=playwright.config.ts --list

# run target suite
yarn test:e2e playwright/suites/<suite-file>.spec.ts

# run target set
yarn test:e2e --project=SET_1
```

## Checklist

- [ ] Tests are mapped to correct suite/set
- [ ] Setup/cleanup is deterministic
- [ ] AGENTS.md baseline matches actual suites/sets/workflow
- [ ] ARCHITECTURE.md file topology and set/suite/test mapping matches actual files
- [ ] No stale references in docs/templates

---

_Last Updated: 2026-03-05_
