# Migration Doc 001: Task Refactor Migration Overview

## Purpose

This document set guides the migration of CC Widgets from the **old ad-hoc task state management** to the **new state-machine-driven architecture** in CC SDK (`task-refactor` branch).

---

## Migration Document Index

| # | Document | Scope | Risk | Priority |
|---|----------|-------|------|----------|
| 002 | [002-ui-controls-migration.md](./002-ui-controls-migration.md) | Replace `getControlsVisibility()` with `task.uiControls` | **High** (core UX) | P0 |
| 003 | [003-store-event-wiring-migration.md](./003-store-event-wiring-migration.md) | Refactor store event handlers to leverage state machine events | **Medium** | P1 |
| 004 | [004-call-control-hook-migration.md](./004-call-control-hook-migration.md) | Refactor `useCallControl` hook, timer utils, fix bugs | **High** (largest widget) | P0 |
| 005 | [005-incoming-task-migration.md](./005-incoming-task-migration.md) | Refactor `useIncomingTask` for state-machine offer/assign flow | **Low** | P2 |
| 006 | [006-task-list-migration.md](./006-task-list-migration.md) | Refactor `useTaskList` for per-task `uiControls` | **Low** | P2 |
| 007 | [007-outdial-call-migration.md](./007-outdial-call-migration.md) | No changes needed (CC-level, not task-level) | **Low** | P3 |
| 008 | [008-store-task-utils-migration.md](./008-store-task-utils-migration.md) | Retire or thin out `task-utils.ts`, fix `findHoldTimestamp` dual signatures | **Medium** | P1 |
| 009 | [009-types-and-constants-migration.md](./009-types-and-constants-migration.md) | Align types/constants with SDK, document `UIControlConfig` | **Medium** | P1 |
| 010 | [010-component-layer-migration.md](./010-component-layer-migration.md) | Update `cc-components` to accept new control shape from SDK | **Medium** | P1 |
| 011 | [011-execution-plan.md](./011-execution-plan.md) | Step-by-step spec-first execution plan with 10 milestones | — | — |
| 012 | [012-task-lifecycle-flows-old-vs-new.md](./012-task-lifecycle-flows-old-vs-new.md) | End-to-end task flows (14 scenarios) with old vs new tracing | — | Reference |
| 013 | [013-file-inventory-old-control-references.md](./013-file-inventory-old-control-references.md) | Complete file-by-file inventory of every old control reference | — | Reference |
| 014 | [014-task-code-scan-report.md](./014-task-code-scan-report.md) | Deep code scan findings across both CC SDK and CC Widgets repos | — | Reference |

---

## Key Architectural Shift

### Before (Old Approach)
```
SDK emits 30+ events → Store handlers manually update observables →
Widgets compute UI controls via getControlsVisibility() →
Components receive {isVisible, isEnabled} per control
```

**Problems:**
- Control visibility logic duplicated between SDK and widgets
- Ad-hoc state derivation from raw task data (consult status, hold status, conference flags)
- Fragile: every new state requires changes in widgets, store utils, AND component logic
- No single source of truth for "what state is this task in?"

### After (New Approach)
```
SDK state machine handles all transitions →
SDK computes task.uiControls automatically →
SDK emits task:ui-controls-updated →
Widgets consume task.uiControls directly →
Components receive {isVisible, isEnabled} per control
```

**Benefits:**
- Single source of truth: `task.uiControls` from SDK
- Widget code dramatically simplified (remove ~600 lines of control visibility logic)
- Store utils thinned (most consult/conference/hold status checks no longer needed)
- New states automatically handled by SDK, zero widget changes needed
- Parity with Agent Desktop guaranteed by SDK

---

## Repo Paths Reference

### CC Widgets (this repo)
| Area | Path |
|------|------|
| Task widgets | `packages/contact-center/task/src/` |
| Task hooks | `packages/contact-center/task/src/helper.ts` |
| Task UI utils (OLD) | `packages/contact-center/task/src/Utils/task-util.ts` |
| Task constants | `packages/contact-center/task/src/Utils/constants.ts` |
| Task timer utils | `packages/contact-center/task/src/Utils/timer-utils.ts` |
| Hold timer hook | `packages/contact-center/task/src/Utils/useHoldTimer.ts` |
| Task types | `packages/contact-center/task/src/task.types.ts` |
| Store | `packages/contact-center/store/src/store.ts` |
| Store event wrapper | `packages/contact-center/store/src/storeEventsWrapper.ts` |
| Store task utils (OLD) | `packages/contact-center/store/src/task-utils.ts` |
| Store constants | `packages/contact-center/store/src/constants.ts` |
| CC Components task | `packages/contact-center/cc-components/src/components/task/` |
| CC Components types | `packages/contact-center/cc-components/src/components/task/task.types.ts` |

### CC SDK (task-refactor branch)
| Area | Path |
|------|------|
| State machine | `packages/@webex/contact-center/src/services/task/state-machine/` |
| UI controls computer | `.../state-machine/uiControlsComputer.ts` |
| State machine config | `.../state-machine/TaskStateMachine.ts` |
| Guards | `.../state-machine/guards.ts` |
| Actions | `.../state-machine/actions.ts` |
| Constants (TaskState, TaskEvent) | `.../state-machine/constants.ts` |
| Types | `.../state-machine/types.ts` |
| Task service | `.../task/Task.ts` |
| Task manager | `.../task/TaskManager.ts` |
| Task types | `.../task/types.ts` |
| Sample app | `docs/samples/contact-center/app.js` |

---

## CC SDK Task-Refactor Branch Reference

> **Repo:** [webex/webex-js-sdk (task-refactor)](https://github.com/webex/webex-js-sdk/tree/task-refactor)
> **Local path:** `/Users/akulakum/Documents/CC_SDK/webex-js-sdk` (branch: `task-refactor`)

### Key SDK Source Files

| File | Purpose |
|------|---------|
| `uiControlsComputer.ts` | Computes `TaskUIControls` from `TaskState` + `TaskContext` — the single source of truth for all control visibility/enabled states |
| `constants.ts` | `TaskState` enum (IDLE, OFFERED, CONNECTED, HELD, CONSULT_INITIATING, CONSULTING, CONF_INITIATING, CONFERENCING, WRAPPING_UP, COMPLETED, TERMINATED, etc.) and `TaskEvent` enum |
| `types.ts` | `TaskContext`, `UIControlConfig`, `TaskStateMachineConfig` |
| `TaskStateMachine.ts` | State machine configuration with transitions, guards, and actions |
| `actions.ts` | State machine action implementations |
| `guards.ts` | Transition guard conditions |
| `../Task.ts` | Task service exposing `task.uiControls` getter and `task:ui-controls-updated` event |
| `../TaskUtils.ts` | Shared utility functions used by `uiControlsComputer.ts` (e.g., `getIsConferenceInProgress`, `getIsCustomerInCall`) |

### Key SDK Architectural Decisions

These decisions in the SDK directly impact how the migration docs should be interpreted:

1. **`exitConference` visibility:** In the SDK, `exitConference` is `VISIBLE_DISABLED` (not hidden) during consulting-from-conference. This differs from the old widget logic where it was hidden. `exitConference.isVisible` is therefore more reliable in the new SDK for detecting conference state, but consulted agents not in conferencing state still see `DISABLED`.

2. **`TaskState.CONSULT_INITIATING` vs `CONSULTING`:** The SDK has `CONSULT_INITIATING` (consult requested, async in-progress) and `CONSULTING` (consult accepted, actively consulting) as distinct states. The old widget constant `TASK_STATE_CONSULT` ('consult') maps to `CONSULT_INITIATING`, NOT `CONSULTING`. `TaskState.CONSULT_INITIATED` exists in the enum but is marked "NOT IMPLEMENTED".

3. **Recording control:** SDK computes: `recordingInProgress ? VISIBLE_ENABLED : VISIBLE_DISABLED` (line 228 of `uiControlsComputer.ts`). So: `recording.isEnabled = true` when recording is active (button clickable to pause). `recording.isEnabled = false` when recording is NOT active (button visible but disabled — nothing to pause/resume). Recording start is handled separately, not via this control's `isEnabled` flag. Widget button wiring (`disabled: !isEnabled`) is correct with this semantic.

4. **`isHeld` derivation:** The SDK computes `isHeld` from `serverHold ?? state === TaskState.HELD` (line 81 of `uiControlsComputer.ts`). Hold control can be `VISIBLE_DISABLED` in conference/consulting states without meaning the call is held. Widgets must derive `isHeld` from task data (`findHoldStatus`), not from `controls.hold.isEnabled`.

5. **`UIControlConfig` built internally:** The SDK builds `UIControlConfig` from agent profile, `callProcessingDetails`, media type, and voice variant. Widgets do NOT need to provide it.

6. **Conference state (`inConference`):** The SDK computes `inConference` as `conferenceActive && (isConferencing || selfInMainCall || consultInitiator)` (line 97). This is broader than `isConferencing` state alone, accounting for backend conference flags and consult-from-conference flows.

---

## SDK Version Requirements

The CC Widgets migration depends on the CC SDK `task-refactor` branch being merged and released. Key new APIs:

| API | Type | Description |
|-----|------|-------------|
| `task.uiControls` | Property (getter) | Pre-computed `TaskUIControls` object |
| `task:ui-controls-updated` | Event | Emitted when any control's visibility/enabled state changes |
| `TaskUIControls` | Type | `{ [controlName]: { isVisible: boolean, isEnabled: boolean } }` |
| `TaskState` | Enum | Explicit task states (IDLE, OFFERED, CONNECTED, HELD, etc.) |

---

## SDK Package Entry Point — Pending Additions

> **As of the `task-refactor` branch snapshot reviewed,** the items below are properly exported from their individual source files within the SDK but are **not yet re-exported** from the package-level entry point (`src/index.ts`). This means widgets cannot `import { ... } from '@webex/contact-center'` for these items until the SDK team adds them.
>
> **A Jira ticket is being created** to track adding these missing exports to the SDK `src/index.ts` before the widget migration begins.

### 1. Add `uiControls` to `ITask` interface

The `uiControls` getter is defined on the **concrete `Task` class** and works at runtime on all task instances (Voice, Digital, WebRTC). However, it is not yet declared on the `ITask` interface — only on `IDigital`. Since widgets import `ITask`, TypeScript won't recognize `task.uiControls` until the interface is updated.

**SDK change:** Add `uiControls: TaskUIControls` to `ITask` interface in `services/task/types.ts`.

### 2. Add `TaskUIControls` type to package exports

`TaskUIControls` is exported from `services/task/types.ts` but not re-exported from `src/index.ts`. Similarly, `TaskUIControlState` (the `{ isVisible, isEnabled }` shape) is a local type — should be exported if widgets need it for prop typing.

**SDK change:** Add to the "Task related types" export block in `src/index.ts`:
```typescript
export type { TaskUIControls, TaskUIControlState } from './services/task/types';
```

### 3. Add `getDefaultUIControls()` to package exports

`getDefaultUIControls()` is exported from `uiControlsComputer.ts` and the state-machine `index.ts`, but not from `src/index.ts`. Widgets need it as a fallback: `task?.uiControls ?? getDefaultUIControls()`.

**SDK change:** Add to `src/index.ts`:
```typescript
export { getDefaultUIControls } from './services/task/state-machine/uiControlsComputer';
```

### 4. Add `TaskState` enum to package exports

`TaskState` is exported from the state-machine internal module but not from the package entry point. Widgets need it for consult timer labeling — `calculateConsultTimerData` must distinguish `CONSULT_INITIATING` (consult requested) from `CONSULTING` (consult accepted) for correct timer labels.

**SDK change:** Add to `src/index.ts`:
```typescript
export { TaskState } from './services/task/state-machine/constants';
```

### 5. Add `IVoice`, `IDigital`, `IWebRTC` to package exports

These task subtype interfaces are defined but not re-exported. Widgets may need them for type narrowing (e.g., to access `holdResume()` on voice tasks).

**SDK change:** Add to `src/index.ts`:
```typescript
export type { IVoice, IDigital, IWebRTC } from './services/task/types';
```

### 6. `holdResume()` only on Voice tasks (informational — no SDK change needed)

The base `Task` class defines `hold()` and `resume()` that throw `unsupportedMethodError`. **Voice** tasks override both to delegate to `holdResume()` — a single toggle. The `ITask` interface exposes `hold(mediaResourceId?)` and `resume(mediaResourceId?)`, but voice tasks actually use `holdResume()` internally (from `IVoice`).

**Widget impact:** Widgets calling `task.hold()` / `task.resume()` will work correctly on voice tasks (they delegate to `holdResume`). No widget change needed unless widgets want to call `holdResume()` directly — in which case they need `IVoice` typing (covered in item 4 above).

---

## Pre-existing Bugs Found During Analysis

These bugs exist in the current codebase and should be fixed during migration:

### 1. Recording Callback Cleanup Mismatch
**File:** `task/src/helper.ts` (useCallControl), lines 634-653

Setup uses `TASK_EVENTS.TASK_RECORDING_PAUSED` / `TASK_EVENTS.TASK_RECORDING_RESUMED`, but cleanup uses `TASK_EVENTS.CONTACT_RECORDING_PAUSED` / `TASK_EVENTS.CONTACT_RECORDING_RESUMED`. Callbacks are never properly removed.

### 2. `findHoldTimestamp` Dual Signatures
Two `findHoldTimestamp` functions with different signatures:
- `store/src/task-utils.ts`: `findHoldTimestamp(task: ITask, mType: string)`
- `task/src/Utils/task-util.ts`: `findHoldTimestamp(interaction: Interaction, mType: string)`

Should be consolidated to one function during migration.

### 3. Event Name Mismatches Between Widget and SDK
Widget `store.types.ts` declares a local `TASK_EVENTS` enum (line 210: `TODO: remove this once cc sdk exports this enum`) with 5 events using CC-level naming that differ from SDK task-level naming:
- `AGENT_WRAPPEDUP = 'AgentWrappedUp'` → SDK: `TASK_WRAPPEDUP = 'task:wrappedup'`
- `AGENT_CONSULT_CREATED = 'AgentConsultCreated'` → SDK: `TASK_CONSULT_CREATED = 'task:consultCreated'`
- `AGENT_OFFER_CONTACT = 'AgentOfferContact'` → SDK: `TASK_OFFER_CONTACT = 'task:offerContact'`
- `CONTACT_RECORDING_PAUSED = 'ContactRecordingPaused'` → SDK: `TASK_RECORDING_PAUSED = 'task:recordingPaused'`
- `CONTACT_RECORDING_RESUMED = 'ContactRecordingResumed'` → SDK: `TASK_RECORDING_RESUMED = 'task:recordingResumed'`

See [009-types-and-constants-migration.md § Event Constants](./009-types-and-constants-migration.md) for the complete mapping.

---

## Critical Migration Notes

### UIControlConfig Is Built by SDK (Not by Widgets)

Widgets do NOT need to provide `UIControlConfig`. The SDK builds it internally from agent profile, `callProcessingDetails`, media type, and voice variant. This means `deviceType`, `featureFlags`, and `conferenceEnabled` **can be removed** from `useCallControlProps` — they are only used for `getControlsVisibility()` which is being eliminated. **Note:** `agentId` must be retained because it is also used by timer utilities (`calculateStateTimerData`, `calculateConsultTimerData`) to look up the agent's participant record from `interaction.participants`.

### Timer Utils Dependency on `controlVisibility`

`calculateStateTimerData()` and `calculateConsultTimerData()` in `timer-utils.ts` accept `controlVisibility` as a parameter with old control names. These functions must be migrated to accept `TaskUIControls` (new control names).

### `task:wrapup` Race Condition

The SDK sample app uses `setTimeout(..., 0)` before updating UI after `task:wrapup`. Consider adding a similar guard in the hook to avoid control flickering during wrapup transition.

### Sample App Reference Pattern

The CC SDK sample app (`docs/samples/contact-center/app.js`) demonstrates the canonical pattern:

```javascript
task.on('task:ui-controls-updated', () => {
  updateCallControlUI(task);
});

function updateCallControlUI(task) {
  const uiControls = task.uiControls || {};
  applyAllControlsFromUIControls(uiControls);
}

function applyControlState(element, control) {
  element.style.display = control?.isVisible ? 'inline-block' : 'none';
  element.disabled = !control?.isEnabled;
}
```

---

_Created: 2026-03-09_
_Updated: 2026-03-09 (added deep scan findings, before/after examples, bug reports)_
_Updated: 2026-03-11 (SDK export gaps, holdResume, event name mismatches — from deep SDK comparison)_
