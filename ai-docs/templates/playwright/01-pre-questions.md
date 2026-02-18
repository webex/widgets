# Playwright Pre-Questions

## Purpose

Mandatory intake checklist to ensure the user provides complete implementation details before Playwright changes.

---

## Required Questions

### 1. Task Scope

- What exactly should be changed? (one sentence)
- Is this a new suite, new test, update, or flaky-test stabilization?
- Which current suite is impacted? (`playwright/suites/*.spec.ts`)

### 2. Coverage Details

- Exact scenarios to add/update (list each scenario title)
- Expected assertions for each scenario
- Out-of-scope scenarios

### 3. Execution Target

- Which set(s) should run this? (`SET_1`..`SET_6` or new set)
- If new set is needed, what suite filename should `TEST_SUITE` map to?

### 4. Data and Environment

- Required env keys (entry points, queue, chat URL, dial number, etc.)
- Which agents/roles are needed (Agent1/Agent2/caller/extension/multi-session)
- Any OAuth or token-related constraints?

### 5. Setup and Utilities

- Preferred `TestManager` setup method (if known)
- Can existing `Utils/*` be reused, or is a new helper needed?

### 6. Stability Expectations

- Known flaky points today
- Timeout/retry expectations
- Cleanup expectations (wrapup/end-state)

### 7. Documentation Expectations

- Should `playwright/ai-docs/AGENTS.md` be updated?
- Should `playwright/ai-docs/ARCHITECTURE.md` be updated?

---

## Completion Gate

Do not start implementation until required questions are answered or explicitly assumed and documented.

---

_Last Updated: 2026-02-18_
