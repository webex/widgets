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
- [ ] No stale references in docs/templates

---

_Last Updated: 2026-02-18_
