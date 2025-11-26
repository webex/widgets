# Create agent.md Template

## Overview

This template generates the `agent.md` file for any package (widgets, store, components, utilities). It provides usage documentation optimized for LLM consumption.

**Purpose:** User-facing documentation with examples and API reference

**Token Optimized:** Architecture link at the END for token efficiency

**Reusable For:** All packages in the monorepo

---

## When to Use

- Creating new widget documentation
- Creating new package documentation
- Updating existing agent.md
- Adding missing examples

---

## Pre-Generation Questions

### 1. Package Information

- **Package name:** _______________
  - Example: `@webex/cc-agent-directory`, `@webex/cc-store`
- **Package type:** Widget | Store | Component Library | Utility
- **Display name:** _______________
  - Example: "Agent Directory", "CC Store", "CC Components"

### 2. Purpose & Capabilities

- **Primary purpose (one sentence):** _______________
- **Key capabilities (3-5 bullet points):** _______________
- **Problem it solves:** _______________

### 3. Usage Examples Needed

- **How many examples to include:** 4-6 (recommended)
- **Example scenarios:** _______________
  - Basic usage (always include)
  - Common use cases
  - Integration patterns
  - Error handling

### 4. API Surface

- **Props/Parameters:** List all public props/parameters
- **Callbacks/Events:** List all callbacks/events
- **Methods (if applicable):** List all public methods

---

## agent.md Structure

```markdown
# {Display Name}

## Overview

{Brief description of the package - 2-3 sentences}

**Package:** `{package-name}`

**Version:** See [package.json](../package.json)

---

## Why and What is This Used For?

### Purpose

{Explain the purpose and problem it solves - 3-4 sentences}

### Key Capabilities

- **Capability 1** - Brief description
- **Capability 2** - Brief description
- **Capability 3** - Brief description
- **Capability 4** - Brief description
- **Capability 5** - Brief description

---

## Examples and Use Cases

### Getting Started

#### Basic Usage (React)

```typescript
import { {PackageName} } from '{package-name}';

function MyApp() {
  const handleEvent = (data) => {
    console.log('Event:', data);
  };

  return (
    <{PackageName}
      requiredProp="value"
      onEvent={handleEvent}
    />
  );
}
```

#### Web Component Usage (If Applicable)

```html
<!DOCTYPE html>
<html>
<head>
  <link rel="stylesheet" href="path/to/momentum-ui.min.css">
</head>
<body>
  <widget-cc-{package-name}></widget-cc-{package-name}>

  <script src="path/to/cc-widgets/dist/wc.js"></script>
  <script>
    const widget = document.querySelector('widget-cc-{package-name}');
    widget.addEventListener('event', (e) => {
      console.log('Event:', e.detail);
    });
  </script>
</body>
</html>
```

### Common Use Cases

#### 1. {Use Case Title}

{Brief description of the use case}

```typescript
import { {PackageName} } from '{package-name}';

// Code example demonstrating this use case
// Include comments explaining key parts
```

**Key Points:**
- Point about this use case
- Another important note
- When to use this pattern

#### 2. {Use Case Title}

{Brief description of the use case}

```typescript
// Code example
```

**Key Points:**
- Point about this use case
- Another important note

#### 3. {Use Case Title}

{Continue with 4-6 realistic examples total}

### Integration Patterns (Optional)

#### Pattern 1: {Pattern Name}

```typescript
// Integration pattern example
```

#### Pattern 2: {Pattern Name}

```typescript
// Integration pattern example
```

---

## Dependencies

**Note:** For exact versions, see [package.json](../package.json)

### Runtime Dependencies

| Package | Purpose |
|---------|---------|
| `{dependency-1}` | Purpose description |
| `{dependency-2}` | Purpose description |
| `{dependency-3}` | Purpose description |

### Peer Dependencies

| Package | Purpose |
|---------|---------|
| `{peer-dep-1}` | Purpose description |
| `{peer-dep-2}` | Purpose description |

### Development Dependencies

Key development tools (see [package.json](../package.json) for versions):
- TypeScript
- Jest (testing)
- Webpack (bundling)
- ESLint (linting)

---

## API Reference

{Choose the appropriate section based on package type}

### For Widgets: Props API

| Prop | Type | Required | Default | Description |
|------|------|----------|---------|-------------|
| `requiredProp` | `string` | Yes | - | Description of what this prop does |
| `optionalProp` | `number` | No | `10` | Description with default value |
| `onEvent` | `(data: Type) => void` | No | - | Callback description |
| `onError` | `(error: Error) => void` | No | - | Error callback |

### For Store: Methods API

| Method | Parameters | Returns | Description |
|--------|------------|---------|-------------|
| `init()` | `config: Config` | `Promise<void>` | Initializes the store |
| `getItems()` | `params?: Params` | `Promise<Item[]>` | Fetches items |
| `setItem()` | `item: Item` | `void` | Sets an item |

### For Components: Exported Components

| Component | Purpose | Props Interface |
|-----------|---------|-----------------|
| `Component1` | Purpose | `Component1Props` |
| `Component2` | Purpose | `Component2Props` |
| `Component3` | Purpose | `Component3Props` |

### For Utilities: Functions API

| Function | Parameters | Returns | Description |
|----------|------------|---------|-------------|
| `utilityFn1()` | `param: Type` | `ReturnType` | What it does |
| `utilityFn2()` | `param: Type` | `ReturnType` | What it does |

---

## Installation

```bash
yarn add {package-name}
```

{If peer dependencies required, add:}

### Peer Dependencies Required

```bash
yarn add @momentum-ui/react-collaboration react react-dom
```

---

## Additional Resources

For detailed {architecture/implementation/technical details}, see [architecture.md](./architecture.md).

---

_Last Updated: {YYYY-MM-DD}_
```

---

## Content Guidelines

### Overview Section

**Do:**
- Keep it brief (2-3 sentences)
- Mention package name clearly
- Reference package.json for version
- Explain at high level what it is

**Don't:**
- Go into technical details (save for architecture.md)
- Include code examples yet
- Hardcode version numbers

---

### Purpose Section

**Do:**
- Explain why this package exists
- Describe the problem it solves
- List 3-5 key capabilities
- Be clear and concise

**Don't:**
- Duplicate overview content
- Go into implementation details
- Use jargon without explanation

---

### Examples Section

**Do:**
- Start with simplest example
- Include 4-6 realistic use cases
- Add comments explaining key parts
- Show both success and error handling
- Include Web Component example if applicable

**Don't:**
- Show overly complex examples first
- Skip error handling
- Use unrealistic scenarios
- Include incomplete code

**Example Structure:**
1. Basic usage (required)
2. Common use case 1
3. Common use case 2
4. Error handling
5. Advanced pattern
6. Integration pattern

---

### Dependencies Section

**Do:**
- Reference package.json for versions
- Explain purpose of each dependency
- Separate runtime, peer, and dev dependencies
- Keep descriptions brief

**Don't:**
- Hardcode version numbers
- List every dev dependency
- Skip explaining purpose

---

### API Section

**Do:**
- Use table format for easy scanning
- Include all required information
- Mark required vs optional
- Include default values
- Link to type definitions

**Don't:**
- Skip descriptions
- Forget to mark required fields
- Use ambiguous type names
- Skip examples for complex props

---

### Token Optimization

**Key Strategy:**
- **Architecture link goes at the END**
- LLM reads agent.md first for most queries
- Only loads architecture.md when needed
- Saves 500+ tokens for simple queries

**Example Query Paths:**

Query: "How do I use AgentDirectory?"
- LLM reads: agent.md only (~400 tokens)
- Finds: Basic usage example
- Returns: Answer without needing architecture.md

Query: "How does AgentDirectory integrate with the store?"
- LLM reads: agent.md (~400 tokens) 
- Sees: Link to architecture.md at end
- Reads: architecture.md (~500 tokens)
- Returns: Detailed architecture answer

---

## Validation Checklist

Before considering agent.md complete:

### Content Completeness
- [ ] Overview section complete
- [ ] Purpose clearly explained
- [ ] 3-5 key capabilities listed
- [ ] 4-6 usage examples provided
- [ ] Dependencies documented
- [ ] API reference complete
- [ ] Installation instructions included

### Quality Checks
- [ ] All code examples work
- [ ] No hardcoded versions (references package.json)
- [ ] Examples have comments
- [ ] Error handling shown
- [ ] Props/methods fully documented
- [ ] Link to architecture.md at END

### Formatting
- [ ] Markdown renders correctly
- [ ] Code blocks have language tags
- [ ] Tables format properly
- [ ] No broken links
- [ ] Consistent heading levels

---

## Examples by Package Type

### Widget Package Example

**Package:** `@webex/cc-agent-directory`

**Key Sections:**
- Props API table (all props documented)
- Both React and Web Component examples
- Common use cases: search, filter, select
- Integration with store and SDK
- Error handling patterns

**Example Count:** 6
1. Basic usage
2. Search functionality
3. Filter by availability
4. Agent selection
5. Error handling
6. Custom styling

---

### Store Package Example

**Package:** `@webex/cc-store`

**Key Sections:**
- Methods API table (all methods documented)
- Initialization examples
- Observable usage
- Event subscription
- Data fetching patterns

**Example Count:** 5
1. Basic initialization
2. Reading observables
3. Setting callbacks
4. Fetching data
5. Error handling

---

### Component Library Example

**Package:** `@webex/cc-components`

**Key Sections:**
- Exported components table
- Component usage examples
- Props patterns
- Styling approach
- Integration with widgets

**Example Count:** 4
1. Basic component usage
2. Composing components
3. Custom styling
4. Integration with widgets

---

### Utility Package Example

**Package:** `@webex/cc-ui-logging`

**Key Sections:**
- Functions API table
- HOC usage
- Direct function calls
- Integration patterns

**Example Count:** 4
1. Using withMetrics HOC
2. Direct logMetrics call
3. Custom metrics
4. Integration with widgets

---

## Related Templates

- **[create-architecture-md.md](./create-architecture-md.md)** - Technical architecture docs
- **[update-documentation.md](./update-documentation.md)** - Update existing docs
- **[add-examples.md](./add-examples.md)** - Add more usage examples

---

_Template Version: 1.0.0_
_Last Updated: 2025-11-26_

