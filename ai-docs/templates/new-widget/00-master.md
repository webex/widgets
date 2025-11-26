# New Widget Generation - Master Template

## Purpose

Orchestrator template for creating contact center widgets following the architecture pattern: **Widget → Hook → Component → Store → SDK**

## Workflow

1. **Gather Requirements** → [01-pre-questions.md](./01-pre-questions.md)
2. **Generate Code** → [02-code-generation.md](./02-code-generation.md)
3. **Generate Components** (if needed) → [03-component-generation.md](./03-component-generation.md)
4. **Integration** → [04-integration.md](./04-integration.md)
5. **Generate Tests** → [05-test-generation.md](./05-test-generation.md)
6. **Validation** → [06-validation.md](./06-validation.md)

## Module Selection

**Display-Only Widget:**
- Modules: 01, 02, 04, 05, 06
- Skip: 03 (use existing components)

**Interactive Widget:**
- Modules: 01, 02, 04, 05, 06
- Skip: 03 (unless new components needed)

**Complex Widget (Store + SDK):**
- Modules: 01, 02, 03 (if new components), 04, 05, 06

## Step Details

### Step 1: Requirements ([01-pre-questions.md](./01-pre-questions.md))
Gather widget name, purpose, design input, complexity level, store needs, component requirements, props, and callbacks.

### Step 2: Code Generation ([02-code-generation.md](./02-code-generation.md))
Generate widget component, custom hook, type definitions, package configuration, and config files.

### Step 3: Component Generation ([03-component-generation.md](./03-component-generation.md))
**Conditional:** Create presentational components in cc-components if new components are needed.

### Step 4: Integration ([04-integration.md](./04-integration.md))
Integrate widget into cc-widgets (React + Web Component exports) and sample apps (React + WC).

### Step 5: Test Generation ([05-test-generation.md](./05-test-generation.md))
Generate widget unit tests, hook unit tests, and optional E2E tests.

### Step 6: Validation ([06-validation.md](./06-validation.md))
Verify code quality, tests, documentation, integration, and manual testing.

## Documentation

Generate documentation using reusable templates:
- **agent.md:** [../documentation/create-agent-md.md](../documentation/create-agent-md.md)
- **architecture.md:** [../documentation/create-architecture-md.md](../documentation/create-architecture-md.md)

## Pattern References

- [TypeScript Patterns](../../patterns/typescript-patterns.md)
- [React Patterns](../../patterns/react-patterns.md)
- [MobX Patterns](../../patterns/mobx-patterns.md)
- [Web Component Patterns](../../patterns/web-component-patterns.md)
- [Testing Patterns](../../patterns/testing-patterns.md)

## Execution Guidelines

1. Start with [01-pre-questions.md](./01-pre-questions.md) to gather requirements
2. Read modules sequentially based on requirements
3. Skip 03-component-generation.md if using existing components
4. Generate code as you progress through modules
5. Complete validation checklist at the end

---

_Last Updated: 2025-11-26_

