<!-- ───────────────────────────────
  Template:     Pattern
  Template-ID:  pattern
  Generates:    ai-docs/patterns/typescript-patterns.md
  Description:  TypeScript conventions from real code — *.types.ts co-location, Pick/Partial prop derivation, in-repo event enums, JSDoc, callbacks.
  Library ver:  0.1.0-draft
  Last updated: 2026-07-01
─────────────────────────────── -->

# Pattern: TypeScript conventions

> Start here → repo root [`AGENTS.md`](../../AGENTS.md) (agent entry) · router [`SPEC_INDEX.md`](../SPEC_INDEX.md). This is an `ai-docs/patterns/` file; the folder [README](./README.md) explains the per-pattern shape and routing.
> Context-efficiency: link to canonical docs — don't duplicate them. `no-any` and formatting are enforced by ESLint/Prettier — those are rules, not patterns.

Language/layer group: **TypeScript**. Each section below is one pattern in the standard shape.

---

## Co-locate types in `*.types.ts`

**When to use:** Every widget and component defines its props/state types in a sibling
`<name>.types.ts`, not inline in the `.tsx`.

**Correct**
```typescript
// from packages/contact-center/cc-components/src/components/UserState/user-state.types.ts
export interface IUserState {
  idleCodes: IdleCode[];
  agentId: string;
  currentState: string;
  onStateChange?: (arg: IdleCode | ICustomState) => void;
}
```

**Incorrect**
```typescript
// props type declared inline in the component .tsx and duplicated in the widget
const UserStateComponent = (props: {idleCodes: IdleCode[]; currentState: string}) => { /* ... */ };
```
**Why wrong:** Inline prop types can't be shared with the widget/hook and drift out of sync; the
`.types.ts` file is the single source the widget derives from (see the `Pick`/`Partial` pattern).

**Where it appears**
- `packages/contact-center/store/src/store.types.ts` , `packages/contact-center/cc-components/src/components/UserState/user-state.types.ts` , `packages/contact-center/cc-components/src/components/StationLogin/station-login.types.ts` (also `task/task.types.ts`, `user-state/src/user-state.types.ts`, `station-login/src/station-login/station-login.types.ts`, `cc-digital-channels/.../digital-channels.types.ts`)

**Edge cases / exceptions**
- The `I`-prefix on interface names is used for many core types (`IUserState`, `IStationLoginProps`, `IContactCenter`, `IStore`) but is **not** consistently applied — several prop/data interfaces omit it (`TaskProps`, `ControlProps`, `OutdialCallProps`, `LoginOptionsState`). Follow the prefix for new interfaces but don't assume every existing type has it.

---

## Derive prop types with `Pick` / `Partial`

**When to use:** A widget or hook needs a subset of a larger interface. Derive it with `Pick` (and
`Partial` for optional callbacks) instead of re-declaring fields.

**Correct**
```typescript
// from packages/contact-center/user-state/src/user-state.types.ts
export type IUserStateProps = Pick<IUserState, 'onStateChange'>;
```
```typescript
// from packages/contact-center/task/src/task.types.ts
export type UseTaskProps = Pick<TaskProps, 'incomingTask' | 'deviceType' | 'logger'> &
  Partial<Pick<TaskProps, 'onAccepted' | 'onRejected'>>;
```

**Incorrect**
```typescript
export type IUserStateProps = {
  onStateChange?: (arg: IdleCode | ICustomState) => void; // hand-copied, will drift from IUserState
};
```
**Why wrong:** A hand-copied subset silently diverges when the source interface changes (a field's type
updates but the copy doesn't), producing type errors far from the edit or, worse, none at all.

**Where it appears**
- `packages/contact-center/user-state/src/user-state.types.ts` , `packages/contact-center/cc-components/src/components/UserState/user-state.types.ts` (`UserStateComponentsProps` = `Pick<IUserState, ...>`) , `packages/contact-center/task/src/task.types.ts`

**Edge cases / exceptions**
- When a prop truly does not exist on any parent interface (a widget-only flag), declaring it directly is fine — derive only what genuinely overlaps a source type.

---

## Union types for closed value sets

**When to use:** A value is one of a small, fixed set of shapes or string literals.

**Correct**
```typescript
// from packages/contact-center/store/src/store.types.ts
type ICustomState = ICustomStateSet | ICustomStateReset;
```
```typescript
// from packages/contact-center/cc-components/src/components/task/task.types.ts
export type CallControlMenuType = 'Consult' | 'Transfer' | 'ExitConference';
```

**Incorrect**
```typescript
type CustomState = {kind: string; [k: string]: any}; // open-ended, loses exhaustiveness
```
**Why wrong:** An open shape defeats exhaustiveness checking — `switch` over the value no longer errors on
an unhandled variant, and `any` re-enters the codebase.

**Where it appears**
- `packages/contact-center/store/src/store.types.ts` (`ICustomState`) , `packages/contact-center/cc-components/src/components/task/task.types.ts` (`CallControlMenuType`, `CategoryType`, `CampaignAutoAction`)

**Edge cases / exceptions**
- **Candidate (fewer than 3 occurrences of one union shape):** each union above is used in only one or two spots. The *convention* (prefer a closed union over an open string) holds broadly, but no single union is a repo-wide 3+ pattern.

---

## Event/state enums are defined in-repo

**When to use:** Referencing SDK event names or fixed agent-state values. Use the repo's enums; do not
scatter string literals.

**Correct**
```typescript
// from packages/contact-center/store/src/store.types.ts
enum TASK_EVENTS {
  TASK_INCOMING = 'task:incoming',
  TASK_ASSIGNED = 'task:assigned',
  TASK_HOLD = 'task:hold',
  // ...
} // TODO: remove this once cc sdk exports this enum
```

**Incorrect**
```typescript
store.cc.on('task:incoming', handler); // raw string literal, easy to typo
```
**Why wrong:** A mistyped event string fails silently (the handler simply never fires). The enum gives one
authoritative spelling and lets TypeScript catch typos.

**Where it appears**
- `packages/contact-center/store/src/store.types.ts` (`TASK_EVENTS`, `CC_EVENTS`, `ConsultStatus`, agent-state constants) , `packages/contact-center/cc-components/src/components/UserState/user-state.types.ts` (`AgentUserState`).

**Edge cases / exceptions**
- These enums are **defined in this repo, not imported from `@webex/contact-center`** — the SDK does not yet export them (see the `// TODO: remove this once cc sdk exports this enum` comment). Data *types* like `Profile`, `ITask`, `Team`, `IdleCode`, `BuddyDetails` do come from the SDK (imported at the top of `store.types.ts`); the event/state enums are the local exception. When the SDK begins exporting these enums, prefer the SDK's.

---

## JSDoc on public interface properties

**When to use:** Every property of an exported props/state interface in `cc-components` (and the store's
public surface) carries a `/** ... */` describing intent.

**Correct**
```typescript
// from packages/contact-center/cc-components/src/components/StationLogin/station-login.types.ts
export interface IStationLoginProps {
  /**
   * Webex instance.
   */
  cc: IContactCenter;

  /**
   * Callback function to be invoked once the agent login is successful
   */
  onLogin?: () => void;
}
```

**Incorrect**
```typescript
export interface IStationLoginProps {
  cc: IContactCenter; // no doc — meaning of the prop is opaque to consumers
  onLogin?: () => void;
}
```
**Why wrong:** These interfaces are the public API of the widgets; without JSDoc, host-app integrators (and
generated typedoc) have no description of each prop.

**Where it appears**
- `packages/contact-center/cc-components/src/components/UserState/user-state.types.ts` , `packages/contact-center/cc-components/src/components/StationLogin/station-login.types.ts` , `packages/contact-center/cc-components/src/components/task/task.types.ts`

**Edge cases / exceptions**
- Internal helper types not part of a public surface don't require full JSDoc.

---

## Typed optional callback props

**When to use:** A component/widget exposes an event to its host as an optional prop. Type the full
signature; make it optional with `?`.

**Correct**
```typescript
// from packages/contact-center/cc-components/src/components/task/task.types.ts
onAccepted?: ({task}: {task: ITask}) => void;
onRejected?: ({task}: {task: ITask}) => void;
```
```typescript
// from packages/contact-center/cc-components/src/components/UserState/user-state.types.ts
onStateChange?: (arg: IdleCode | ICustomState) => void;
```

**Incorrect**
```typescript
onAccepted?: Function; // untyped — arguments and return are unchecked
```
**Why wrong:** `Function` (or `any` args) removes checking on what the host receives, so a callback shape
change won't surface at the call site.

**Where it appears**
- `packages/contact-center/cc-components/src/components/task/task.types.ts` (`onAccepted`, `onRejected`) , `packages/contact-center/cc-components/src/components/StationLogin/station-login.types.ts` (`onLogin`, `onLogout`) , `packages/contact-center/cc-components/src/components/UserState/user-state.types.ts` (`onStateChange`)

**Edge cases / exceptions**
- Required callbacks (no `?`) follow the same typed-signature rule — the pattern is "type the signature," and optionality is orthogonal.

---

## Naming: files and identifiers

**When to use:** Naming new files and symbols.

**Correct**
- Components: PascalCase, `.tsx` (`user-state.tsx` exports `UserStateComponent`; `DigitalChannelsComponent.tsx`).
- Hooks: `use*` prefix in a `.ts` file — the widget's hooks live in `helper.ts`; broadly-shared ones in a `hooks/` or `Utils/` folder (`cc-components/src/hooks/useIntersectionObserver.ts`, `task/src/Utils/useHoldTimer.ts`).
- Constants/enums: SCREAMING_SNAKE_CASE (`TASK_EVENTS`, `CC_EVENTS`, `AGENT_STATE_AVAILABLE`).

**Incorrect**
```
UseUserState.ts   // hook file should be camelCase and, for a widget's logic, live in helper.ts
```
**Why wrong:** Inconsistent casing/placement makes hooks hard to locate; the repo convention is a widget's
hooks in `helper.ts` and shared hooks in a dedicated folder.

**Where it appears**
- Components: `.../cc-components/src/components/UserState/user-state.tsx` , `.../cc-components/src/components/StationLogin/station-login.tsx` , `.../cc-digital-channels/src/digital-channels/DigitalChannelsComponent.tsx`
- Hooks: `.../task/src/helper.ts` , `.../cc-components/src/hooks/useIntersectionObserver.ts` , `.../task/src/Utils/useHoldTimer.ts`

**Edge cases / exceptions**
- `no-any` is enforced by ESLint (`@typescript-eslint/no-explicit-any`); where `any` is genuinely required it carries an inline `eslint-disable` with a reason (see `IContactCenter` in `store.types.ts`). That's a lint rule, not a documented pattern.

---

## Related

- [React Patterns](./react-patterns.md) · [MobX Patterns](./mobx-patterns.md) · [Testing Patterns](./testing-patterns.md)
