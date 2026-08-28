<!-- ───────────────────────────────
  Template:     Pattern
  Template-ID:  pattern
  Generates:    ai-docs/patterns/react-patterns.md
  Description:  React conventions from real code — Widget→Hook→Component layering, ErrorBoundary, helper.ts hooks, effect cleanup.
  Library ver:  0.1.0-draft
  Last updated: 2026-07-01
─────────────────────────────── -->

# Pattern: React component structure

> Start here → repo root [`AGENTS.md`](../../AGENTS.md) (agent entry) · router [`SPEC_INDEX.md`](../SPEC_INDEX.md). This is an `ai-docs/patterns/` file; the folder [README](./README.md) explains the per-pattern shape and routing.
> Context-efficiency: link to canonical docs — don't duplicate them. The one-directional layering is fixed by ADR [`0001`](../adr/0001-one-directional-dependency-flow.md).

Language/layer group: **React**. Functional components with hooks only — no class components.
Each section below is one pattern in the standard shape.

---

## Three-layer architecture: Widget → Hook → Presentational Component

**When to use:** Every user-facing feature. The widget (in a feature package) reads the store and wires
an `ErrorBoundary`; a `helper.ts` hook holds business logic and SDK calls; the presentational component
(in `cc-components`) is pure UI driven by props.

**Correct**

```typescript
// from packages/contact-center/user-state/src/user-state/index.tsx
const UserStateInternal: React.FunctionComponent<IUserStateProps> = observer(({onStateChange}) => {
  const {cc, idleCodes, agentId, currentState /* ...from store */} = store;
  const props: UserStateComponentsProps = {
    ...useUserState({cc, idleCodes, agentId, currentState, onStateChange /* ... */}),
    idleCodes,
    currentState,
  };
  return <UserStateComponent {...props} />;
});
```

The three real layers for this feature:

- Widget: `packages/contact-center/user-state/src/user-state/index.tsx`
- Hook: `packages/contact-center/user-state/src/helper.ts` (`useUserState`)
- Component: `packages/contact-center/cc-components/src/components/UserState/user-state.tsx` (`UserStateComponent`)

**Incorrect**

```typescript
// a presentational component in cc-components reaching into the store
import store from '@webex/cc-store';
export const UserStateComponent = () => {
  const {idleCodes} = store; // component must not read the store or call the SDK
};
```

**Why wrong:** It reverses the dependency arrow (`cc-components` must not import the store/SDK) and makes
the component untestable in isolation — it can no longer be driven purely by props. See ADR-0001.

**Where it appears**

- `user-state`: `.../user-state/src/user-state/index.tsx` → `.../user-state/src/helper.ts` → `.../cc-components/src/components/UserState/user-state.tsx`
- `station-login`: `.../station-login/src/station-login/index.tsx` → `.../station-login/src/helper.ts` → `.../cc-components/src/components/StationLogin/station-login.tsx`
- `task` (CallControl): `.../task/src/CallControl/index.tsx` → `.../task/src/helper.ts` → `.../cc-components/src/components/task/CallControl/call-control.tsx`

**Edge cases / exceptions**

- The `task` package has several widgets sharing one `helper.ts` (see the hooks pattern below).
- Small presentational sub-components may compose without their own hook, but data still arrives via props.

---

## Wrap every widget with `ErrorBoundary`

**When to use:** Every exported widget. An inner `observer` component does the work; an outer wrapper
catches render errors and reports them through `store.onErrorCallback`.

**Correct**

```typescript
// from packages/contact-center/task/src/CallControl/index.tsx
const CallControl: React.FunctionComponent<CallControlProps> = (props) => {
  return (
    <ErrorBoundary
      fallbackRender={() => <></>}
      onError={(error: Error) => {
        if (store.onErrorCallback) store.onErrorCallback('CallControl', error);
      }}
    >
      <CallControlInternal {...props} conferenceEnabled={props.conferenceEnabled ?? true} />
    </ErrorBoundary>
  );
};
```

**Incorrect**

```typescript
// exporting the observer component directly, with no boundary
export {CallControlInternal as CallControl};
```

**Why wrong:** A render error in one widget would otherwise bubble up and blank out the whole host page.
The boundary contains the failure to that widget and forwards it to the host via `onErrorCallback`.

**Where it appears**

- `packages/contact-center/user-state/src/user-state/index.tsx` , `packages/contact-center/station-login/src/station-login/index.tsx` , `packages/contact-center/task/src/CallControl/index.tsx` (also `IncomingTask`, `OutdialCall`, `CallControlCAD`)

**Edge cases / exceptions**

- `fallbackRender={() => <></>}` renders nothing on failure by design (widgets are embedded in a host app that owns the surrounding UI).
- The first `onError` argument is the widget name string — keep it matching the widget so host telemetry attributes errors correctly.

---

## Encapsulate logic in a `helper.ts` hook

**When to use:** Any SDK call, event subscription, timer, or local UI state a widget needs. It goes in a
`use*` hook exported from the feature's `helper.ts`, not inline in the widget.

**Correct**

```typescript
// from packages/contact-center/task/src/helper.ts
const loadBuddyAgents = useCallback(async () => {
  try {
    setLoadingBuddyAgents(true);
    const agents = await store.getBuddyAgents();
    setBuddyAgents(agents);
  } catch (error) {
    logger?.error(`CC-Widgets: Task: Error loading buddy agents - ${error.message || error}`, {
      module: 'useCallControl',
      method: 'loadBuddyAgents',
    });
    setBuddyAgents([]);
  } finally {
    setLoadingBuddyAgents(false);
  }
}, [logger]);
```

Real hooks: `useUserState` (`user-state/src/helper.ts`), `useStationLogin` (`station-login/src/helper.ts`),
and `useTaskList` / `useIncomingTask` / `useCallControl` / `useOutdialCall` / `useRealTimeTranscript`
(all in `task/src/helper.ts`).

**Incorrect**

```typescript
// SDK call inline in the widget instead of a hook
const CallControlInternal = observer((props) => {
  const onHold = () => store.cc.hold(); // logic leaks into the widget
});
```

**Why wrong:** Inline logic can't be unit-tested with `renderHook`, gets duplicated across widgets, and
mixes rendering with side effects. Hooks keep the widget thin and the logic reusable/testable.

**Where it appears**

- `packages/contact-center/user-state/src/helper.ts` , `packages/contact-center/station-login/src/helper.ts` , `packages/contact-center/task/src/helper.ts` (also `packages/contact-center/cc-digital-channels/src/helper.ts`)

**Edge cases / exceptions**

- One `helper.ts` may export several hooks when a package hosts several widgets (the `task` package does).
- A few narrowly-reusable hooks live outside `helper.ts` — e.g. `task/src/Utils/useHoldTimer.ts`, `cc-components/src/hooks/useIntersectionObserver.ts` — when they're shared UI utilities rather than a widget's business logic.

---

## Pure presentational components in `cc-components`

**When to use:** All shared UI. Components take data and callbacks via props, render, and never touch the
store or SDK.

**Correct**

```typescript
// from packages/contact-center/cc-components/src/components/UserState/user-state.tsx
const UserStateComponent: React.FunctionComponent<UserStateComponentsProps> = (props) => {
  const {idleCodes, setAgentStatus, isSettingAgentStatus, currentState, customState, logger} = props;
  const items = buildDropdownItems(customState, idleCodes, currentState, logger);
  return (
    <div className="user-state-container" data-testid="user-state-container">
      {/* renders from props only */}
    </div>
  );
};
```

**Incorrect**

```typescript
import store from '@webex/cc-store'; // component pulling state itself
```

**Why wrong:** Same as the layering rule — importing the store into `cc-components` reverses the
dependency arrow and destroys prop-driven testability.

**Where it appears**

- `packages/contact-center/cc-components/src/components/UserState/user-state.tsx` , `packages/contact-center/cc-components/src/components/StationLogin/station-login.tsx` , `packages/contact-center/cc-components/src/components/task/CallControl/call-control.tsx` (also `task/IncomingTask`, `task/TaskList`)

**Edge cases / exceptions**

- Components may hold local view-only state (open/closed, hover) and use UI utility hooks; they just never own domain state or call the SDK.

---

## Clean up event/callback subscriptions in `useEffect`

**When to use:** Any effect that registers a task/SDK callback or subscribes to an event. Always return a
cleanup that unregisters the exact same handler.

**Correct**

```typescript
// from packages/contact-center/task/src/helper.ts
useEffect(() => {
  const registeredTask = currentTask;
  if (!registeredTask?.data?.interactionId) return;
  const interactionId = registeredTask.data.interactionId;

  store.setTaskCallback(TASK_EVENTS.TASK_HOLD, holdCallback, interactionId, registeredTask);
  store.setTaskCallback(TASK_EVENTS.TASK_RESUME, resumeCallback, interactionId, registeredTask);
  store.setTaskCallback(TASK_EVENTS.TASK_END, endCallCallback, interactionId, registeredTask);

  return () => {
    store.removeTaskCallback(TASK_EVENTS.TASK_HOLD, holdCallback, interactionId, registeredTask);
    store.removeTaskCallback(TASK_EVENTS.TASK_RESUME, resumeCallback, interactionId, registeredTask);
    store.removeTaskCallback(TASK_EVENTS.TASK_END, endCallCallback, interactionId, registeredTask);
  };
}, [currentTask]);
```

Note the repo registers task-scoped listeners through the store's `setTaskCallback` /
`removeTaskCallback` helpers (not raw `cc.on` / `cc.off` in the widget). Both take
`(event, callback, taskId, task?)`: the `taskId` keeps the published API compatible with any
external/already-shipped consumer still passing only a string ID (it falls back to a
`store.taskList[taskId]` lookup), but in-repo callers should always also pass the optional `task`
object — that lookup can be stale during React 18 StrictMode mount/unmount cycles, whereas passing
the captured task reference registers/removes directly on it.

**Incorrect**

```typescript
useEffect(() => {
  store.setTaskCallback(TASK_EVENTS.TASK_HOLD, holdCallback, currentTask.data.interactionId);
  // no return — handler never removed, and omitting `task` risks a stale taskList lookup
}, [currentTask]);
```

**Why wrong:** Without cleanup, handlers accumulate across re-renders/task changes, firing multiple times
and holding references to stale task state (a memory + double-fire leak).

**Where it appears**

- `packages/contact-center/task/src/helper.ts` (task callbacks) , `packages/contact-center/user-state/src/helper.ts` (worker lifecycle) , `packages/contact-center/cc-digital-channels/src/helper.ts`

**Edge cases / exceptions**

- The cleanup must reference the **same function identity** passed on registration (define handlers in the hook body or memoize them), or removal is a no-op.

---

## Memoize callbacks with `useCallback`

**When to use:** A handler defined in a hook that is (a) a dependency of another effect/hook or (b)
passed to a memoized child. Keeps identity stable across renders.

**Correct**

```typescript
// from packages/contact-center/task/src/helper.ts
const getEntryPoints = useCallback(async () => {
  // ...fetch and set state...
}, [logger]);
```

**Incorrect**

```typescript
const getEntryPoints = async () => {
  /* ... */
}; // new identity every render
useEffect(() => {
  getEntryPoints();
}, [getEntryPoints]); // effect re-runs every render
```

**Why wrong:** A fresh function each render changes the effect's dependency identity, re-running the
effect on every render — an infinite-ish fetch loop.

**Where it appears**

- `packages/contact-center/task/src/helper.ts` (`loadBuddyAgents`, `getAddressBookEntries`, `getEntryPoints`, `getQueuesFetcher`, `extractConsultingAgent`).

**Edge cases / exceptions**

- Skip `useCallback` for handlers used only inline in JSX with no memoized child and no effect dependency — the memo overhead buys nothing there.

---

## Related

- [MobX Patterns](./mobx-patterns.md) · [TypeScript Patterns](./typescript-patterns.md) · [Testing Patterns](./testing-patterns.md)
- ADR: [One-directional dependency flow](../adr/0001-one-directional-dependency-flow.md)
