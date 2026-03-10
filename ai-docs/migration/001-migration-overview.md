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

## SDK Version Requirements

The CC Widgets migration depends on the CC SDK `task-refactor` branch being merged and released. Key new APIs:

| API | Type | Description |
|-----|------|-------------|
| `task.uiControls` | Property (getter) | Pre-computed `TaskUIControls` object |
| `task:ui-controls-updated` | Event | Emitted when any control's visibility/enabled state changes |
| `TaskUIControls` | Type | `{ [controlName]: { isVisible: boolean, isEnabled: boolean } }` |
| `TaskState` | Enum | Explicit task states (IDLE, OFFERED, CONNECTED, HELD, etc.) |

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
