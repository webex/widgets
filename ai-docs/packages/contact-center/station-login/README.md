# Station Login

## Why this widget?

- Provides the first step in the agent workflow: station login and device selection.
- Centralizes profile updates (device type, dial number, team) with consistent UX and error handling.

## What is this widget?

- A React widget that wires `@webex/cc-components`’ StationLogin UI to MobX store and the Contact Center SDK.
- Handles:
  - Station login (`cc.stationLogin`) and logout (`cc.stationLogout`), optional full CC sign-out (with `cc.deregister`).
  - Profile updates via `cc.updateAgentProfile` with save progress callbacks.
  - Multi-login “continue” flow via the shared store (`registerCC`).

## Use cases

- Log in with BROWSER device (no dial number) or with a dialed device (requires dial number).
- Switch agent device type or team and persist via “Save” when changes are detected.
- Handle login success/failure and show errors without breaking the page.
- Logout from station and optionally sign out from CC (via `onCCSignOut` and `doStationLogout`).
- Continue after multiple-login alert by re-registering with CC.

Concrete behaviors validated in tests:

- Successful login sets `loginSuccess` and clears `loginFailure`.
- Failed login sets `loginFailure` and does not call `onLogin`.
- Successful logout sets `logoutSuccess`; failure is logged.
- Save is a no-op if nothing changed; otherwise calls `updateAgentProfile`.
- When device type is BROWSER, dial number is omitted from update payload.
- `onCCSignOut` triggers `stationLogout` and `deregister` when `doStationLogout !== false`.

## Getting started

```tsx
// Import from this package’s public entry
import {StationLogin} from '...'; // <!-- TODO: clarify exact package name -->

export default function App() {
  return (
    <StationLogin
      profileMode={false}
      onLogin={() => {
        /* post-login handling */
      }}
      onLogout={() => {
        /* post-logout handling */
      }}
      onCCSignOut={() => {
        /* app-level sign-out */
      }}
      onSaveStart={() => {
        /* show saving indicator */
      }}
      onSaveEnd={(ok) => {
        /* hide indicator, check ok */
      }}
      // teamId="team123"
      // doStationLogout={true}
    />
  );
}
```

## Configuration

- Props (from `station-login.types.ts`):
  - `profileMode: boolean`
  - Optional callbacks: `onLogin`, `onLogout`, `onCCSignOut`, `onSaveStart`, `onSaveEnd`
  - Optional data/flags: `teamId`, `doStationLogout`
- Store-driven inputs: `cc`, `teams`, `loginOptions`, `deviceType`, `dialNumber`, `teamId`, `isAgentLoggedIn`, `showMultipleLoginAlert`, `logger`.
- Validation: `dialNumberRegex` from `cc.agentConfig.regexUS` if available.

## Integration notes

- Requires the shared MobX store (`@webex/cc-store`) to be initialized and populated (device/team/options).
- UI uses `@webex/cc-components`’ `StationLoginComponent`.
- For Web Component consumption, see the `cc-widgets` package. <!-- TODO: add custom element name once confirmed -->

## Related docs

- [Architecture](./architecture.md)
- [Parent agent](./agent.md)

<!-- TODO: Document exact import path once package name is finalized. -->
