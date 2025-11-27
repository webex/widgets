# Call History Widget

## Overview

Displays agent's call history grouped by contact, with filtering and outdial capabilities.

## Why This Widget?

**Problem:** Agents need quick access to recent call history to follow up with customers.

**Solution:** Provides grouped call history with one-click dial functionality.

## What It Does

- Fetches call history from store (populated by task events)
- Groups calls by contact/phone number
- Supports "All" and "Missed" filters
- Enables one-click outdial for follow-ups
- Shows call details (date, type, duration)
- Minimizes/maximizes for space management

## Usage

### React

```tsx
import { CallHistory } from '@webex/cc-widgets';

function App() {
  return (
    <CallHistory
      filter="all"
      onDial={(phoneNumber) => console.log('Dialing:', phoneNumber)}
      onError={(error) => console.error(error)}
    />
  );
}
```

### Web Component

```html
<widget-cc-call-history></widget-cc-call-history>

<script>
  const widget = document.querySelector('widget-cc-call-history');
  widget.filter = 'missed';
  widget.onDial = (phoneNumber) => console.log('Dialing:', phoneNumber);
</script>
```

## Props API

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `filter` | `'all' \| 'missed'` | `'all'` | Active filter for call history |
| `onDial` | `(phoneNumber: string) => void` | - | Callback when dial button clicked |
| `onError` | `(error: Error) => void` | - | Callback when error occurs |
| `className` | `string` | `''` | Custom CSS class |
| `customStyles` | `React.CSSProperties` | - | Inline styles |

## Examples

### Missed Calls Only

```tsx
<CallHistory
  filter="missed"
  onDial={(phoneNumber) => {
    // Handle dial
    console.log('Calling back:', phoneNumber);
  }}
/>
```

### With Error Handling

```tsx
<CallHistory
  onError={(error) => {
    if (error.message.includes('not configured')) {
      alert('Outdial not enabled for your account');
    }
  }}
/>
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

See [package.json](../package.json) for versions.

## Additional Resources

- [Architecture Details](architecture.md) - Component internals, data flows, diagrams

