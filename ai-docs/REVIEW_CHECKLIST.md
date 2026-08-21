# Review-Check Catalog — Webex Contact Center Widgets

> Start here → root [`AGENTS.md`](../AGENTS.md) (agent entry) · router [`SPEC_INDEX.md`](SPEC_INDEX.md) · system [`ARCHITECTURE.md`](ARCHITECTURE.md). Then this doc at Review & Merge.
> Context-efficiency: link to canonical docs — don't duplicate them; load on demand, not upfront.

> Each finding records: severity (Blocking / Important / Medium / Minor), check id, file path, what's wrong,
> why it matters, a concrete fix. Any Blocking finding fails the gate.

## Core checks (always run)
| # | Check | What it verifies | Severity if it fails |
|---|---|---|---|
| C1 | Spec-currency + WHAT/WHY | Module spec/docs changed in the same change as code (`specCurrency.sameChangeRequired`); the touched module's `ai-docs/` spec and any AI Docs Impact entries are updated; every requirement (incl. ADDED) states WHAT and WHY | Blocking |
| C2 | Contract correctness | Public-surface delta is real and complete — exported components/hooks/store members and r2wc custom-element tag names (e.g. `widget-cc-station-login`) match `CONTRACTS.md`; no undocumented breaking change to an exported API or element tag/attribute | Blocking |
| C3 | Code-vs-spec match | Signatures, data-flow (Widget → hook → component → store → SDK), and architecture claims in the spec match the actual code (file path) | Blocking |
| C4 | Test adequacy | Each acceptance criterion has a Jest/RTL test with a positive AND a negative case; changed-line coverage meets the 80% bar (`coverageBar.changedLines` in `.sdd/coverage-policy.defaults.yaml`) | Important |
| C5 | Error handling + input validation | SDK/event boundaries and untrusted input validated; failure/edge paths handled, not swallowed; widgets wrapped in ErrorBoundary | Important |
| C6 | Security baseline | No hardcoded secrets/credentials; no PII or credentials logged; SDK accessed only via the store (`store.cc.*`), never imported directly in a widget/component (per `SECURITY.md` and `RULES.md`) | Blocking |

## Coverage-conditional checks (run by the touched module's manifest coverage state)
| # | Check | When it applies | What it verifies | Severity |
|---|---|---|---|---|
| K1 | Regression guard | Modifying a weakly covered module (DRAFT/PARTIAL), or any MODIFIED/REMOVED requirement | A characterization baseline exists; invariants the change claims NOT to alter still hold (positive + negative) | Blocking |
| K2 | Grounding | Weakly covered module — all tracked modules are `Partial` during migration (`.sdd/manifest.json` `coverage_status`); per `coverage_status_definitions`, a Partial spec is a hint, so cross-check code | Claims cite real code (file path), not memory; uncovered public surfaces flagged `[NEEDS HUMAN INPUT]` | Important |
| K3 | Drift threshold | Any tracked module | Module drift is within its status threshold (DRAFT 25% / PARTIAL 15% / AUTHORITATIVE 5%; see `RULES.md` / `.sdd/coverage-policy.defaults.yaml`) | Important |
| K4 | Coverage-state accuracy | Coverage-state change proposed | The recorded `.sdd/manifest.json` coverage state matches the evidence; promotion/demotion rules honored | Medium |

## Cross-cutting checks (apply at higher risk / autonomy)
| # | Check | What it verifies | Severity |
|---|---|---|---|
| X1 | Cross-model review | The artifact was validated by a different runtime than the one that generated it (generator ≠ validator) | Blocking when required |
| X2 | Observability | Metrics via `withMetrics` / `metricsLogger` adequate for the change; nothing sensitive (PII/credentials) logged | Medium |
| X3 | Rollout safety | Behavior-changing defaults are safe; rollback path exists; PR targets `next` and follows the FedRAMP-mandated `.github/PULL_REQUEST_TEMPLATE.md` | Important |

## How the set is selected
1. Always run the 6 core checks.
2. Add the coverage-conditional checks whose "when it applies" matches the touched modules' manifest coverage state.
3. Add the cross-cutting checks when the change is high-risk or runs at higher autonomy.

## Output
- A compliance matrix + severity-sorted findings + a verdict (Pass / Pass-with-warnings / Blocked).
  Draft only; a human posts.
