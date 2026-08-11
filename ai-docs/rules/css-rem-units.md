<!-- ───────────────────────────────
  Template:     Rule (example)
  Template-ID:  rule
  Generates:    ai-docs/rules/<name>.md
  Description:  One enforceable repo rule — the rule, its rationale, how to follow it, and how it's enforced.
  Library ver:  0.1.0-draft
  Last updated: 2026-07-20
─────────────────────────────── -->

# Rule: Use rem units in component styles, not px

> Start here → repo root [`AGENTS.md`](../../AGENTS.md) (agent entry, carries the critical rules) · router [`SPEC_INDEX.md`](../SPEC_INDEX.md). This is an `ai-docs/rules/` fill-in; the folder README explains generic-vs-per-language routing; the repo-wide rules digest is `../RULES.md`.
> Context-efficiency: link to canonical docs — don't duplicate them; one rule per file; defer to the linter where it enforces.

## Rule

In `*.style.scss` / `*.scss` files under `packages/contact-center/*/src/`, express spacing, sizing,
border-radius, border-width, and box-shadow offsets in `rem`, not hardcoded `px`. Use Momentum design
tokens (`var(--mds-color-theme-*)`) for color instead of hex codes, and avoid hardcoding `font-size` /
`font-weight` when the Momentum `Text` component's `type` prop already controls that typography.

## Why

This repo's component styles are built on the Momentum design system, which defines its own type scale
and spacing scale in `rem` (root-relative units respect the user/host app's base font size; `px` does
not). Hardcoded `px` values silently drift from the design tokens and break if a host app changes its
root font size for accessibility. This was flagged in review on PR #719 (`e911-modal.style.scss` used
`px` spacing and hex colors instead of the established convention).

## How to follow

- Convert `px` to `rem` at a 16px base (e.g. `8px` → `0.5rem`, `4px` → `0.25rem`, `1px` → `0.0625rem`).
  See the inline `// Npx to rem` comments in
  `packages/contact-center/cc-components/src/components/task/CallControl/call-control.styles.scss`.
- Reference:
  ```scss
  // from packages/contact-center/cc-components/src/components/task/CampaignErrorDialog/campaign-error-dialog.style.scss
  .campaign-error-dialog {
    width: 25rem;
    border-radius: 0.5rem;
    padding: 1rem;
    box-shadow:
      0rem 0.25rem 0.5rem 0rem rgba(0, 0, 0, 0.16),
      0rem 0rem 0.0625rem 0rem rgba(0, 0, 0, 0.16);
  }
  ```
  Incorrect (pre-fix `e911-modal.style.scss`):
  ```scss
  .e911-modal {
    border-radius: 8px;
    box-shadow: 0 4px 16px rgba(0, 0, 0, 0.2);
  }
  .e911-warning-box {
    background-color: #fff3cd; // hardcoded hex instead of a Momentum token
    border: 1px solid #ffc107;
  }
  .e911-modal-title {
    font-size: 18px; // redundant: Text type="body-large-bold" already sets this
    font-weight: 600;
  }
  ```
- Use Momentum theme tokens for color, not hex: `var(--mds-color-theme-background-alert-warning-normal)`,
  `var(--mds-color-theme-outline-warning-normal)`, `var(--mds-color-theme-text-warning-normal)`,
  `var(--mds-color-theme-text-secondary-normal)`, `var(--mds-color-theme-text-accent-normal)`,
  `var(--mds-color-theme-outline-primary-normal)` (see `call-control.styles.scss`, `user-state.scss`).
- Don't set `font-size`/`font-weight` in SCSS for text rendered through the Momentum `Text` component —
  its `type` prop (e.g. `type="body-large-bold"`) already governs typography.
- **Exceptions:** media-query breakpoints (`@media (max-width: 600px)`) and exact pixel-perfect image/SVG
  asset dimensions (e.g. a background-image sized to a specific icon export) may stay in `px` — see the
  same `call-control.styles.scss` file for both cases. Don't over-apply the rule to these.

## Enforced by

Review only. `yarn test:styles` runs ESLint (`"test:styles": "eslint"` in each package's
`package.json`), not a CSS/SCSS linter — there is no Stylelint config in this repo, so nothing currently
bans `px` or hex colors in `.scss` files automatically. Consider adding Stylelint with
`declaration-property-unit-disallowed-list` (scoped to spacing/sizing properties) and `color-no-hex` to
make this automatic.
