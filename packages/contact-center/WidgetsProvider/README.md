# Webex Contact Center Widgets Provider

This package provides a React provider component that automatically detects and tracks metrics for Contact Center widgets in your application.

## Features

- **Automatic Widget Detection**: The provider automatically scans for widgets in the DOM and tracks them without requiring manual HOC wrapping
- **Metrics Collection**: Collects performance and usage metrics for all detected widgets
- **Theme and Icon Support**: Integrates with Momentum Design System for consistent theming and iconography
- **Context-based Metrics**: Provides React context for accessing metrics data

## Installation

```bash
yarn add @webex/cc-widgets-provider
```

## Usage

### Basic Setup

Simply wrap your application with the `WidgetsProvider`:

```tsx
import React from 'react';
import WidgetsProvider from '@webex/cc-widgets-provider';
import {MyWidget} from './widgets';

function App() {
  return (
    <WidgetsProvider enableMetrics={true}>
      <div data-widget-id="my-custom-widget">
        <MyWidget />
      </div>
    </WidgetsProvider>
  );
}

export default App;
```

### Widget Detection

For a widget to be automatically detected and tracked, it must have a `data-widget-id` attribute:

```tsx
// This widget will be automatically detected
<div data-widget-id="user-profile-widget">
  <UserProfileWidget />
</div>

// This widget will also be detected
<section data-widget-id="task-list-widget">
  <TaskListWidget />
</section>
```

### Accessing Metrics

Use the `useMetrics` hook to access metrics data in your components:

```tsx
import React from 'react';
import {useMetrics} from '@webex/cc-widgets-provider';

function MetricsDashboard() {
  const {metrics, sessionSummary, refreshMetrics} = useMetrics();

  return (
    <div>
      <h2>Widget Metrics</h2>
      <p>Total Widgets: {sessionSummary.totalWidgetsLoaded}</p>
      <p>Active Widgets: {sessionSummary.activeWidgets}</p>

      <button onClick={refreshMetrics}>Refresh Metrics</button>

      <ul>
        {Array.from(metrics.entries()).map(([widgetName, metric]) => (
          <li key={widgetName}>
            <strong>{widgetName}</strong>: Initialized at {new Date(metric.initializationTime).toLocaleTimeString()}
          </li>
        ))}
      </ul>
    </div>
  );
}
```

## Props

### WidgetsProvider Props

| Prop            | Type        | Default                         | Description                       |
| --------------- | ----------- | ------------------------------- | --------------------------------- |
| `children`      | `ReactNode` | Required                        | Child components to render        |
| `enableMetrics` | `boolean`   | `true`                          | Enable/disable metrics collection |
| `themeclass`    | `string`    | `'mds-theme-stable-lightWebex'` | Momentum Design theme class       |
| `iconSet`       | `string`    | `'momentum-icons'`              | Icon set to use                   |

## Metrics Events

The provider automatically tracks the following events:

- `WIDGET_DETECTED`: When a widget with `data-widget-id` is found in the DOM
- `WIDGET_INITIALIZED`: When a widget is initialized (if using withMetrics HOC)
- `WIDGET_PROP_UPDATED`: When widget props change (if using withMetrics HOC)
- `WIDGET_UNMOUNTED`: When a widget is unmounted (if using withMetrics HOC)

## Manual Widget Tracking (Optional)

If you need more granular control, you can still use the `withMetrics` HOC:

```tsx
import React from 'react';
import {withMetrics} from '@webex/cc-widgets-provider';

const MyWidget = ({title, data}) => {
  return (
    <div>
      <h3>{title}</h3>
      <pre>{JSON.stringify(data, null, 2)}</pre>
    </div>
  );
};

// Wrap with HOC for detailed tracking
export default withMetrics(MyWidget, 'my-custom-widget');
```

## API Reference

### useMetrics Hook

Returns an object with:

- `metrics`: `Map<string, WidgetMetrics>` - All widget metrics
- `sessionSummary`: Session summary with total and active widget counts
- `refreshMetrics`: Function to manually refresh metrics

### MetricEvent Interface

```typescript
interface MetricEvent {
  widgetName: string;
  event: 'WIDGET_INITIALIZED' | 'WIDGET_UNMOUNTED' | 'WIDGET_PROP_UPDATED' | 'WIDGET_DETECTED';
  props?: any;
  timestamp: number;
  sessionId?: string;
}
```

### WidgetMetrics Interface

```typescript
interface WidgetMetrics {
  widgetName: string;
  initializationTime: number;
  lastPropUpdate?: number;
  unmountTime?: number;
  propUpdateCount: number;
  currentProps?: any;
}
```

## Example

Here's a complete example of how to use the provider:

```tsx
import React from 'react';
import WidgetsProvider, {useMetrics} from '@webex/cc-widgets-provider';

// A simple widget component
const StatusWidget = ({status}) => <div data-widget-id="status-widget">Status: {status}</div>;

// Component that displays metrics
const MetricsDisplay = () => {
  const {metrics, sessionSummary} = useMetrics();

  return (
    <div>
      <h3>Detected Widgets: {sessionSummary.totalWidgetsLoaded}</h3>
      {Array.from(metrics.keys()).map((widgetName) => (
        <p key={widgetName}>✓ {widgetName}</p>
      ))}
    </div>
  );
};

// Main application
function App() {
  return (
    <WidgetsProvider enableMetrics={true}>
      <h1>My Contact Center App</h1>
      <StatusWidget status="Online" />
      <div data-widget-id="task-panel">
        <h2>Task Panel</h2>
        <p>Current tasks...</p>
      </div>
      <MetricsDisplay />
    </WidgetsProvider>
  );
}

export default App;
```

## Migration from Manual HOC Approach

If you were previously wrapping each widget with `withMetrics`, you can now simply:

1. Remove the HOC wrapping from your widgets
2. Add `data-widget-id` attributes to the widget containers
3. The provider will automatically detect and track them

Before:

```tsx
export default withMetrics(MyWidget, 'my-widget');
```

After:

```tsx
// In your JSX
<div data-widget-id="my-widget">
  <MyWidget />
</div>
```

The automatic detection approach is simpler and requires less code changes while providing the same tracking capabilities.
