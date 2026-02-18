# Playwright Framework and Docs Updates

## Purpose

Apply shared framework updates and keep Playwright docs aligned.

---

## Framework Files (update only if required)

- `playwright/Utils/*.ts`
- `playwright/test-manager.ts`
- `playwright/constants.ts`
- `playwright/global.setup.ts`
- `playwright.config.ts`

---

## Doc Files

- `playwright/ai-docs/AGENTS.md`
- `playwright/ai-docs/ARCHITECTURE.md`

`playwright/ai-docs/ARCHITECTURE.md` is the single source of truth for framework architecture and scenario-level technical documentation.

---

## Checklist

- [ ] Shared changes are reusable and not test-case specific
- [ ] Existing tests remain backward compatible or intentionally migrated
- [ ] Docs reflect actual current code paths and behavior

---

_Last Updated: 2026-02-18_
