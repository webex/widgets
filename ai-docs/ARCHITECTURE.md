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
| `ai-assistant/` | AI Assistant widget (`@webex/cc-ai-assistant`): assistant chrome + Real-time Assist suggestion cards | `packages/contact-center/ai-assistant/ai-docs/ai-assistant-spec.md` |
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

### State Model
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
| From | To | Kind | Purpose |
|---|---|---|---|
| Widget (observer) | Custom hook (`helper.ts`) | call | Read derived state, obtain action callbacks |
| Custom hook | Store (`store.cc.*`, mutators) | call | Invoke SDK operations; mutate observables via `runInAction` |
| Store | `@webex/contact-center` SDK | call | All telephony/agent/task operations (sole SDK boundary) |
| `@webex/contact-center` SDK | Store | event | `CC_EVENTS` / `TASK_EVENTS` proxied into observables (`storeEventsWrapper.ts`) |
| Store observables | Widget (observer) | event | MobX reactivity re-renders observing widgets |
| Widget / component | `ui-logging` (`withMetrics`) | call | Emit mount/unmount/error telemetry |

## Observability Patterns
- **Logging:** No repo-owned server logging. Widgets emit diagnostic/error signals through `ui-logging`;
  the SDK owns session/network logging. Never log PII or credentials (see `SECURITY.md`). No correlation-id
  propagation is owned here — correlation is a concern of the host and the SDK.
- **Metrics:** Telemetry flows through `ui-logging` — the `withMetrics` HOC wraps widgets and `metricsLogger`
  emits mount/unmount/error and interaction events. Naming and event taxonomy live in
  `packages/contact-center/ui-logging/ai-docs/ui-logging-spec.md`.
- **Audit:** No audit trail is owned by this library; auditable agent/telephony actions are recorded by the
  Webex Contact Center backend via the SDK, not by the widgets.

## Package Map & Inter-Package Dependencies
- **Workspace tooling:** Yarn 4.5.1 with the **node-modules linker** (`nodeLinker: node-modules` in
  `.yarnrc.yml`), not PnP. Workspace globs (`package.json`): `packages/**/*`,
  `packages/contact-center/*`, `widgets-samples/**/**`.
- **Inter-package dependency graph** (from each package's `package.json`):
```
cc-widgets ── wraps ──> station-login, user-state, task, ai-assistant (+ cc-digital-channels)
station-login ─┐
user-state    ─┤
task          ─┼──> cc-components, cc-store
ai-assistant  ─┘
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

## Security Architecture
- **Trust boundary:** The single trust boundary is the store ↔ `@webex/contact-center` SDK edge. The SDK
  holds the authenticated Webex session and access tokens; widgets and presentational components never see,
  store, or transmit raw credentials.
- **Identity/token flow:** The host authenticates and hands an initialized SDK/session to `store.init(...)`;
  the store is the sole holder of the SDK reference. No token minting, refresh, or storage happens in this
  repo — those are delegated to the SDK and host.
- **Encryption / transport:** All telephony/agent/task traffic rides SDK-owned encrypted transport; the
  library owns no at-rest data and no persistent store, so there is nothing to encrypt at rest here.
- See `SECURITY.md` for the full trust-boundary and data-classification detail; this section is the
  architectural view only.

## E2E Test Architecture (Playwright)
The repo ships a Playwright end-to-end framework under `playwright/` that drives the widgets running in
`samples-cc-react-app` (served at `http://localhost:3000`, booted by `playwright.config.ts`'s
`webServer`). It layers as **Project (Set) → Suite (`playwright/suites/*.spec.ts`) → Test factory
(`playwright/tests/*.spec.ts`) → Utils + TestManager + Constants → Browser + Widgets + SDK-backed
behavior**. Sources of truth: set/suite mapping in `playwright/test-data.ts` (`USER_SETS`), runtime/project
config in `playwright.config.ts`, setup/teardown orchestration in `playwright/test-manager.ts`, shared ops
in `playwright/Utils/*.ts`, constants/timeouts in `playwright/constants.ts`, and OAuth/env expansion in
`playwright/global.setup.ts`.

**Set → Suite → Test mapping (resources):** each `USER_SETS` key is one Playwright project bound to a
single suite file (`TEST_SUITE`) and a dedicated agent/queue resource pool; a suite composes one or
more test-factory files. Grounded in `playwright/test-data.ts` (`USER_SETS`) and each
`playwright/suites/*.spec.ts`.
| Set | Queue / agents (resources) | Suite file (`TEST_SUITE`) | Test factory files composed |
|---|---|---|---|
| `SET_1` | `Queue e2e 1`, agents user15/user16 | `digital-incoming-task-tests.spec.ts` | `digital-incoming-task-and-task-controls.spec.ts` |
| `SET_2` | `Queue e2e 2`, agents user13/user14 | `task-list-multi-session-tests.spec.ts` | `incoming-task-and-controls-multi-session.spec.ts`, `tasklist-test.spec.ts` |
| `SET_3` | `Queue e2e 3`, agents user19/user20 | `station-login-user-state-tests.spec.ts` | `station-login-test.spec.ts`, `user-state-test.spec.ts`, `incoming-telephony-task-test.spec.ts` |
| `SET_4` | `Queue e2e 4`, agents user21/user22 | `basic-advanced-task-controls-tests.spec.ts` | `basic-task-controls-test.spec.ts`, `advance-task-control-combinations-test.spec.ts` |
| `SET_5` | `Queue e2e 5`, agents user23/user24 | `advanced-task-controls-tests.spec.ts` | `advanced-task-controls-test.spec.ts` |
| `SET_6` | `Queue e2e 6`, agents user17/user18 | `dial-number-tests.spec.ts` | `dial-number-task-control-test.spec.ts`, `outdial-call-test.spec.ts` |
| `SET_7` | `Queue e2e 7`, agents user25–user28 (4) | `multiparty-conference-set-7-tests.spec.ts` | `multiparty-conference-set-7-test.spec.ts` |
| `SET_8` | `Queue e2e 8`, agents user29–user32 (4) | `multiparty-conference-set-8-tests.spec.ts` | `multiparty-conference-set-8-test.spec.ts` |
| `SET_9` | `Queue e2e 9`, agents user33–user36 (4) | `multiparty-conference-set-9-tests.spec.ts` | `multiparty-conference-set-9-test.spec.ts` |

**Dynamic multi-context project generation:** `playwright.config.ts` generates one Playwright project per
key in `USER_SETS`. Each set project runs `fullyParallel: false`, depends on the `OAuth: Get Access Token`
setup project, sets **per-project `retries: 1`**, and binds `testMatch = **/suites/${TEST_SUITE}`. Worker
count is `Object.keys(USER_SETS).length` (one worker per set). Each set launches Chrome with the WebRTC/
telephony fake-media flags (`--use-fake-ui-for-media-stream`, `--use-fake-device-for-media-stream`,
`--use-file-for-fake-audio-capture=<repo>/playwright/wav/dummyAudio.wav`) and a unique
`--remote-debugging-port=${9221 + index}` per set. `global.setup.ts` expands `USER_SETS` into set-scoped env
keys and builds OAuth groups (group size 2, batch size 4) run in parallel before a single `.env` upsert.

**Multi-context setup:** `TestManager(projectName, maxRetries?)` is the setup/teardown orchestrator. Its
`setup(browser, config: SetupConfig)` runs a three-phase flow — (1) create the required browser
contexts/pages in parallel (`agent1Page`, `agent2Page`, `agent3Page`/`agent4Page` for conference sets,
`callerPage`, `agent1ExtensionPage`, `chatPage`, `multiSessionAgent1Page`, `dialNumberPage`), (2) run
independent login + widget init in parallel (`createSetupPromises` plus the optional multi-session flow),
and (3) register console-logging handlers. Convenience wrappers select context sets per scenario
(`basicSetup`, `setupForAdvancedTaskControls`, `setupForDialNumber`, `setupForIncomingTask*`,
`setupForOutdial*`, `setupForMultipartyConference`, and the custom `setupForStationLogin` which bootstraps
station-login sequentially).

**Multi-session flow (distinct):** multi-session is a separate setup path, not part of the default
parallel init. When `needsMultiSession` is set, `setup()` runs the standard three phases and then, only
in `LOGIN_MODE.EXTENSION`, invokes `setupMultiSessionFlow` to `pageSetup` `multiSessionAgent1Page` with
the multi-session flag against the same agent1 token/extension (used by `setupForIncomingTaskMultiSession`).
`setupMultiSessionPage()` is the targeted helper that logs in and initializes only the multi-session page
on demand, and `setupForStationLogin` bootstraps main then multi-session pages sequentially (multi-login
enabled) to avoid init contention. Per-operation recovery uses `retryOperation`, a bounded
exponential-backoff wrapper (`2^attempt` seconds) around fragile logins (extension, caller, dial-number).

**Shared control helpers (`playwright/Utils/controlUtils.ts`):** a scanning/click utility catalog for
duplicated call-control groups that appear across task, conference, and advanced consult flows (where a
page renders both a simple and a CAD control group). It exports five distinct operations, each keyed by a
`testId`: `findFirstVisibleControlIndex` (index of the first visible matching control, or `-1`),
`findFirstVisibleEnabledControlIndex` (index of the first visible **and** enabled control, or `-1`),
`hasAnyVisibleControl` (boolean — any visible control exists), `hasAnyVisibleEnabledControl` (boolean —
any visible-and-enabled control exists), and `clickFirstVisibleEnabledControl` (bounded-retry click of the
first visible-and-enabled control within `AWAIT_TIMEOUT`, throwing if none becomes clickable). These back
`handleStrayTasks`' dual-control-group handling and similar disambiguation across the other `Utils/*.ts`
helper modules.

**Retry & cleanup:** In addition to per-project `retries: 1`, `TestManager` carries a `maxRetries`
(`DEFAULT_MAX_RETRIES` = 3) for its own bounded recovery (e.g. `pageSetup` does one guarded logout/re-login if
`state-select` is missing). Teardown is two-tier and bounded by best-effort timeout guards so a single stuck
page cannot hang a hook: `softCleanup()` clears stray tasks only (`handleStrayTasks`) across `agent1Page`,
`multiSessionAgent1Page`, `agent2Page`, `agent3Page`, `agent4Page`, and `callerPage` (for `afterAll`
between-file cleanup); `cleanup()` runs `softCleanup()` first, then performs guarded station logout for each
active page (including `multiSessionAgent1Page`, gated on the logout button being visible), waits for
post-logout settle (`login-button` visible + `STATION_LOGOUT_UNREGISTER_SETTLE_TIMEOUT` unregister settle),
and finally closes every created page and context in parallel with errors swallowed (end-of-suite full
cleanup). Each cleanup operation is wrapped in `runBestEffortWithTimeout` (default `OPERATION_TIMEOUT`, logout
allows `OPERATION_TIMEOUT + UI_SETTLE_TIMEOUT * 10`). Conference suites use guarded per-page cleanup wrappers
and run teardown sequentially across agents to avoid call-leg ownership races. Fragile logins
(extension, caller, dial-number) are wrapped by `retryOperation`, a bounded exponential-backoff helper
(`2^attempt` seconds, up to `maxRetries`).

**Timeout hierarchy (execution constraints):** Timeouts are centralized in `playwright/constants.ts`; tests
should choose the smallest fitting value and justify any increase rather than inflating waits. Grounded in
`playwright/constants.ts`.
| Constant | Value | Typical use |
|---|---|---|
| `DROPDOWN_SETTLE_TIMEOUT` | 200 ms | Dropdown animation settle |
| `CONFERENCE_SWITCH_TOGGLE_TIMEOUT` | 1000 ms | Wait after switching conference call legs |
| `CONFERENCE_END_TASK_SETTLE_TIMEOUT` | 1500 ms | Wait after ending task in conference |
| `UI_SETTLE_TIMEOUT` / `CONFERENCE_ACTION_SETTLE_TIMEOUT` | 2000 ms | Generic UI settle / conference merge/exit settle |
| `CONFERENCE_CUSTOMER_DISCONNECT_TIMEOUT` | 3000 ms | Wait for customer disconnect propagation |
| `STATION_LOGOUT_UNREGISTER_SETTLE_TIMEOUT` / `CONFERENCE_RECONNECT_SETTLE_TIMEOUT` | 4000 ms | Post-logout backend unregister settle / conference reconnect settle |
| `DEFAULT_TIMEOUT` | 5000 ms | Default visibility/check timeout |
| `AWAIT_TIMEOUT` | 10000 ms | Standard element interactions |
| `CONSULT_NO_ANSWER_TIMEOUT` | 12000 ms | Consult no-answer (RONA) scenario |
| `WRAPUP_TIMEOUT` | 15000 ms | Wrapup UI timing |
| `FORM_FIELD_TIMEOUT` | 20000 ms | Popover/form field loading |
| `OPERATION_TIMEOUT` | 30000 ms | Longer user operations (e.g. logout checks) |
| `EXTENSION_REGISTRATION_TIMEOUT` / `NETWORK_OPERATION_TIMEOUT` | 40000 ms | Extension registration / network-dependent operations |
| `WIDGET_INIT_TIMEOUT` | 50000 ms | Widget initialization |
| `CHAT_LAUNCHER_TIMEOUT` / `ACCEPT_TASK_TIMEOUT` | 60000 ms | Chat launcher iframe loading / incoming-task acceptance |

The Playwright runner adds two top-level bounds: per-test `timeout: 220000` and the `webServer` on
`http://localhost:3000` (`yarn workspace samples-cc-react-app serve`), grounded in `playwright.config.ts`.

**Console-observation behavior:** Console-log observation is a core assertion mechanism, not incidental
logging. On setup, `TestManager` attaches a raw `page.on('console', ...)` collector on `agent1Page` (into
`consoleMessages`) and, per `enableConsoleLogging`/`enableAdvancedLogging`, registers scoped filtering
handlers that retain only relevant SDK/callback lines. Grounded in
`playwright/Utils/taskControlUtils.ts`, `playwright/Utils/advancedTaskControlUtils.ts`,
`playwright/Utils/userStateUtils.ts`, and `playwright/constants.ts` (`CONSOLE_PATTERNS`). Captured categories:
- **Basic controls** (`setupConsoleLogging`): `WXCC_SDK_TASK_HOLD_SUCCESS` / `WXCC_SDK_TASK_RESUME_SUCCESS`,
  `WXCC_SDK_TASK_PAUSE_RECORDING_SUCCESS` / `WXCC_SDK_TASK_RESUME_RECORDING_SUCCESS`, and the
  `onHoldResume invoked` / `onRecordingToggle invoked` / `onEnd invoked` callback lines — asserted by
  `verifyHoldLogs`, `verifyRecordingLogs`, `verifyEndLogs`.
- **Advanced controls** (`setupAdvancedConsoleLogging`): `WXCC_SDK_TASK_TRANSFER_SUCCESS`,
  `WXCC_SDK_TASK_CONSULT_START_SUCCESS`, `WXCC_SDK_TASK_CONSULT_END_SUCCESS`, `AgentConsultTransferred`, and
  `onTransfer invoked` / `onConsult invoked` / `onEnd invoked` — asserted by `verifyTransferSuccessLogs`,
  `verifyConsultStartSuccessLogs`, `verifyConsultEndSuccessLogs`, `verifyConsultTransferredLogs`.
- **State changes** (`CONSOLE_PATTERNS` + `userStateUtils.ts`): `WXCC_SDK_AGENT_STATE_CHANGE_SUCCESS` and
  `onStateChange invoked with state name: <stateName>` — asserted by `validateConsoleStateChange` /
  `checkCallbackSequence`.

Ordering-sensitive assertions use `checkCallbackSequence()`, which requires that (1) the SDK success log is
present, (2) the `onStateChange` callback log is present, (3) the callback occurs *after* the SDK success,
and (4) the logged state value matches the expected state. Captured buffers are cleared before each
verification so assertions never read stale lines.

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
