# Playwright Pre-Questions

## Purpose

Mandatory intake checklist to ensure the user provides complete implementation details before Playwright changes.

---

## Core Principles

### 1. Root Cause Analysis Over Symptomatic Fixes
- **NEVER** increase timeouts as a first response to flaky tests
- **ALWAYS** investigate WHY a test is failing before applying fixes
- Timeouts mask underlying issues (race conditions, incorrect selectors, state leakage)
- Document the specific reason if timeout increases are necessary

### 2. No Lazy Reasoning
- **NEVER** assume "it probably works this way" - verify by reading code or testing
- **NEVER** copy-paste patterns without understanding them
- **NEVER** skip edge cases or error handling
- **ALWAYS** ask clarifying questions when requirements are unclear

### 3. Timeout Justification Required
- Default timeouts should be sufficient for most operations
- When increasing timeouts, document:
  - What specific operation needs more time
  - Why this operation requires more time (measured/observed duration)
  - Why the operation cannot be optimized instead
- Example GOOD reason: "Widget initialization requires loading external config (observed 15-20s in production)"
- Example BAD reason: "Test was flaky, increased timeout to make it pass"

### 4. Requirements Gathering First
- Use questionnaire-driven approach
- Understand full scope before implementation
- Identify edge cases and error scenarios upfront
- Don't start coding until requirements are clear

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

- Which set(s) should run this? (`SET_1`..`SET_9` or new set)
- If new set is needed:
  - What suite filename should `TEST_SUITE` map to?
  - How many agents are required? (1-4)
  - What entry points/queues/URLs are needed?

### 4. Data and Environment

- Required env keys (entry points, queue, chat URL, dial number, etc.)
- How many agents are needed? (1-4)
- Which roles are needed? (Agent1/Agent2/Agent3/Agent4/caller/extension/multi-session)
- Any OAuth or token-related constraints?
- Are there specific user credentials or permissions required?

### 5. Setup and Utilities

- Preferred `TestManager` setup method (if known)
- Can existing `Utils/*` be reused, or is a new helper needed?

### 6. Stability Expectations

- Known flaky points today and their root causes (if known)
- Have existing flaky tests been investigated for root cause?
- Are there specific operations that legitimately require longer timeouts? (with justification)
- What cleanup is required? (wrapup/end-state/agent cleanup)
- Are there race conditions or state dependencies to address?

**Important:** If user mentions timeout issues:
1. First investigate: console logs, network traces, application state
2. Identify root cause: race condition? slow operation? incorrect selector?
3. Fix root cause: add proper state checks, optimize operation, fix selector
4. Only increase timeout if justified and documented

### 7. Documentation Expectations

- Should `playwright/ai-docs/AGENTS.md` be updated?
- Should `playwright/ai-docs/ARCHITECTURE.md` be updated?

---

## Completion Gate

Do not start implementation until required questions are answered or explicitly assumed and documented.

---

_Last Updated: 2026-03-04_
