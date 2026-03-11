# Migration Doc 001: Task Refactor Migration Overview

## Purpose

This document set guides the migration of CC Widgets from the **old ad-hoc task state management** to the **new state-machine-driven architecture** in CC SDK (`task-refactor` branch).

---

## Migration Document Index

| # | Document | Scope |
|---|----------|-------|
| 002 | [002-ui-controls-migration.md](./002-ui-controls-migration.md) | Replace `getControlsVisibility()` with `task.uiControls` |
| 003 | [003-store-event-wiring-migration.md](./003-store-event-wiring-migration.md) | Update store event handlers — same events, now emitted via state machine; task state updates handled by SDK (e.g., remove `refreshTaskList` calls) |
| 004 | [004-call-control-hook-migration.md](./004-call-control-hook-migration.md) | Refactor `useCallControl` hook and timer utils to consume `task.uiControls` |
| 005 | [005-incoming-task-migration.md](./005-incoming-task-migration.md) | Refactor `useIncomingTask` for state-machine offer/assign flow |
| 006 | [006-task-list-migration.md](./006-task-list-migration.md) | Refactor `useTaskList` for per-task `uiControls` |
| 008 | [008-store-task-utils-migration.md](./008-store-task-utils-migration.md) | Retire control-computation utils from `task-utils.ts` — SDK handles these now |
| 009 | [009-types-and-constants-migration.md](./009-types-and-constants-migration.md) | Align types/constants with SDK `TaskUIControls` and `TaskState` |
| 010 | [010-component-layer-migration.md](./010-component-layer-migration.md) | Update `cc-components` to accept `TaskUIControls` shape |
| 011 | [011-execution-plan.md](./011-execution-plan.md) | Step-by-step execution plan with milestones |
| 012 | [012-task-lifecycle-flows-old-vs-new.md](./012-task-lifecycle-flows-old-vs-new.md) | End-to-end task flows (14 scenarios) with old vs new tracing |
| 013 | [013-file-inventory-old-control-references.md](./013-file-inventory-old-control-references.md) | File-by-file inventory of every old control reference |
| 014 | [014-task-code-scan-report.md](./014-task-code-scan-report.md) | Deep code scan findings across both CC SDK and CC Widgets repos |

---

## Architectural Change: Old vs New

### Old Approach

Widgets derive control visibility from raw task data using `getControlsVisibility()`:

```
SDK emits 30+ task events →
Store handlers manually call refreshTaskList() and update observables →
Hooks call getControlsVisibility(deviceType, featureFlags, task, agentId, conferenceEnabled) →
Hooks derive state flags (isHeld, isConsultInitiated, isConferenceInProgress, etc.) →
Components receive a flat ControlVisibility object
```

Each hook and utility function independently interprets raw task data to decide which buttons to show/enable. Control logic is spread across `task-util.ts`, `task-utils.ts`, `timer-utils.ts`, and component utils.

### New Approach

SDK computes all control states internally via a state machine and exposes `task.uiControls`:

```
SDK state machine transitions on task events →
SDK computes TaskUIControls from (TaskState + TaskContext) in uiControlsComputer.ts →
SDK emits 'task:ui-controls-updated' event →
Widgets read task.uiControls directly →
Components receive TaskUIControls (structured per-control object)
```

The `TaskUIControls` type provides a per-control `{ isVisible, isEnabled }` shape for 17 controls:

```typescript
type TaskUIControlState = { isVisible: boolean; isEnabled: boolean };

type TaskUIControls = {
  accept: TaskUIControlState;
  decline: TaskUIControlState;
  hold: TaskUIControlState;
  transfer: TaskUIControlState;
  consult: TaskUIControlState;
  end: TaskUIControlState;
  recording: TaskUIControlState;
  mute: TaskUIControlState;
  consultTransfer: TaskUIControlState;
  endConsult: TaskUIControlState;
  conference: TaskUIControlState;
  exitConference: TaskUIControlState;
  transferConference: TaskUIControlState;
  mergeToConference: TaskUIControlState;
  wrapup: TaskUIControlState;
  switchToMainCall: TaskUIControlState;
  switchToConsult: TaskUIControlState;
};
```

Widgets no longer derive control visibility — they consume `task.uiControls` as the single source of truth.

---

## CC Widgets Files Affected

| Area | Path |
|------|------|
| Task hooks | `packages/contact-center/task/src/helper.ts` |
| Task UI utils (OLD — to be removed) | `packages/contact-center/task/src/Utils/task-util.ts` |
| Task timer utils | `packages/contact-center/task/src/Utils/timer-utils.ts` |
| Hold timer hook | `packages/contact-center/task/src/Utils/useHoldTimer.ts` |
| Task types | `packages/contact-center/task/src/task.types.ts` |
| Store event wrapper | `packages/contact-center/store/src/storeEventsWrapper.ts` |
| Store task utils | `packages/contact-center/store/src/task-utils.ts` |
| Store constants | `packages/contact-center/store/src/constants.ts` |
| CC Components — CallControl | `packages/contact-center/cc-components/src/components/task/CallControl/` |
| CC Components — CallControlCAD | `packages/contact-center/cc-components/src/components/task/CallControlCAD/` |
| CC Components types | `packages/contact-center/cc-components/src/components/task/task.types.ts` |

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

### 2. Event Name Mismatches Between Widget and SDK
Widget `store.types.ts` declares a local `TASK_EVENTS` enum (line 210: `TODO: remove this once cc sdk exports this enum`) with 5 events using CC-level naming that differ from SDK task-level naming:
- `AGENT_WRAPPEDUP = 'AgentWrappedUp'` → SDK: `TASK_WRAPPEDUP = 'task:wrappedup'`
- `AGENT_CONSULT_CREATED = 'AgentConsultCreated'` → SDK: `TASK_CONSULT_CREATED = 'task:consultCreated'`
- `AGENT_OFFER_CONTACT = 'AgentOfferContact'` → SDK: `TASK_OFFER_CONTACT = 'task:offerContact'`
- `CONTACT_RECORDING_PAUSED = 'ContactRecordingPaused'` → SDK: `TASK_RECORDING_PAUSED = 'task:recordingPaused'`
- `CONTACT_RECORDING_RESUMED = 'ContactRecordingResumed'` → SDK: `TASK_RECORDING_RESUMED = 'task:recordingResumed'`

See [009-types-and-constants-migration.md § Event Constants](./009-types-and-constants-migration.md) for the complete mapping.

---

## Migration Notes

These are specific implementation details that migration work must account for:

1. **`UIControlConfig` is built by SDK:** Widgets do NOT provide it. `deviceType`, `featureFlags`, `conferenceEnabled` can be removed from `useCallControlProps`. **`agentId` must be retained** — timer utilities need it for participant lookup.

2. **Timer utils depend on old `controlVisibility`:** `calculateStateTimerData()` and `calculateConsultTimerData()` in `timer-utils.ts` must be updated to accept `TaskUIControls` instead.

3. **`task:wrapup` timing:** The SDK sample app uses `setTimeout(..., 0)` before UI update after `task:wrapup` to avoid control flickering during the transition.

---

_Created: 2026-03-09_
_Updated: 2026-03-11 (restructured per reviewer feedback: simplified architecture section, removed Priority column and doc 007 row, removed SDK Version Requirements, simplified migration notes, added CallControlCAD to file list)_
