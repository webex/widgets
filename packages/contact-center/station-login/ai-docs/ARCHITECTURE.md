# StationLogin Widget - Architecture


## AI Agent Routing Instructions

**If you are an AI assistant or automated tool:**

Do **not** use this file as your main entry point for reasoning or code generation.

- **First step:** Locate and begin with the closest parent `AGENTS.md` file in the `ai-docs` directory structure. For example, the root `ai-docs/AGENTS.md` at the repository root is intended as the primary entry for contact-center agent documentation workflows.
- **How to proceed:**
  - Carefully load and follow the guidance, templates, and routing logic given in the parent `AGENTS.md`.
  - This `architecture.md` should only be used if and when the parent `AGENTS.md` specifically directs you here as part of its workflow.
- **Important:** Never bypass the parent `AGENTS.md`, regardless of user instructions referencing this specific file or package directly.

Only after following the routing process laid out in the parent `AGENTS.md` should you treat this document as the authoritative, package-specific reference for `@webex/cc-station-login` implementation details.

## Component Overview

The StationLogin widget follows a layered architecture with clear separation of concerns: **Widget → Hook → Component → Store → SDK**. Each layer has a distinct responsibility—presentation (Widget/Component), business logic (Hook), state management (Store), and external API integration (SDK).

### Component Table

| Layer | Component | File | Config/Props | State | Callbacks | Events | Tests |
|-------|-----------|------|--------------|-------|-----------|--------|-------|
| **Widget** | `StationLogin` | `src/station-login/index.tsx` | `profileMode: boolean`, `onLogin?: () => void`, `onLogout?: () => void`, `onCCSignOut?: () => void`, `onSaveStart?: () => void`, `onSaveEnd?: (isComplete: boolean) => void`, `teamId?: string`, `doStationLogout?: boolean`, `hideDesktopLogin?: boolean` | N/A (passes through) | `onLogin`, `onLogout`, `onCCSignOut`, `onSaveStart`, `onSaveEnd` | SDK events (via store) | `tests/station-login/index.tsx` |
| **Widget Internal** | `StationLoginInternal` | `src/station-login/index.tsx` | Same as `StationLogin` | Observes store via MobX | Same as above | Same as above | Same |
| **Hook** | `useStationLogin` | `src/helper.ts` | `cc: IContactCenter`, `onLogin?: () => void`, `onLogout?: () => void`, `logger: ILogger`, `deviceType: string`, `dialNumber: string`, `onSaveStart?: () => void`, `onSaveEnd?: (isComplete: boolean) => void`, `teamId: string`, `isAgentLoggedIn: boolean`, `onCCSignOut?: () => void`, `doStationLogout?: boolean` | `team: string`, `loginSuccess?: StationLoginSuccessResponse`, `loginFailure?: Error`, `logoutSuccess?: LogoutSuccess`, `originalLoginOptions: LoginOptionsState`, `currentLoginOptions: LoginOptionsState`, `saveError: string` | Wraps props callbacks | Subscribes to SDK events | `tests/helper.ts` |
| **Component** | `StationLoginComponent` | `@webex/cc-components` | `teams: Team[]`, `loginOptions: string[]`, `login: () => void`, `logout: () => void`, `loginSuccess?: StationLoginSuccessResponse`, `loginFailure?: Error`, `logoutSuccess?: LogoutSuccess`, `setDeviceType: (deviceType: string) => void`, `setDialNumber: (dn: string) => void`, `setTeam: (team: string) => void`, `isAgentLoggedIn: boolean`, `handleContinue: () => void`, `deviceType: string`, `dialNumberRegex?: RegExp \| string`, `showMultipleLoginAlert: boolean`, `onCCSignOut?: () => void`, `setTeamId: (teamId: string) => void`, `logger: ILogger`, `profileMode: boolean`, `originalLoginOptions: LoginOptionsState`, `currentLoginOptions: LoginOptionsState`, `setCurrentLoginOptions: React.Dispatch<React.SetStateAction<LoginOptionsState>>`, `isLoginOptionsChanged: boolean`, `saveLoginOptions: () => void`, `saveError: string`, `setSelectedDeviceType: (deviceType: string) => void`, `selectedDeviceType: string`, `dialNumberValue: string`, `setDialNumberValue: (value: string) => void`, `setSelectedTeamId: (teamId: string) => void`, `selectedTeamId: string`, `hideDesktopLogin?: boolean` | Internal form state | Inherited from hook | N/A | `@webex/cc-components` tests |
| **Store** | `Store` (singleton) | `@webex/cc-store` | N/A | `cc: IContactCenter`, `teams: Team[]`, `loginOptions: string[]`, `deviceType: string`, `dialNumber: string`, `teamId: string`, `isAgentLoggedIn: boolean`, `showMultipleLoginAlert: boolean` | N/A | `AGENT_STATION_LOGIN_SUCCESS`, `AGENT_LOGOUT_SUCCESS` | `@webex/cc-store` tests |
| **SDK** | `ContactCenter` | `@webex/contact-center` | N/A | N/A | N/A | Login/logout events | SDK tests |

### SDK Methods & Events Integration

| Component | SDK Methods Used | SDK Events Subscribed | Store Methods Used |
|-----------|------------------|----------------------|-------------------|
| **useStationLogin** hook | `stationLogin()`, `stationLogout()`, `updateAgentProfile()`, `deregister()` | `AGENT_STATION_LOGIN_SUCCESS`, `AGENT_LOGOUT_SUCCESS` | `setCCCallback()`, `removeCCCallback()`, `setShowMultipleLoginAlert()`, `registerCC()` |
| **Store** | All SDK methods | All SDK events | N/A |
| **Widget** | N/A (via hook) | N/A (via store) | N/A (via hook) |

### File Structure

```
station-login/
├── src/
│   ├── helper.ts                      # useStationLogin hook
│   ├── index.ts                       # Package exports
│   └── station-login/
│       ├── index.tsx                  # Widget component
│       └── station-login.types.ts     # TypeScript types
├── tests/
│   ├── helper.ts                      # Hook tests (if exists)
│   └── station-login/
│       └── index.tsx                  # Widget tests
├── ai-docs/
│   ├── agents.md                       # Overview, examples, usage
│   └── architecture.md                # Architecture documentation
├── dist/                              # Build output
├── package.json                       # Dependencies and scripts
├── tsconfig.json                      # TypeScript config
├── webpack.config.js                  # Webpack build config
├── jest.config.js                     # Jest test config
├── babel.config.js                    # Babel config
└── eslint.config.mjs                  # ESLint config

```

---

## Data Flows

### Layer Communication Flow

The widget follows a unidirectional data flow pattern across layers:

```mermaid
graph TB
    subgraph "Presentation Layer"
        Widget[StationLogin Widget]
        Component[StationLoginComponent]
    end
    
    subgraph "Business Logic Layer"
        Hook[useStationLogin Hook<br/>helper.ts]
    end
    
    subgraph "State Management Layer"
        Store[Store Singleton]
    end
    
    subgraph "SDK Layer"
        SDK[Contact Center SDK]
    end
    
    Widget -->|Props<br/>callbacks, config| Hook
    Hook -->|Read state<br/>teams, deviceType, etc| Store
    Hook -->|Call methods<br/>stationLogin, logout, etc| SDK
    Store -->|Register callbacks<br/>Manage SDK instance| SDK
    
    SDK -->|Events<br/>login success, logout| Store
    Store -->|State changes<br/>observable| Hook
    Hook -->|Return state<br/>& handlers| Widget
    Widget -->|Props<br/>state, handlers, teams| Component
    
    style Hook fill:#e1f5ff
    style Store fill:#fff4e1
    style SDK fill:#f0e1ff
```

**Hook Responsibilities:**
- Manages local state
- Subscribes to SDK events
- Handles login/logout logic
- Profile update logic
- Error handling

**Store Responsibilities:**
- Observable state
- SDK instance holder
- Event callback registry
- Global configuration

### Hook (helper.ts) Details

**File:** `src/helper.ts`

The `useStationLogin` hook is the core business logic layer that:

1. **Manages Local State:**
   - `team` - Selected team ID
   - `loginSuccess` / `loginFailure` - Login operation results
   - `logoutSuccess` - Logout operation result
   - `originalLoginOptions` / `currentLoginOptions` - For profile update comparison
   - `saveError` - Profile update error messages

2. **Subscribes to SDK Events:**
   ```typescript
   useEffect(() => {
     store.setCCCallback(CC_EVENTS.AGENT_STATION_LOGIN_SUCCESS, handleLogin);
     store.setCCCallback(CC_EVENTS.AGENT_LOGOUT_SUCCESS, handleLogout);
   }, [store.isAgentLoggedIn]);
   ```

3. **Provides Key Functions:**
   - `login()` - Calls `cc.stationLogin()` with selected options
   - `logout()` - Calls `cc.stationLogout()` with reason
   - `saveLoginOptions()` - Calls `cc.updateAgentProfile()` for profile updates
   - `handleContinue()` - Handles multiple login continuation via `store.registerCC()`
   - `handleCCSignOut()` - Performs station logout and deregistration
   - `setTeam()` - Updates selected team

4. **Profile Update Logic:**
   - Compares `originalLoginOptions` vs `currentLoginOptions`
   - Computes `isLoginOptionsChanged` to enable/disable save button
   - Only sends changed fields to SDK
   - Updates `originalLoginOptions` after successful save

### Sequence Diagrams

#### 1. Login Flow

```mermaid
sequenceDiagram
    actor User
    participant Widget as StationLogin Widget
    participant Hook as useStationLogin Hook
    participant Component as StationLoginComponent
    participant Store
    participant SDK

    User->>Widget: Load widget
    activate Widget
    Widget->>Hook: useStationLogin()
    activate Hook
    Hook->>Store: getInstance()
    Store-->>Hook: {configuration, teams, deviceTypes}
    Hook-->>Widget: {state, handlers}
    deactivate Hook
    Widget->>Component: Render with state
    activate Component
    Component->>Component: Display teams dropdown
    Component->>Component: Display device types
    Component-->>Widget: UI rendered
    deactivate Component
    deactivate Widget

    Note over User,Component: User Selects Team
    User->>Component: Select team from dropdown
    activate Component
    Component->>Hook: onTeamChange(teamId)
    activate Hook
    Hook->>Store: runInAction(() => setSelectedTeam(teamId))
    Store-->>Hook: Updated state
    Hook-->>Component: New state
    deactivate Hook
    Component->>Component: Update UI
    deactivate Component

    Note over User,Component: User Selects Device Type
    User->>Component: Select device type (Extension/Mobile)
    activate Component
    Component->>Hook: onDeviceTypeChange(type)
    activate Hook
    Hook->>Store: runInAction(() => setDeviceType(type))
    Store-->>Hook: Updated state
    Hook-->>Component: New state
    deactivate Hook
    Component->>Component: Show appropriate fields
    deactivate Component

    Note over User,SDK: User Submits Login
    User->>Component: Click Login button
    activate Component
    Component->>Hook: onLoginClick(credentials)
    activate Hook
    Hook->>Store: runInAction(() => login(credentials))
    activate Store
    Store->>SDK: login({extension, team, deviceType})
    SDK-->>Store: Success/Error
    Store-->>Hook: Login result
    deactivate Store
    Hook-->>Component: Updated state
    deactivate Hook
    Component->>Component: Show success/error
    deactivate Component
```

---

#### 2. Logout Flow

```mermaid
sequenceDiagram
    actor User
    participant Component as StationLoginComponent
    participant Hook as useStationLogin Hook
    participant Store
    participant SDK

    User->>Component: Click Logout button
    activate Component
    Component->>Hook: logout()
    activate Hook
    Hook->>SDK: stationLogout({ logoutReason })
    activate SDK
    SDK->>SDK: Process logout
    SDK-->>Hook: AGENT_LOGOUT_SUCCESS event
    deactivate SDK
    Hook->>Hook: handleLogout()
    Hook->>Hook: Invoke onLogout callback
    Hook->>Store: Update state
    activate Store
    Store->>Store: isAgentLoggedIn = false
    Store-->>Hook: State updated
    deactivate Store
    Hook-->>Component: Updated state
    deactivate Hook
    Component->>Component: Re-render (logged out UI)
    deactivate Component
```

---

#### 3. Profile Update Flow

```mermaid
sequenceDiagram
    actor User
    participant Component as StationLoginComponent
    participant Hook as useStationLogin Hook
    participant Store
    participant SDK

    User->>Component: Modify device type
    activate Component
    Component->>Hook: setCurrentLoginOptions({ deviceType })
    activate Hook
    Hook->>Hook: Compute isLoginOptionsChanged
    Hook-->>Component: isLoginOptionsChanged = true
    deactivate Hook
    Component->>Component: Enable Save button
    deactivate Component

    User->>Component: Click Save
    activate Component
    Component->>Hook: saveLoginOptions()
    activate Hook
    Hook->>Hook: Invoke onSaveStart()
    Hook->>Hook: Build payload
    Hook->>SDK: updateAgentProfile(payload)
    activate SDK
    SDK->>SDK: Update agent profile
    SDK-->>Hook: Success response
    deactivate SDK
    Hook->>Hook: setOriginalLoginOptions = currentLoginOptions
    Hook->>Hook: Invoke onSaveEnd(true)
    Hook-->>Component: Save complete
    deactivate Hook
    Component->>Component: Show success message
    Component->>Component: Disable Save button
    deactivate Component
```

---

#### 4. Multiple Login Flow

```mermaid
sequenceDiagram
    actor User
    participant Component as StationLoginComponent
    participant Hook as useStationLogin Hook
    participant Store
    participant SDK

    User->>Component: Attempt login
    activate Component
    Component->>Hook: login()
    activate Hook
    Hook->>SDK: stationLogin()
    activate SDK
    SDK->>SDK: Detect existing session
    SDK-->>Hook: Multiple login detected
    deactivate SDK
    Hook->>Store: showMultipleLoginAlert = true
    Store-->>Component: Re-render with alert
    deactivate Hook
    Component->>Component: Show alert dialog
    Component-->>User: "Already logged in elsewhere"
    deactivate Component

    User->>Component: Click Continue
    activate Component
    Component->>Hook: handleContinue()
    activate Hook
    Hook->>Store: setShowMultipleLoginAlert(false)
    Hook->>Store: registerCC()
    activate Store
    Store->>SDK: register()
    activate SDK
    SDK->>SDK: Force register
    SDK-->>Store: Success
    deactivate SDK
    Store->>Store: isAgentLoggedIn = true
    Store-->>Hook: Registration complete
    deactivate Store
    Hook-->>Component: Update state
    deactivate Hook
    Component->>Component: Hide alert
    Component->>Component: Show logged in UI
    deactivate Component
```

---

#### 5. CC Sign Out Flow

```mermaid
sequenceDiagram
    actor User
    participant Component as StationLoginComponent
    participant Hook as useStationLogin Hook
    participant Store
    participant SDK
    participant App as Application

    User->>Component: Click Sign Out button
    activate Component
    Component->>Hook: handleCCSignOut()
    activate Hook

    alt doStationLogout = true AND isAgentLoggedIn = true
        Hook->>SDK: stationLogout({ logoutReason })
        activate SDK
        SDK-->>Hook: Logout success
        deactivate SDK
        Hook->>SDK: deregister()
        activate SDK
        SDK-->>Hook: Deregister success
        deactivate SDK
    end

    Hook->>Hook: Invoke onCCSignOut callback
    Hook->>App: onCCSignOut()
    activate App
    App->>App: Handle full sign out
    App->>App: Clear session, redirect, etc.
    deactivate App
    Hook-->>Component: Sign out complete
    deactivate Hook
    Component-->>User: Signed out
    deactivate Component
```

---

## Troubleshooting Guide

### Common Issues

#### 1. Widget Not Rendering

**Symptoms:**
- Widget shows blank screen
- No error messages

**Possible Causes:**
- Store not initialized
- SDK instance not set in store
- Missing peer dependencies

**Solutions:**

```typescript
import { store, StationLogin } from '@webex/cc-widgets';
import {useState} from 'react'


function App() {
  // Initialize store with SDK instance
  // Only render when store is ready
  const [ready,setStoreReady] = useState(false)
  const access_token = 'agents_access_token'

  useEffect(() => {
    const initializeStore = async () => {
      // Initialize store 
      const cc = await store.init({
        webexConfig,
        access_token: access_token
      }).then(()=>{
        setStoreReady(true)
      });
      
    };
    
    initializeStore();
  }, []);

  return {ready && <StationLogin profileMode={false} />};
}
```

#### 2. Login Fails Silently

**Symptoms:**
- Login button clicked but nothing happens
- No error or success message

**Possible Causes:**
- SDK not initialized
- Network issues
- Invalid credentials

**Solutions:**

```typescript
// Check logger
console.log('Logger:', store.logger); // Should be defined


// Check SDK events
store.setCCCallback('error', (error) => {
  console.error('SDK Error:', error);
});
```

#### 3. Profile Update Not Working

**Symptoms:**
- Save button disabled
- Changes not persisted
- `onSaveEnd` called with `false`

**Possible Causes:**
- `profileMode` not set to `true`
- No actual changes made
- SDK updateAgentProfile failing

**Solutions:**

```typescript
// Ensure profileMode is true
<StationLogin profileMode={true} />

// Check if changes are detected
const hook = useStationLogin(props);
console.log('Login options changed:', hook.isLoginOptionsChanged);

// Check save error
console.log('Save error:', hook.saveError);
```

#### 4. Multiple Login Alert Not Dismissing

**Symptoms:**
- Alert stays visible after clicking Continue
- Agent cannot proceed with login

**Possible Causes:**
- `handleContinue` not called
- `registerCC` failing
- Store state not updating

**Solutions:**

```typescript
// Check store state
console.log('Show alert:', store.showMultipleLoginAlert);

// Manually dismiss (for testing)
store.setShowMultipleLoginAlert(false);

// Check registration
store.registerCC()
  .then(() => console.log('Registered'))
  .catch(err => console.error('Registration failed:', err));
```

#### 5. Callbacks Not Firing

**Symptoms:**
- `onLogin`, `onLogout`, or `onSaveEnd` not called
- Application state not updating

**Possible Causes:**
- SDK events not properly subscribed
- Store callback registration failing
- Callback references changing

**Solutions:**

```typescript
// Ensure callbacks are stable references
const handleLogin = useCallback(() => {
  console.log('Login callback');
}, []);

// Verify SDK event subscription
useEffect(() => {
  const loginHandler = () => console.log('SDK login event');
  store.setCCCallback(CC_EVENTS.AGENT_STATION_LOGIN_SUCCESS, loginHandler);
  
  return () => {
    store.removeCCCallback(CC_EVENTS.AGENT_STATION_LOGIN_SUCCESS, loginHandler);
  };
}, []);
```

#### 6. Error Boundary Showing Empty Screen

**Symptoms:**
- Widget displays nothing
- Error callback invoked

**Possible Causes:**
- Error in hook
- Error in component rendering
- Store access error

**Solutions:**

```typescript
// Set error callback to see details
store.onErrorCallback = (component, error) => {
  console.error(`Error in ${component}:`, error);
  // Show error UI instead of blank screen
  showErrorNotification(error.message);
};

// Wrap widget with custom error boundary
<ErrorBoundary fallback={<ErrorDisplay />}>
  <StationLogin />
</ErrorBoundary>
```

---

## Related Documentation

- [Agent Documentation](./agent.md) - Usage examples and props
- [MobX Patterns](../../../../ai-docs/patterns/mobx-patterns.md) - Store patterns
- [React Patterns](../../../../ai-docs/patterns/react-patterns.md) - Component patterns
- [Testing Patterns](../../../../ai-docs/patterns/testing-patterns.md) - Testing guidelines
- [Store Documentation](../../store/ai-docs/agent.md) - Store API reference

---

_Last Updated: 2025-11-26_
