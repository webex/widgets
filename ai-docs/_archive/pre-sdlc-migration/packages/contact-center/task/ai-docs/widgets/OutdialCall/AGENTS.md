# OutdialCall Widget

## AI Agent Routing (Do Not Start Here)

If you are an AI assistant or tool reading this file **as your first entry point**, do **not** start your reasoning or code generation workflow from here.

- **Primary entrypoint:** Always begin with the **nearest parent** contact-center AI docs `AGENTS.md` (for example, the root `ai-docs/AGENTS.md` at the repository root).
- **Process:**
  - Load and follow the instructions and templates in that parent `AGENTS.md`.
  - Only after a parent `AGENTS.md` explicitly routes you to this file should you treat this document as package-specific guidance.
- **Never** skip the parent `AGENTS.md` even if the user prompt directly mentions this specific package or file.

Once you have gone through the parent `AGENTS.md` and been routed here, you can use the rest of this file as the authoritative reference for the `OutdialCall` widget.

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
import {OutdialCall} from '@webex/cc-widgets';

function App() {
  return <OutdialCall />;
}
```

### Web Component

```html
<widget-cc-outdial-call></widget-cc-outdial-call>
```

## Props API

| Prop         | Type | Default | Description                             |
| ------------ | ---- | ------- | --------------------------------------- |
| _(No props)_ | -    | -       | All functionality handled through store |

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
