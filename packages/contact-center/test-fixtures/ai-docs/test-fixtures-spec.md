# test-fixtures — SPEC

> Start here → root [`AGENTS.md`](../../../../AGENTS.md) (agent entry) · router [`SPEC_INDEX.md`](../../../../ai-docs/SPEC_INDEX.md) · system [`ARCHITECTURE.md`](../../../../ai-docs/ARCHITECTURE.md). This is the module's canonical spec: orientation, requirements, design, flows, and tests.
> Context-efficiency: link to canonical docs — don't duplicate them. Load specs on demand per `SPEC_INDEX.md`.

## Metadata

| Field | Value |
|---|---|
| Module id | `test-fixtures` |
| Source path(s) | `packages/contact-center/test-fixtures/src/` |
| Doc kind | Module spec |
| Coverage score | Pending coverage assessment |
| Generated from | `module-spec` @ SDLC template library `0.1.0-draft` |
| generated_by / approved_by / updated_at | migration agent / pending / 2026-06-29 |
| Validation status | not-run |

Coverage score: `Pending coverage assessment` before the first report; after assessment, replace with `<0-100%>` plus the report path/evidence. Keep manifest coverage state outside the rendered module doc metadata.

## Evidence Rules
Every generated requirement below must cite concrete source evidence using `file path`. Separate source evidence, test evidence, examples, assumptions, and gaps so validators and future agents can distinguish truth from context. Test evidence is preferred for WHY. Commit evidence is allowed only when the repository policy says history is reliable, and must include the commit hash. If evidence is missing or conflicting, ask a focused discovery question before finalizing the requirement; record unresolved answers as approved unknowns only when the human explicitly defers or does not know.

## Source Material Register

| Source doc | Scope | Decision | Detail location or disposition |
|---|---|---|---|
| `ai-docs/_archive/pre-sdlc-migration/packages/contact-center/test-fixtures/ai-docs/AGENTS.md` | overview / API / examples | reconciled | Overview, Public Surface, Use Cases. Export list reconciled against `src/fixtures.ts`: archived doc omitted `makeMockTask`, `mockCampaignCpd`, `mockCampaignTask`, `makeMockCampaignTask`, `mockCallAssociatedData`; archived `mockIncomingTaskData`/`mockTaskData`/`mockOutdialCallProps`/`mockAniEntries`/`mockCCWithAni` confirmed present. |
| `ai-docs/_archive/pre-sdlc-migration/packages/contact-center/test-fixtures/ai-docs/ARCHITECTURE.md` | architecture / tests | reconciled | Design Overview, Folder Structure, Pitfalls. Conflict: archived `mockCC` listed task methods (`accept`, `hold`, …) and proxies (`AgentProxy`, `DiagnosticsProxy`, …) that the real `mockCC` (`src/fixtures.ts`) does not define — those live on `mockTask` and the `LoggerProxy`/`taskManager` only. Archived `mockTask.data` shape (flat `origin`/`destination`/`status`) does not match real nested `interaction` shape — corrected from source. |

## Overview
`test-fixtures` (`@webex/test-fixtures`) is a test-only utility package. It exports pre-built mock objects and small factory functions that other contact-center packages import inside their Jest unit tests, so widgets can be rendered and exercised without a live Contact Center SDK connection or backend. It owns no runtime behavior, holds no state, and ships nothing into the browser bundle of any consumer; consuming packages list it as a dev dependency only.

The package is structured as a flat set of fixture modules under `src/`, each one re-exported by the barrel `src/index.ts`. `src/fixtures.ts` holds the core SDK-shaped mocks (`mockCC`, `mockProfile`, `mockTask`, queues, agents, address book, campaign-preview tasks). `src/aiSummaryFixtures.ts` holds the SDK-independent D1 AI summary fixture inventory. `src/incomingTaskFixtures.ts` and `src/taskListFixtures.ts` hold plain UI-data records keyed by scenario for the task widgets. `src/components/task/outdialCallFixtures.ts` composes `mockCC` into outdial-specific mocks.

The load-bearing contract of this module is structural: each exported mock is typed against the real SDK / store / cc-components type (e.g. `mockCC: IContactCenter`, `mockProfile: Profile`, `mockTask: ITask`) so that when a consuming test passes a fixture into production code, the shape matches what production code expects at compile time. A maintainer changing a fixture should start at `src/fixtures.ts` and keep the declared types intact.

## Purpose / Responsibility
Provides shared, type-checked mock SDK instances, mock profile/task/queue/agent data, and component-prop fixtures consumed by other packages' Jest tests; it does NOT provide runtime behavior, test runners, or shared test-render helpers.

## Stack
TypeScript 5.6.3. No framework runtime — fixtures are plain objects whose methods are Jest mock functions (`jest.fn()`), so the package assumes a Jest global is present in the consumer's test environment. Built with `tsc` (type output) and Webpack 5 + Babel (`build:src`). No datastore, no messaging. `deploy:npm` is intentionally a no-op (`package.json`).

## Folder / Package Structure
```
test-fixtures/src/
├── index.ts                                # Barrel: re-exports fixture modules and AI summary group inventory
├── aiSummaryFixtures.ts                    # Raw AI summary D1 fixtures and exact group-name tuple
├── fixtures.ts                             # Core SDK-shaped mocks: mockCC, mockProfile, mockTask, queues, agents, address book, campaign tasks
├── incomingTaskFixtures.ts                 # mockIncomingTaskData — incoming-task UI data by channel scenario
├── taskListFixtures.ts                     # mockTaskData — task-list UI data by scenario (active/incoming/action/selection)
├── taskUIControlsFixtures.ts               # TaskUIControls factories with per-leg and destination overrides
└── components/task/
    └── outdialCallFixtures.ts              # Outdial mocks composed from mockCC: mockOutdialCallProps, mockAniEntries, mockCCWithAni
```

## Key Files (source of truth)

| File | Holds |
|---|---|
| `packages/contact-center/test-fixtures/src/index.ts` | The public export barrel — the authoritative list of what consumers may import, including `aiSummaryFixtures`, `aiSummaryFixtureGroupNames`, and `AISummaryFixtureGroupName`. |
| `packages/contact-center/test-fixtures/src/aiSummaryFixtures.ts` | SDK-independent raw AI summary contract fixtures with the exact D1 group inventory: `featureEnablement`, `initiatingMidCall`, `receivingMidCall`, `postCall`, `malformed`, `errors`, `ordering`, `transfers`, `conferences`, `feedback`, `counters`, `wrapUp`, and `postWrapUpSend`. |
| `packages/contact-center/test-fixtures/src/fixtures.ts` | Core fixture values and their type annotations (`IContactCenter`, `Profile`, `ITask`, etc.). Never re-infer these shapes elsewhere. |
| `packages/contact-center/test-fixtures/src/incomingTaskFixtures.ts` | `mockIncomingTaskData` and its `MEDIA_CHANNEL` source import. |
| `packages/contact-center/test-fixtures/src/taskListFixtures.ts` | `mockTaskData` and its `MEDIA_CHANNEL` source import. |
| `packages/contact-center/test-fixtures/src/taskUIControlsFixtures.ts` | Typed `TaskUIControls` factories, including consult/transfer destination-control overrides. |
| `packages/contact-center/test-fixtures/src/components/task/outdialCallFixtures.ts` | Outdial fixtures derived from `mockCC`. |
| `packages/contact-center/test-fixtures/package.json` | Dependency list and the `deploy:npm` no-op. |

## Public Surface
Internal Surface — consumed only by other packages' Jest tests in this monorepo. There is no network/event/CLI contract; the contract is the set of TypeScript exports below, all re-exported through `src/index.ts`. Each is summarized here — read the source file for the exact object shape.

| Contract ID | Type | Surface | Purpose | Compatibility / deprecation | Schema / detail link | Entry point |
|---|---|---|---|---|---|---|
| `test-fixtures.mockCC` | SDK export | `mockCC: IContactCenter` | Mock SDK instance; methods are `jest.fn()` so tests can spy/override | Shape must track `IContactCenter`; removing a mocked method may break consumer tests | `src/fixtures.ts` | internal (`src/index.ts`) |
| `test-fixtures.mockProfile` | SDK export | `mockProfile: Profile` | Full agent profile (teams, idle/wrapup codes, dial plan, flags) | Track `Profile`; additive fields safe | `src/fixtures.ts` | internal (`src/index.ts`) |
| `test-fixtures.mockTask` | SDK export | `mockTask: ITask` | Connected telephony task with nested `interaction`; methods are `jest.fn()` | Track `ITask` | `src/fixtures.ts` | internal (`src/index.ts`) |
| `test-fixtures.makeMockTask` | SDK export | `makeMockTask(overrides?): ITask` | Factory producing a fresh task with deep `data`/`interaction` overrides and fresh `jest.fn()`s | Override shape `MakeMockTaskOverrides` | `src/fixtures.ts` | internal (`src/index.ts`) |
| `test-fixtures.mockCampaignTask` | SDK export | `mockCampaignTask: ITask` | Campaign-preview-shaped task (CPD + outbound details) | Track `ITask` + campaign CPD keys | `src/fixtures.ts` | internal (`src/index.ts`) |
| `test-fixtures.makeMockCampaignTask` | SDK export | `makeMockCampaignTask(overrides?): ITask` | Factory for campaign-preview task with `cpd`/`interaction`/`data` overrides | Override shape `IMakeMockCampaignTaskOverrides` | `src/fixtures.ts` | internal (`src/index.ts`) |
| `test-fixtures.mockCampaignCpd` | data export | `mockCampaignCpd: Record<string,string>` | Default campaign-preview call-processing-detail values | Additive keys safe | `src/fixtures.ts` | internal (`src/index.ts`) |
| `test-fixtures.mockQueueDetails` | data export | `mockQueueDetails` | Two fully-populated queue config objects for transfer/queue tests | Additive fields safe | `src/fixtures.ts` | internal (`src/index.ts`) |
| `test-fixtures.mockAgents` | data export | `mockAgents` | Buddy-agent list for transfer/consult tests | Additive fields safe | `src/fixtures.ts` | internal (`src/index.ts`) |
| `test-fixtures.mockEntryPointsResponse` | data export | `mockEntryPointsResponse: EntryPointListResponse` | Outdial entry-points response | Track `EntryPointListResponse` | `src/fixtures.ts` | internal (`src/index.ts`) |
| `test-fixtures.mockAddressBookEntriesResponse` | data export | `mockAddressBookEntriesResponse: AddressBookEntriesResponse` | Address-book entries response | Track `AddressBookEntriesResponse` | `src/fixtures.ts` | internal (`src/index.ts`) |
| `test-fixtures.makeMockAddressBook` | SDK export | `makeMockAddressBook(getEntriesMock?): AddressBook` | Factory for an `AddressBook` mock; default `getEntries` resolves the entries response | Track `AddressBook` | `src/fixtures.ts` | internal (`src/index.ts`) |
| `test-fixtures.mockCallAssociatedData` | data export | `mockCallAssociatedData` | Call-associated-data variants (global, viewable/hidden, secure) | Additive keys safe | `src/fixtures.ts` | internal (`src/index.ts`) |
| `test-fixtures.mockIncomingTaskData` | data export | `mockIncomingTaskData` | Incoming-task UI data keyed `webRTC`/`extension`/`social`/`chat` | Additive scenario keys safe | `src/incomingTaskFixtures.ts` | internal (`src/index.ts`) |
| `test-fixtures.mockTaskData` | data export | `mockTaskData` | Task-list UI data keyed `active`/`incoming`/`action`/`selection` | Additive scenario keys safe | `src/taskListFixtures.ts` | internal (`src/index.ts`) |
| `test-fixtures.createMockTaskUIControls` | factory export | `createMockTaskUIControls(overrides?): TaskUIControls` | Produces SDK-shaped task controls with independent main/consult/active-leg and ordered consult/transfer destination overrides | Track `TaskUIControls`; additive override fields are safe | `src/taskUIControlsFixtures.ts` | internal (`src/index.ts`) |
| `test-fixtures.mockOutdialCallProps` | data export | `mockOutdialCallProps` | `mockCC` spread + `startOutdial`/`getOutdialANIEntries` jest mocks | Spread of `mockCC` | `src/components/task/outdialCallFixtures.ts` | internal (`src/index.ts`) |
| `test-fixtures.mockAniEntries` | data export | `mockAniEntries` | Outdial ANI entry list | Additive fields safe | `src/components/task/outdialCallFixtures.ts` | internal (`src/index.ts`) |
| `test-fixtures.mockCCWithAni` | data export | `mockCCWithAni` | `mockCC` + `agentConfig.outdialANIId` + ANI-resolving `getOutdialAniEntries` | Spread of `mockCC` | `src/components/task/outdialCallFixtures.ts` | internal (`src/index.ts`) |
| `test-fixtures.aiSummaryFixtureGroupNames` | data export | `aiSummaryFixtureGroupNames` | Readonly tuple that pins the thirteen D1 AI summary fixture groups. | Additive or renamed group names are contract changes; update D1 consumers and R-009 together. | `src/aiSummaryFixtures.ts` | internal (`src/index.ts`) |
| `test-fixtures.aiSummaryFixtures` | data export | `aiSummaryFixtures` | SDK-independent raw objects covering AI summary feature enablement, initiating mid-call, receiving mid-call, post-call, malformed validation, the eight sanitized error categories, ordering, transfers, conferences, feedback, counters, wrap-up, and post-wrap-up-send cases. Conforming fixtures use the packed SDK vocabulary: capability fields `interactionId`/`midCallEnabled`/`postCallEnabled`/`actionTimestamp`; `AISummary.sections` object keys `initialContactReason`/`additionalContactReasons`/`additionalContext`/`keyActionsTaken`/`nextSteps`/`reasonForTransferOrConsult`; actions `CONSULT`/`TRANSFER`; feedback `none`/`thumbs_up`/`thumbs_down`; states `DEFAULT`/`EXCLUDED`/`IGNORED`/`MID_CALL_CANCELLED`/`NOT_RECEIVED`; local counters `viewed`/`edited`/`copied` plus response projections `numberOfTimesViewed`/`numberOfTimesEdited`/`numberOfTimesCopied`/`summaryReceived`; SDK errors using `data.errorCode`, message, or safe transport status fields; and post-wrap-up sends as fulfilled/rejected sequences with exactly one attempted `AISummaryResponse` send. Malformed, invented, or deliberately invalid values live only under the `malformed` validation group. | The thirteen group names are the immutable D1 inventory. No compatibility aliases or nested taxonomy are exported; consumers must use the named two-level groups directly. Do not import the SDK or cast to SDK types here; D0 proves assignability against the packed package. | `src/aiSummaryFixtures.ts` | internal (`src/index.ts`) |

Compatibility notes:
- Adding a new fixture export or an additive field on existing data fixtures is non-breaking. Removing or renaming an export, or removing a method on `mockCC`/`mockTask`, can break consumer test files that reference it — grep consumers before changing.
- `mockAddressBook` and `mockQueuesResponse` are defined in `src/fixtures.ts` but NOT exported; they are internal wiring for `mockCC` only.

## Requires (dependencies)
- `@webex/cc-store` (`workspace:*`) — imports the `IContactCenter` type used to type `mockCC` (`src/fixtures.ts`).
- `@webex/contact-center` (SDK) — imports types `ITask`, `Interaction`, `Profile`, `TaskData`, `TaskResponse`, `AddressBook`, `EntryPointListResponse`, `AddressBookEntriesResponse`, `ContactServiceQueuesResponse` (`src/fixtures.ts`). Type-only; resolved transitively via `@webex/cc-store` (not a direct dependency in `package.json`).
- `@webex/cc-components` — `incomingTaskFixtures.ts` and `taskListFixtures.ts` import the `MEDIA_CHANNEL` enum via relative path `../../cc-components/src/components/task/task.types` (a cross-package source-relative import, not a `package.json` dependency).
- Jest (peer/ambient) — fixtures call `jest.fn()`; a Jest global must exist in the consumer's test runtime. Not declared in `package.json`.
- `typescript` 5.6.3 (`package.json`).

## Requirements

| ID | WHAT | WHY | Source Evidence | Test / Example Evidence | Assumptions / Gaps | Confidence |
|---|---|---|---|---|---|---|
| `test-fixtures-R-001` | Each exported mock is annotated with its real SDK/store type (`mockCC: IContactCenter`, `mockProfile: Profile`, `mockTask: ITask`, `mockEntryPointsResponse: EntryPointListResponse`, `mockAddressBookEntriesResponse: AddressBookEntriesResponse`, `mockQueuesResponse: ContactServiceQueuesResponse`) so consumer code type-checks against production shapes. | Fixtures exist to let tests substitute real SDK shapes; a drifted shape would let tests pass while production code breaks. | `src/fixtures.ts` (type annotations on each declaration) | No package-local tests; consumed by sibling-package tests. | Gap: no in-package compile assertion that fixtures stay in sync beyond `tsc`; relies on cross-package build. | PRESENT |
| `test-fixtures-R-002` | All SDK methods on `mockCC` and `mockTask` are `jest.fn()`s so consumers can spy, assert calls, and override return values. | Tests need to observe and control SDK interactions without a backend. | `src/fixtures.ts` (`mockCC`, `mockTask` method definitions) | Archived usage examples (spy/override) in `_archive/.../AGENTS.md` | none | PRESENT |
| `test-fixtures-R-003` | `makeMockTask` and `makeMockCampaignTask` return a fresh object with new `jest.fn()` method instances per call, applying deep `data`/`interaction` (and `cpd`) overrides. | Reusing a shared mutated fixture causes cross-test bleed; factories give isolation and scenario shaping. | `src/fixtures.ts` (`makeMockTask`, `makeMockCampaignTask`) | none found | Gap: no test verifying fresh-instance isolation. | PRESENT |
| `test-fixtures-R-004` | `makeMockAddressBook` returns an `AddressBook` whose `getEntries` defaults to a `jest.fn()` resolving `mockAddressBookEntriesResponse`, overridable via parameter. | Address-book tests need a controllable async data source. | `src/fixtures.ts` (`makeMockAddressBook`) | Archived example in `_archive/.../AGENTS.md` (search address book) | none | PRESENT |
| `test-fixtures-R-005` | `mockIncomingTaskData` and `mockTaskData` expose UI-data variants keyed by scenario (incoming: `webRTC`/`extension`/`social`/`chat`; list: `active`/`incoming`/`action`/`selection`) using the shared `MEDIA_CHANNEL` enum. | Task widget tests render against named, channel-correct scenarios rather than ad-hoc literals. | `src/incomingTaskFixtures.ts`, `src/taskListFixtures.ts` | none found | none | PRESENT |
| `test-fixtures-R-006` | Outdial fixtures (`mockOutdialCallProps`, `mockCCWithAni`) are composed by spreading `mockCC` and adding outdial-specific jest mocks/config, keeping a single source of SDK shape. | Avoids a divergent second SDK mock; outdial tests inherit the canonical `mockCC`. | `src/components/task/outdialCallFixtures.ts` | none found | none | PRESENT |
| `test-fixtures-R-007` | Every fixture and factory is re-exported through the barrel `src/index.ts`; non-barrelled internals (`mockAddressBook`, `mockQueuesResponse`) are not part of the public surface. | Consumers import from the package root; the barrel is the stability boundary. | `src/index.ts`, `src/fixtures.ts` (export list) | none found | none | PRESENT |
| `test-fixtures-R-008` | `createMockTaskUIControls` starts from the SDK defaults, applies independent per-leg and active-leg overrides, and preserves or overrides the ordered `consultTransferDestinations.consult` and `.transfer` arrays. | Component tests must represent the same task-owned destination visibility and ordering contract used at runtime without rebuilding that policy in test code. | `src/taskUIControlsFixtures.ts` | Consumed by call-control tests in `packages/contact-center/cc-components/tests` | No package-local unit test; type and shape are checked by package builds and consumers. | PRESENT |
| `test-fixtures-R-009` | `aiSummaryFixtures` exports one readonly SDK-independent raw-object fixture set whose enumerable D1 inventory is exactly `featureEnablement`, `initiatingMidCall`, `receivingMidCall`, `postCall`, `malformed`, `errors`, `ordering`, `transfers`, `conferences`, `feedback`, `counters`, `wrapUp`, and `postWrapUpSend`, with `aiSummaryFixtureGroupNames` pinning the same list and no compatibility aliases. Conforming fixtures use only the packed SDK AI summary vocabulary: capability fields `interactionId`, optional `midCallEnabled`, optional `postCallEnabled`, optional `actionTimestamp`; inbound `AISummary` fields with top-level SDK-keyed `sections` records instead of local section arrays or titles; `AISummaryAction` values `CONSULT`/`TRANSFER`; `AISummaryFeedback` values `none`/`thumbs_up`/`thumbs_down`; `AISummaryState` values `DEFAULT`/`EXCLUDED`/`IGNORED`/`MID_CALL_CANCELLED`/`NOT_RECEIVED`; local counters `viewed`/`edited`/`copied`; response counters `numberOfTimesViewed`/`numberOfTimesEdited`/`numberOfTimesCopied` plus optional `summaryReceived`; SDK error indicators through `data.errorCode`, message, or transport status; wrap-up code through `wrapUpCode`; and fulfilled/rejected post-wrap-up sends through an `AISummaryResponse` payload with `summary`, never `summaryText`, with exactly one attempted send per sequence. Receiver inbound fixtures omit action correlation (`actionType`), include mixed typed/plain/card fields only to prove the store derives action from the bound Task, and malformed or intentionally invented values are isolated under the explicitly named `malformed` validation group. | D1 supplies deterministic raw inputs without importing the SDK package, while the D0 packed-SDK proof owns compile/runtime assignability against `AISummaryFeatureEnablement`, `AISummary`, `AISummarySections`, `AISummaryFeedback`, `AISummaryState`, `WrapupPayLoad`, and `AISummaryResponse`. | `src/aiSummaryFixtures.ts`, `src/index.ts` | `yarn workspace @webex/test-fixtures build`; D0 proof: `yarn workspace @webex/cc-store test:unit --runInBand --runTestsByPath tests/ai-summary-contract.ts` | Runtime store/component behavior remains in consuming D2-D6 suites; this package owns only raw fixture inventory and vocabulary. | PRESENT |

Do not record raw data/schema inventory as requirements. The per-field contents of each mock are descriptive data in `src/`, not behavioral requirements.

## Design Overview
The module is a pass-through fixture library: no control flow, no async orchestration, no state. Design choices are all about isolation and shape-fidelity.

Shape fidelity is achieved by importing the real SDK/store types and annotating each fixture (`const mockCC: IContactCenter = {…}`). `tsc` then fails the build if a fixture drifts from the production type, which is the package's only automated guard. Where the SDK type is broader than what a fixture can fully populate, the code uses a targeted cast (`as unknown as TaskData`, `as {} as AddressBook`) — a deliberate, localized escape hatch documented in Pitfalls.

Isolation is offered two ways. Static fixtures (`mockTask`, `mockCC`) are shared singletons — cheap but mutable, so tests that mutate must clone. Factory functions (`makeMockTask`, `makeMockCampaignTask`, `makeMockAddressBook`) return fresh objects with brand-new `jest.fn()`s each call, which is the safe path for tests that mutate or assert call counts.

Composition keeps the SDK mock single-sourced: outdial fixtures spread `mockCC` rather than redeclaring it, so a change to `mockCC` propagates. The same principle is why `mockQueuesResponse` is derived by mapping `mockQueueDetails` instead of being hand-written twice.

AI summary fixtures are deliberately one layer lower than store behavior. D1 keeps plain readonly objects and a closed group-name tuple; D0 (`store/tests/ai-summary-contract.ts`) imports the packed `@webex/contact-center` declarations and proves the fixture vocabulary and response examples are assignable to the SDK-facing contract. Do not move SDK imports into the fixture package to satisfy that proof.

## Data Flow
In-process, compile-time only. A consumer test file imports a fixture from `@webex/test-fixtures`; the fixture (a plain object, often with `jest.fn()` methods) is either passed as a prop/argument into production code under test or used to build a `jest.mock('@webex/cc-store', …)` factory. No network, queue, or wire transport is involved.

```mermaid
flowchart LR
    Types["@webex/cc-store types<br/>@webex/contact-center SDK types<br/>cc-components MEDIA_CHANNEL"] -->|type-check| Fixtures["test-fixtures/src/*<br/>(mockCC, mockTask, makeMock*, mockTaskData…)"]
    Fixtures -->|re-export| Barrel["src/index.ts"]
    Barrel -->|import in test| ConsumerTest["consuming package test<br/>(station-login / task / user-state …)"]
    ConsumerTest -->|prop / arg| Component["component under test"]
    ConsumerTest -->|jest.mock factory| StoreMock["mocked @webex/cc-store"]
    StoreMock --> Component
```

## Sequence Diagram(s)
Sequence coverage: this is a single-operation pass-through utility (import a fixture, use it in a test). The quality bar permits one diagram for a trivial pass-through module, so the import-and-use flow below covers the package; there are no async jobs, retries, or failure branches to diagram.

| Operation group | Diagram | Failure / recovery coverage |
|---|---|---|
| Import fixture → use in consumer test | `Fixture use in a consumer test` | N/A — no runtime failure modes (compile-time `tsc` is the only check); `jest.fn()` rejection behavior is configured by the consumer, not this module. |

```mermaid
sequenceDiagram
    participant Test as Consumer test
    participant Pkg as test-fixtures (index.ts)
    participant Comp as Component under test
    Test->>Pkg: import { mockTask, mockCC }
    Pkg-->>Test: fixture objects (jest.fn() methods)
    opt mutate / isolate
        Test->>Pkg: makeMockTask({ data:{...} })
        Pkg-->>Test: fresh ITask + new jest.fn()s
    end
    Test->>Comp: render(<Comp task={mockTask} />)
    Test->>Test: assert(mockTask.hold) / spy
```

## Class / Component Relationships
```mermaid
classDiagram
    class mockCC {
        <<IContactCenter>>
        LoggerProxy
        taskManager
        getBuddyAgents() jest.fn
        getQueues() jest.fn
        getEntryPoints() jest.fn
    }
    class mockTask { <<ITask>> data: TaskData; hold/resume/end/wrapup: jest.fn }
    class makeMockTask { <<factory>> (overrides) ITask }
    class mockCampaignTask { <<ITask>> }
    class makeMockCampaignTask { <<factory>> (overrides) ITask }
    class mockProfile { <<Profile>> }
    class makeMockAddressBook { <<factory>> (getEntriesMock) AddressBook }
    class mockOutdialCallProps
    class mockCCWithAni

    makeMockTask ..> mockTask : spreads + fresh jest.fn
    makeMockCampaignTask ..> mockCampaignTask : spreads + overrides
    mockCampaignTask ..> mockTask : spreads base
    mockOutdialCallProps ..> mockCC : spreads
    mockCCWithAni ..> mockCC : spreads
    mockCC ..> makeMockAddressBook : addressBook field
```
Static base fixtures (`mockCC`, `mockTask`, `mockProfile`) are the roots. Factories and derived fixtures all compose from those bases by object spread, so the type annotations on the bases govern the whole graph. There is no inheritance — composition only.

## Use Cases
- **UC-1 Render a widget with a mock task:** test imports `mockTask` → passes it as a prop to a task component → asserts UI / spies on `mockTask.hold`. Outcome: widget rendered with no SDK connection. Evidence: `src/fixtures.ts` (`mockTask`), archived examples in `ai-docs/_archive/pre-sdlc-migration/packages/contact-center/test-fixtures/ai-docs/AGENTS.md`.
- **UC-2 Mock the store with profile/SDK fixtures:** test builds a `jest.mock('@webex/cc-store', () => ({ cc: mockCC, teams: mockProfile.teams, … }))` factory → renders a widget that reads the store. Outcome: store-driven widget testable in isolation. Evidence: `src/fixtures.ts` (`mockCC`, `mockProfile`), archived `AGENTS.md`.
- **UC-3 Isolate a mutated task via factory:** test calls `makeMockTask({ data: { interaction: { state: 'hold' } } })` → gets a fresh task with new `jest.fn()`s → asserts without cross-test bleed. Outcome: isolated, scenario-shaped task. Evidence: `src/fixtures.ts` (`makeMockTask`).
- **UC-4 Test outdial flows:** test imports `mockCCWithAni` / `mockOutdialCallProps` / `mockAniEntries` → drives outdial component → asserts ANI handling. Outcome: outdial UI tested with configured ANI. Evidence: `src/components/task/outdialCallFixtures.ts`.
- **UC-5 Drive task widgets with scenario data:** test reads `mockTaskData.incoming.webrtcTelephony` or `mockIncomingTaskData.social` → feeds it to a task-list / incoming-task component. Outcome: channel-correct UI scenario. Evidence: `src/taskListFixtures.ts`, `src/incomingTaskFixtures.ts`.

## Pitfalls
- **Shared static fixtures are mutable.** `mockTask`, `mockCC`, `mockProfile` are module singletons. A test that mutates `mockTask.data` or `mockCC.stationLogin.mockResolvedValue(…)` without `jest.clearAllMocks()` / cloning leaks into later tests (flaky-together, pass-alone). Use the `makeMock*` factories or spread-clone, and reset mocks in `beforeEach`.
- **`MEDIA_CHANNEL` is a source-relative cross-package import.** `incomingTaskFixtures.ts` / `taskListFixtures.ts` import from `../../cc-components/src/components/task/task.types`, not from a package entry point. Moving that file or the relative depth silently breaks the build; it also makes test-fixtures depend on cc-components source (not reflected in `package.json`).
- **Targeted type casts mask shape drift.** `mockTask.data` uses `as unknown as TaskData` and `makeMockAddressBook` uses `as {} as AddressBook`. These bypass `tsc` for those values, so a real SDK shape change to `TaskData`/`AddressBook` will NOT fail the build here — verify those fixtures manually when the SDK types change.
- **`mockCC` is not a full `IContactCenter` of task methods.** Task lifecycle methods (`hold`, `resume`, `wrapup`, etc.) live on `mockTask`, not `mockCC`. The archived ARCHITECTURE doc incorrectly listed them and several proxies on `mockCC`; do not rely on that. `mockCC` exposes `LoggerProxy`, `taskManager`, and the listed `getX`/state/preview methods only.
- **Jest global is assumed, not declared.** Fixtures call `jest.fn()` at module load. Importing this package outside a Jest environment throws `jest is not defined`. It is test-only by design (`deploy:npm` is a no-op).
- **AI summary D1 is not the D0 packed-SDK proof.** `aiSummaryFixtures` must stay SDK-independent and expose the thirteen named groups only; compile/runtime assignability to the packed SDK belongs to the cc-store contract suite.

## Module Do's / Don'ts
- DO: keep every fixture annotated with its real SDK/store type so `tsc` catches drift (`src/fixtures.ts`).
- DO: add new mocks to the `src/index.ts` barrel and to the export list in `src/fixtures.ts`.
- DO: keep `aiSummaryFixtures` SDK-independent; model raw payloads as plain readonly objects under the thirteen `aiSummaryFixtureGroupNames` entries and put deliberately bad values only in `malformed`.
- DO: prefer `makeMock*` factories when a test mutates state or asserts call counts.
- DON'T: import this package from non-test (runtime) code — it calls `jest.fn()` at load.
- DON'T: redeclare a second SDK mock; spread `mockCC` like the outdial fixtures do.
- DON'T: add invented AI summary response fields such as `summaryText`, UI feedback values such as `like`/`dislike`, local section arrays, or `error.category` to conforming AI summary fixtures.
- DON'T: remove or rename an export without grepping sibling-package tests first.

## Export Stability
Published/consumed as `@webex/test-fixtures` (`workspace:*`), but `deploy:npm` is a deliberate no-op (`package.json`) — it is an internal monorepo dev dependency, not an npm artifact. Stability rules: adding an export or an additive field on a data fixture is a minor/non-breaking change; removing/renaming an export, or removing a mocked method on `mockCC`/`mockTask`, is breaking for consumer test files and must be done with a repo-wide grep of test imports. Type-declaration surface is emitted to `dist/types/` via `tsc`.

## Test-Case Strategy (module)
The package ships no tests of its own (no `tests/` directory; confirmed by tree). Its correctness is enforced through (1) `tsc` type-checking the typed fixtures against real SDK/store types during `yarn build:dev`, and (2) sibling-package tests that consume the fixtures. `store/tests/ai-summary.ts` explicitly checks the exact thirteen D1 groups and matching SDK error message/errorCode pairs; disabled and timeout examples must not mix mid-call and post-call indicators. `store/tests/ai-summary-contract.ts` checks assignability against the sealed SDK. The cast-escaped legacy fixtures (`TaskData`, `AddressBook`) and factory isolation remain candidates for additional dedicated coverage.

| Behavior / Requirement | Existing test evidence | Gap |
|---|---|---|
| `test-fixtures-R-001` (typed fixtures) | None in-package; enforced by `tsc` + consumer builds | No explicit type-assertion test; cast-escaped `TaskData`/`AddressBook` not covered |
| `test-fixtures-R-002` (jest.fn methods) | None in-package; exercised by consumer tests | No in-package assertion that methods are mocks |
| `test-fixtures-R-003` (factory freshness) | None found | Missing test that two `makeMockTask()` calls return independent `jest.fn()`s |
| `test-fixtures-R-004` (address book factory) | None found | Missing test for default-resolve + override |
| `test-fixtures-R-005` (scenario UI data) | None found | Consumed indirectly by task widget tests only |
| `test-fixtures-R-006` (outdial composition) | None found | Consumed by outdial widget tests only |
| `test-fixtures-R-007` (barrel surface) | None found | No test guarding the public export list |
| `test-fixtures-R-008` (task UI controls) | Call-control consumer tests; `@webex/test-fixtures` and `@webex/cc-components` builds | No package-local assertion for destination override merging |
| `test-fixtures-R-009` (AI summary raw fixtures) | `@webex/test-fixtures` build; D0 packed-SDK proof in `@webex/cc-store` `tests/ai-summary-contract.ts`; consumed by later AI summary store/component tests | No package-local behavior test; the package owns raw data only |

## Traceability
- Repo architecture: [`ARCHITECTURE.md`](../../../../ai-docs/ARCHITECTURE.md) · Registry: [`SPEC_INDEX.md`](../../../../ai-docs/SPEC_INDEX.md)
- Coverage state & contracts baseline: `.sdd/manifest.json`
