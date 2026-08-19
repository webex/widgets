---
type: Feature Spec
title: Agent Desktop consult and transfer list policy
description: Keep consult and transfer destination eligibility and ordering aligned with Agent Desktop while leaving widgets as a thin SDK consumer.
tags: [feature, specification, contact-center, consult-transfer]
---

# Agent Desktop consult and transfer list policy

This document owns the feature's what and why. The paired SDK delta owns the reusable destination-list policy; this repository owns only action context, current-task context, UI loading, and error presentation.

Related context: [repository architecture](../../../ARCHITECTURE.md) · [specification index](../../../SPEC_INDEX.md) · [repository instructions](../../../../AGENTS.md)

## Metadata

| Field | Value |
| --- | --- |
| Feature key | `CAI-8354` |
| Owner | Webex Contact Center widgets maintainers |
| Status | Approved and implemented; generator-side conformance PASS; independent validation pending |
| Work type | Defect |
| Change class | Contract / UI |
| Source/intake | Developer-approved Agent Desktop parity review and current code/tests |
| Last verified | 2026-08-19 in a working tree based on `4b928847` |

## Applicability

| Condition ID | Status | Evidence or reason | Owned section |
| --- | --- | --- | --- |
| `feature.feature_nontrivial` | Applicable | `packages/contact-center/store/src/storeEventsWrapper.ts` | Feasibility and risks |
| `feature.feature_interactions` | Applicable | `packages/contact-center/cc-components/src/components/task/CallControl/call-control.tsx` | Interaction and scenario matrix |
| `feature.touches_data_shapes` | Applicable | `packages/contact-center/store/src/store.types.ts` | Requested data and fields |
| `feature.backward_compat` | Applicable | `packages/contact-center/store/package.json` | Migration expectations |
| `feature.perf_critical` | N/A | This change does not add client-side processing or a new request fan-out. | Scale and performance |
| `feature.security_compliance` | N/A | The store forwards authenticated SDK calls and adds no credential or authorization ownership. | Security and compliance |
| `feature.needs_rollout` | N/A | No widget feature flag or staged runtime path is introduced. | Rollout and feature controls |
| `feature.serviceability` | Applicable | `packages/contact-center/task/src/helper.ts` | Serviceability |
| `feature.doc_obligations` | Applicable | `packages/contact-center/store/ai-docs/store-spec.md` | Documentation obligations |
| `feature.changes_ui` | Applicable | `packages/contact-center/cc-components/src/components/task/CallControl/CallControlCustom/consult-transfer-popover.tsx` | UI flow and design |
| `feature.changes_api` | Applicable | `packages/contact-center/store/src/store.types.ts` | API contract delta |
| `feature.changes_events` | N/A | No event name, payload, producer, consumer, or delivery order changes. | Event contract delta |
| `feature.changes_public_api` | Applicable | `packages/contact-center/cc-components/src/components/task/task.types.ts` | Public API and semver impact |
| `feature.cross_package` | Applicable | `packages/contact-center/store/package.json` | Cross-package impact |

## Problem and goal

The widgets previously embedded destination policy in the store: buddy agents were always restricted to Available, queues were fetched through the generic SDK API and filtered in memory by channel, and list response metadata was reconstructed. That made widget behavior diverge from Agent Desktop and made list order dependent on widget-side transformation.

The goal is for widgets to supply only the user's action, pagination/search input, and the current task media needed by the queue policy. The SDK returns eligible, backend-ordered lists and their metadata. Widgets must not choose ordering, entry-point media defaults, reusable eligibility, or pagination semantics.

## Stakeholders and open questions

| Stakeholder | Need or decision | Status |
| --- | --- | --- |
| Contact Center agents | Consult and transfer destination lists match Agent Desktop eligibility and order. | Decided |
| Widget maintainers | Destination business policy remains outside React and MobX UI code. | Decided |
| SDK maintainers | SDK services own list ordering defaults and specialized methods own consult/transfer eligibility. | Decided in the paired SDK delta |
| Host applications | Existing widget UI behavior remains compatible apart from the corrected destination results. | Decided |

There are no open product decisions for this delta.

## Scope

### In scope

- Pass `Consult` or `Transfer` from the call-control menu and reload action to the SDK through the task hook and store.
- Forward only pagination, page size, and search text for entry-point and dial-number lists; forward current-task media only for queues, where it selects the task channel.
- Load dial numbers through the generic SDK AddressBook service and rely on its default backend ordering.
- Preserve the SDK's `data` order and pagination metadata without local sorting, channel filtering, or metadata reconstruction.
- Keep loading, empty, and error behavior in the existing widget layers.
- Use the locally linked SDK worktree while verifying the coordinated change.

### Out of scope

- Reimplementing queue, entry-point, or buddy-agent eligibility in widgets.
- Sorting any destination array in React, the task hook, or the store.
- Supplying `sortBy` or `sortOrder` from the consult/transfer widget path.
- Changing backend ordering or adding a widget feature flag.
- Committing, publishing, or pushing either repository.

## Prior work and evidence

| Source | What it establishes | Decision or disposition |
| --- | --- | --- |
| `packages/contact-center/store/src/storeEventsWrapper.ts` | The old store filtered queue data and rebuilt pagination metadata; the new store delegates to specialized SDK methods. | Used |
| `packages/contact-center/task/src/helper.ts` | The task hook owns UI loading/error state and forwards list input. | Used |
| `packages/contact-center/cc-components/src/components/task/CallControl/call-control.tsx` | The selected menu identifies Consult versus Transfer. | Used |
| `packages/contact-center/cc-components/src/components/task/CallControl/CallControlCustom/consult-transfer-popover.tsx` | Reload has the same action context as initial list loading. | Used |
| `packages/contact-center/store/tests/storeEventsWrapper.ts` | Store delegation, action forwarding, metadata preservation, and error propagation are asserted. | Used |
| `packages/contact-center/task/tests/helper.ts` | Hook forwarding and safe empty-page fallback are asserted. | Used |
| `packages/contact-center/cc-components/tests/components/task/CallControl` | Initial load and reload preserve action context. | Used |

## Requirements

| ID | WHAT | WHY | Source evidence | Test or example evidence | Assumptions or gaps | Confidence |
| --- | --- | --- | --- | --- | --- | --- |
| `WIDGET-LIST-R-001` | The store must use the SDK's specialized consult/transfer queue and entry-point methods, use the generic SDK AddressBook service for dial numbers, and must not apply local eligibility filters, sorting, or pagination reconstruction. | SDK-owned defaults prevent drift while avoiding a redundant consult-specific dial-number API. | `packages/contact-center/store/src/storeEventsWrapper.ts` | `packages/contact-center/store/tests/storeEventsWrapper.ts` | Requires the paired SDK delta at runtime. | Present |
| `WIDGET-LIST-R-002` | Opening or reloading the Agents list must forward the active `Consult` or `Transfer` action through the component, hook, and store. | Agent eligibility differs by action, so losing the action would silently return the wrong population. | `packages/contact-center/cc-components/src/components/task/CallControl/call-control.tsx`, `packages/contact-center/cc-components/src/components/task/CallControl/CallControlCustom/consult-transfer-popover.tsx`, `packages/contact-center/task/src/helper.ts` | `packages/contact-center/cc-components/tests/components/task/CallControl`, `packages/contact-center/task/tests/helper.ts` | None. | Present |
| `WIDGET-LIST-R-003` | Queue requests must forward page, page size, search, and current-task media; entry-point and dial-number requests must forward only pagination/search. | Queue media comes from the active task, while telephony entry-point behavior and both list-order defaults are SDK decisions that widgets must not duplicate. | `packages/contact-center/store/src/storeEventsWrapper.ts`, `packages/contact-center/task/src/helper.ts` | `packages/contact-center/store/tests/storeEventsWrapper.ts`, `packages/contact-center/task/tests/helper.ts` | When queue media is absent, the SDK default applies. | Present |
| `WIDGET-LIST-R-004` | Widgets must render destination arrays in the order supplied by the SDK and preserve the SDK pagination metadata object. | Backend-selected ordering must not be changed or made inconsistent by a second client sort. | `packages/contact-center/store/src/storeEventsWrapper.ts` | `packages/contact-center/store/tests/storeEventsWrapper.ts` | Presentational virtualized-list behavior remains unchanged. | Present |
| `WIDGET-LIST-R-005` | Store failures must be logged and rethrown; the task hook must convert destination-page failures to an empty page and buddy-agent failures to an empty agent list while ending loading state. | Existing UI boundaries need predictable empty/error behavior without hiding failures at the SDK/store boundary. | `packages/contact-center/store/src/storeEventsWrapper.ts`, `packages/contact-center/task/src/helper.ts` | `packages/contact-center/store/tests/storeEventsWrapper.ts`, `packages/contact-center/task/tests/helper.ts` | Existing UI error presentation remains unchanged. | Present |
| `WIDGET-LIST-R-006` | Store and component types must expose the action-aware loader and the specialized SDK request/response shapes without `any`. | Compile-time alignment prevents the widgets from recreating SDK policy through loosely typed escape hatches. | `packages/contact-center/store/src/store.types.ts`, `packages/contact-center/cc-components/src/components/task/task.types.ts` | `packages/contact-center/store/tests/storeEventsWrapper.ts`, `packages/contact-center/task/tests/helper.ts`, `packages/contact-center/cc-components/tests/components/task/CallControl` | The local SDK link is required until a released SDK contains the new exports. | Present |

## Defect context (when applicable)

- Observed versus expected behavior: widgets could show a different destination population/order because they always requested Available agents, used generic queue/entry-point APIs, locally filtered queues, and rebuilt metadata; expected behavior is the Agent Desktop request policy with no widget-side sorting or filtering.
- Reproduction and environment: open Consult and Transfer destination popovers for the same active task and compare Agents, Queues, and Entry Points with Agent Desktop.
- Regression range or last known good state: unknown; the previous widget implementation predates this coordinated SDK policy.
- Severity, frequency, and workaround: user-visible whenever backend order or action eligibility differs; no reliable host-side workaround.
- Diagnostic evidence: `packages/contact-center/store/src/storeEventsWrapper.ts`, `packages/contact-center/store/tests/storeEventsWrapper.ts`.

## MODIFIED Requirements

### MOD-001 — Store list delegation (`STORE-R-015`)

- **WHAT**: Replace widget-owned queue filtering/metadata reconstruction and generic entry-point calls with thin delegation to the SDK's consult/transfer queue/entry-point methods. Keep dial numbers on the generic AddressBook service. Pass current-task media only to queues and pass no ordering inputs; preserve each SDK response as returned.
- **WHY**: Eligibility, backend query flags, and ordering defaults are reusable domain policy and must not diverge across UI clients.
- **Evidence:** `packages/contact-center/store/src/storeEventsWrapper.ts`, `packages/contact-center/store/tests/storeEventsWrapper.ts`.
- **Acceptance:** No queue, entry-point, or dial-number `.sort()`/`.filter()` exists in the store list path, and tests prove response order and metadata are unchanged.

### MOD-002 — Task consult/transfer orchestration (`TASK-R-011` through `TASK-R-014`)

- **WHAT**: Extend the existing consult/transfer flow so list loading carries `Consult` or `Transfer`; queue loading no longer derives and passes an independent media argument from the hook.
- **WHY**: The action affects buddy-agent eligibility, while media and request policy must be resolved once at the store/SDK boundary.
- **Evidence:** `packages/contact-center/task/src/helper.ts`, `packages/contact-center/task/tests/helper.ts`.
- **Acceptance:** Transfer loading reaches the store as `Transfer`, Consult remains the default, and paginated queue inputs contain only page, page size, and search.

### MOD-003 — Call-control action context (`CC-COMPONENTS-R-006`)

- **WHAT**: Initial menu opening and agent-list reload must call the loader with the active menu action.
- **WHY**: A reload must not silently revert Transfer eligibility to Consult eligibility.
- **Evidence:** `packages/contact-center/cc-components/src/components/task/CallControl/call-control.tsx`, `packages/contact-center/cc-components/src/components/task/CallControl/CallControlCustom/consult-transfer-popover.tsx`, `packages/contact-center/cc-components/tests/components/task/CallControl`.
- **Acceptance:** Component tests cover both the initial Transfer load and action-preserving reload.

## Acceptance criteria

- [x] Consult agent loading forwards `Consult`; Transfer agent loading forwards `Transfer` on initial open and reload (`MOD-002`, `MOD-003`, `WIDGET-LIST-R-002`).
- [x] Queue and entry-point fetchers delegate to specialized SDK methods, while dial numbers use AddressBook, without local sort/filter/metadata logic (`MOD-001`, `WIDGET-LIST-R-001`, `WIDGET-LIST-R-004`).
- [x] Only queue requests include current-task media when available; entry-point and dial-number requests contain no widget-selected media or sorting (`MOD-001`, `WIDGET-LIST-R-003`).
- [x] Store errors are rethrown and task-hook errors retain the existing empty-result behavior (`WIDGET-LIST-R-005`).
- [x] Store, task, test-fixtures, and cc-components build/type surfaces agree with the linked SDK (`WIDGET-LIST-R-006`).
- [x] Store, task, and cc-components unit suites pass with the coordinated SDK worktree.

## Scenarios and applicable change views

| Scenario | Actor | Preconditions | Expected behavior | Failure or boundary behavior | Requirements |
| --- | --- | --- | --- | --- | --- |
| Open Consult Agents | Agent | Active task and Consult selected | UI forwards `Consult`; SDK result order is rendered unchanged. | SDK failure produces an empty agent list and clears loading. | `WIDGET-LIST-R-002`, `WIDGET-LIST-R-005` |
| Open Transfer Agents | Agent | Active task and Transfer selected | UI forwards `Transfer`; SDK applies transfer eligibility. | Reload retains `Transfer`; it does not fall back to Consult. | `WIDGET-LIST-R-002` |
| Search Queues | Agent | Active task with media context | Page/search input plus media reach the SDK; response and metadata are preserved. | Missing task media lets the SDK default to telephony. | `WIDGET-LIST-R-003`, `WIDGET-LIST-R-004` |
| Search Entry Points | Agent | Entry-point tab visible | Page/search input reaches the SDK and backend order is rendered. | Failure becomes the existing empty paginated result. | `WIDGET-LIST-R-004`, `WIDGET-LIST-R-005` |
| Search Dial Numbers | Agent | Address book enabled | Page/search input reaches AddressBook and its SDK-default backend order is rendered. | Failure becomes the existing empty paginated result. | `WIDGET-LIST-R-001`, `WIDGET-LIST-R-004`, `WIDGET-LIST-R-005` |

### Interaction and scenario matrix

| Context or interacting state | Trigger | Expected result | Invalid or conflicting result | Requirements |
| --- | --- | --- | --- | --- |
| Consult + Agents | Open or reload | `loadBuddyAgents('Consult')` | Applying Transfer-only availability filtering | `WIDGET-LIST-R-002` |
| Transfer + Agents | Open or reload | `loadBuddyAgents('Transfer')` | Reloading with the default Consult action | `WIDGET-LIST-R-002` |
| Queue + current task media | Fetch/search/page | Store forwards media once to the specialized SDK call | Hook/store filters returned rows or sorts them again | `WIDGET-LIST-R-001`, `WIDGET-LIST-R-003`, `WIDGET-LIST-R-004` |
| No current task media | Queue fetch | SDK receives no media override and uses its default | Widget invents a backend channel policy | `WIDGET-LIST-R-003` |
| Entry point or dial number | Fetch/search/page | Store forwards pagination/search only and preserves SDK order | Widget supplies media or sort policy | `WIDGET-LIST-R-001`, `WIDGET-LIST-R-003`, `WIDGET-LIST-R-004` |

### UI flow and design

The visible popover, tabs, row presentation, pagination, loading indicators, empty states, and accessibility labels do not change. The only UI contract change is that initial and reload actions carry the active Consult/Transfer intent. The rendered list order is exactly the SDK response order.

### API contract delta

| API or operation | Change | Consumer impact | Compatibility expectation | Canonical definition |
| --- | --- | --- | --- | --- |
| Store buddy-agent loader | Accepts optional `Consult`/`Transfer` action instead of a media argument. | Task and component layers pass user intent. | Coordinated widgets release required. | `packages/contact-center/store/src/store.types.ts` |
| Store queue loader | Accepts pagination/search only and delegates to the SDK's specialized method. | Callers no longer supply independent media policy. | Coordinated widgets/SDK release required. | `packages/contact-center/store/src/store.types.ts` |
| Store entry-point loader | Delegates pagination/search to the SDK's specialized method. | No caller-owned media, profile, filter, or sort flags. | Additive at the SDK boundary; coordinated store update. | `packages/contact-center/store/src/store.types.ts` |
| Store dial-number loader | Delegates pagination/search to the generic SDK AddressBook service. | The SDK default supplies backend name ordering. | Existing SDK surface with a corrected default. | `packages/contact-center/store/src/store.types.ts` |

### Public API and semver impact

| Export or entry point | Change | Affected consumers | Required version change | Deprecation or migration |
| --- | --- | --- | --- | --- |
| `@webex/cc-store` loader types | Action-aware and specialized request shapes | Internal widget packages and any direct store consumer | Semver-sensitive; coordinate under repository release policy | Direct consumers must pass action rather than media to the buddy loader. |
| `@webex/cc-components` call-control loader prop | Optional action parameter | Call-control consumers | Additive callback argument for compatible functions; coordinate typings | Consumers may ignore the argument, but action-aware loaders should use it. |

### Cross-package impact

| Package | Change | Dependency direction | Release sequencing | Owner |
| --- | --- | --- | --- | --- |
| `@webex/contact-center` | Supplies specialized queue/entry-point APIs plus AddressBook and EntryPoint ordering defaults. | SDK → store | Build/link first. | SDK maintainers |
| `@webex/cc-store` | Thin delegation and typed boundary. | store → SDK | Release with a compatible SDK version. | Widgets maintainers |
| `@webex/cc-task` | Carries action and pagination/search. | task → store | Release after store types. | Widgets maintainers |
| `@webex/cc-components` | Carries menu action on open/reload. | components → task callback | Release with task package. | Widgets maintainers |

## Contracts delta

**Provides — MODIFIED:** The widget packages provide action-aware list loading and preserve SDK result order/metadata without owning eligibility policy.

**Requires — MODIFIED:** The store requires an SDK that exports `ConsultTransferAction`, `ConsultTransferListSearchParams`, `ConsultTransferQueueSearchParams`, `getConsultTransferQueues`, and `getConsultTransferEntryPoints`.

No event contract changes.

## Success and guardrail metrics

| Metric | Baseline | Target | Measurement source |
| --- | --- | --- | --- |
| Widget-side consult/transfer queue filters or sorts | Present | 0 | `packages/contact-center/store/src/storeEventsWrapper.ts` |
| Action loss on initial/reload agent fetch | Possible | 0 covered paths | `packages/contact-center/cc-components/tests/components/task/CallControl` |
| Touched package unit failures | Unknown before change | 0 | Store, task, and cc-components unit suites |
| Touched package build/style failures | Unknown before change | 0 | Store, task, test-fixtures, and cc-components build/style commands |

## Requested data and fields

| Entity or payload | Requested field or shape | Purpose | Ownership | Privacy, retention, or compatibility constraint |
| --- | --- | --- | --- | --- |
| Buddy-agent request | `action`, optional current task `mediaType` | Distinguish Consult and Transfer eligibility. | SDK contract; widgets supply runtime context. | No new retained data or credentials. |
| Queue list request | `page`, `pageSize`, `search`, optional current task `mediaType` | Paginated destination discovery. | SDK owns reusable defaults. | No widget-owned eligibility flags. |
| Entry-point list request | `page`, `pageSize`, `search` | Paginated destination discovery. | SDK owns telephony eligibility and backend name ordering. | No widget-owned media, eligibility, or sort flags. |
| Dial-number list request | `page`, `pageSize`, `search` | Paginated address-book destination discovery. | AddressBook owns backend name ordering. | No widget-owned sort flags. |
| Paginated response | SDK `data` and `meta` unchanged | Preserve backend order and pagination truth. | SDK/backend | No client reconstruction. |

## Impacted domains

| Repository or module | Impact | Owner |
| --- | --- | --- |
| `packages/contact-center/store` | SDK boundary and response preservation | Widgets maintainers |
| `packages/contact-center/task` | Action and list-input forwarding | Widgets maintainers |
| `packages/contact-center/cc-components` | Initial/reload action propagation | Widgets maintainers |
| `packages/contact-center/test-fixtures` | Type-compatible fixtures | Widgets maintainers |

## Feasibility and risks

| Risk or assumption | Evidence | Mitigation or decision owner |
| --- | --- | --- |
| Widgets are run with an SDK lacking the new methods. | `packages/contact-center/store/package.json` | Coordinate the SDK dependency/release; use the approved local worktree link for testing. |
| A future widget reintroduces local sorting/filtering. | `packages/contact-center/store/tests/storeEventsWrapper.ts` | Retain delegation and exact-response assertions. |
| Transfer action is lost during reload. | `packages/contact-center/cc-components/tests/components/task/CallControl/CallControlCustom/consult-transfer-popover.tsx` | Retain the action-specific reload assertion. |

## Error Matrix

| Failure | Store behavior | Task/UI behavior | Evidence |
| --- | --- | --- | --- |
| Buddy-agent SDK rejection | Log and rethrow. | Log, clear agents, end loading. | `packages/contact-center/store/src/storeEventsWrapper.ts`, `packages/contact-center/task/src/helper.ts` |
| Queue SDK rejection | Log and rethrow. | Log and return an empty paginated result. | `packages/contact-center/store/src/storeEventsWrapper.ts`, `packages/contact-center/task/src/helper.ts` |
| Entry-point SDK rejection | Log and rethrow. | Log and return an empty paginated result. | `packages/contact-center/store/src/storeEventsWrapper.ts`, `packages/contact-center/task/src/helper.ts` |
| Missing current task media | Omit media from the SDK request. | Existing UI flow continues. | `packages/contact-center/store/src/storeEventsWrapper.ts` |

## Resilience

- The change adds no retry or duplicate request loop; existing component reload remains the explicit retry mechanism.
- Empty fallbacks remain confined to the task/UI boundary, while the store preserves rejection semantics for other consumers.
- Response order and pagination are not cached or reconstructed by widgets.

## Observability

- Existing store and task error logs remain the diagnostic surface.
- Successful buddy-agent loading retains the count-only informational log; no agent identities or list contents are logged.
- No new metric, trace, alert, or PII-bearing log is introduced.

## Operations

- Build/link the paired SDK before widgets so the new exports resolve.
- Run the store, task, and cc-components unit suites plus touched package builds/styles before release.
- Roll back widgets and SDK together if the specialized methods are unavailable; no data migration or cleanup is required.

## Migration expectations

- Compatibility: the SDK additions are additive, but direct `@webex/cc-store` callers of the changed loader signatures must migrate with the widgets release.
- Data or consumer transition: release a compatible SDK before or with the store, then task and component packages.
- Coexistence period: local development uses the approved SDK worktree link; published packages must use a released compatible SDK.
- Completion and rollback outcome: all packages resolve the same types and list methods; rollback is a coordinated dependency/code rollback with no persisted state.

## Serviceability

| Signal or support surface | Required change | Consumer or operator | Acceptance evidence |
| --- | --- | --- | --- |
| Store error log | Preserve SDK rejection context without list contents. | Widget maintainers | `packages/contact-center/store/tests/storeEventsWrapper.ts` |
| Task error log | Preserve list kind and operation context. | Widget maintainers | `packages/contact-center/task/tests/helper.ts` |
| Buddy load info log | Record count only. | Widget maintainers | `packages/contact-center/task/src/helper.ts` |

## Documentation obligations

- This approved delta modifies `STORE-R-015`, the task consult/transfer requirement family, and `CC-COMPONENTS-R-006` without overwriting the draft canonical module specs.
- The paired SDK feature spec remains the canonical owner for filter, projection, ordering, profile-view, media mapping, and cache-bypass decisions.
- A future canonical-spec promotion must fold this delta into the routed module specs and reconcile the delta path rather than duplicate the requirements.

## Decision and change log

| Date | Decision or change | Rationale | Owner |
| --- | --- | --- | --- |
| 2026-08-19 | Approved this exact MODIFIED delta path. | Avoid overwriting draft canonical module specs while keeping spec-currency with the implementation. | Developer |
| 2026-08-19 | Assigned reusable list policy to the SDK and retained only UI/runtime context in widgets. | Prevent policy duplication and ordering drift. | Developer + Codex |
| 2026-08-19 | Explicitly prohibited widget-side sorting/filtering of SDK destination results. | Preserve the backend order selected by the SDK request. | Developer + Codex |
| 2026-08-19 | Removed widget selection of entry-point media and the consult-specific dial-number helper. | EntryPoint and AddressBook defaults must work for widgets out of the box; other SDK consumers can pass explicit overrides. | Developer + Codex |
