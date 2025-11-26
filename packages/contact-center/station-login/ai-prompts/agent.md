# Station Login Widget

## Overview

The Station Login widget provides a user interface for contact center agents to log in and out of their station. It handles device type selection (Extension, Mobile, Browser), team selection, and agent profile management. The widget integrates with the Webex Contact Center SDK and follows the standard three-layer architecture pattern (Widget → Hook → Component → Store).

**Package:** `@webex/cc-station-login`

**Version:** See [package.json](../package.json)

---

## Why and What is This Widget Used For?

### Purpose

The Station Login widget enables contact center agents to:
- **Login to their station** with appropriate device settings
- **Select their team** from available teams
- **Choose device type** (Extension, Agent DN, Browser-based)
- **Logout from their station** when ending their shift
- **Update their profile settings** while logged in (profile mode)
- **Handle multiple login scenarios** with continuation prompts

### Key Capabilities

- **Device Type Support**: Extension, Agent DN (Mobile), and Browser-based login
- **Team Management**: Dropdown selection for multi-team agents
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
import { StationLogin } from '@webex/cc-station-login';
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
    />
  );
}
```

#### Web Component Usage

```html
<!-- Include the widget bundle -->
<script src="path/to/cc-widgets.js"></script>

<!-- Use the web component -->
<cc-station-login
  profile-mode="false"
></cc-station-login>

<script>
  const widget = document.querySelector('cc-station-login');
  
  widget.addEventListener('login', () => {
    console.log('Agent logged in');
  });
  
  widget.addEventListener('logout', () => {
    console.log('Agent logged out');
  });
</script>
```

#### Profile Mode Usage

```typescript
import { StationLogin } from '@webex/cc-station-login';

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

// Set error callback before rendering widget
store.onErrorCallback = (componentName, error) => {
  console.error(`Error in ${componentName}:`, error);
  // Send to error tracking service
  trackError(componentName, error);
};

// Widget will call this callback on errors
<StationLogin profileMode={false} />
```

### Integration Patterns

#### With Custom Authentication

```typescript
import { StationLogin } from '@webex/cc-station-login';
import store from '@webex/cc-store';

function AuthenticatedApp() {
  // Initialize store with SDK instance
  useEffect(() => {
    const initializeCC = async () => {
      // Initialize Contact Center SDK
      const cc = await ContactCenter.init({
        token: authToken,
        region: 'us1'
      });
      
      // Set CC instance in store
      store.setCC(cc);
    };
    
    initializeCC();
  }, [authToken]);

  return <StationLogin profileMode={false} onLogin={handleLogin} />;
}
```

#### With State Management

```typescript
import { StationLogin } from '@webex/cc-station-login';
import { observer } from 'mobx-react-lite';
import store from '@webex/cc-store';

// Observer component that reacts to store changes
const LoginContainer = observer(() => {
  const { isAgentLoggedIn, teams, deviceType } = store;

  if (isAgentLoggedIn) {
    return <AgentDesktop />;
  }

  return (
    <StationLogin
      onLogin={() => {
        // Store automatically updates isAgentLoggedIn
        console.log('Teams available:', teams);
        console.log('Device type:', deviceType);
      }}
      profileMode={false}
    />
  );
});
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
| `profileMode` | `boolean` | Yes | - | Shows save button (true) or login/logout (false) |
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
yarn add @webex/cc-station-login

# Or install the entire widgets bundle
yarn add @webex/cc-widgets
```

---

## Additional Resources

For detailed component architecture, data flows, and sequence diagrams, see [architecture.md](./architecture.md).

---

_Last Updated: 2025-11-26_

