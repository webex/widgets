---
type: Feature Spec
title: Consult and transfer list policy
description: Keep consult and transfer destination eligibility and ordering consistent while leaving widgets as a thin SDK consumer.
tags: [feature, specification, contact-center, consult-transfer]
---

# Consult and transfer list policy

This document owns the feature's what and why. The paired SDK delta owns reusable destination-list policy and the ordered destination availability attached to each Task; this repository owns list loading, selection UI, host hide overrides, and error presentation.

Related context: [repository architecture](../../../ARCHITECTURE.md) · [specification index](../../../SPEC_INDEX.md) · [repository instructions](../../../../AGENTS.md)

## Metadata

| Field | Value |
| --- | --- |
| Feature key | `CAI-8354` |
| Owner | Webex Contact Center widgets maintainers |
| Status | Approved and implemented; diff-scoped drift validation PASS; independent validation pending |
| Work type | Defect |
| Change class | Contract / UI |
| Source/intake | Developer-approved consult/transfer behavior review and current code/tests |
| Last verified | 2026-08-25 with `@webex/contact-center` 3.12.0-next.109 |

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

The widgets previously embedded destination policy in the store: buddy agents were always restricted to Available, queues were fetched through the generic SDK API and filtered in memory by channel, and list response metadata was reconstructed. That made behavior inconsistent across consumers and made list order dependent on widget-side transformation.

The goal is for widgets to use the SDK's existing `getBuddyAgents`, `getQueues`, and `getEntryPoints` methods. Widgets supply the user's action and pagination/search input; the store uses current-task media only to override the SDK's queue default for an active non-telephony task. Entry points delegate directly so the SDK can fetch and map the profile-scoped dial-number records. The SDK returns eligible, backend-ordered lists and their metadata. Widgets must not transform returned rows, choose ordering, or reconstruct pagination semantics.

## Stakeholders and open questions

| Stakeholder | Need or decision | Status |
| --- | --- | --- |
| Contact Center agents | Consult and transfer destination lists have consistent eligibility and order. | Decided |
| Widget maintainers | Destination business policy remains outside React and MobX UI code. | Decided |
| SDK maintainers | Existing SDK services own default list eligibility, profile views, and ordering; no consult/transfer-specific list method or response abstraction is added. | Decided in the paired SDK delta |
| Host applications | Existing widget UI behavior remains compatible apart from the corrected destination results. | Decided |

There are no open product decisions for this delta.

## Scope

### In scope

- Pass `Consult` or `Transfer` from the call-control menu and reload action to the SDK through the task hook and store.
- Forward pagination, page size, and search text through the existing list APIs. For an active non-telephony task, the store supplies a complete channel eligibility filter only to the queue request because the generic queue method does not receive Task context. Entry-point requests delegate without widget-owned filters.
- Load dial numbers through the generic SDK AddressBook service and rely on its default backend ordering.
- Preserve the SDK's `data` order and pagination metadata without local sorting, channel filtering, or metadata reconstruction.
- Keep loading, empty, and error behavior in the existing widget layers.
- Use the pinned `@webex/contact-center` 3.12.0-next.109 dependency containing the coordinated SDK change.

### Out of scope

- Reimplementing queue, entry-point, or buddy-agent eligibility in widgets.
- Sorting any destination array in React, the task hook, or the store.
- Supplying `sortBy` or `sortOrder` from the consult/transfer widget path.
- Changing backend ordering or adding a widget feature flag.
- Committing, publishing, or pushing either repository.

## Prior work and evidence

| Source | What it establishes | Decision or disposition |
| --- | --- | --- |
| `packages/contact-center/store/src/storeEventsWrapper.ts` | The old store filtered queue data and rebuilt pagination metadata; the new store delegates to the existing SDK methods and only supplies active non-telephony task context to queue requests through the existing filter. | Used |
| `packages/contact-center/task/src/helper.ts` | The task hook owns UI loading/error state and forwards list input. | Used |
| `packages/contact-center/cc-components/src/components/task/CallControl/call-control.tsx` | The selected menu identifies Consult versus Transfer. | Used |
| `packages/contact-center/cc-components/src/components/task/CallControl/CallControlCustom/consult-transfer-popover.tsx` | Reload has the same action context as initial list loading. | Used |
| `packages/contact-center/store/tests/storeEventsWrapper.ts` | Store delegation, action forwarding, metadata preservation, and error propagation are asserted. | Used |
| `packages/contact-center/task/tests/helper.ts` | Hook forwarding and safe empty-page fallback are asserted. | Used |
| `packages/contact-center/cc-components/tests/components/task/CallControl` | Initial load and reload preserve action context. | Used |

## Requirements

| ID | WHAT | WHY | Source evidence | Test or example evidence | Assumptions or gaps | Confidence |
| --- | --- | --- | --- | --- | --- | --- |
| `WIDGET-LIST-R-001` | The store must use the SDK's existing `getBuddyAgents`, `getQueues`, and `getEntryPoints` methods and the existing AddressBook service for dial numbers. It must not filter or sort returned rows or reconstruct pagination metadata. | Reusing established methods and response types keeps the public surface small while SDK-owned defaults prevent policy drift. | `packages/contact-center/store/src/storeEventsWrapper.ts` | `packages/contact-center/store/tests/storeEventsWrapper.ts` | Requires the paired SDK default-policy delta at runtime. | Present |
| `WIDGET-LIST-R-002` | Opening or reloading the Agents list must forward the active `Consult` or `Transfer` action through the component, hook, and store. The store must also continue accepting the established media-type call form for direct consumers. | Agent eligibility differs by action, so losing the action would silently return the wrong population; retaining the old call form avoids an unnecessary breaking store change. | `packages/contact-center/cc-components/src/components/task/CallControl/call-control.tsx`, `packages/contact-center/cc-components/src/components/task/CallControl/CallControlCustom/consult-transfer-popover.tsx`, `packages/contact-center/task/src/helper.ts`, `packages/contact-center/store/src/storeEventsWrapper.ts` | `packages/contact-center/cc-components/tests/components/task/CallControl`, `packages/contact-center/task/tests/helper.ts`, `packages/contact-center/store/tests/storeEventsWrapper.ts` | None. | Present |
| `WIDGET-LIST-R-003` | Queue and entry-point requests must forward page, page size, and search. When the active task is non-telephony, the store must pass a complete inbound/active/channel filter only to the queue request and combine it with any caller filter; params-only telephony or missing-media calls omit that override. The queue loader must accept both the thin params-only form and the established media-plus-params form; the legacy form retains explicit channel scoping, and params-only calls preserve an explicit empty filter. Entry-point and dial-number requests delegate without widget-owned filter or sort policy. | The SDK's generic queue method has no Task argument and cannot infer which concurrent task is being rendered, while entry-point profile/dial-number mapping is reusable SDK policy. Combining filters prevents caller input from erasing required Task scope, and exact compatibility handling avoids breaking existing store consumers or swallowing an SDK override. | `packages/contact-center/store/src/storeEventsWrapper.ts`, `packages/contact-center/task/src/helper.ts` | `packages/contact-center/store/tests/storeEventsWrapper.ts`, `packages/contact-center/task/tests/helper.ts` | No new SDK method or response type is required. | Present |
| `WIDGET-LIST-R-004` | Widgets must render destination arrays in the order supplied by the SDK and preserve the SDK pagination metadata object. | Backend-selected ordering must not be changed or made inconsistent by a second client sort. | `packages/contact-center/store/src/storeEventsWrapper.ts` | `packages/contact-center/store/tests/storeEventsWrapper.ts` | Presentational virtualized-list behavior remains unchanged. | Present |
| `WIDGET-LIST-R-005` | Store failures must be logged and rethrown; the task hook must convert destination-page failures to an empty page and buddy-agent failures to an empty agent list while ending loading state. | Existing UI boundaries need predictable empty/error behavior without hiding failures at the SDK/store boundary. | `packages/contact-center/store/src/storeEventsWrapper.ts`, `packages/contact-center/task/src/helper.ts` | `packages/contact-center/store/tests/storeEventsWrapper.ts`, `packages/contact-center/task/tests/helper.ts` | Existing UI error presentation remains unchanged. | Present |
| `WIDGET-LIST-R-006` | Store and component types must reuse `BuddyAgents`, `TaskUIControls`, `ContactServiceQueueSearchParams`, `ContactServiceQueuesResponse`, `EntryPointSearchParams`, `EntryPointListResponse`, `ContactServiceQueue`, and `EntryPointRecord` without `any`; no one-off action, media, destination-control, destination-list, list-options, or list-response public type may be introduced. | Consumers only need the existing methods, lists, and Task control field. Deriving destination typing from `TaskUIControls` avoids parallel public abstractions and misleading projected-record types. | `packages/contact-center/store/src/store.types.ts`, `packages/contact-center/cc-components/src/components/task/task.types.ts` | `packages/contact-center/store/tests/storeEventsWrapper.ts`, `packages/contact-center/task/tests/helper.ts`, `packages/contact-center/cc-components/tests/components/task/CallControl` | The local SDK link is required until a released SDK contains the default behavior. | Present |
| `WIDGET-LIST-R-007` | CallControl must read the matching ordered category array from `currentTask.uiControls.consultTransferDestinations`, pass it directly to the popover, and render categories in that order. Widgets must not use collaboration profile flags or media/direction/task payload fields to derive visibility, and must not fetch buddy agents when Agents is omitted; the legacy `allowConsultToQueue` store/property pass-through remains exported only for compatibility and is not consumed by this UI. Host options may only hide Dial Number or Entry Point after the SDK decision. | One SDK Task control surface prevents policy drift while retaining the existing public widgets surface, fixes incorrect payload-path reads, makes the SDK-provided first category the default selection, and avoids loading data for a disallowed category. | `packages/contact-center/task/src/CallControl/index.tsx`, `packages/contact-center/task/src/CallControlCAD/index.tsx`, `packages/contact-center/cc-components/src/components/task/CallControl/call-control.tsx`, `packages/contact-center/cc-components/src/components/task/CallControl/CallControlCustom/consult-transfer-popover.tsx`, `packages/contact-center/store/src/storeEventsWrapper.ts` | `packages/contact-center/cc-components/tests/components/task/CallControl`, `packages/contact-center/store/tests/storeEventsWrapper.ts` | Consumers cannot enable a category omitted by the SDK; compatibility fields do not participate in the decision. | Present |
| `WIDGET-LIST-R-008` | Agent rows must pass Momentum Avatar presence `active` for SDK state `Available` and `away` for every other state. Every destination avatar must derive initials from the first character of the first and last non-empty name tokens, using one character for a single-token name. Dial-number and entry-point rows must show their typed SDK `number` as secondary text below the name. | The design-system Avatar owns presence presentation, first/last-token initials keep multi-token destination labels distinguishable, and secondary identifiers distinguish similarly named routable destinations without widget-side response transformation. | `packages/contact-center/cc-components/src/components/task/CallControl/CallControlCustom/call-control-custom.utils.ts`, `packages/contact-center/cc-components/src/components/task/CallControl/CallControlCustom/consult-transfer-list-item.tsx`, `packages/contact-center/cc-components/src/components/task/CallControl/CallControlCustom/consult-transfer-popover.tsx` | `packages/contact-center/cc-components/tests/components/task/CallControl/CallControlCustom/call-control-custom.util.tsx`, `packages/contact-center/cc-components/tests/components/task/CallControl/CallControlCustom/consult-transfer-list-item.tsx`, `packages/contact-center/cc-components/tests/components/task/CallControl/CallControlCustom/consult-transfer-popover.tsx` | Entry-point `number` requires the paired SDK dial-number mapping. | Present |
| `WIDGET-LIST-R-009` | Buddy-agent state and loading must be updated only by the newest request, including when the action switches between Consult and Transfer while a request is in flight. | A slower Consult response must not overwrite the Transfer population currently selected by the user. | `packages/contact-center/task/src/helper.ts` | `packages/contact-center/task/tests/helper.ts` | The underlying request is not cancelled; its stale result is ignored. | Present |

## Defect context (when applicable)

- Observed versus expected behavior: widgets could show a different destination population/order because they always requested Available agents, used generic queue/entry-point APIs, locally filtered queues, and rebuilt metadata; expected behavior is the SDK-owned request policy with no widget-side sorting or filtering.
- Reproduction and environment: open Consult and Transfer destination popovers for the same active task and compare Agents, Queues, and Entry Points across SDK and widget consumers.
- Regression range or last known good state: unknown; the previous widget implementation predates this coordinated SDK policy.
- Severity, frequency, and workaround: user-visible whenever backend order or action eligibility differs; no reliable host-side workaround.
- Diagnostic evidence: `packages/contact-center/store/src/storeEventsWrapper.ts`, `packages/contact-center/store/tests/storeEventsWrapper.ts`.

## MODIFIED Requirements

### MOD-001 — Store list delegation (`STORE-R-015`)

- **WHAT**: Replace widget-owned returned-row filtering and metadata reconstruction with delegation to the SDK's existing queue and entry-point methods. Keep dial numbers on the existing AddressBook service. Pass pagination/search plus a complete non-telephony channel filter only to queue requests when the active Task requires an override, combine that scope with a caller filter, and preserve the established media-plus-params store call as a compatibility overload; delegate entry points without widget policy and preserve each SDK response as returned.
- **WHY**: Eligibility, backend query flags, and ordering defaults are reusable domain policy and must not diverge across UI clients.
- **Evidence:** `packages/contact-center/store/src/storeEventsWrapper.ts`, `packages/contact-center/store/tests/storeEventsWrapper.ts`.
- **Acceptance:** No queue, entry-point, or dial-number returned-data `.sort()`/`.filter()` exists in the store list path, and tests prove response order and metadata are unchanged. Telephony queue requests rely on SDK defaults; non-telephony queue requests use only the existing `filter` option without losing a caller filter; both queue call forms work; entry points always delegate directly.

### MOD-002 — Task consult/transfer orchestration (`TASK-R-011` through `TASK-R-014`)

- **WHAT**: Extend the existing consult/transfer flow so list loading carries `Consult` or `Transfer`; preserve the store's legacy media-type buddy call for compatibility; make buddy state latest-request-wins; queue loading no longer derives and passes an independent media argument from the hook.
- **WHY**: The action affects buddy-agent eligibility, while media and request policy must be resolved once at the store/SDK boundary.
- **Evidence:** `packages/contact-center/task/src/helper.ts`, `packages/contact-center/task/tests/helper.ts`.
- **Acceptance:** Transfer loading reaches the store as `Transfer`, Consult remains the default, legacy media callers keep working, a late request from the prior action cannot overwrite the current agent list, and paginated queue inputs contain only page, page size, and search.

### MOD-003 — Call-control action context (`CC-COMPONENTS-R-006`)

- **WHAT**: Initial menu opening and agent-list reload must call the loader with the active menu action. Category visibility, order, and initial selection come from the matching SDK Task destination-control array; widget wrappers no longer build interaction context or forward raw profile access flags.
- **WHY**: A reload must not silently revert Transfer eligibility to Consult eligibility, and UI consumers must not duplicate the SDK's destination policy.
- **Evidence:** `packages/contact-center/cc-components/src/components/task/CallControl/call-control.tsx`, `packages/contact-center/cc-components/src/components/task/CallControl/CallControlCustom/consult-transfer-popover.tsx`, `packages/contact-center/cc-components/tests/components/task/CallControl`.
- **Acceptance:** Component tests cover action-preserving reload, SDK category omission, SDK category order, and host-only hide overrides.

## Acceptance criteria

- [x] Consult agent loading forwards `Consult`; Transfer agent loading forwards `Transfer` on initial open and reload (`MOD-002`, `MOD-003`, `WIDGET-LIST-R-002`).
- [x] Consult/Transfer category visibility, order, and default selection come from `Task.uiControls`; widgets contain no collaboration-profile/direction policy (`MOD-003`, `WIDGET-LIST-R-007`).
- [x] Queue and entry-point fetchers delegate to existing SDK methods, while dial numbers use AddressBook, without local returned-data sort/filter/metadata logic (`MOD-001`, `WIDGET-LIST-R-001`, `WIDGET-LIST-R-004`).
- [x] Params-only telephony queue requests rely on SDK defaults; active non-telephony requests supply a complete channel filter, and legacy media-plus-params calls preserve their channel scope and caller filter. Entry-point requests always delegate directly, and no list request contains widget-selected sorting, projection, or profile-view flags (`MOD-001`, `WIDGET-LIST-R-003`).
- [x] Store errors are rethrown and task-hook errors retain the existing empty-result behavior (`WIDGET-LIST-R-005`).
- [x] Store, task, test-fixtures, and cc-components build/type surfaces agree with `@webex/contact-center` 3.12.0-next.109 (`WIDGET-LIST-R-006`).
- [x] Agent rows show active/away presence from buddy state, and dial-number/entry-point rows show their typed secondary identifiers (`WIDGET-LIST-R-008`).
- [x] A late buddy-agent response from a previous Consult/Transfer action cannot overwrite the current action's list or loading state (`WIDGET-LIST-R-009`).
- [x] Store and task unit suites, focused consult/transfer cc-components tests, and touched package build/style checks pass with `@webex/contact-center` 3.12.0-next.109.
- [x] The complete cc-components unit suite and the focused consult/transfer suites pass with `@webex/contact-center` 3.12.0-next.109.

## Scenarios and applicable change views

| Scenario | Actor | Preconditions | Expected behavior | Failure or boundary behavior | Requirements |
| --- | --- | --- | --- | --- | --- |
| Open Consult Agents | Agent | Active task and Consult selected | UI forwards `Consult`; SDK result order is rendered unchanged and each row shows active/away presence from buddy state. | SDK failure produces an empty agent list and clears loading; a stale request cannot replace newer state. | `WIDGET-LIST-R-002`, `WIDGET-LIST-R-005`, `WIDGET-LIST-R-008`, `WIDGET-LIST-R-009` |
| Open Transfer Agents | Agent | Active task and Transfer selected | UI forwards `Transfer`; SDK applies transfer eligibility. | Reload retains `Transfer`; a late Consult response cannot replace Transfer results. | `WIDGET-LIST-R-002`, `WIDGET-LIST-R-009` |
| Search Queues | Agent | Active task with media context | Page/search reach the existing SDK method; a non-telephony Task adds a complete channel filter, and the response and metadata are preserved. | Telephony or missing media lets SDK defaults apply. | `WIDGET-LIST-R-003`, `WIDGET-LIST-R-004` |
| Search Entry Points | Agent | Entry-point tab visible | Page/search reach the existing SDK method without widget policy; backend order is rendered and typed `number` appears below the name when present. | Failure becomes the existing empty paginated result. | `WIDGET-LIST-R-003`, `WIDGET-LIST-R-004`, `WIDGET-LIST-R-005`, `WIDGET-LIST-R-008` |
| Search Dial Numbers | Agent | Address book enabled | Page/search input reaches AddressBook, its SDK-default backend order is rendered, and `number` appears below the name. | Failure becomes the existing empty paginated result. | `WIDGET-LIST-R-001`, `WIDGET-LIST-R-004`, `WIDGET-LIST-R-005`, `WIDGET-LIST-R-008` |

### Interaction and scenario matrix

| Context or interacting state | Trigger | Expected result | Invalid or conflicting result | Requirements |
| --- | --- | --- | --- | --- |
| Consult + Agents | Open or reload | `loadBuddyAgents('Consult')` | Applying Transfer-only availability filtering | `WIDGET-LIST-R-002` |
| Transfer + Agents | Open or reload | `loadBuddyAgents('Transfer')` | Reloading with the default Consult action | `WIDGET-LIST-R-002` |
| Queue + non-telephony current task media | Fetch/search/page | Store calls existing `getQueues` with a complete channel filter and preserves SDK order | Hook/store filters returned rows or sorts them again | `WIDGET-LIST-R-001`, `WIDGET-LIST-R-003`, `WIDGET-LIST-R-004` |
| Telephony or no current task media + params-only call | Queue fetch | Store supplies no policy override and SDK defaults apply | Widget supplies redundant sort, projection, or profile-view flags | `WIDGET-LIST-R-003` |
| Entry point | Fetch/search/page | Store calls existing `getEntryPoints` directly and preserves SDK rows/order | Widget filters returned rows or supplies query policy | `WIDGET-LIST-R-001`, `WIDGET-LIST-R-003`, `WIDGET-LIST-R-004` |
| Dial number | Fetch/search/page | Store forwards pagination/search only and preserves SDK order | Widget supplies media or sort policy | `WIDGET-LIST-R-001`, `WIDGET-LIST-R-003`, `WIDGET-LIST-R-004` |
| Consult buddy request in flight | User opens or reloads Transfer Agents | Only the Transfer request may update agents and loading state | Late Consult response replaces the Transfer list | `WIDGET-LIST-R-009` |

### UI flow and design

The popover, tabs, pagination, loading indicators, empty states, and accessibility labels remain unchanged. Agent avatars pass semantic active/away presence derived directly from `BuddyDetails.state` to the Momentum Avatar; dial-number and entry-point rows show their typed `number` below the name. The rendered list order remains exactly the SDK response order.

### API contract delta

| API or operation | Change | Consumer impact | Compatibility expectation | Canonical definition |
| --- | --- | --- | --- | --- |
| Store buddy-agent loader | Adds a `Consult`/`Transfer` action overload while retaining the established optional media-type form. | Task and component layers pass user intent; existing direct store callers remain valid. | Additive overload; coordinated SDK behavior update required. | `packages/contact-center/store/src/store.types.ts` |
| Store queue loader | Adds a thin params-only overload while retaining the established media-plus-params form, then delegates to SDK `getQueues`; the store adds a non-telephony filter from Task context when needed. | Widget callers omit redundant media plumbing; existing direct store callers remain valid. | Additive overload; no new SDK method or response type. | `packages/contact-center/store/src/store.types.ts` |
| Store entry-point loader | Retains the existing SDK-compatible search-parameter and full-response signature and delegates directly to `getEntryPoints`. | Callers keep the established entry-point list contract and receive SDK-mapped numbers. | No new SDK method or response type; coordinated SDK default update required. | `packages/contact-center/store/src/store.types.ts` |
| Store dial-number loader | Delegates pagination/search to the generic SDK AddressBook service. | The SDK default supplies backend name ordering. | Existing SDK surface with a corrected default. | `packages/contact-center/store/src/store.types.ts` |
| Consult/transfer list-item props | Adds optional semantic `presence` passed directly to Momentum Avatar. | Agent rows expose SDK availability while leaving visual presentation to the design system. | Additive optional prop. | `packages/contact-center/cc-components/src/components/task/task.types.ts` |

### Public API and semver impact

| Export or entry point | Change | Affected consumers | Required version change | Deprecation or migration |
| --- | --- | --- | --- | --- |
| `@webex/cc-store` loader types | Buddy loading adds Consult/Transfer action context and queue loading adds a params-only form; both established call forms remain accepted. Entry-point loaders retain existing SDK request/response types. | Internal widget packages and any direct store consumer | Additive overloads; queue and entry-point list shapes remain established. | No required direct-consumer migration; new widget code should use action and params-only forms. |
| `@webex/cc-components` call-control loader prop | Optional action parameter | Call-control consumers | Additive callback argument for compatible functions; coordinate typings | Consumers may ignore the argument, but action-aware loaders should use it. |
| `@webex/cc-components` list-item props | Optional `active`/`away` `presence` value | Internal list rows and direct type consumers | Additive optional prop | Consumers that omit it retain the plain avatar. |

### Cross-package impact

| Package | Change | Dependency direction | Release sequencing | Owner |
| --- | --- | --- | --- | --- |
| `@webex/contact-center` | Applies consult/transfer defaults through existing `getBuddyAgents`, `getQueues`, and `getEntryPoints`; Queue returns full records and EntryPoint maps EP-DN rows through its existing response wrapper. | SDK → store | Build/link first. | SDK maintainers |
| `@webex/cc-store` | Thin delegation and typed boundary. | store → SDK | Release with a compatible SDK version. | Widgets maintainers |
| `@webex/cc-task` | Carries action and pagination/search. | task → store | Release after store types. | Widgets maintainers |
| `@webex/cc-components` | Carries menu action on open/reload. | components → task callback | Release with task package. | Widgets maintainers |

## Contracts delta

**Provides — MODIFIED:** The widget packages provide action-aware list loading and preserve SDK result order/metadata without owning eligibility policy.

**Requires — MODIFIED:** The store requires the SDK's existing `getBuddyAgents`, `getQueues`, and `getEntryPoints` methods and their existing queue/entry-point request and response types, plus the action-aware buddy-agent option and Task destination controls.

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
| Queue list request | Existing queue search parameters; params-only calls add a complete filter only for an active non-telephony Task, while the legacy media form retains explicit channel scope. | Paginated destination discovery. | SDK owns reusable telephony eligibility, profile-view, and ordering defaults; store owns active Task context and legacy-call compatibility. | No new method or response; no widget-side returned-data filtering. |
| Entry-point list request | Existing entry-point search parameters, delegated without widget-owned filter policy. | Paginated destination discovery with mapped dialled numbers. | SDK owns the profile-scoped dial-number query, row mapping, and ordering defaults. | No new method or signature; no widget-selected filter, projection, view, or sort flags. |
| Dial-number list request | `page`, `pageSize`, `search` | Paginated address-book destination discovery. | AddressBook owns backend name ordering. | No widget-owned sort flags. |
| Buddy-agent row | `state` | Pass Avatar presence `active` only for `Available`; pass `away` otherwise. | SDK response owns agent state; Momentum owns presence presentation. | No identity or state value is logged or retained. |
| Dial-number / entry-point row | `AddressBookEntry.number` / optional `EntryPointRecord.number` | Show a secondary routable identifier below each destination name. | SDK response owns the fields; cc-components renders them unchanged. | Entry-point numbers come from the SDK's dial-number mapping. |
| Queue/entry-point paginated response | Existing `ContactServiceQueuesResponse` with full `ContactServiceQueue` rows and `EntryPointListResponse` with SDK-mapped `{id, name, number?}` `EntryPointRecord` rows; `meta` remains unchanged. | Preserve backend order, established typing, and pagination truth. | SDK/backend | Widgets must not project rows or reconstruct metadata. |

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
| Widgets are run with an SDK lacking the corrected defaults and action-aware buddy policy. | `packages/contact-center/store/package.json` | Pin the store to the compatible SDK release; currently `3.12.0-next.109`. |
| A future widget reintroduces local sorting/filtering. | `packages/contact-center/store/tests/storeEventsWrapper.ts` | Retain delegation and exact-response assertions. |
| Transfer action is lost during reload. | `packages/contact-center/cc-components/tests/components/task/CallControl/CallControlCustom/consult-transfer-popover.tsx` | Retain the action-specific reload assertion. |
| A Consult buddy request completes after the user switches to Transfer. | `packages/contact-center/task/src/helper.ts` | Track the newest buddy request and ignore older data, error fallback, and loading-state updates. |

## Error Matrix

| Failure | Store behavior | Task/UI behavior | Evidence |
| --- | --- | --- | --- |
| Buddy-agent SDK rejection | Log and rethrow. | Log, clear agents, end loading. | `packages/contact-center/store/src/storeEventsWrapper.ts`, `packages/contact-center/task/src/helper.ts` |
| Queue SDK rejection | Log and rethrow. | Log and return an empty paginated result. | `packages/contact-center/store/src/storeEventsWrapper.ts`, `packages/contact-center/task/src/helper.ts` |
| Entry-point SDK rejection | Log and rethrow. | Log and return an empty paginated result. | `packages/contact-center/store/src/storeEventsWrapper.ts`, `packages/contact-center/task/src/helper.ts` |
| Missing current task media | Omit media from the SDK request. | Existing UI flow continues. | `packages/contact-center/store/src/storeEventsWrapper.ts` |

## Resilience

- The change adds no retry or duplicate request loop; existing component reload remains the explicit retry mechanism.
- Buddy-agent loading retains only the newest action request, preventing a prior Consult/Transfer response from replacing the selected action's data or loading state.
- Empty fallbacks remain confined to the task/UI boundary, while the store preserves rejection semantics for other consumers.
- Response order and pagination are not cached or reconstructed by widgets.

## Observability

- Existing store and task error logs remain the diagnostic surface.
- Successful buddy-agent loading retains the count-only informational log; no agent identities or list contents are logged.
- No new metric, trace, alert, or PII-bearing log is introduced.

## Operations

- Install the pinned SDK dependency before building widgets so the corrected defaults and existing types resolve.
- Run the store, task, and cc-components unit suites plus touched package builds/styles before release.
- Roll back widgets and SDK together if the coordinated behavior is incompatible; no data migration or cleanup is required.

## Migration expectations

- Compatibility: queue, entry-point, and legacy buddy-agent callers retain their existing methods and call forms; action-aware buddy loading and params-only queue loading are additive overloads.
- Data or consumer transition: release a compatible SDK before or with the store, then task and component packages.
- Coexistence period: local development and published packages resolve the compatible SDK version pinned by the store.
- Completion and rollback outcome: all packages resolve the existing types and list methods; rollback is a coordinated dependency/code rollback with no persisted state.

## Serviceability

| Signal or support surface | Required change | Consumer or operator | Acceptance evidence |
| --- | --- | --- | --- |
| Store error log | Preserve SDK rejection context without list contents. | Widget maintainers | `packages/contact-center/store/tests/storeEventsWrapper.ts` |
| Task error log | Preserve list kind and operation context. | Widget maintainers | `packages/contact-center/task/tests/helper.ts` |
| Buddy load info log | Record count only. | Widget maintainers | `packages/contact-center/task/src/helper.ts` |

## Documentation obligations

- This approved delta modifies `STORE-R-015`, the task consult/transfer requirement family, and `CC-COMPONENTS-R-006` without overwriting the draft canonical module specs.
- The paired SDK feature spec remains the canonical owner for reusable queue eligibility/order/profile defaults and entry-point mapping/order/cache behavior. This widget delta owns only the active non-telephony queue filter override needed because the generic queue call carries no Task context.
- A future canonical-spec promotion must fold this delta into the routed module specs and reconcile the delta path rather than duplicate the requirements.

## Decision and change log

| Date | Decision or change | Rationale | Owner |
| --- | --- | --- | --- |
| 2026-08-21 | Preserved legacy buddy media and queue media-plus-params store calls, combined Task and caller queue filters, and made buddy-agent state latest-request-wins across action changes. | The simplified widget calls must not break direct store consumers, erase required digital Task scope, or allow a stale Consult response to replace Transfer results. | Developer + Codex |
| 2026-08-21 | Changed destination initials from the first two tokens to the first and last non-empty tokens. | Multi-token destination labels must yield compact, distinguishable initials such as `Queue e2e 1 → Q1` and `Entry point e2e set 1 → E1`. | Developer + Codex |
| 2026-08-21 | Mapped SDK availability to the Momentum Avatar's built-in `active`/`away` presence and removed widget-owned icon/color/position CSS. The provisional entry-point `dbId` subtitle was replaced with SDK-mapped `EntryPointRecord.number`, and entry-point requests now delegate without a task-media filter. | Figma and the installed design-system API assign presence presentation to Avatar, while the backend's dial-number mapping supplies the visible entry-point number and owns its query policy. | Developer + Codex |
| 2026-08-19 | Removed dependencies on new action/media/destination aliases and typed widget destinations from `TaskUIControls`; removed the queue `dbId` passthrough fixture. | Widgets need the existing methods, entity records, and Task control field only; deriving types prevents an unnecessary public SDK surface. | Developer + Codex |
| 2026-08-19 | Approved this exact MODIFIED delta path. | Avoid overwriting draft canonical module specs while keeping spec-currency with the implementation. | Developer |
| 2026-08-19 | Assigned reusable list policy to the SDK and retained only UI/runtime context in widgets. | Prevent policy duplication and ordering drift. | Developer + Codex |
| 2026-08-19 | Explicitly prohibited widget-side sorting/filtering of SDK destination results. | Preserve the backend order selected by the SDK request. | Developer + Codex |
| 2026-08-19 | Reused the existing queue and entry-point methods and full response types; removed the one-off consult/transfer destination/list abstractions. | Widget consumers need lists, not a parallel public model or method family. | Developer + Codex |
| 2026-08-19 | Removed widget selection of entry-point media and the consult-specific dial-number helper. | EntryPoint and AddressBook defaults must work for widgets out of the box; other SDK consumers can pass explicit overrides. | Developer + Codex |
| 2026-08-19 | Removed the widget/store destination-policy utility and raw profile/context plumbing; CallControl now renders the matching ordered `Task.uiControls.consultTransferDestinations` array. | Task already contains the live interaction and SDK-computed UI decisions, so no extra policy call or duplicated consumer logic is needed. | Developer + Codex |
| 2026-08-19 | Limited widget-owned list policy to a complete non-telephony request filter selected from the active Task media. | The existing generic SDK methods have no Task parameter and cannot infer which concurrent Task the UI is rendering; all reusable defaults and response decisions remain in the SDK. | Developer + Codex |
