# User State

## Why this widget?

- Enables agents to set and monitor their availability, a core requirement for routing and reporting.
- Provides elapsed time tracking for current state and last idle-code change to improve UX.

## What is this widget?

- A React widget that wires `@webex/cc-components`’ UserState UI to MobX store and the Contact Center SDK.
- Handles:
  - Setting the agent state (`cc.setAgentState`) and updating store timestamps on success.
  - Emitting `onStateChange` to the host (custom state or matched idle code).
  - Tracking elapsed durations via a Web Worker (non-blocking timers).

## Use cases

- Switch to Available or a specific Idle code; propagate change to backend and UI.
- Track how long the agent has been in the current state and since last idle-code change.
- Revert state if backend update fails and log the error for observability.
- Provide a `customState` to override emitted state details to the host app.

Concrete behaviors validated in tests:

- Worker initializes, posts timer updates, and is cleaned up on unmount.
- `setAgentStatus` updates `store.currentState` and triggers backend update via effect.
- On success, store timestamps are updated from the backend response.
- On error, logs are emitted and UI reverts to the previous state.
- `onStateChange` is called with `customState` when provided, otherwise with the matched `idleCode`.

## Getting started

```tsx
// Import from this package’s public entry
import {UserState} from '...'; // <!-- TODO: clarify exact package name -->

export default function App() {
  return (
    <UserState
      onStateChange={(codeOrCustom) => {
        // Handle state change (either customState or matched idleCode)
      }}
    />
  );
}
```

## Configuration

- Props (from `user-state.types.ts`):
  - `onStateChange?: (state) => void`
- Store-driven inputs: `idleCodes`, `agentId`, `currentState`, `customState`, `lastStateChangeTimestamp`, `lastIdleCodeChangeTimestamp`, `logger`, `cc`.

## Integration notes

- Requires the shared MobX store (`@webex/cc-store`) to be initialized (idle codes, agentId, currentState).
- UI uses `@webex/cc-components`’ `UserStateComponent`.

## Related docs

- [Architecture](./architecture.md)
- [Parent agent](./agent.md)
