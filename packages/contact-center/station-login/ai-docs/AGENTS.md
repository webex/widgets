# StationLogin Widget

## Overview

The `StationLogin` component allows agents to perform station login and select the type of channel they want to use for establishing voice connections.

It provides a user interface for agents to log in to their contact center station and choose from different connection types:

- **Desktop**: Uses WebRTC for voice communication
- **Extension**: Allows using a softphone or a hardphone extension
- **Dial Number**: Allows using a PSTN phone number

The widget integrates with the Webex Contact Center SDK and follows the standard three-layer architecture pattern (Widget → Hook → Component → Store).

**Package:** `@webex/cc-station-login`

**Version:** See [package.json](../package.json)

---

## Why and What is This Widget Used For?

### Purpose

The StationLogin widget enables contact center agents to:
- **Login to their station** with appropriate device settings
- **Select their team** from available teams
- **Choose device type** (Extension, Agent DN, desktop-based)
- **Logout from their station** to login to another login type
- **Change station login mode** while logged in (profile mode)

### Key Capabilities

- **Device Type Support**: Extension, Agent DN, and Desktop-based login
- **Team Selection**: Dropdown selection for multi-team agents
- **Profile Mode**: Update agent profile settings without full re-login
- **Error Handling**: Comprehensive error boundary with callback support
- **Multiple Login Detection**: Alerts and continuation flow for agents logged in elsewhere
- **Validation**: Dial number validation using regex patterns
- **Callbacks**: Extensible callbacks for login, logout, and sign-out events

---

## Examples and Use Cases

### Getting Started

#### Basic Usage (React)

```typescript
import { StationLogin } from '@webex/cc-widgets';
import React from 'react';

function MyApp() {
  const handleLogin = () => {
    console.log('Agent logged in successfully');
  };

  const handleLogout = () => {
    console.log('Agent logged out successfully');
  };

  const handleCCSignOut = () => {
    console.log('Agent signed out from contact center');
  };

  return (
    <StationLogin
      onLogin={handleLogin}
      onLogout={handleLogout}
      onCCSignOut={handleCCSignOut}
      profileMode={false}
      doStationLogout={false}
    />
  );
}
```

#### Profile Mode Usage

```typescript
import { StationLogin } from '@webex/cc-widgets';

function AgentProfile() {
  const handleSaveStart = () => {
    console.log('Saving profile changes...');
  };

  const handleSaveEnd = (success: boolean) => {
    if (success) {
      console.log('Profile updated successfully');
    } else {
      console.log('Profile update failed');
    }
  };

  return (
    <StationLogin
      profileMode={true}
      onSaveStart={handleSaveStart}
      onSaveEnd={handleSaveEnd}
      teamId="defaultTeamId"
      doStationLogout={false} // Don't logout when signing out in profile mode
    />
  );
}
```

### Common Use Cases

#### 1. Agent Login Flow

```typescript
// Agent selects team, device type, and enters extension
// Widget handles the login process through the SDK
<StationLogin
  onLogin={() => {
    // Navigate to agent desktop
    navigateToDesktop();
  }}
  onLogout={() => {
    // Return to login screen
    navigateToLogin();
  }}
  onCCSignOut={() => {
    // Sign out from entire application
    performFullSignOut();
  }}
  profileMode={false}
/>
```

#### 2. Update Agent Profile Settings

```typescript
// Agent updates device type or team while logged in
<StationLogin
  profileMode={true}
  onSaveStart={() => showSpinner()}
  onSaveEnd={(success) => {
    hideSpinner();
    showNotification(success ? 'Profile updated' : 'Update failed');
  }}
  teamId={currentTeamId}
  doStationLogout={false}
/>
```

#### 3. Handle Multiple Login Sessions

```typescript
// Widget automatically detects if agent is logged in elsewhere
// Shows alert and provides continuation option
// While initializing the store we need to pass
// allowMultiLogin flag as true
<StationLogin
  onLogin={() => {
    console.log('Successfully continued session');
  }}
  // Widget handles the multiple login flow internally
/>
```

#### 4. Custom Error Handling

```typescript
import store from '@webex/cc-store';

// Configure a global error callback before rendering the widget.
// The StationLogin widget will invoke this callback whenever an error occurs
// during station login/logout, profile updates, or underlying SDK operations.
store.onErrorCallback = (component, error) => {
  if (component === 'StationLogin') {
    // Handle StationLogin‑specific errors in your application shell
    console.error('StationLogin error:', error);

    // Example: surface a user‑friendly notification
    showToast(error.userMessage ?? 'Unable to complete station login. Please try again.');
  }
};

// When an error occurs inside StationLogin, it will call store.onErrorCallback
// with componentName === 'StationLogin' and the error object.
<StationLogin profileMode={false} />
```

### Integration Patterns

#### With store initialization

```typescript
import { store, StationLogin } from '@webex/cc-widgets';
import {useState} from 'react'


function App() {
  // Initialize store with SDK instance
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

#### With props

```typescript
import { store, StationLogin } from '@webex/cc-widgets';

function App() {
  const { isAgentLoggedIn, teams, deviceType } = store;

  return (
    <ThemeProvider themeclass={currentTheme === 'LIGHT' ? 'mds-theme-stable-lightWebex' : 'mds-theme-stable-darkWebex'}>
      <IconProvider iconSet="momentum-icons">
        <StationLogin
          onLogin={onLogin}
          onLogout={onLogout}
          onCCSignOut={onCCSignOut}
          profileMode={false}
        />
      </IconProvider>
    </ThemeProvider>
  );
};
```

---

## Dependencies

**Note:** For exact versions, see [package.json](../package.json)

### Runtime Dependencies

| Package | Purpose |
|---------|---------|
| `@webex/cc-components` | React UI components |
| `@webex/cc-store` | MobX singleton store for state management |
| `mobx-react-lite` | React bindings for MobX |
| `react-error-boundary` | Error boundary implementation |

### Peer Dependencies

| Package | Purpose |
|---------|---------|
| `react` | React framework |
| `react-dom` | React DOM rendering |
| `@momentum-ui/react-collaboration` | Momentum UI components |

### Development Dependencies

Key development tools (see [package.json](../package.json) for versions):
- TypeScript
- Jest (testing)
- Webpack (bundling)
- ESLint (linting)

### External SDK Dependency

The widget requires the **Webex Contact Center SDK** (`@webex/contact-center`) to be initialized and available through the store. The SDK provides:
- `stationLogin()` - Login to station
- `stationLogout()` - Logout from station
- `updateAgentProfile()` - Update agent profile settings
- `registerCC()` - Register contact center client
- `deregister()` - Deregister contact center client

---

## Props API

| Prop | Type | Required | Default | Description |
|------|------|----------|---------|-------------|
| `profileMode` | `boolean` | Yes | `false` | Shows save button (true) or login/logout (false) |
| `onLogin` | `() => void` | No | - | Callback when login succeeds |
| `onLogout` | `() => void` | No | - | Callback when logout succeeds |
| `onCCSignOut` | `() => void` | No | - | Callback when CC sign out is triggered |
| `onSaveStart` | `() => void` | No | - | Callback when profile save starts |
| `onSaveEnd` | `(success: boolean) => void` | No | - | Callback when profile save ends |
| `teamId` | `string` | No | - | Default team ID |
| `doStationLogout` | `boolean` | No | `true` | Perform station logout on CC sign out |

---

## Installation

```bash
# Install as part of contact center widgets
yarn add @webex/cc-widgets
npm install @webex/cc-widgets
```

---

## Additional Resources

For detailed component architecture, data flows, and sequence diagrams, see [architecture.md](./architecture.md).

For multi-login configuration and store initialization options, see [store/ai-docs](../../../store/ai-docs).


---

_Last Updated: 2025-11-26_

