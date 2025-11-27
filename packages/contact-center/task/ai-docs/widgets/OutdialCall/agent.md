# OutdialCall Widget

## Overview

A dialpad widget for agents to make outbound calls with ANI (Automatic Number Identification) selection.

## Why This Widget?

**Problem:** Agents need to initiate outbound calls to contacts with proper caller ID selection.

**Solution:** Provides a dialpad interface with number validation and ANI selection.

## What It Does

- Displays numeric keypad for entering destination number
- Validates phone number format (E.164 and special chars)
- Fetches and displays available ANI options for caller ID
- Initiates outbound call via SDK
- Shows validation errors for invalid numbers

## Usage

### React

```tsx
import { OutdialCall } from '@webex/cc-widgets';

function App() {
  return <OutdialCall />;
}
```

### Web Component

```html
<widget-cc-outdial-call></widget-cc-outdial-call>
```

## Props API

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| *(No props)* | - | - | All functionality handled through store |

**Note:** OutdialCall reads `store.cc` and `store.logger` directly. No props needed.

## Examples

### Basic Usage

```tsx
// Simply render - no configuration needed
<OutdialCall />
```

### Error Handling

```tsx
// Widget handles errors internally via store.onErrorCallback
// Logs are available via store.logger
```

## Dependencies

```json
{
  "@webex/cc-components": "workspace:*",
  "@webex/cc-store": "workspace:*",
  "@webex/cc-ui-logging": "workspace:*",
  "mobx-react-lite": "^4.1.0",
  "react-error-boundary": "^6.0.0"
}
```

See [package.json](../../package.json) for versions.

## Additional Resources

- [Architecture Details](architecture.md) - Component internals, data flows, diagrams

