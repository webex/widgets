# Store — Architecture

## Purpose & role in the system

- Provide a singleton MobX state for all Contact Center widgets.
- Normalize SDK (`@webex/contact-center`) data into UI-friendly observables.
- Broker events between the SDK and widgets (task lifecycle, agent state, station login).

## High-level design

- Core singleton: `Store` (`src/store.ts`) with `makeAutoObservable`; accessed through `Store.getInstance()`.
- Wrapper/facade: `StoreWrapper` (`src/storeEventsWrapper.ts`) that:
  - Exposes typed getters/setters and methods for widgets.
  - Registers/unregisters CC and task events.
  - Provides callbacks for incoming tasks, selected task, rejects, etc.
- Public entry: `src/index.ts` exports the wrapper as default and re-exports types and `task-utils`.

## Component/module diagram (ASCII)

```
SDK (Contact Center) ──▶ Store.registerCC/init ──▶ Store (MobX observables)
                               │                          │
                               │                          ▼
                        setupIncomingTaskHandler      StoreWrapper (facade)
                               │                          │
          CC/TASK events  ─────┴─────▶ on(...)           ▼
                                                 Widgets/Components
```

## Data & state

- Key observables (non-exhaustive): `teams`, `loginOptions`, `idleCodes`, `agentId`, `currentTheme`, `wrapupCodes`,
  `currentTask`, `taskList`, `isAgentLoggedIn`, `deviceType`, `teamId`, `dialNumber`, `currentState`, `customState`,
  `lastStateChangeTimestamp`, `lastIdleCodeChangeTimestamp`, `featureFlags`, `isMuted`, `isEndConsultEnabled`,
  `isAddressBookEnabled`, `allowConsultToQueue`, `agentProfile`, `showMultipleLoginAlert`, `callControlAudio`,
  `isQueueConsultInProgress`, `currentConsultQueueId`, `consultStartTimeStamp`.
- `store.types.ts` defines SDK-shaped types and store contracts, plus exported enums/constants (e.g., `CC_EVENTS`, `TASK_EVENTS`).

## Interactions

- Registration & init:
  - `registerCC(webex?)` sets `cc` and `logger`, calls `cc.register()`, populates observables, and extracts `featureFlags` via `getFeatureFlags`.
  - `init({webex}|{webexConfig, access_token}, setupEventListeners)` initializes SDK (or uses provided `webex`), waits for `ready`, calls `registerCC`, and invokes `setupIncomingTaskHandler(cc)`.
- Event handling (in wrapper):
  - `setupIncomingTaskHandler(cc)` attaches:
    - CC: `AGENT_STATION_LOGIN_SUCCESS`, `AGENT_DN_REGISTERED`, `AGENT_RELOGIN_SUCCESS`, `AGENT_STATE_CHANGE`, `AGENT_MULTI_LOGIN`, `AGENT_LOGOUT_SUCCESS`.
    - TASK: `TASK_HYDRATE`, `TASK_INCOMING`, `TASK_MERGED`, and many others registered per-task via `registerTaskEventListeners`.
  - Task media: attach/detach `TASK_MEDIA` handlers only when `deviceType === 'BROWSER'`.
  - Multi-login: toggles `showMultipleLoginAlert` and supports re-registration.
- Facade API highlights:
  - Getters for all store fields and typed setters (e.g., `setCurrentState`, `setTeamId`, `setIsMuted`).
  - Task controls: `setCurrentTask`, `refreshTaskList`, `setTaskCallback/removeTaskCallback`.
  - Event bridge: `setCCCallback/removeCCCallback`.
  - Data fetchers: `getBuddyAgents`, `getQueues`, `getEntryPoints`, `getAddressBookEntries`.
  - Clean-up: `cleanUpStore` on logout to reset critical fields.

## Async & error handling

- All SDK calls wrapped with logging and try/catch, using `logger` (`LoggerProxy`).
- `init` uses a timeout (6s) to reject if SDK never emits `ready`.
- `registerCC` logs and rejects on failure.
- Address book fetch short-circuits when disabled.
- On task update failures, logic reverts state where needed (e.g., in widgets consuming the store).

## Performance notes

- `makeAutoObservable` with `cc` observed by reference (`observable.ref`) to avoid deep observation of the SDK instance.
- Event listeners are added once; wrapper ensures register/remove consistency.
- Derived filtering (e.g., for `idleCodes`) handled in getter to avoid mutating source arrays.

## Extensibility points

- Add new getters/setters to wrapper without exposing internal `Store` directly.
- Extend `featureFlags` extraction in `util.ts`.
- Add typed events in `store.types.ts` and map them in `setupIncomingTaskHandler`.

## Security & compliance

- Do not persist secrets in observables.
- Avoid logging PII; logs already use structured messages.

## Testing strategy

- `tests/store.ts` covers singleton initialization, `registerCC`, `init` timeout and ready-paths, and error logging.
- `tests/storeEventsWrapper.ts` covers: event wiring, task lifecycle handlers, conditional media handling, multi-login, custom states, queue/EP/address book fetchers, and cleanup behavior.

## Operational concerns

- Ensure SDK is initialized before `registerCC` unless using `init` with Webex config.
- On logout, `cleanUpStore` resets flags and state for a clean slate; event listeners are removed.

## Risks & known pitfalls

- Ensure event listeners are removed on logout to prevent leaks.
- Relying on SDK fields that may be missing; tests and code guard against undefined shapes.

## Source map

- `packages/contact-center/store/src/store.ts`
- `packages/contact-center/store/src/storeEventsWrapper.ts`
- `packages/contact-center/store/src/store.types.ts`
- `packages/contact-center/store/src/util.ts`
- `packages/contact-center/store/src/task-utils.ts`
- `packages/contact-center/store/tests/*`

<!-- TODOs -->

