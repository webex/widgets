# Spec Index — webex-widgets (Contact Center)

> Start here → root [`AGENTS.md`](../AGENTS.md) (agent entry). This file is the router (`ai-docs/SPEC_INDEX.md`); system overview in [`ARCHITECTURE.md`](ARCHITECTURE.md). Load `AGENTS.md` + this file first; pull every other doc on demand.
> Context-efficiency: link to canonical docs — don't duplicate them; route to the minimum needed per task.

> AI agent entry point after `AGENTS.md`. Load this once at session start; pull other docs on demand.
> **Source of truth:** `.sdd/manifest.json` (this file mirrors it for humans).

## Module Registry
| Module | Responsibility | Manifest coverage state | Start here |
|---|---|---|---|
| `packages/@webex/widgets/` | Legacy meetings widgets (separate family) | Partial | `packages/@webex/widgets/ai-docs/widgets-spec.md` |
| `packages/contact-center/ai-assistant/` | AI Assistant widget: chrome + Real-time Assist requests, transcript, feedback | Partial | `packages/contact-center/ai-assistant/ai-docs/ai-assistant-spec.md` |
| `packages/contact-center/cc-components/` | Shared presentational React UI primitives | Partial | `packages/contact-center/cc-components/ai-docs/cc-components-spec.md` |
| `packages/contact-center/cc-digital-channels/` | Digital channels (chat/email/social) widget | Partial | `packages/contact-center/cc-digital-channels/ai-docs/cc-digital-channels-spec.md` |
| `packages/contact-center/cc-widgets/` | r2wc Web Component wrappers (aggregator) | Partial | `packages/contact-center/cc-widgets/ai-docs/cc-widgets-spec.md` |
| `packages/contact-center/station-login/` | Agent login: team + device selection | Partial | `packages/contact-center/station-login/ai-docs/station-login-spec.md` |
| `packages/contact-center/store/` | MobX singleton; global CC state; proxies SDK events; sole SDK access point | Partial | `packages/contact-center/store/ai-docs/store-spec.md` |
| `packages/contact-center/task/` | Task widget bundle: CallControl, IncomingTask, OutdialCall, TaskList, CallControlCAD | Partial | `packages/contact-center/task/ai-docs/task-spec.md` |
| `packages/contact-center/test-fixtures/` | Shared test mocks/helpers | Partial | `packages/contact-center/test-fixtures/ai-docs/test-fixtures-spec.md` |
| `packages/contact-center/ui-logging/` | Metrics/telemetry: `withMetrics`, `metricsLogger` | Partial | `packages/contact-center/ui-logging/ai-docs/ui-logging-spec.md` |
| `packages/contact-center/user-state/` | Agent state: state, idle codes, timer | Partial | `packages/contact-center/user-state/ai-docs/user-state-spec.md` |

## Task Routing
| If the task is… | Load |
|---|---|
| Understanding the system | `ARCHITECTURE.md` |
| Working in a module | that module's `<module>-spec.md` (see registry); load only the relevant section |
| Changing the store / SDK access | `store-spec.md` + `ARCHITECTURE.md` Component Interaction; check `@webex/contact-center` types (`node_modules/@webex/contact-center/dist/types/index.d.ts`) |
| Adding/changing a public surface (export, custom element, event) | `CONTRACTS.md` first, then the owning module spec |
| A UI/component change | `cc-components-spec.md` + `patterns/react-patterns.md` |
| A new widget | new-widget templates (`ai-docs/templates/new-widget/`); create the module spec as part of the change |
| A bug fix | the touched module spec + `patterns/` + `RULES.md`; bug-fix template `ai-docs/templates/existing-widget/bug-fix.md` |
| Playwright E2E work | `playwright/` suites + `ai-docs/templates/playwright/` |
| Naming a concept | `GLOSSARY.md` |
| Anything touching input/identity/logging | `SECURITY.md` |
| Review & merge | `REVIEW_CHECKLIST.md` |

## Intake Routing
```
What kind of change?
├─ New feature / widget       -> create/update an intake record under .generated/sdd/features/<KEY>/run-records/
├─ Bug / defect               -> create/update an intake record; load the touched module spec
├─ New module / component      -> create the module spec (module-spec template) + register in .sdd/manifest.json
└─ Doc/spec backfill only     -> no feature intake record; reconcile the target spec, regenerate, run conformance
```
The intake record confirms scope/modules **against the code** and sets the change class
(routine / security / contract / perf-critical / ui) that gates conditional spec sections.

## Incident History
| INC id | Date | Module | One-line | Link |
|---|---|---|---|---|
| _none recorded_ | — | — | Populate from the tracker as RCAs are written | — |

## Spec Registry
| Doc | Location | Purpose |
|---|---|---|
| Agent entry | `AGENTS.md` (root) | First file read: commands, critical rules, boundaries, routing |
| Architecture | `ai-docs/ARCHITECTURE.md` | System components, interactions, monorepo package map |
| Patterns | `ai-docs/patterns/` | Repo conventions (TypeScript, React, MobX, testing), correct vs incorrect |
| Rules | `ai-docs/RULES.md` + `ai-docs/rules/` | Enforceable do/don't beyond AGENTS critical rules |
| Glossary | `ai-docs/GLOSSARY.md` | Ubiquitous language: term → definition → code location |
| Security | `ai-docs/SECURITY.md` | Trust boundaries, secret/token handling, data classification |
| Contracts | `ai-docs/CONTRACTS.md` | Root index of public surfaces (exports, custom elements, events) |
| Service state | `ai-docs/SERVICE_STATE.md` | Living as-built registry — read first to avoid duplicating a surface |
| Getting started | `ai-docs/GETTING_STARTED.md` | Clone/build/test loop, workspace layout |
| Decision records | `ai-docs/adr/` | Standing ADRs — why the architecture is the way it is |
| Review catalog | `ai-docs/REVIEW_CHECKLIST.md` | 6-core + 4-coverage + 3-cross-cutting review checks |
| SDK reference | `@webex/contact-center` types (`node_modules/@webex/contact-center/dist/types/index.d.ts`) | installed SDK `.d.ts` surface — verify every SDK call |

_No `DATA_MODEL.md`: this repo owns no persistent datastore (all domain data comes from the SDK at runtime)._
