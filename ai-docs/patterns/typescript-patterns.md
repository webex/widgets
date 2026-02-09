# TypeScript Patterns

> Quick reference for LLMs working with TypeScript in this repository.

---

## Rules

- **MUST** prefix all interfaces with `I` (e.g., `IUserState`, `IStationLoginProps`)
- **MUST** use PascalCase for components and interfaces
- **MUST** use camelCase for hooks with `use` prefix (e.g., `useUserState`)
- **MUST** use `.tsx` extension for components, `.ts` for hooks and utilities
- **MUST** co-locate types in `{component}.types.ts` files
- **MUST** use `Pick` and `Partial` to derive types from parent interfaces
- **MUST** document every interface property with JSDoc comments
- **MUST** use enums for event names and constants
- **NEVER** use `any` without ESLint disable comment and explanation
- **NEVER** duplicate type definitions - derive from source with `Pick`

---

## Naming Conventions

### Components
```typescript
// PascalCase, .tsx extension
UserState.tsx
StationLogin.tsx
CallControl.tsx
```

### Hooks
```typescript
// camelCase with 'use' prefix, .ts extension
useUserState.ts
useStationLogin.ts
useCallControl.ts
```

### Interfaces & Types
```typescript
// PascalCase with 'I' prefix
interface IUserState { ... }
interface IStationLoginProps { ... }
interface IContactCenter { ... }
```

### Constants
```typescript
// SCREAMING_SNAKE_CASE
const MAX_RETRY_COUNT = 3;
const DEFAULT_TIMEOUT = 5000;
```

### File Structure
```
packages/*/src/{widget}/index.tsx      # Widget entry
packages/*/src/helper.ts               # Hooks/helpers
packages/*/src/{widget}/{widget}.types.ts  # Types
```

---

## Import Patterns

### Store Import
```typescript
import store from '@webex/cc-store';
```

### Components Import
```typescript
import { Component } from '@webex/cc-components';
```

### Types Import
```typescript
import { IUserState } from './user-state.types';
```

### MobX Import
```typescript
import { observer } from 'mobx-react-lite';
import { runInAction } from 'mobx';
```

---

## Interface Patterns

### Pattern 1: Interface with I Prefix
```typescript
interface IUserState {
  idleCodes: IdleCode[];
  agentId: string;
  cc: IContactCenter;
  currentState: string;
  onStateChange?: (arg: IdleCode | ICustomState) => void;
}
```

### Pattern 2: Use Pick to Derive Types
```typescript
// Widget picks only what it needs from component interface
export type IUserStateProps = Pick<IUserState, 'onStateChange'>;

// Hook picks different subset
export type UseUserStateProps = Pick<
  IUserState,
  'idleCodes' | 'agentId' | 'cc' | 'currentState' | 'logger'
>;
```

### Pattern 3: Combine Pick with Partial
```typescript
// Required props + optional callback props
export type StationLoginProps = 
  Pick<IStationLoginProps, 'profileMode'> &
  Partial<Pick<IStationLoginProps, 'onLogin' | 'onLogout' | 'onCCSignOut'>>;
```

### Pattern 4: Union Types
```typescript
type ICustomState = ICustomStateSet | ICustomStateReset;
```

---

## Enum Patterns

### Event Enums
```typescript
export enum TASK_EVENTS {
  TASK_INCOMING = 'task:incoming',
  TASK_ASSIGNED = 'task:assigned',
  TASK_HOLD = 'task:hold',
}

export enum CC_EVENTS {
  AGENT_DN_REGISTERED = 'agent:dnRegistered',
  AGENT_LOGOUT_SUCCESS = 'agent:logoutSuccess',
}
```

### State Enums
```typescript
export enum AgentUserState {
  Available = 'Available',
  RONA = 'RONA',
  Engaged = 'ENGAGED',
}
```

---

## JSDoc Pattern

```typescript
/**
 * Interface representing the properties for the Station Login component.
 */
export interface IStationLoginProps {
  /**
   * Webex Contact Center instance.
   */
  cc: IContactCenter;

  /**
   * Array of teams the agent belongs to.
   */
  teams: Team[];

  /**
   * Handler called when login completes.
   */
  onLogin?: () => void;
}
```

---

## Type Export Pattern

```typescript
// Central export from *.types.ts
export type {
  IContactCenter,
  ITask,
  Profile,
  Team,
};

export {
  CC_EVENTS,
  TASK_EVENTS,
};
```

---

## Callback Type Pattern

```typescript
// Optional callback with specific signature
onStateChange?: (arg: IdleCode | ICustomState) => void;
onLogin?: () => void;
onSaveEnd?: (isComplete: boolean) => void;
```

---

## Related

- [React Patterns](./react-patterns.md)
- [MobX Patterns](./mobx-patterns.md)
- [Testing Patterns](./testing-patterns.md)
