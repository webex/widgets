# Store

## Why this module?

- Centralizes Contact Center state across widgets for consistency and simplicity.
- Encapsulates SDK interactions (registration, events, data fetchers) behind a typed facade.
- Reduces coupling: widgets consume a stable API instead of raw SDK objects.

## What is this module?

- A MobX-powered singleton store with a wrapper facade exported as default.
- Responsibilities:
  - Initialize and register the Contact Center SDK.
  - Mirror SDK state into observables (agent, tasks, options, timestamps, flags).
  - Expose typed getters/setters and convenience fetchers (queues, entry points, address book).
  - Wire CC/TASK events to update the store and notify widgets.

## Use cases

- Widgets read/store: `cc`, `teams`, `loginOptions`, `idleCodes`, `deviceType`, `dialNumber`, `teamId`, `currentState`, `isAgentLoggedIn`, timestamps, etc.
- Widgets set:
  - Current state (`setCurrentState`), theme, mute, task selection, consult metadata, multi-login visibility.
  - Event callbacks: register/remove CC events, set task-level callbacks.
- App-level flows:
  - Boot the SDK using `init({ webex } | { webexConfig, access_token })`.
  - Re-register via `registerCC(webex)`; handle logout using `cleanUpStore`.
  - Fetch domain data: `getQueues`, `getEntryPoints`, `getAddressBookEntries`, `getBuddyAgents`.

Validated in tests:
- Initialization paths (provided `webex` vs config + `ready`), error timeouts, and `registerCC` population.
- Event wiring for login, relogin, state changes, multi-login, task lifecycle; cleanup on logout.
- Conditional media handling for BROWSER device type only.
- Filtering logic for `idleCodes` and queue pagination handling.

## Getting started

```ts
// Public entry
import store from '@webex/cc-store'; // <!-- confirm package name -->

// Initialize with existing webex
await store.init({webex}, (cc) => {
  // optional: custom event listeners setup; wrapper also manages default listeners
});

// Or initialize by configuration (auto Webex.init + ready)
await store.init({webexConfig, access_token}, (cc) => {
  // setup listeners if needed
});

// Use the facade from anywhere
store.setOnError((widget, err) => console.error(widget, err));
store.setCCCallback(store.CC_EVENTS.AGENT_STATE_CHANGE, (payload) => {/* ... */});

// Read/Write observables
const {teams, loginOptions, isAgentLoggedIn, deviceType} = store;
store.setDeviceType('BROWSER');
```

## Configuration

- Init:
  - With existing SDK: `{ webex: { cc, logger } }`
  - With config: `{ webexConfig, access_token }` (waits for `ready` or rejects after ~6s)
- Events exposed (via types in `store.types.ts`):
  - CC: `AGENT_STATION_LOGIN_SUCCESS`, `AGENT_DN_REGISTERED`, `AGENT_RELOGIN_SUCCESS`, `AGENT_STATE_CHANGE`, `AGENT_MULTI_LOGIN`, `AGENT_LOGOUT_SUCCESS`
  - TASK: `TASK_INCOMING`, `TASK_ASSIGNED`, `TASK_END`, `AGENT_WRAPPEDUP`, consult/conference events, etc.

## Integration notes

- Consumers should not instantiate `Store` directly; import the default wrapper.
- For BROWSER deviceType, media events will attach to tasks to drive audio sinks.
- Widgets should rely on store setters (e.g., `setCurrentState`) rather than mutating fields.

## Related docs

- [Architecture](./architecture.md)
- [Parent agent](./agent.md)

<!-- TODOs -->
<!-- TODO: Confirm package import name for external consumers. -->

