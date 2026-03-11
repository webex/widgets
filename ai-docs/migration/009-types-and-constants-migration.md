# Migration Doc 009: Types and Constants Alignment

## Summary

CC Widgets defines its own types for control visibility, task state, and constants. These must be aligned with the new SDK types (`TaskUIControls`, `TaskState`, etc.) to ensure type safety and avoid duplication.

---

## Type Mapping: Old → New

### Control Visibility Type

| Old (CC Widgets) | New (CC SDK) |
|------------------|--------------|
| `Visibility` from `@webex/cc-components` = `{ isVisible: boolean; isEnabled: boolean }` | `TaskUIControlState` = `{ isVisible: boolean; isEnabled: boolean }` |

**Same shape, different name.** Can either:
- (A) Import `TaskUIControlState` from SDK and alias
- (B) Keep `Visibility` as-is since shape is identical
- **Recommendation:** Keep `Visibility` in `cc-components` for UI-layer independence; accept `TaskUIControls` from SDK in hooks.

### Controls Object Type

| Old (CC Widgets) | New (CC SDK) |
|------------------|--------------|
| No unified type — `getControlsVisibility()` returns ad-hoc object with 22 controls + 7 flags | `TaskUIControls` = `{ [17 control names]: { isVisible, isEnabled } }` |

**Action:** Import and use `TaskUIControls` from SDK. Map to component props.

### Task State Constants

| Old (CC Widgets Store) | New (CC SDK) |
|------------------------|--------------|
| `TASK_STATE_CONSULT` | **Not a 1:1 map** — represents `CONSULT_STATE_INITIATED` specifically (consult requested, not yet accepted). SDK equivalent is `TaskState.CONSULT_INITIATING` (intermediate async state). Note: SDK also has `TaskState.CONSULT_INITIATED` but it is marked "NOT IMPLEMENTED". Do NOT collapse with `TASK_STATE_CONSULTING` which maps to `TaskState.CONSULTING` |
| `TASK_STATE_CONSULTING` | `TaskState.CONSULTING` (consult accepted, actively consulting) |
| `TASK_STATE_CONSULT_COMPLETED` | `TaskState.CONNECTED` (consult ended, back to connected) |
| `INTERACTION_STATE_WRAPUP` | `TaskState.WRAPPING_UP` |
| `POST_CALL` | `TaskState.POST_CALL` (not implemented) |
| `CONNECTED` | `TaskState.CONNECTED` |
| `CONFERENCE` | `TaskState.CONFERENCING` |

### Consult Status Constants

| Old (CC Widgets Store) | New (CC SDK Context) |
|------------------------|---------------------|
| `CONSULT_STATE_INITIATED` | `context.consultInitiator` = true |
| `CONSULT_STATE_COMPLETED` | SDK transitions back to CONNECTED/CONFERENCING |
| `CONSULT_STATE_CONFERENCING` | `TaskState.CONFERENCING` |
| `ConsultStatus.CONSULT_INITIATED` | `TaskState.CONSULT_INITIATING` |
| `ConsultStatus.CONSULT_ACCEPTED` | `context.consultDestinationAgentJoined` = true |
| `ConsultStatus.BEING_CONSULTED` | `context.isConsultedAgent` (derived by SDK) |
| `ConsultStatus.BEING_CONSULTED_ACCEPTED` | `context.isConsultedAgent` + CONSULTING state |
| `ConsultStatus.CONSULT_COMPLETED` | SDK clears consult context on CONSULT_END |

### Event Constants

| Old (CC Widgets) | New (CC SDK) | Change |
|------------------|--------------|--------|
| `TASK_EVENTS.TASK_INCOMING` | `TASK_EVENTS.TASK_INCOMING` | Same |
| `TASK_EVENTS.TASK_ASSIGNED` | `TASK_EVENTS.TASK_ASSIGNED` | Same |
| `TASK_EVENTS.TASK_HOLD` | `TASK_EVENTS.TASK_HOLD` | Same |
| `TASK_EVENTS.TASK_RESUME` | `TASK_EVENTS.TASK_RESUME` | Same |
| `TASK_EVENTS.TASK_END` | `TASK_EVENTS.TASK_END` | Same |
| — | `TASK_EVENTS.TASK_UI_CONTROLS_UPDATED` | **NEW** |
| `TASK_EVENTS.TASK_WRAPUP` | `TASK_EVENTS.TASK_WRAPUP` | Same |
| `TASK_EVENTS.AGENT_WRAPPEDUP` | `TASK_EVENTS.AGENT_WRAPPEDUP` | Same |
| All consult/conference events | Same event names | Same |

### Media Type Constants

| Old (CC Widgets) | New (CC SDK) |
|------------------|--------------|
| `MEDIA_TYPE_TELEPHONY` = `'telephony'` | `TASK_CHANNEL_TYPE.VOICE` = `'voice'` |
| `MEDIA_TYPE_CHAT` = `'chat'` | `TASK_CHANNEL_TYPE.DIGITAL` = `'digital'` |
| `MEDIA_TYPE_EMAIL` = `'email'` | `TASK_CHANNEL_TYPE.DIGITAL` = `'digital'` |

**Note:** SDK uses channel type (`VOICE`/`DIGITAL`) for UI control computation. Widget media types may still be needed for display purposes.

---

## New Types to Import from SDK

| Type | Source | Purpose |
|------|--------|---------|
| `TaskUIControls` | `@webex/contact-center` | Pre-computed control states |
| `TaskUIControlState` | `@webex/contact-center` | Single control `{ isVisible, isEnabled }` |
| `TASK_EVENTS.TASK_UI_CONTROLS_UPDATED` | `@webex/contact-center` | New event |

**Note:** `TaskState` and `TaskEvent` enums are internal to SDK and NOT exported to consumers. Widgets should not depend on them directly — use `task.uiControls` instead.

---

---

## Before/After: Type Imports

### Before (task.types.ts)
```typescript
// task/src/task.types.ts — old approach
import {ITask, Interaction} from '@webex/contact-center';
import {Visibility, ControlProps} from '@webex/cc-components';

export interface useCallControlProps {
  currentTask: ITask;
  deviceType: string;            // Used for control visibility computation
  featureFlags: {[key: string]: boolean}; // Used for control visibility
  agentId: string;               // Used for control visibility AND timer participant lookup
  conferenceEnabled: boolean;    // Used for control visibility
  isMuted: boolean;
  logger: ILogger;
  onHoldResume?: (data: any) => void;
  onEnd?: (data: any) => void;
  onWrapUp?: (data: any) => void;
  onRecordingToggle?: (data: any) => void;
  onToggleMute?: (data: any) => void;
}
// Return type is ad-hoc — includes 22 controls + 7 flags + hook state + actions
```

### After (task.types.ts)
```typescript
// task/src/task.types.ts — new approach
import {ITask, TaskUIControls} from '@webex/contact-center';

export interface useCallControlProps {
  currentTask: ITask;
  // REMOVED: deviceType, featureFlags, conferenceEnabled
  //          (SDK computes controls via UIControlConfig, set at task creation)
  agentId: string;  // RETAINED — still needed by timer utils for participant lookup
  isMuted: boolean;
  logger: ILogger;
  onHoldResume?: (data: any) => void;
  onEnd?: (data: any) => void;
  onWrapUp?: (data: any) => void;
  onRecordingToggle?: (data: any) => void;
  onToggleMute?: (data: any) => void;
}

export interface CallControlHookResult {
  controls: TaskUIControls;   // NEW: all 17 controls from SDK
  currentTask: ITask;
  isMuted: boolean;
  isRecording: boolean;
  holdTime: number;
  startTimestamp: number;
  stateTimerLabel: string | null;
  stateTimerTimestamp: number;
  consultTimerLabel: string;
  consultTimerTimestamp: number;
  secondsUntilAutoWrapup: number | null;
  buddyAgents: BuddyDetails[];
  loadingBuddyAgents: boolean;
  consultAgentName: string;
  conferenceParticipants: Participant[];
  lastTargetType: TargetType;
  // Actions
  toggleHold: (hold: boolean) => void;
  toggleMute: () => Promise<void>;
  toggleRecording: () => void;
  endCall: () => void;
  wrapupCall: (reason: string, auxCodeId: string) => void;
  transferCall: (to: string, type: DestinationType) => Promise<void>;
  consultCall: (dest: string, type: DestinationType, interact: boolean) => Promise<void>;
  endConsultCall: () => Promise<void>;
  consultTransfer: () => Promise<void>;
  consultConference: () => Promise<void>;
  switchToMainCall: () => Promise<void>;
  switchToConsult: () => Promise<void>;
  exitConference: () => Promise<void>;
  cancelAutoWrapup: () => void;
  loadBuddyAgents: () => Promise<void>;
  getAddressBookEntries: (params: PaginatedListParams) => Promise<any>;
  getEntryPoints: (params: PaginatedListParams) => Promise<any>;
  getQueuesFetcher: (params: PaginatedListParams) => Promise<any>;
  setLastTargetType: (type: TargetType) => void;
  setConsultAgentName: (name: string) => void;
}
```

### Before/After: Constants

#### Before (store/constants.ts)
```typescript
// Used throughout for consult status derivation
export const TASK_STATE_CONSULT = 'consult';
export const TASK_STATE_CONSULTING = 'consulting';
export const TASK_STATE_CONSULT_COMPLETED = 'consultCompleted';
export const INTERACTION_STATE_WRAPUP = 'wrapup';
export const POST_CALL = 'postCall';
export const CONNECTED = 'connected';
export const CONFERENCE = 'conference';
export const CONSULT_STATE_INITIATED = 'initiated';
export const CONSULT_STATE_COMPLETED = 'completed';
export const CONSULT_STATE_CONFERENCING = 'conferencing';
export const RELATIONSHIP_TYPE_CONSULT = 'consult';
export const MEDIA_TYPE_CONSULT = 'consult';
```

#### After
```typescript
// REMOVE these (no longer needed for control computation):
// TASK_STATE_CONSULT, TASK_STATE_CONSULTING, TASK_STATE_CONSULT_COMPLETED
// INTERACTION_STATE_WRAPUP, INTERACTION_STATE_POST_CALL, INTERACTION_STATE_CONNECTED, INTERACTION_STATE_CONFERENCE
// CONSULT_STATE_INITIATED, CONSULT_STATE_COMPLETED, CONSULT_STATE_CONFERENCING

// KEEP these (still used for display or action logic):
export const RELATIONSHIP_TYPE_CONSULT = 'consult';
export const MEDIA_TYPE_CONSULT = 'consult'; // Used by findMediaResourceId
```

---

## UIControlConfig Note

**Important:** Widgets do NOT need to provide `UIControlConfig`. The SDK builds it internally:
- `channelType` — resolved from `task.data.interaction.mediaType` (telephony → voice, else digital)
- `voiceVariant` — set by Voice/WebRTC layer (PSTN vs WebRTC)
- `isEndTaskEnabled` / `isEndConsultEnabled` — from agent profile config flags
- `isRecordingEnabled` — from `callProcessingDetails.pauseResumeEnabled`
- `agentId` — from `taskManager.setAgentId()`

This means the widget no longer needs to pass `deviceType`, `featureFlags`, or `conferenceEnabled` for control computation. **Note:** `agentId` is retained — it is still needed by timer utilities for participant lookup.

---

## Files to Modify

| File | Action |
|------|--------|
| `task/src/task.types.ts` | Import `TaskUIControls` from SDK; update hook return types |
| `cc-components/.../task/task.types.ts` | Add `TaskUIControls` prop type for CallControl |
| `store/src/store.types.ts` | Ensure `TASK_UI_CONTROLS_UPDATED` is available |
| `store/src/constants.ts` | Review/remove consult state constants |
| `task/src/Utils/constants.ts` | Review/remove media type constants used only for controls |

---

## Validation Criteria

- [ ] `TaskUIControls` type imported from SDK compiles correctly
- [ ] No type mismatches between SDK controls and component props
- [ ] `TASK_UI_CONTROLS_UPDATED` event constant available
- [ ] Old constants still available where needed (display purposes)
- [ ] No unused type imports remain

---

_Parent: [001-migration-overview.md](./001-migration-overview.md)_
