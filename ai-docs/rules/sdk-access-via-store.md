# Rule: Access the SDK only through the store

> Start here → repo root [`AGENTS.md`](../../AGENTS.md) (agent entry, carries the critical rules) · router [`SPEC_INDEX.md`](../SPEC_INDEX.md). This is an `ai-docs/rules/` fill-in; the folder README explains generic-vs-per-language routing; the repo-wide rules digest is `../RULES.md`.
> Context-efficiency: link to canonical docs — don't duplicate them; one rule per file; defer to the linter where it enforces.

## Rule
Never import the Webex Contact Center SDK (`@webex/contact-center`) directly in a widget or component;
always reach the SDK through the store singleton via `store.cc.*`.

## Why
The store (`@webex/cc-store`) is the single SDK boundary for the repo (see ADR-0001). Importing the SDK
elsewhere scatters SDK coupling across packages — an SDK upgrade then ripples through every importer,
SDK calls become impossible to mock at one place so unit tests get brittle, and error handling around
SDK calls fragments instead of being centralized. Keeping access in the store keeps coupling, mocking,
and consistent error/event handling at one point.

## How to follow
- The SDK is a dependency of `@webex/cc-store` only. Its access layer lives in
  `packages/contact-center/store/src/` (the store wraps the SDK and exposes `store.cc`).
- In a widget or component, get the singleton and call through it:
  ```ts
  import Store from '@webex/cc-store';
  const store = Store.getInstance();
  await store.cc.someMethod();   // never: import {...} from '@webex/contact-center'
  ```
- In tests, mock the store (or `store.cc`) rather than the SDK.

## Enforced by
Review only — no automated lint rule yet. The repo's ESLint config (`.eslintrc`) does not include a
`no-restricted-imports` ban on `@webex/contact-center`, so reviewers enforce this (review check C6).
Consider adding a `no-restricted-imports` rule scoped to non-store packages to make it automatic.
