<!-- ───────────────────────────────
  Template:     Pattern
  Template-ID:  pattern
  Generates:    ai-docs/patterns/mobx-patterns.md
  Description:  MobX state conventions from real code — singleton store, runInAction mutations, observer widgets, event wiring.
  Library ver:  0.1.0-draft
  Last updated: 2026-07-01
─────────────────────────────── -->

# Pattern: MobX state management

> Start here → repo root [`AGENTS.md`](../../AGENTS.md) (agent entry) · router [`SPEC_INDEX.md`](../SPEC_INDEX.md). This is an `ai-docs/patterns/` file; the folder [README](./README.md) explains the per-pattern shape and routing.
> Context-efficiency: link to canonical docs — don't duplicate them. See also ADR [`0001`](../adr/0001-one-directional-dependency-flow.md) (single SDK boundary) and rule [`sdk-access-via-store`](../rules/sdk-access-via-store.md).

Language/layer group: **MobX** (state lives in `@webex/cc-store`; the SDK is reached only through it).
Each section below is one pattern in the standard shape.

---

## Singleton store via `Store.getInstance()`

**When to use:** Whenever any package needs contact-center state or the SDK. There is exactly one store
for the whole repo; never construct a second one.

**Correct**
```typescript
// from packages/contact-center/store/src/store.ts
class Store implements IStore {
  private static instance: Store;
  teams: Team[] = [];
  idleCodes: IdleCode[] = [];
  agentId: string = '';

  constructor() {
    makeAutoObservable(this, {
      cc: observable.ref, // don't deep-observe the SDK instance
    });
  }

  public static getInstance(): Store {
    if (!Store.instance) {
      Store.instance = new Store();
    }
    return Store.instance;
  }
}
```
The store uses **`makeAutoObservable`** in the constructor — plain property declarations, no decorators.
The exported default is the singleton wrapper (`packages/contact-center/store/src/index.ts` re-exports
`storeEventsWrapper`, which holds `Store.getInstance()`).

**Incorrect**
```typescript
import {Store} from '@webex/cc-store';
const store = new Store(); // second instance
```
**Why wrong:** A second instance holds its own observable state and its own SDK connection, so widgets
observe stale data and events fire against the wrong store. Global CC state must stay coherent across
widgets (see ADR-0001).

**Where it appears**
- `packages/contact-center/store/src/store.ts` (class + `getInstance`) , `packages/contact-center/store/src/storeEventsWrapper.ts` (constructs `Store.getInstance()`) , `packages/contact-center/store/src/index.ts` (exports the singleton as default)

**Edge cases / exceptions**
- Decorator-style MobX (`@observable` / `@action`) is **not** used here; the store is `makeAutoObservable`. Ignore any legacy example showing decorators.
- `cc` is registered as `observable.ref` so MobX tracks the reference swap, not the SDK's internal fields.

---

## Mutate observable state only inside `runInAction`

**When to use:** Every write to a store observable that happens outside a MobX action — i.e. inside an
`async` continuation, a promise `.then`, an SDK event callback, or a setter helper.

**Correct**
```typescript
// from packages/contact-center/store/src/storeEventsWrapper.ts
setDigitalChannelsInitialized = (value: boolean): void => {
  runInAction(() => {
    this.store.isDigitalChannelsInitialized = value;
  });
};
```

**Incorrect**
```typescript
const handleLogin = async () => {
  const result = await cc.login();
  store.agentId = result.agentId; // direct mutation, no runInAction
};
```
**Why wrong:** With `makeAutoObservable`, mutating an observable outside an action after an `await`
triggers MobX strict-mode warnings and batches inconsistently, so observers may re-render mid-update or
not at all.

**Where it appears**
- `packages/contact-center/store/src/storeEventsWrapper.ts` (dozens of setters and event handlers wrap writes in `runInAction`) , `packages/contact-center/task/src/helper.ts` , `packages/contact-center/user-state/src/helper.ts`

**Edge cases / exceptions**
- Reads never need `runInAction`; only writes to observables do.
- The store exposes setter methods (`setAgentProfile`, `setCurrentState`, …) that already wrap
  `runInAction`; prefer calling those from widgets/hooks over mutating `store.x` directly.

---

## Wrap store-consuming widgets with `observer`

**When to use:** Any widget component that reads store observables and must re-render when they change.

**Correct**
```typescript
// from packages/contact-center/user-state/src/user-state/index.tsx
import store from '@webex/cc-store';
import {observer} from 'mobx-react-lite';

const UserStateInternal: React.FunctionComponent<IUserStateProps> = observer(({onStateChange}) => {
  const {cc, idleCodes, agentId, currentState} = store;
  // ...
});
```

**Incorrect**
```typescript
const UserStateInternal = ({onStateChange}) => {
  const {idleCodes} = store; // reads observables but no observer()
  // ...
};
```
**Why wrong:** Without `observer`, the component captures observable values once and never re-renders
when the store updates, so the UI silently goes stale.

**Where it appears**
- `packages/contact-center/user-state/src/user-state/index.tsx` , `packages/contact-center/station-login/src/station-login/index.tsx` , `packages/contact-center/task/src/CallControl/index.tsx` (also `IncomingTask`, `TaskList`, `OutdialCall`, `CallControlCAD`, `RealTimeTranscript`, `cc-digital-channels`)

**Edge cases / exceptions**
- Purely presentational components in `cc-components` receive data via props and must **not** read the store, so they are not `observer`-wrapped.
- The outer `ErrorBoundary` wrapper (see [react-patterns](./react-patterns.md)) is not an `observer`; only the inner `*Internal` component is.

---

## Import the store as a default singleton

**When to use:** Any file (widget, hook, logger) that needs store state or `store.cc`.

**Correct**
```typescript
// from packages/contact-center/user-state/src/helper.ts
import store from '@webex/cc-store';
```
The default export of `@webex/cc-store` is the already-instantiated singleton wrapper — importing it gives
every consumer the same instance.

**Incorrect**
```typescript
import {Store} from '@webex/cc-store';
const store = Store.getInstance(); // works, but never `new Store()` — and prefer the default import
```
**Why wrong:** Constructing or re-resolving the instance in consumers scatters access styles; the default
import is the one supported entry point and keeps the singleton contract obvious.

**Where it appears**
- `packages/contact-center/user-state/src/helper.ts` , `packages/contact-center/station-login/src/station-login/index.tsx` , `packages/contact-center/task/src/helper.ts` (and every widget `index.tsx` + `ui-logging/src/metricsLogger.ts`)

**Edge cases / exceptions**
- Inside the store package itself, code references `Store.getInstance()` / the wrapper directly rather than the published default export.

---

## Central SDK-event wiring in the store wrapper

**When to use:** Registering handlers for SDK events (`agent:*`, `task:*`) that update global state. This
lives in the store, not in widgets.

**Correct**
```typescript
// from packages/contact-center/store/src/storeEventsWrapper.ts
const handleLogin = (payload: Profile) => {
  runInAction(() => {
    this.setAgentProfile(payload);
    this.setIsAgentLoggedIn(true);
    this.setCurrentState(payload.auxCodeId?.trim() !== '' ? payload.auxCodeId : '0');
  });
};

ccSDK.on(CC_EVENTS.AGENT_STATION_LOGIN_SUCCESS, handleLogin);
```

**Incorrect**
```typescript
// in a widget index.tsx — global agent state wired up per-widget
store.cc.on(CC_EVENTS.AGENT_STATION_LOGIN_SUCCESS, (p) => { store.agentId = p.agentId; });
```
**Why wrong:** Global state (login, agent state, current task) wired in a widget duplicates listeners,
leaks them on unmount, and mutates observables outside `runInAction`. Global wiring belongs in the store
wrapper so there is one registration and one source of truth.

**Where it appears**
- `packages/contact-center/store/src/storeEventsWrapper.ts` (login, logout, state-change, task events) — this is the single place global SDK events are wired.

**Edge cases / exceptions**
- **Widget-local, task-scoped** listeners are legitimate in a hook, but go through the store's
  `setTaskCallback` / `removeTaskCallback` helpers with `useEffect` cleanup (see the effect-cleanup
  pattern in [react-patterns](./react-patterns.md)), not raw `cc.on` in the widget.

---

## Computed-style getters on the store wrapper

**When to use:** Exposing a derived view of raw store state (e.g. filtering system idle codes) so
consumers read a ready-to-use value.

**Correct**
```typescript
// from packages/contact-center/store/src/storeEventsWrapper.ts
get idleCodes() {
  return this.store.idleCodes.filter((code) => {
    return Object.values(ERROR_TRIGGERING_IDLE_CODES).includes(code.name) || !code.isSystem;
  });
}
```
Derivations are plain TypeScript getters on the `StoreWrapper` that proxy/transform the underlying
`Store` observables (there are 30+ such getters on the wrapper). Because the wrapper reads observables
inside the getter, `observer` components stay reactive.

**Incorrect**
```typescript
// filtering the same derived value inside every widget
const usable = store.idleCodes.filter((c) => !c.isSystem); // duplicated derivation logic
```
**Why wrong:** Copying the derivation into each consumer drifts over time and re-implements the same rule
in many places; centralizing it on the wrapper keeps one definition.

**Where it appears**
- `packages/contact-center/store/src/storeEventsWrapper.ts` (`get idleCodes`, `get currentTask`, `get taskList`, `get currentState`, and other proxy getters).

**Edge cases / exceptions**
- These are TypeScript getters on the wrapper, **not** MobX `@computed` — there is no memoization; keep the derivation cheap.
- The plain `Store` class holds no getters; all derivation lives on the wrapper.

---

## Related

- [React Patterns](./react-patterns.md) · [TypeScript Patterns](./typescript-patterns.md) · [Testing Patterns](./testing-patterns.md)
- Rule: [Access the SDK only through the store](../rules/sdk-access-via-store.md) · ADR: [One-directional dependency flow](../adr/0001-one-directional-dependency-flow.md)
