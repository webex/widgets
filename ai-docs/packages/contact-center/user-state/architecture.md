# User State — Architecture

## Purpose & role in the system

- Displays and updates the agent’s availability/state (e.g., Available vs Idle with specific idle codes).  
  Open: `packages/contact-center/user-state/src/user-state/index.tsx`, `packages/contact-center/cc-components/src/components/UserState/*`
- Emits state-change callbacks to the hosting application while coordinating with the shared store and SDK.  
  Open: `packages/contact-center/user-state/src/helper.ts`, `packages/contact-center/store/src/*`

## High-level design

- Presentation wrapper `UserState` renders `UserStateInternal` inside an `ErrorBoundary`. On errors, it calls `store.onErrorCallback('UserState', error)`.  
  Open: `packages/contact-center/user-state/src/user-state/index.tsx`
- UI is rendered via `UserStateComponent` from `@webex/cc-components`.  
  Open: `packages/contact-center/cc-components/src/components/UserState/user-state.tsx`, `packages/contact-center/cc-components/src/components/UserState/user-state.types.ts`
- Business logic lives in the `useUserState` hook (in `src/helper.ts`), which:  
  Open: `packages/contact-center/user-state/src/helper.ts`
  - Creates an inline Web Worker to track elapsed timers (state duration and idle-code duration).
  - Reacts to `currentState`, `customState`, and timestamp changes from the MobX store.
  - Calls `cc.setAgentState` to update backend state, updating store timestamps on success and reverting on failure.
  - Invokes `onStateChange` with either a `customState` or the matching idle code.

## Component/module diagram (ASCII)

```
UserState (export) ──▶ UserState (ErrorBoundary)
                          │
                          ▼
                   UserStateInternal (observer)
                          │
            ┌────────── useUserState (helper.ts) ───────────┐
            │ - Worker-based timers (elapsed, idle elapsed) │
            │ - setAgentStatus -> store.setCurrentState     │
            │ - updateAgentState -> cc.setAgentState(...)   │
            │ - callOnStateChange(customState|idleCode)     │
            └──────────────────────────┬─────────────────────┘
                                       │
                        MobX store (@webex/cc-store)
                         - idleCodes, agentId
                         - currentState, customState
                         - lastStateChangeTimestamp, lastIdleCodeChangeTimestamp
                         - logger, cc
                                       │
                                       ▼
                   UserStateComponent (@webex/cc-components)
```

## Data & state

- Store-sourced readables: `idleCodes`, `agentId`, `currentState`, `customState`, `lastStateChangeTimestamp`, `lastIdleCodeChangeTimestamp`, `cc`, `logger`.  
  Open: `packages/contact-center/store/src/*`, docs → `ai-docs/packages/contact-center/store/agent.md`
- Hook state:
  - `isSettingAgentStatus`, `elapsedTime`, `lastIdleStateChangeElapsedTime`.
  - `prevStateRef` (tracks prior `currentState` to revert on failures).
- Worker messages:
  - `elapsedTime`, `lastIdleStateChangeElapsedTime`, `stopIdleCodeTimer`.

## Interactions

- Inputs (props): `onStateChange` callback (optional).
- Store interactions:
  - `setAgentStatus(codeId)` calls `store.setCurrentState(codeId)` which triggers the effect to update backend.
  - On successful `cc.setAgentState` response, updates `store.setLastStateChangeTimestamp(...)` and `store.setLastIdleCodeChangeTimestamp(...)`.
  - On failure, reverts `store.setCurrentState(prevStateRef.current)`.
- SDK calls:
  - `cc.setAgentState({state, auxCodeId, agentId, lastStateChangeReason})` where `state` is `'Available'` or `'Idle'` derived from the code name.  
    Open: SDK surface via `@webex/contact-center`, usage in `packages/contact-center/user-state/src/helper.ts`
- Outputs to UI:
  - Exposes `setAgentStatus`, `isSettingAgentStatus`, timers, and current state for rendering.
  - Invokes `onStateChange` with the `customState` (if provided) or the matching `idleCode`.

## Async & error handling

- Worker lifecycle managed in a guarded `useEffect` with cleanup (`stop`, `stopIdleCode`, `terminate`).
- All operations wrapped with try/catch and logged with structured metadata.
- Timestamp resets notify the worker to reset or stop the idle-code timer.
  Open: `packages/contact-center/user-state/src/helper.ts`

## Performance notes

- Timer updates are offloaded to a Web Worker to avoid blocking the main thread.
- `observer` ensures efficient re-renders on state changes.
  Open: `packages/contact-center/user-state/src/user-state/index.tsx`

## Extensibility points

- Add new state categories by extending `idleCodes` and handling new naming conventions in `updateAgentState`.
- Customize `onStateChange` semantics by providing `customState` with a `developerName`.
  Open: Store → `packages/contact-center/store/src/*`, Hook → `packages/contact-center/user-state/src/helper.ts`

## Security & compliance

- Avoid logging agent identifiers beyond what is necessary; structured logs are already used.
  Open: Guidelines → `ai-docs/rules.md`, Repo rules → `rules.md`, UI logging → `ai-docs/packages/contact-center/ui-logging/agent.md`

## Testing strategy

- Component-level tests validate ErrorBoundary behavior and prop wiring.
- Hook tests verify:
  - Worker lifecycle and timer messages.
  - State transition updates (including timestamps) and revert on failure.
  - `onStateChange` for both `customState` and `idleCodes`.
  - Error paths for worker/message handling and SDK failures.
  Open: Unit → `packages/contact-center/user-state/tests/*`, Playwright → `playwright/tests/user-state-test.spec.ts`, `playwright/suites/station-login-user-state-tests.spec.ts`, Patterns → `ai-docs/patterns/testing-patterns.md`

## Operational concerns

- Ensure the environment supports Web Workers; the hook creates one via `Blob` + `URL.createObjectURL`.
- Centralized error handling via `store.onErrorCallback('UserState', error)` in the ErrorBoundary.
  Open: `packages/contact-center/user-state/src/user-state/index.tsx`

## Risks & known pitfalls

- If `idleCodes` do not include the current `id`, backend updates may fail; logs will capture the error.
- Worker creation/termination should succeed; errors are caught and logged.
  Open: Store → `packages/contact-center/store/src/*`, Hook → `packages/contact-center/user-state/src/helper.ts`

## Source map

- `packages/contact-center/user-state/src/index.ts`
- `packages/contact-center/user-state/src/user-state/index.tsx`
- `packages/contact-center/user-state/src/user-state.types.ts`
- `packages/contact-center/user-state/src/helper.ts`
- `packages/contact-center/user-state/tests/*`

<!-- TODOs -->
