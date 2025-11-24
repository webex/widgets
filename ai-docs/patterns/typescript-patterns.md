# TypeScript Patterns

---
Technology: TypeScript
Configuration: [root tsconfig.json](../../tsconfig.json)
Dependencies: See individual [package.json](../../packages/contact-center/*/package.json) files
Scope: Repository-wide
Last Updated: 2025-11-23
---

> **For LLM Agents**: Add this file to context when working on TypeScript code, interfaces, or type definitions.
>
> **For Developers**: Update this file when committing TypeScript pattern changes.

---

## Naming Conventions

**Components:**
- PascalCase: `UserState.tsx`, `StationLogin.tsx`
- Component files use `.tsx` extension

**Hooks:**
- camelCase with `use` prefix: `useUserState.ts`, `useStationLogin.ts`
- Hook files use `.ts` extension

**Types/Interfaces:**
- PascalCase with `I` prefix: `IUserState`, `IStationLoginProps`
- Located in `{component}.types.ts` files

**Constants:**
- SCREAMING_SNAKE_CASE: `MAX_RETRY_COUNT`, `DEFAULT_TIMEOUT`
- Grouped in constants files or at top of modules

**Files:**
- Widget entry: `packages/*/src/{widget}/index.tsx`
- Helpers/Hooks: `packages/*/src/helper.ts`
- Types: `packages/*/src/{widget}/{widget}.types.ts`

## Import Patterns

**Store:**
```typescript
import store from '@webex/cc-store';
```

**Components:**
```typescript
import {Component} from '@webex/cc-components';
```

**Hooks:**
```typescript
import {useUserState} from '../helper';
```

**Types:**
```typescript
import {IUserState} from './user-state.types';
```

**MobX:**
```typescript
import {observer} from 'mobx-react-lite';
import {runInAction} from 'mobx';
```

---

## Summary

The codebase uses TypeScript with a centralized configuration and consistent patterns across all packages. TypeScript strict mode is **partially enabled** (`alwaysStrict: true` but not full `strict: true`). The project emphasizes type safety through interfaces, type aliases, and utility types, with a clear separation between widget-level and component-level type definitions.

---

## TypeScript Configuration

### Root Configuration (`tsconfig.json`)

**Location:** `/packages/contact-center/../../../tsconfig.json`

**Key Settings:**
- `alwaysStrict: true` - Enforces strict mode in emitted JavaScript
- `strict: false` - Full strict mode **NOT enabled**
- `allowJs: true` - Allows JavaScript files
- `allowSyntheticDefaultImports: true` - Enables synthetic default imports
- `experimentalDecorators: true` - Required for MobX decorators
- `isolatedModules: true` - Required for Babel transpilation
- `module: "commonjs"` - CommonJS module system
- `target: "ES6"` - ES6 compilation target
- `jsx: "react"` - React JSX support
- `skipLibCheck: true` - Skip type checking of declaration files
- `types: ["jest"]` - Global Jest types

### Package-Level Configurations

All packages (`station-login`, `user-state`, `store`, `cc-components`, `cc-widgets`, `task`, `ui-logging`, `test-fixtures`) extend the root configuration:

```json
{
  "extends": "../../../tsconfig.json",
  "include": ["./src"],
  "compilerOptions": {
    "outDir": "./dist",
    "declaration": true,
    "declarationDir": "./dist/types"
  }
}
```

**Notable Exception:** `store` package uses `moduleResolution: "NodeNext"` and `module: "NodeNext"` for modern resolution.

---

## Interface Patterns

### 1. **Interface Naming Convention**

**Pattern:** Prefix interfaces with `I`

**Examples:**
```typescript
interface IContactCenter { ... }
interface IStore { ... }
interface IStoreWrapper extends IStore { ... }
interface ILogger { ... }
interface IWrapupCode { ... }
interface IUserState { ... }
interface IStationLoginProps { ... }
```

**Enforcement:** Consistent across all packages, especially in `store.types.ts` and component type files.

---

### 2. **Type Aliases vs Interfaces**

**When to use `type`:**
- Union types: `type ICustomState = ICustomStateSet | ICustomStateReset`
- Intersection types: `type WithWebex = { webex: {...} }`
- Utility type compositions: `type UseTaskProps = Pick<TaskProps, ...> & Partial<...>`
- Simple object shapes without extension needs

**When to use `interface`:**
- Component props: `interface IStationLoginProps { ... }`
- Store contracts: `interface IStore { ... }`
- Extensible structures: `interface IStoreWrapper extends IStore { ... }`
- API contracts: `interface IContactCenter { ... }`

**Examples:**
```typescript
// Type for union
type ICustomState = ICustomStateSet | ICustomStateReset;

// Interface for props
interface IUserState {
  idleCodes: IdleCode[];
  logger: ILogger;
  onStateChange?: (arg: IdleCode | ICustomState) => void;
}
```

---

### 3. **Pick and Partial Utility Types**

**Heavy use of `Pick` and `Partial` to derive types** - This is a core pattern throughout the codebase.

**Pattern 1: Pick specific props from parent interface**
```typescript
export type IUserStateProps = Pick<IUserState, 'onStateChange'>;

export type UseUserStateProps = Pick<
  IUserState,
  | 'idleCodes'
  | 'agentId'
  | 'cc'
  | 'currentState'
  | 'customState'
  | 'lastStateChangeTimestamp'
  | 'logger'
  | 'onStateChange'
  | 'lastIdleCodeChangeTimestamp'
>;
```

**Pattern 2: Combine Pick with Partial for optional props**
```typescript
export type IncomingTaskProps = Pick<TaskProps, 'incomingTask'> & 
  Partial<Pick<TaskProps, 'onAccepted' | 'onRejected'>>;

export type StationLoginProps = Pick<IStationLoginProps, 'profileMode'> &
  Partial<Pick<IStationLoginProps, 
    'onLogin' | 'onLogout' | 'onCCSignOut' | 'onSaveStart' | 'onSaveEnd' | 'teamId' | 'doStationLogout'>>;
```

**Pattern 3: Pick from multiple interfaces with intersection**
```typescript
export type UseTaskProps = Pick<TaskProps, 'incomingTask' | 'deviceType' | 'logger'> &
  Partial<Pick<TaskProps, 'onAccepted' | 'onRejected'>>;
```

**Benefit:** Ensures type consistency between component layers (widget → component) without duplication.

---

### 4. **Optional Properties**

**Convention:** Use `?` for optional properties

```typescript
interface IUserState {
  onStateChange?: (arg: IdleCode | ICustomState) => void;
  lastStateChangeTimestamp?: number;
  lastIdleCodeChangeTimestamp?: number;
}
```

**Alternative:** Use `Partial<Pick<...>>` to make specific props optional when deriving types.

---

### 5. **Function Type Signatures**

**Callback Props:**
```typescript
onStateChange?: (arg: IdleCode | ICustomState) => void;
onLogin?: () => void;
onSaveEnd?: (isComplete: boolean) => void;
```

**Generic Functions:**
```typescript
type FetchPaginatedList<T> = (
  params: PaginatedListParams
) => Promise<{data: T[]; meta?: {page?: number; totalPages?: number}}>;

type TransformPaginatedData<T, U> = (item: T, page: number, index: number) => U;
```

**Event Handlers:**
```typescript
// eslint-disable-next-line @typescript-eslint/no-explicit-any
on: (event: string, callback: (data: any) => void) => void;
```

---

## Enums

### Pattern: Named enums for constants

**Examples:**
```typescript
export enum TASK_EVENTS {
  TASK_INCOMING = 'task:incoming',
  TASK_ASSIGNED = 'task:assigned',
  TASK_HOLD = 'task:hold',
  // ... 40+ task events
}

export enum CC_EVENTS {
  AGENT_DN_REGISTERED = 'agent:dnRegistered',
  AGENT_LOGOUT_SUCCESS = 'agent:logoutSuccess',
  AGENT_STATION_LOGIN_SUCCESS = 'agent:stationLoginSuccess',
  // ...
}

export enum ConsultStatus {
  NO_CONSULTATION_IN_PROGRESS = 'No consultation in progress',
  BEING_CONSULTED = 'beingConsulted',
  CONSULT_INITIATED = 'consultInitiated',
  // ...
}

export enum AgentUserState {
  Available = 'Available',
  RONA = 'RONA',
  Engaged = 'ENGAGED',
}
```

**Convention:** UPPERCASE for enum names representing events/constants, PascalCase for state enums.

---

## Type Exports

### Central Export Pattern

**Each package has a `*.types.ts` file that exports all types:**

```typescript
export type {
  IContactCenter,
  ITask,
  Profile,
  Team,
  // ... all interfaces and types
};

export {
  CC_EVENTS,
  TASK_EVENTS,
  ENGAGED_LABEL,
  // ... all enums and constants
};
```

**Widget packages export minimal types:**
```typescript
// user-state.types.ts
export type IUserStateProps = Pick<IUserState, 'onStateChange'>;
export type UseUserStateProps = Pick<IUserState, ...>;
```

---

## Import Patterns

### 1. **SDK Type Imports**

**Direct imports from `@webex/contact-center`:**
```typescript
import {
  AgentLogin,
  Profile,
  ITask,
  // ...
} from '@webex/contact-center';
```

**Deep imports for types not exported (workaround):**
```typescript
import {
  OutdialAniEntriesResponse,
  OutdialAniParams,
} from 'node_modules/@webex/contact-center/dist/types/services/config/types';
```

**Comment pattern for SDK issues:**
```typescript
//  To be fixed in SDK - https://jira-eng-sjc12.cisco.com/jira/browse/CAI-6762
interface IContactCenter {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  on: (event: string, callback: (data: any) => void) => void;
}
```

### 2. **Internal Package Imports**

```typescript
import store, {CC_EVENTS} from '@webex/cc-store';
import {StationLoginComponent, StationLoginComponentProps} from '@webex/cc-components';
import {IUserState} from '@webex/cc-components';
```

---

## Documentation Patterns

### JSDoc for Interfaces

**Comprehensive JSDoc comments on interface properties:**

```typescript
/**
 * Interface representing the properties for the Station Login component.
 */
export interface IStationLoginProps {
  /**
   * Webex instance.
   */
  cc: IContactCenter;

  /**
   * Array of the team IDs that agent belongs to
   */
  teams: Team[];

  /**
   * Handler to initiate the agent login
   */
  login: () => void;

  /**
   * Flag to indicate if the agent is logged in
   */
  isAgentLoggedIn: boolean;
  
  // ...
}
```

**Convention:** Every property should have a JSDoc comment describing its purpose.

---

## Key Conventions to Enforce

### ✅ DO:
1. **Prefix interfaces with `I`**: `IStore`, `ILogger`, `IUserState`
2. **Use `Pick` and `Partial`** to derive widget types from component types
3. **Export all types** from a central `*.types.ts` file in each package
4. **Document every interface property** with JSDoc comments
5. **Use enums for event names and constants** instead of string literals
6. **Use `type` for unions, intersections, and utility compositions**
7. **Use `interface` for component props and extensible contracts**
8. **Mark optional props with `?`** or wrap in `Partial<>`
9. **Use explicit `void` return type** for callbacks
10. **Add TODO comments with JIRA links** for SDK workarounds

### ❌ DON'T:
1. **Don't use `any`** without ESLint disable comment and explanation
2. **Don't duplicate type definitions** - use `Pick` to derive from source
3. **Don't mix `type` and `interface`** for the same use case
4. **Don't skip JSDoc** on public interfaces
5. **Don't use deep imports** from `node_modules` unless SDK types are unavailable

---

## Anti-Patterns Found

### 1. **Deep imports from node_modules**
```typescript
// ❌ ANTI-PATTERN
import {OutdialAniEntriesResponse} from 'node_modules/@webex/contact-center/dist/types/services/config/types';
```
**Reason:** These should be exported from SDK. Tracked as technical debt with JIRA link.

### 2. **Use of `any` in SDK interface workaround**
```typescript
// ❌ NECESSARY EVIL (documented)
// eslint-disable-next-line @typescript-eslint/no-explicit-any
on: (event: string, callback: (data: any) => void) => void;
```
**Reason:** SDK doesn't properly type event callbacks. Disable comment required.

### 3. **Partial strict mode**
- `alwaysStrict: true` but `strict: false` in root config
- **Impact:** Missing stricter null checks, implicit any, etc.
- **Recommendation:** Consider enabling full `strict: true` in future

---

## Examples to Reference

### Example 1: Widget Type Derivation
```typescript
// Component defines full interface
interface IUserState {
  idleCodes: IdleCode[];
  agentId: string;
  cc: IContactCenter;
  currentState: string;
  onStateChange?: (arg: IdleCode | ICustomState) => void;
  // ... 10+ more properties
}

// Widget picks only what it needs
export type IUserStateProps = Pick<IUserState, 'onStateChange'>;

// Helper hook picks different subset
export type UseUserStateProps = Pick<
  IUserState,
  | 'idleCodes'
  | 'agentId'
  | 'cc'
  | 'currentState'
  | 'customState'
  | 'lastStateChangeTimestamp'
  | 'logger'
  | 'onStateChange'
  | 'lastIdleCodeChangeTimestamp'
>;
```

### Example 2: Combining Picked and Partial Props
```typescript
export type StationLoginProps = 
  Pick<IStationLoginProps, 'profileMode'> &
  Partial<Pick<IStationLoginProps, 
    'onLogin' | 'onLogout' | 'onCCSignOut' | 'onSaveStart' | 'onSaveEnd'>>;
```

### Example 3: Generic Type Definitions
```typescript
type FetchPaginatedList<T> = (
  params: PaginatedListParams
) => Promise<{data: T[]; meta?: {page?: number; totalPages?: number}}>;
```

---

## Files Analyzed

1. `/packages/contact-center/tsconfig.json` (root)
2. `/packages/contact-center/station-login/tsconfig.json`
3. `/packages/contact-center/user-state/tsconfig.json`
4. `/packages/contact-center/store/tsconfig.json`
5. `/packages/contact-center/cc-components/tsconfig.json`
6. `/packages/contact-center/store/src/store.types.ts` (346 lines)
7. `/packages/contact-center/user-state/src/user-state.types.ts`
8. `/packages/contact-center/task/src/task.types.ts`
9. `/packages/contact-center/station-login/src/station-login/station-login.types.ts`
10. `/packages/contact-center/cc-components/src/components/StationLogin/station-login.types.ts` (247 lines)
11. `/packages/contact-center/cc-components/src/components/UserState/user-state.types.ts`
12. `/packages/contact-center/station-login/src/helper.ts` (332 lines)
13. `/packages/contact-center/station-login/src/station-login/index.tsx` (77 lines)
14. `/packages/contact-center/user-state/src/user-state/index.tsx` (52 lines)

---

## Usage in Documentation

This pattern is referenced by:
- [`ARCHITECTURE.md`](../ARCHITECTURE.md#typescript-configuration) - TypeScript architecture
- [`DEVELOPMENT.md`](../DEVELOPMENT.md#typescript-standards) - Development standards
- [`.cursorrules`](../../.cursorrules) - AI code generation constraints

## Related Documentation

- [MobX Patterns](./02-mobx-patterns.md) - MobX store with TypeScript types
- [React Patterns](./03-react-patterns.md) - React components with TypeScript
- [Testing Patterns](./05-testing-patterns.md) - TypeScript in tests

## See Also

- [Interface Naming Pattern](./patterns/interface-naming.md)
- [Type Derivation Pattern](./patterns/type-derivation.md)
- [Pick & Partial Usage](./patterns/pick-partial-usage.md)

## Diagrams

![Architecture](./diagrams/architecture.svg)

