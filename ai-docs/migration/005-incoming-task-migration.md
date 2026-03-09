# Migration Doc 005: IncomingTask Widget Migration

## Summary

The IncomingTask widget handles task offer/accept/reject flows. The state machine changes are minimal here since accept/decline SDK methods are unchanged. The main change is that the OFFERED → CONNECTED/TERMINATED transitions are now explicit state machine states, and `task.uiControls.accept`/`decline` can drive button visibility instead of widget-side logic.

---

## Old Approach

### Entry Point
**File:** `packages/contact-center/task/src/helper.ts`
**Hook:** `useIncomingTask(props: UseTaskProps)`

### How It Works (Old)
1. Store sets `incomingTask` observable on `TASK_INCOMING` event
2. Widget (observer) re-renders when `incomingTask` changes
3. Hook registers per-task callbacks: `TASK_ASSIGNED`, `TASK_CONSULT_ACCEPTED`, `TASK_END`, `TASK_REJECT`, `TASK_CONSULT_END`
4. Accept → `task.accept()` → SDK → `TASK_ASSIGNED` → `onAccepted` callback
5. Reject → `task.decline()` → SDK → `TASK_REJECT` → `onRejected` callback
6. Timer expiry (RONA) → `reject()` → `task.decline()`
7. Accept/Decline button visibility computed by `getAcceptButtonVisibility()` / `getDeclineButtonVisibility()` in task-util.ts

---

## New Approach

### What Changes
1. **Accept/Decline visibility** → now available via `task.uiControls.accept` / `task.uiControls.decline`
2. **State machine states**: IDLE → OFFERED → (CONNECTED on accept | TERMINATED on reject/RONA)
3. **SDK methods unchanged**: `task.accept()`, `task.decline()` still work the same
4. **Events unchanged**: `TASK_ASSIGNED`, `TASK_REJECT` still emitted

### Minimal Changes Required
- Replace `getAcceptButtonVisibility()` / `getDeclineButtonVisibility()` with `task.uiControls.accept` / `task.uiControls.decline`
- Optionally subscribe to `task:ui-controls-updated` for reactive updates
- Keep all callback registration as-is (accept/reject lifecycle callbacks)

---

## Old → New Mapping

| Aspect | Old | New |
|--------|-----|-----|
| Accept visible | `getAcceptButtonVisibility(isBrowser, isPhone, webRtc, isCall, isDigital)` | `task.uiControls.accept.isVisible` |
| Decline visible | `getDeclineButtonVisibility(isBrowser, webRtc, isCall)` | `task.uiControls.decline.isVisible` |
| Accept action | `task.accept()` | `task.accept()` (unchanged) |
| Decline action | `task.decline()` | `task.decline()` (unchanged) |
| Task assigned event | `TASK_EVENTS.TASK_ASSIGNED` | `TASK_EVENTS.TASK_ASSIGNED` (unchanged) |
| Task rejected event | `TASK_EVENTS.TASK_REJECT` | `TASK_EVENTS.TASK_REJECT` (unchanged) |
| Timer/RONA | Widget-managed timer | Widget-managed timer (unchanged) |

---

## Refactor Pattern

### Before
```typescript
// In IncomingTask component or hook
const { isBrowser, isPhoneDevice } = getDeviceTypeFlags(store.deviceType);
const acceptVisibility = getAcceptButtonVisibility(
  isBrowser, isPhoneDevice, webRtcEnabled, isCall, isDigitalChannel
);
const declineVisibility = getDeclineButtonVisibility(isBrowser, webRtcEnabled, isCall);
```

### After
```typescript
// In IncomingTask component or hook
const task = store.incomingTask;
const acceptVisibility = task?.uiControls?.accept ?? { isVisible: false, isEnabled: false };
const declineVisibility = task?.uiControls?.decline ?? { isVisible: false, isEnabled: false };
```

---

---

## Full Before/After: `useIncomingTask` Hook

### Before (current code in `helper.ts`)
```typescript
export const useIncomingTask = (props: UseTaskProps) => {
  const {onAccepted, onRejected, deviceType, incomingTask, logger} = props;
  const isBrowser = deviceType === 'BROWSER';
  const isDeclineButtonEnabled = store.isDeclineButtonEnabled;

  // Event callbacks registered per-task for accept/reject lifecycle
  useEffect(() => {
    if (!incomingTask) return;
    store.setTaskCallback(TASK_EVENTS.TASK_ASSIGNED, () => {
      if (onAccepted) onAccepted({task: incomingTask});
    }, incomingTask.data.interactionId);
    store.setTaskCallback(TASK_EVENTS.TASK_CONSULT_ACCEPTED, taskAssignCallback, incomingTask?.data.interactionId);
    store.setTaskCallback(TASK_EVENTS.TASK_END, taskRejectCallback, incomingTask?.data.interactionId);
    store.setTaskCallback(TASK_EVENTS.TASK_REJECT, taskRejectCallback, incomingTask?.data.interactionId);
    store.setTaskCallback(TASK_EVENTS.TASK_CONSULT_END, taskRejectCallback, incomingTask?.data.interactionId);

    return () => {
      store.removeTaskCallback(TASK_EVENTS.TASK_ASSIGNED, taskAssignCallback, incomingTask?.data.interactionId);
      store.removeTaskCallback(TASK_EVENTS.TASK_CONSULT_ACCEPTED, taskAssignCallback, incomingTask?.data.interactionId);
      store.removeTaskCallback(TASK_EVENTS.TASK_END, taskRejectCallback, incomingTask?.data.interactionId);
      store.removeTaskCallback(TASK_EVENTS.TASK_REJECT, taskRejectCallback, incomingTask?.data.interactionId);
      store.removeTaskCallback(TASK_EVENTS.TASK_CONSULT_END, taskRejectCallback, incomingTask?.data.interactionId);
    };
  }, [incomingTask]);

  const accept = () => {
    if (!incomingTask?.data.interactionId) return;
    incomingTask.accept().catch((error) => { /* log */ });
  };

  const reject = () => {
    if (!incomingTask?.data.interactionId) return;
    incomingTask.decline().catch((error) => { /* log */ });
  };

  return {
    incomingTask,
    accept,
    reject,
    isBrowser,           // Used to determine accept/decline button visibility
    isDeclineButtonEnabled,  // Feature flag for decline button
  };
};
```

**Note:** The `isBrowser` and `isDeclineButtonEnabled` flags are passed to the component, which uses them to decide whether to show accept/decline buttons. This duplicates what `task.uiControls.accept/decline` now provides.

### After (migrated)
```typescript
export const useIncomingTask = (props: UseTaskProps) => {
  const {onAccepted, onRejected, incomingTask, logger} = props;

  // NEW: Read accept/decline visibility from SDK
  const acceptControl = incomingTask?.uiControls?.accept ?? {isVisible: false, isEnabled: false};
  const declineControl = incomingTask?.uiControls?.decline ?? {isVisible: false, isEnabled: false};

  // Event callbacks — UNCHANGED (still need lifecycle callbacks for onAccepted/onRejected)
  useEffect(() => {
    if (!incomingTask) return;
    store.setTaskCallback(TASK_EVENTS.TASK_ASSIGNED, () => {
      if (onAccepted) onAccepted({task: incomingTask});
    }, incomingTask.data.interactionId);
    store.setTaskCallback(TASK_EVENTS.TASK_CONSULT_ACCEPTED, taskAssignCallback, incomingTask?.data.interactionId);
    store.setTaskCallback(TASK_EVENTS.TASK_END, taskRejectCallback, incomingTask?.data.interactionId);
    store.setTaskCallback(TASK_EVENTS.TASK_REJECT, taskRejectCallback, incomingTask?.data.interactionId);
    store.setTaskCallback(TASK_EVENTS.TASK_CONSULT_END, taskRejectCallback, incomingTask?.data.interactionId);

    return () => { /* cleanup — same as before */ };
  }, [incomingTask]);

  // Actions — UNCHANGED
  const accept = () => {
    if (!incomingTask?.data.interactionId) return;
    incomingTask.accept().catch((error) => { /* log */ });
  };

  const reject = () => {
    if (!incomingTask?.data.interactionId) return;
    incomingTask.decline().catch((error) => { /* log */ });
  };

  return {
    incomingTask,
    accept,
    reject,
    acceptControl,     // NEW: { isVisible, isEnabled } from SDK
    declineControl,    // NEW: { isVisible, isEnabled } from SDK
    // REMOVED: isBrowser, isDeclineButtonEnabled (no longer needed)
  };
};
```

### Component-Level Before/After

#### Before (IncomingTaskComponent)
```tsx
// incoming-task.tsx — old approach
const IncomingTaskComponent = ({ isBrowser, isDeclineButtonEnabled, onAccept, onReject, ... }) => {
  // Widget computes visibility from device type and feature flags
  const showAccept = isBrowser; // simplified — actual logic in getAcceptButtonVisibility()
  const showDecline = isBrowser && isDeclineButtonEnabled;

  return (
    <div>
      {showAccept && <Button onClick={onAccept}>Accept</Button>}
      {showDecline && <Button onClick={onReject}>Decline</Button>}
    </div>
  );
};
```

#### After (IncomingTaskComponent)
```tsx
// incoming-task.tsx — new approach
const IncomingTaskComponent = ({ acceptControl, declineControl, onAccept, onReject, ... }) => {
  // SDK provides exact visibility and enabled state
  return (
    <div>
      {acceptControl.isVisible && (
        <Button onClick={onAccept} disabled={!acceptControl.isEnabled}>Accept</Button>
      )}
      {declineControl.isVisible && (
        <Button onClick={onReject} disabled={!declineControl.isEnabled}>Decline</Button>
      )}
    </div>
  );
};
```

---

## Files to Modify

| File | Action |
|------|--------|
| `task/src/helper.ts` (`useIncomingTask`) | Use `task.uiControls.accept/decline` instead of visibility functions |
| `task/src/IncomingTask/index.tsx` | Minor: pass new control shape to component |
| `cc-components/.../IncomingTask/incoming-task.tsx` | Update accept/decline prop names if needed |
| `task/tests/IncomingTask/index.tsx` | Update tests |

---

## Validation Criteria

- [ ] Accept button visible for WebRTC voice tasks
- [ ] Accept button visible for digital channel tasks (chat/email)
- [ ] Decline button visible for WebRTC voice tasks only
- [ ] Accept action calls `task.accept()` and triggers `TASK_ASSIGNED`
- [ ] Decline action calls `task.decline()` and triggers `TASK_REJECT`
- [ ] RONA timer triggers reject correctly
- [ ] Consult incoming (OFFER_CONSULT) shows accept/decline correctly
- [ ] Cleanup on unmount removes callbacks

---

_Parent: [001-migration-overview.md](./001-migration-overview.md)_
