# Station Login — Architecture

## Purpose & role in the system

- Implements the agent’s station authentication and profile configuration.
- Manages device selection (BROWSER vs dialed device), dial number, and team.
- Delegates all side-effects to the Contact Center SDK (`cc`) and MobX `store`.

## High-level design

- Presentation wrapper `StationLogin` renders `StationLoginInternal` inside an `ErrorBoundary`. On errors, it calls `store.onErrorCallback('StationLogin', error)`.
- UI is rendered via `StationLoginComponent` from `@webex/cc-components`; this widget prepares the props via the `useStationLogin` hook and store values.
- Business logic lives in `useStationLogin` (in `src/helper.ts`), which:
  - Reads initial device/team/dial-number from props/store.
  - Subscribes to store and CC events to invoke `onLogin`/`onLogout`.
  - Calls SDK methods: `cc.stationLogin`, `cc.stationLogout`, `cc.deregister`, `cc.updateAgentProfile`.
  - Tracks editable login options and emits `onSaveStart`/`onSaveEnd`.

## Component/module diagram (ASCII)

```
StationLogin (export) ──▶ StationLogin (ErrorBoundary)
                             │
                             ▼
                      StationLoginInternal (observer)
                             │
            ┌──────── useStationLogin (helper.ts) ──────────┐
            │     - stationLogin / stationLogout             │
            │     - updateAgentProfile                       │
            │     - handleContinue (multi-login)             │
            │     - CC_EVENTS callbacks                      │
            └──────────────────────────┬─────────────────────┘
                                       │
                        MobX store (@webex/cc-store)
                         - cc, teams, loginOptions
                         - deviceType, dialNumber, teamId
                         - isAgentLoggedIn, showMultipleLoginAlert
                         - setDeviceType, setDialNumber, setTeamId
                                       │
                                       ▼
                     StationLoginComponent (@webex/cc-components)
```

## Data & state

- Store-sourced readables: `cc`, `teams`, `loginOptions`, `deviceType`, `dialNumber`, `teamId`, `isAgentLoggedIn`, `showMultipleLoginAlert`, `logger`.
- Hook state:
  - `selectedDeviceType`, `dialNumberValue`, `selectedTeamId`
  - `originalLoginOptions`, `currentLoginOptions`, `isLoginOptionsChanged`, `saveError`
  - `loginSuccess`, `loginFailure`, `logoutSuccess`
- Derived/validation:
  - `dialNumberRegex` from `cc?.agentConfig?.regexUS`
  - `isLoginOptionsChanged` compares original vs current (with special handling for BROWSER not requiring a dial number).

## Interactions

- Inputs (props): `onLogin`, `onLogout`, `onCCSignOut`, `onSaveStart`, `onSaveEnd`, `profileMode`, optional `teamId`, optional `doStationLogout`.
- Store interactions:
  - Registers CC event callbacks via `store.setCCCallback(CC_EVENTS.AGENT_STATION_LOGIN_SUCCESS, ...)` and `AGENT_LOGOUT_SUCCESS`.
  - Uses `store.registerCC()` for “continue” flow when multiple logins detected.
  - Reads/writes device/team/dial number via store setters.
- SDK calls:
  - `cc.stationLogin({teamId, loginOption, dialNumber})`
  - `cc.stationLogout({logoutReason: 'User requested logout'})`
  - `cc.deregister()` (when signing out of CC)
  - `cc.updateAgentProfile({loginOption, teamId, dialNumber?})`
- Outputs to UI:
  - Passes all computed props to `StationLoginComponent` (including setters, flags, and validation).
  - Invokes callbacks `onLogin`, `onLogout`, `onSaveStart`, `onSaveEnd`, and `onCCSignOut`.

## Async & error handling

- All SDK interactions wrapped in try/catch and Promise handlers with structured logs:
  - Login: sets `loginSuccess`/`loginFailure`.
  - Logout: sets `logoutSuccess` on resolve; logs on error.
  - Update profile: updates `originalLoginOptions` after success; sets `saveError` and fires `onSaveEnd(false)` on failure.
- ErrorBoundary at the widget root triggers `store.onErrorCallback('StationLogin', error)`.

## Performance notes

- `observer` wraps internals to re-render on MobX store updates.
- Validation compares simple objects; no expensive computations.
- Event listeners are registered once; removal is commented with a TODO in code.

## Extensibility points

- Add new device types or profile options by extending `LoginOptionsState` and UI mapping in `cc-components`.
- Add new CC event subscriptions via `store.setCCCallback`.
- Extend `StationLoginProps` in `station-login.types.ts` with additional optional callbacks/flags.

## Security & compliance

- Avoid logging PII. Current logs redact specific payload values (no dial number printed).
- `doStationLogout` flag allows skipping `cc.stationLogout` on CC sign-out when required by policy.

## Testing strategy

- Component tests validate ErrorBoundary behavior and prop wiring.
- Hook tests cover:
  - Successful/failed login and logout paths.
  - Update profile success/failure (including BROWSER device type omitting dial number).
  - Multi-login “continue” flow (`registerCC`), event callbacks, and error scenarios.

## Operational concerns

- Multiple login alert: `store.setShowMultipleLoginAlert(false)` then `store.registerCC()` in `handleContinue`.
- Error callback: `store.onErrorCallback('StationLogin', error)` for centralized error handling.
- Event listener cleanup is noted with a TODO in code.

## Risks & known pitfalls

- Event listener cleanup is currently commented out; risk of duplicate handlers if remounted frequently. <!-- TODO: consider implementing removeCCCallback on unmount -->
- Ensure dial number validation matches backend expectations; `regexUS` is used if present.
- Save button logic depends on accurate `originalLoginOptions`; ensure updates after login/profile changes.

## Source map

- `packages/contact-center/station-login/src/index.ts`
- `packages/contact-center/station-login/src/station-login/index.tsx`
- `packages/contact-center/station-login/src/station-login/station-login.types.ts`
- `packages/contact-center/station-login/src/helper.ts`

<!-- TODO: Document exact custom element mapping if exposed via cc-widgets. -->
