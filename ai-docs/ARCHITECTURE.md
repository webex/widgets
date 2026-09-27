# ARCHITECTURE — webex-widgets (Contact Center)

> Start here → root [`AGENTS.md`](../AGENTS.md) (agent entry) · router [`SPEC_INDEX.md`](SPEC_INDEX.md). This is the system architecture; per-module detail lives in each manifest-routed module spec, source-local as `<module-path>/ai-docs/<module-name>-spec.md`.
> Context-efficiency: link to canonical docs — don't duplicate them; this loads on demand, not upfront.

## Design Overview
webex-widgets is a library monorepo that packages Webex Contact Center agent-desktop capabilities as
embeddable UI. The guiding design choice is a **strict one-directional layering** that isolates SDK
coupling: every widget renders through a presentational component, derives its data and callbacks from a
single MobX store, and the store is the only layer that touches the `@webex/contact-center` SDK. This keeps
presentational components pure and framework-agnostic, lets the r2wc layer expose the same widgets as Web
Components for non-React hosts, and means SDK changes ripple through exactly one boundary (the store).

State is centralized in a MobX **singleton** (`Store.getInstance()`) so independently-mounted widgets
(login, state, call control) share one coherent view of the agent session without prop drilling or
cross-widget coupling. Widgets observe the store via the `observer()` HOC; the store proxies SDK events
into observables and exposes convenience methods for SDK calls and list fetches.

The repo owns no persistent data — all domain data (teams, queues, tasks, agent state) is fetched from the
SDK at runtime — so there is no datastore, schema, or migration discipline to document.

## Component Inventory & Responsibilities
| Component | Responsibility (one line) | Docs |
|---|---|---|
| `store/` | MobX singleton: global CC state, SDK event wiring, SDK access surface | `packages/contact-center/store/ai-docs/store-spec.md` |
| `cc-components/` | Pure presentational React primitives (props-only) | `packages/contact-center/cc-components/ai-docs/cc-components-spec.md` |
| `cc-widgets/` | r2wc Web Component wrappers; aggregates and exports all widgets | `packages/contact-center/cc-widgets/ai-docs/cc-widgets-spec.md` |
| `station-login/` | Agent login widget (team + device selection) | `packages/contact-center/station-login/ai-docs/station-login-spec.md` |
| `user-state/` | Agent state widget (state, idle codes, timer) | `packages/contact-center/user-state/ai-docs/user-state-spec.md` |
| `task/` | Task widgets: CallControl, CallControlCAD, IncomingTask, OutdialCall, TaskList | `packages/contact-center/task/ai-docs/task-spec.md` |
| `ui-logging/` | Metrics/telemetry (`withMetrics` HOC, `metricsLogger`) | `packages/contact-center/ui-logging/ai-docs/ui-logging-spec.md` |
| `test-fixtures/` | Shared test mocks/helpers | `packages/contact-center/test-fixtures/ai-docs/test-fixtures-spec.md` |
| `@webex/widgets/` | Legacy meetings widgets (separate family) | `packages/@webex/widgets/ai-docs/widgets-spec.md` |

## Component Interaction
```mermaid
graph TD
  Host[Host app / Web Component] --> Widget
  subgraph WidgetPackages[Widget packages: station-login, user-state, task]
    Widget[Widget = observer HOC] --> Hook[Custom hook helper.ts]
  end
  Hook --> Comp[Presentational component cc-components]
  Hook --> Store[(MobX store singleton)]
  Comp -->|metrics| UILog[ui-logging]
  Store --> SDK[@webex/contact-center SDK]
  CCW[cc-widgets r2wc] -.wraps.-> Widget
```
A host mounts a widget (directly in React, or as a custom element via `cc-widgets`). The widget is an
`observer` that calls its custom hook (`helper.ts`); the hook reads store observables and invokes
`store.cc.*` methods. The presentational component (`cc-components`) receives everything via props and emits
metrics through `ui-logging`. The store proxies SDK events back into observables, which re-render observers.

## Execution & Flow
**Init & Call Flow (library):** Host calls `store.init(...)` / `Store.getInstance()` → store registers with
the `@webex/contact-center` SDK and subscribes to events → host mounts a widget → widget `observer`
subscribes to store observables → user action (e.g. set state, accept task) → hook calls `store.cc.<method>()`
→ SDK responds and/or emits an event → store updates observables in `runInAction()` → observing widgets
re-render. Grounded in `packages/contact-center/store/src/store.ts` and `storeEventsWrapper.ts`.

**AI Summary visual evidence:** `playwright/visual/ai-summary-harness.json` binds the
accepted UX source/state IDs to the existing Playwright project, sample-app
production-component mount, observable assertions, and 2x capture geometry.
`playwright/Utils/aiSummaryUtils.ts` runs browser assertions and writes raw
PNG/DOM/comparison records under `.matrix/results/prog-mini-js/ux-visual/<phase>/`.
These records do not assert visual fidelity; the prog-mini-js visual task must
inspect the target/render pairs and publish a separate attempt-bound handoff.
The deterministic host owns browser startup and cleanup. Do not turn a
machine-generated comparison score into a claim of model image inspection.

**UX seal revalidation:** `tooling/src/ai-summary-sdk-lock.js seal-ux` independently
reopens and hashes the admitted target files on every call. If an existing seal
matches the complete validated evidence and authority metadata, it preserves the
original lock-file bytes and `ux.sealedAt`; repeated DAG acceptance must not make
visual receipts stale merely by refreshing a timestamp. Missing, symlinked, or
changed inputs and mismatched sealed metadata fail closed without replacing the
receipt. A genuinely changed authority requires an explicit admission repair,
not an automatic reseal during acceptance. Regression coverage lives in
`tooling/tests/ai-summary-sdk-lock.test.js`.

**Local UX provenance:** `tooling/src/verify-ai-summary-release.js` checks the
harness descriptor, active visual plan/receipts, and archived JSON evidence.
The exact `figma_mcp_policy: "forbidden"` and `mcp_policy: "forbidden"` declarations
are prohibitions, not evidence of MCP use. Explicit use/transport/tool records
and remote Figma references remain rejected; ambiguous MCP policies fail closed.
Local scene-graph node/file IDs and evidence filenames alone do not establish
remote acquisition. Provenance failures identify the repository-relative file
and JSON field, without printing evidence values or remote credentials.
Regression coverage lives in `tooling/tests/verify-ai-summary-release.test.js`.

**AI summary SDK validation:** initiating/post-call requests resolve `Promise<AISummary>`;
receiver content uses `task:midCallSummaryReceived` and capability updates use
`task:featureEnablement` on the matching Task. The packed runtime and its extracted declarations
are checked together, including a TypeScript compiler probe explicitly mapped to the candidate.
Legacy seals cannot skip runtime validation or omit required source/build provenance. The combined
lock verification also packs and inspects all six AI-summary workspace boundaries in an isolated
child environment. See [`ai-summary.md`](../ai-summary.md) for the exact API and current sealed-package defect.

**Release evidence binding:** release manifests are nonempty, hash every named file, and match live
Git changes since an ancestor `baseCommit`. Verification runs on the requirement's promotion branch.
Each gate names a repository-contained receipt with an explicit passing status, matching file hash,
and matching HEAD. The D8b gate also binds the packaging receipt hash; actual tarball file lists must
match that receipt. Executable provenance scanning inspects calls rather than matching explanatory
comments, regular expressions, or test source strings. Privacy scanning permits raw-error variables
used for normalization while rejecting their use as arguments to known logging sinks. These checks
do not turn unexecuted browser/visual or failed SDK checks into passing release evidence.

## Dependencies
| Dependency | Type (internal / external / peer) | How used | Failure / version handling |
|---|---|---|---|
| `@webex/contact-center` (SDK) | external | All telephony/agent/task operations; accessed only via the store | Errors surfaced through store callbacks; version per package.json |
| `@webex/cc-store` | internal | Shared singleton state; imported by all widget + component packages | Workspace-pinned |
| `@webex/cc-components` | internal | Presentational components used by widget packages | Workspace-pinned |
| `@webex/cc-ui-logging` | internal | Metrics/telemetry HOC + logger | Workspace-pinned |
| `react` / `react-dom` | peer | UI runtime | Peer `^18` |
| `mobx` / `mobx-react-lite` | external | Reactive state + `observer` | Per package.json |
| `@momentum-ui/*` / Momentum design | external | UI primitives, CSS | Per package.json |
| `@r2wc/react-to-web-component` | external | React→Web Component wrapping (cc-widgets only) | Per package.json |

## State Model
The store holds the client-side session model: agent profile/state, login options (teams, device type),
task map and per-task lifecycle, and fetched lists (queues, entry points, buddy agents, address book).
Transitions are driven by user-invoked `store.cc.*` methods and by SDK events the store proxies; all
mutations occur in `runInAction()`. Detailed slices live in `store-spec.md`.

## Cross-Cutting Concerns
- **Security:** No secrets in the repo; the SDK holds the authenticated Webex session and tokens. Widgets
  never handle raw credentials. Never log PII or credentials. See `SECURITY.md`.
- **Observability:** Metrics/telemetry go through `ui-logging` (`withMetrics`, `metricsLogger`); widgets are
  wrapped with `withMetrics` and an `ErrorBoundary`.

## Non-Functional Posture
**Footprint & Compatibility:** Published as consumable packages + Web Components. React `^18` peer; widgets
must mount in both React hosts and framework-agnostic hosts (via r2wc). Prefer memoization and MobX batching
to avoid unnecessary re-renders. Backward compatibility of exported surfaces and custom-element names is a
release concern (see `CONTRACTS.md`).

## Dependency / Interaction Topology
The who-calls-whom call graph and the SDK event topology. Calls are synchronous (React render / hook →
store method); events are asynchronous (SDK → store observables → observing widgets). Grounded in
`packages/contact-center/store/src/storeEventsWrapper.ts` (event wiring) and each package's `helper.ts`.
```
Host ──call──> Widget(observer) ──call──> Hook(helper.ts) ──call──> Store ──call──> @webex/contact-center SDK
SDK  ──event(CC_EVENTS/TASK_EVENTS)──> Store(runInAction) ──observable change──> Widget(observer) re-render
Hook ──call──> cc-components (props) ──call──> ui-logging(withMetrics)
```
For Consult/Transfer, `Task.uiControls.consultTransferDestinations` is the visibility and ordering source of truth. Task widgets pass the matching action array to `cc-components`; the store does not mirror Desktop Profile collaboration flags, and components do not derive policy from raw task/profile data.

| From | To | Kind | Purpose |
|---|---|---|---|
| Widget (observer) | Custom hook (`helper.ts`) | call | Read derived state, obtain action callbacks |
| Custom hook | Store (`store.cc.*`, mutators) | call | Invoke SDK operations; mutate observables via `runInAction` |
| Store | `@webex/contact-center` SDK | call | All telephony/agent/task operations (sole SDK boundary) |
| `@webex/contact-center` SDK | Store | event | `CC_EVENTS` / `TASK_EVENTS` proxied into observables (`storeEventsWrapper.ts`) |
| Store observables | Widget (observer) | event | MobX reactivity re-renders observing widgets |
| Widget / component | `ui-logging` (`withMetrics`) | call | Emit mount/unmount/error telemetry |

## Package Map & Inter-Package Dependencies
- **Workspace tooling:** Yarn 4.5.1 (PnP). Workspace globs: `packages/**/*`, `packages/contact-center/*`,
  `widgets-samples/**/**`.
- **Inter-package dependency graph** (from each package's `package.json`):
```
cc-widgets ── wraps ──> station-login, user-state, task (+ cc-digital-channels)
station-login ─┐
user-state    ─┼──> cc-components, cc-store
task          ─┘
cc-components ──> cc-store, cc-ui-logging
ui-logging   ──> cc-store
store        ──> (no internal CC deps) ──> @webex/contact-center SDK
```
- **Visibility:** `cc-widgets` is the public aggregator (consumers import widgets/store from it);
  `store`, `cc-components`, `ui-logging` are shared internals.
- **Version-sync rule:** workspace-internal deps are pinned across the monorepo; releases via
  semantic-release (`release:widgets`).
- **Different-kind package:** `packages/@webex/widgets` is the legacy **meetings** widget family — it does
  not participate in the CC dependency flow or share the CC store.

## Release & Versioning
- Published as `@webex/*` packages; release driven by `semantic-release` (`yarn release:widgets`).
- Public surfaces (exports, custom-element tag names, events) follow semver; breaking changes need a major
  bump and a consumer transition note. See `CONTRACTS.md` for the compatibility policy.

## Host Integration & Theming
- Widgets mount in two ways: React components (import from the widget package or `cc-widgets`) and custom
  elements (r2wc, registered by `cc-widgets`). Hosts must load Momentum UI CSS
  (`@momentum-ui/core/css/momentum-ui.min.css`, imported by `cc-widgets`). Peer React `^18`.

---
→ Per-module orientation and detailed design live in each manifest-routed module spec, source-local as
`<module-path>/ai-docs/<module-name>-spec.md`. Routing: `SPEC_INDEX.md`.

## Architecture Reference Links
| Reference | Location | When to read |
|---|---|---|
| Architecture decisions | `adr/` | To understand why major design choices were made and what alternatives were rejected |
| Repo patterns | `patterns/` | To follow established implementation conventions (TypeScript, React, MobX, testing) |
| Enforceable rules | `RULES.md` + `rules/` | To understand constraints every architecture-affecting change must obey |

## WS6 References
N/A — this repository has no WS6 / platform / enterprise-architecture specs. It is a self-contained UI
library over the `@webex/contact-center` SDK; the SDK's own contract (`node_modules/@webex/contact-center/dist/types/index.d.ts`)
is the only upstream architecture reference, and it is already cited in `CONTRACTS.md` and the store spec.
Add rows here if a WS6 spec is later published for this component.

| WS6 artifact | Relevance to this repo | Link |
|---|---|---|
| _none_ | — | — |
