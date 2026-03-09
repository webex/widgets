# Migration Doc 011: Execution Plan (Spec-First)

## Overview

This plan uses the **spec-driven development** approach already established in CC Widgets. Each milestone starts with writing specs (tests), then implementing to make specs pass. This ensures parity between old and new behavior.

---

## Prerequisites

- [ ] CC SDK `task-refactor` branch merged and released (or linked locally)
- [ ] `TaskUIControls` type and `task:ui-controls-updated` event available in `@webex/contact-center`
- [ ] `task.uiControls` getter available on `ITask`
- [ ] Team alignment on migration approach

---

## Milestone Overview

| # | Milestone | Scope | Est. Effort | Risk | Depends On |
|---|-----------|-------|-------------|------|------------|
| M0 | SDK integration setup | Link SDK, verify types | 1 day | Low | SDK release |
| M1 | Types & constants alignment | Import new types, add adapters | 1-2 days | Low | M0 |
| M2 | Store event wiring simplification | Simplify event handlers, add `ui-controls-updated` | 2-3 days | Medium | M0 |
| M3 | Store task-utils thinning | Remove redundant utils | 1-2 days | Low | M2 |
| M3.5 | Timer utils migration | Update timer-utils to accept `TaskUIControls` | 1 day | Low | M3 |
| M4 | CallControl hook refactor | Core: replace `getControlsVisibility` with `task.uiControls` | 3-5 days | **High** | M1, M2, M3, M3.5 |
| M5 | Component layer update | Update `cc-components` prop interfaces | 2-3 days | Medium | M4 |
| M6 | IncomingTask migration | Use `task.uiControls.accept/decline` | 1 day | Low | M1 |
| M7 | TaskList migration | Optional status enhancement | 1 day | Low | M1 |
| M8 | Integration testing & cleanup | E2E, remove dead code, docs | 2-3 days | Medium | All |

**Total estimated effort: 15–23 days**

---

## Detailed Milestone Plans

### M0: SDK Integration Setup (1 day)

**Goal:** Verify the new SDK API is available and types compile.

**Steps:**
1. Update `@webex/contact-center` dependency to task-refactor version
2. Verify `TaskUIControls` type is importable
3. Verify `task.uiControls` getter exists on `ITask`
4. Verify `TASK_EVENTS.TASK_UI_CONTROLS_UPDATED` constant exists
5. Run `yarn build` to confirm no type errors

**Spec:** Write a minimal integration test that creates a mock task and reads `uiControls`.

**Validation:** `yarn build` passes with new SDK version.

---

### M1: Types & Constants Alignment (1-2 days)

**Ref:** [009-types-and-constants-migration.md](./009-types-and-constants-migration.md)

**Goal:** Import new SDK types into widget packages without changing runtime behavior.

**Spec first:**
```typescript
// Test: TaskUIControls type compatibility
import { TaskUIControls } from '@webex/contact-center';
const controls: TaskUIControls = task.uiControls;
expect(controls.hold).toHaveProperty('isVisible');
expect(controls.hold).toHaveProperty('isEnabled');
```

**Steps:**
1. Add `TaskUIControls` import to `task/src/task.types.ts`
2. Create adapter type mapping old control names → new (for gradual migration)
3. Add `TASK_UI_CONTROLS_UPDATED` to store event constants
4. Review and annotate constants for deprecation

**Validation:** All existing tests still pass. New types compile.

---

### M2: Store Event Wiring Simplification (2-3 days)

**Ref:** [003-store-event-wiring-migration.md](./003-store-event-wiring-migration.md)

**Goal:** Simplify store event handlers; add `task:ui-controls-updated` subscription.

**Spec first:**
```typescript
// Test: Store registers ui-controls-updated listener
describe('registerTaskEventListeners', () => {
  it('should register TASK_UI_CONTROLS_UPDATED handler', () => {
    store.registerTaskEventListeners(mockTask);
    expect(mockTask.on).toHaveBeenCalledWith(
      TASK_EVENTS.TASK_UI_CONTROLS_UPDATED, expect.any(Function)
    );
  });

  it('should NOT call refreshTaskList on TASK_HOLD', () => {
    // Verify simplified handler
  });
});
```

**Steps:**
1. Add `TASK_UI_CONTROLS_UPDATED` handler in `registerTaskEventListeners()`
2. Replace `refreshTaskList()` calls with callback-only for: TASK_HOLD, TASK_RESUME, TASK_CONSULT_END, all conference events
3. Keep `refreshTaskList()` only for: initialization, hydration
4. Update tests for each modified handler

**Order (low risk → high risk):**
1. Add new `TASK_UI_CONTROLS_UPDATED` handler (additive, no breakage)
2. Simplify conference event handlers (less critical)
3. Simplify hold/resume handlers (medium impact)
4. Simplify consult handlers (medium impact)
5. Remove unnecessary `refreshTaskList()` calls (highest impact)

**Validation:** All existing widget tests pass. Store correctly fires callbacks on events.

---

### M3: Store Task-Utils Thinning (1-2 days)

**Ref:** [008-store-task-utils-migration.md](./008-store-task-utils-migration.md)

**Goal:** Remove utility functions that are now handled by SDK.

**Spec first:**
```typescript
// Test: Verify no consumers remain for removed functions
// (Static analysis — ensure no import of getConsultStatus, getIsConferenceInProgress, etc.)
```

**Steps:**
1. Search codebase for each function to verify consumers
2. Remove functions with zero consumers after M2 changes
3. Mark functions with remaining consumers for later removal (after M4/M5)
4. Keep display-only functions (`getTaskStatus`, `getConferenceParticipants`, etc.)

**Validation:** Build succeeds. No runtime errors.

---

### M3.5: Timer Utils Migration (1 day)

**Ref:** [004-call-control-hook-migration.md](./004-call-control-hook-migration.md#timer-utils-migration)

**Goal:** Update `calculateStateTimerData()` and `calculateConsultTimerData()` to accept `TaskUIControls`.

**Why:** These functions accept `controlVisibility` (old shape) as a parameter and derive timer labels from it. They must be migrated before M4 since `useCallControl` depends on them.

**Spec first:**
```typescript
describe('calculateStateTimerData with TaskUIControls', () => {
  it('should return Wrap Up label when controls.wrapup.isVisible', () => {
    const controls = { ...getDefaultUIControls(), wrapup: { isVisible: true, isEnabled: true } };
    const result = calculateStateTimerData(mockTask, controls, agentId);
    expect(result.label).toBe('Wrap Up');
  });
});
```

**Steps:**
1. Update `calculateStateTimerData(task, controls, agentId)` signature
2. Replace `controlVisibility.isConsultInitiatedOrAccepted` → `controls.endConsult.isVisible`
3. Replace `controlVisibility.isHeld` → derive from `controls.hold`
4. Update `calculateConsultTimerData(task, controls, agentId)` similarly
5. Update all test cases

**Also fix during this milestone:**
- Consolidate `findHoldTimestamp` dual signatures (store vs task-util versions)

---

### M4: CallControl Hook Refactor (3-5 days) — CRITICAL PATH

**Ref:** [004-call-control-hook-migration.md](./004-call-control-hook-migration.md)

**Goal:** Replace `getControlsVisibility()` with `task.uiControls` in `useCallControl`.

**Spec first (write ALL specs before implementation):**

```typescript
describe('useCallControl with task.uiControls', () => {
  // Parity specs: each scenario must produce identical control states
  
  describe('connected voice call', () => {
    it('should show hold, mute, end, transfer, consult controls', () => {
      mockTask.uiControls = {
        hold: { isVisible: true, isEnabled: true },
        mute: { isVisible: true, isEnabled: true },
        end: { isVisible: true, isEnabled: true },
        transfer: { isVisible: true, isEnabled: true },
        consult: { isVisible: true, isEnabled: true },
        // ... all other controls disabled
      };
      const { result } = renderHook(() => useCallControl(props));
      expect(result.current.controls.hold).toEqual({ isVisible: true, isEnabled: true });
    });
  });

  describe('held voice call', () => {
    it('should show hold (enabled=true for resume), disable end/mute', () => { /* ... */ });
  });

  describe('consulting', () => {
    it('should show endConsult, switchToMainCall, switchToConsult, mergeToConference', () => { /* ... */ });
  });

  describe('conferencing', () => {
    it('should show exitConference, disable hold', () => { /* ... */ });
  });

  describe('wrapping up', () => {
    it('should show only wrapup control', () => { /* ... */ });
  });

  describe('digital channel', () => {
    it('should show only accept, end, transfer, wrapup', () => { /* ... */ });
  });

  describe('ui-controls-updated event', () => {
    it('should re-render when task emits ui-controls-updated', () => { /* ... */ });
  });

  describe('no task', () => {
    it('should return default controls when no task', () => { /* ... */ });
  });
});
```

**Steps:**
1. Write comprehensive parity specs (30+ test cases covering all states)
2. Create `adaptSDKControls()` adapter function (maps SDK names to old names if needed during transition)
3. Replace `getControlsVisibility()` call in `useCallControl` with `task.uiControls`
4. Add `task:ui-controls-updated` subscription with `useEffect`
5. Update hook return type to use new control names
6. Remove old state flags from return
7. Run parity specs — fix any mismatches

**Parity verification approach:**
- For each state (connected, held, consulting, conferencing, wrapping-up, offered):
  - Mock task with known data
  - Call old `getControlsVisibility()` → capture result
  - Read `task.uiControls` → capture result
  - Compare: every control must have same `isVisible`/`isEnabled`
  - Document and resolve any differences (old bug vs new behavior)

**Validation:** All 30+ parity specs pass. All existing hook tests pass (with updated assertions).

---

### M5: Component Layer Update (2-3 days)

**Ref:** [010-component-layer-migration.md](./010-component-layer-migration.md)

**Goal:** Update `cc-components` to accept new control prop shape.

**Spec first:**
```typescript
describe('CallControlComponent', () => {
  it('should render hold button from controls.hold', () => {
    render(<CallControlComponent controls={mockControls} {...otherProps} />);
    expect(screen.getByTestId('hold-button')).toBeVisible();
  });

  it('should hide mute button when controls.mute.isVisible=false', () => {
    const controls = { ...mockControls, mute: { isVisible: false, isEnabled: false } };
    render(<CallControlComponent controls={controls} {...otherProps} />);
    expect(screen.queryByTestId('mute-button')).not.toBeInTheDocument();
  });
});
```

**Steps:**
1. Update `CallControlComponentProps` to accept `controls: TaskUIControls`
2. Update `CallControlComponent` to read from `controls.*`
3. Update `CallControlConsult` component
4. Update `IncomingTaskComponent` if needed
5. Update all component tests

**Validation:** All component tests pass. Visual output identical.

---

### M6: IncomingTask Migration (1 day)

**Ref:** [005-incoming-task-migration.md](./005-incoming-task-migration.md)

**Goal:** Use `task.uiControls.accept/decline` in IncomingTask.

**Spec first:**
```typescript
describe('useIncomingTask with uiControls', () => {
  it('should derive accept visibility from task.uiControls.accept', () => { /* ... */ });
  it('should derive decline visibility from task.uiControls.decline', () => { /* ... */ });
});
```

**Steps:**
1. Replace `getAcceptButtonVisibility()` / `getDeclineButtonVisibility()` with `task.uiControls`
2. Update component props
3. Update tests

**Validation:** IncomingTask tests pass. Accept/decline work for voice and digital.

---

### M7: TaskList Migration (1 day)

**Ref:** [006-task-list-migration.md](./006-task-list-migration.md)

**Goal:** Optionally enhance task status display; verify compatibility.

**Steps:**
1. Verify `useTaskList` works with new SDK (should be compatible)
2. Optionally enhance `getTaskStatus()` to use SDK state info
3. Update tests if any changes made

**Validation:** TaskList renders correctly with all task states.

---

### M8: Integration Testing & Cleanup (2-3 days)

**Goal:** End-to-end verification, dead code removal, documentation update.

**Steps:**

1. **E2E Test Matrix:**

| Scenario | Widgets Involved | Verify |
|----------|-----------------|--------|
| Incoming voice call → accept → end | IncomingTask, CallControl | Accept button, end button |
| Incoming voice call → reject | IncomingTask | Decline button, RONA timer |
| Connected → hold → resume | CallControl | Hold toggle, timer |
| Connected → consult → end consult | CallControl | Consult flow controls |
| Connected → consult → conference | CallControl | Merge, conference controls |
| Conference → exit | CallControl | Exit conference |
| Conference → transfer conference | CallControl | Transfer conference |
| Connected → transfer (blind) | CallControl | Transfer popover |
| Connected → end → wrapup | CallControl | Wrapup button |
| Outdial → connected → end | OutdialCall, CallControl | Full outdial flow |
| Digital task → accept → end → wrapup | IncomingTask, CallControl | Digital controls |
| Multiple tasks in list | TaskList | Task selection, per-task controls |
| Page refresh → hydrate | All | Restore state correctly |

2. **Bug fixes (found during analysis):**
   - Fix recording callback cleanup mismatch (`TASK_RECORDING_PAUSED` vs `CONTACT_RECORDING_PAUSED`)
   - Consolidate `findHoldTimestamp` dual signatures (store vs task-util)
   - Add `task:wrapup` race guard if needed

3. **Dead code removal:**
   - Delete `task/src/Utils/task-util.ts` (or reduce to `findHoldTimestamp` only)
   - Remove unused store utils
   - Remove unused constants
   - Remove unused type definitions

4. **Documentation updates:**
   - Update `task/ai-docs/widgets/CallControl/AGENTS.md` and `ARCHITECTURE.md`
   - Update `task/ai-docs/widgets/IncomingTask/AGENTS.md` and `ARCHITECTURE.md`
   - Update `store/ai-docs/AGENTS.md` and `ARCHITECTURE.md`
   - Update `cc-components/ai-docs/AGENTS.md`

5. **Final validation:**
   - `yarn build` — no errors
   - `yarn test:unit` — all pass
   - `yarn test:styles` — no lint errors
   - Sample apps (React + WC) work correctly

---

## Risk Mitigation

### High-Risk Areas
1. **CallControl hook refactor (M4)** — largest change, most complex logic
   - **Mitigation:** Comprehensive parity specs written BEFORE implementation
   - **Rollback:** Old `getControlsVisibility()` stays in codebase until M8 cleanup

2. **Store event wiring (M2)** — removing `refreshTaskList()` could cause stale data
   - **Mitigation:** Gradual removal; keep `refreshTaskList()` as fallback initially
   - **Rollback:** Re-add `refreshTaskList()` calls if data staleness detected

3. **Consult/Conference flows** — most complex state transitions
   - **Mitigation:** Dedicated parity specs for every consult/conference scenario
   - **Mitigation:** Test with Agent Desktop to verify identical behavior

### Low-Risk Areas
- OutdialCall (no changes needed)
- IncomingTask (minimal changes)
- TaskList (minimal changes)
- Types alignment (additive, no runtime changes)

---

## Spec-First Checklist

For each milestone, complete these in order:

1. [ ] Write spec file with test cases for NEW behavior
2. [ ] Write parity tests (old behavior == new behavior) where applicable
3. [ ] Run specs — verify they FAIL (red)
4. [ ] Implement changes
5. [ ] Run specs — verify they PASS (green)
6. [ ] Run ALL existing tests — verify no regressions
7. [ ] `yarn build` — verify compilation
8. [ ] Code review with team
9. [ ] Mark milestone complete

---

## Recommended Order of Execution

```
M0 (SDK setup)
  │
  ├── M1 (types)         ─┐
  └── M2 (store events)  ─┤
                           │
                     M3 (store utils)
                           │
                     M3.5 (timer utils)
                           │
                     M4 (CallControl hook)   ← CRITICAL PATH
                           │
                     M5 (components)
                           │
                     ├── M6 (IncomingTask)
                     └── M7 (TaskList)
                           │
                     M8 (integration + cleanup + bug fixes)
```

**M0 → M1 + M2 (parallel) → M3 → M3.5 → M4 → M5 → M6 + M7 (parallel) → M8**

---

_Created: 2026-03-09_
_Parent: [001-migration-overview.md](./001-migration-overview.md)_
