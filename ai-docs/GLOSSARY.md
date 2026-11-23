# Glossary — webex-widgets

> Start here → root [`AGENTS.md`](../AGENTS.md) (agent entry) · router [`SPEC_INDEX.md`](SPEC_INDEX.md) · system [`ARCHITECTURE.md`](ARCHITECTURE.md). Then this doc; related: [`CONTRACTS.md`](CONTRACTS.md); module specs indexed in `SPEC_INDEX.md`.
> Context-efficiency: link to canonical docs — don't duplicate them; load on demand, not upfront.

> Read this before naming anything. Use the canonical name exactly; never introduce a synonym. Find a term
> in code that isn't here? Add it rather than guessing its meaning.

## Domain Terms

| Term | Definition (one or two sentences) | Authoritative location (file/type) | Notes / synonyms to avoid |
|---|---|---|---|
| Store | The single MobX store class holding global Contact Center state (`teams`, `idleCodes`, `agentId`, `currentState`, `cc`, etc.) and proxying SDK events into observables. It is the sole SDK access point. | `packages/contact-center/store/src/store.ts` (`class Store implements IStore`) | Not "state container" / "Redux store". |
| `Store.getInstance()` | Static accessor returning the lazily-created singleton `Store` instance; the default export of `@webex/cc-store` is this instance. | `packages/contact-center/store/src/store.ts` (`public static getInstance()`) | Never `new Store()`. Import as `import store from '@webex/cc-store'`. |
| Widget | A self-contained CC feature unit following the Widget → Hook → Component flow; the exported widget is an `observer()` component wrapped in an `ErrorBoundary`. | `packages/contact-center/{station-login,user-state,task}/src/.../index.tsx` | Not "component" (that means the presentational layer here). |
| observer HOC | `observer()` from `mobx-react-lite` wrapping a widget so it re-renders when the store observables it reads change. | `packages/contact-center/user-state/src/user-state/index.tsx`; pattern in `ai-docs/patterns/mobx-patterns.md` | Not "connect" / "subscribe". |
| helper hook | The custom hook (e.g. `useUserState`, `useCallControl`) in a package's `helper.ts` that holds business logic, SDK calls (via the store), and event wiring; widgets call it, components do not. | `packages/contact-center/{pkg}/src/helper.ts` | Not "service" / "controller". |
| Presentational component | Pure-UI React component receiving props only, living in `cc-components`; never accesses the store or SDK. | `packages/contact-center/cc-components/src/` (e.g. `CallControlCADComponent`) | Not "widget". Suffix `...Component`. |
| Task | An active contact/interaction (call, etc.) the agent is handling, carrying queue/entry-point metadata; modeled as `ITask`. | `packages/contact-center/task/src/task.types.ts` (`ITask`); store utils `packages/contact-center/store/src/task-utils.ts` | Not "session" / "interaction" in code identifiers. |
| IncomingTask | The widget that presents a ringing/offered task to the agent (accept/decline). | `packages/contact-center/task/src/IncomingTask/index.tsx` | Not "RingingTask". |
| CallControl | The widget providing in-call controls (hold/resume, transfer, consult, mute, end). | `packages/contact-center/task/src/CallControl/index.tsx` | Distinct from CallControlCAD. |
| CallControlCAD | CallControl variant surfacing Call-Associated Data and wrapup codes alongside controls. | `packages/contact-center/task/src/CallControlCAD/index.tsx` | "CAD" = Call-Associated Data; do not expand as "computer-aided". |
| OutdialCall | The widget that initiates an outbound (outdial) call. | `packages/contact-center/task/src/OutdialCall/index.tsx` | Not "Dialer". |
| TaskList | The widget listing the agent's active tasks. | `packages/contact-center/task/src/TaskList/index.tsx` | Not "queue list". |
| RealTimeTranscript | Task sub-widget rendering a live transcript of the interaction. | registered in `packages/contact-center/cc-widgets/src/wc.ts`; exported from `@webex/cc-task` | — |
| idle code | A configured non-available agent state/reason (e.g. Break, Lunch) selectable in the user-state widget; modeled as `IdleCode`. | `packages/contact-center/store/src/store.types.ts` (`IdleCode`, `idleCodes`); `packages/contact-center/user-state/src/helper.ts` | Not "aux code" / "reason code" in identifiers (though it maps to `lastStateAuxCodeId`). |
| agent state | The agent's current presence/availability, held as `currentState` and changed via the user-state widget through the store. | `packages/contact-center/store/src/store.ts` (`currentState`); `packages/contact-center/user-state/src/helper.ts` | Not "status". |
| station login | The agent login flow selecting team and device (dial number / extension / browser); the station-login widget. | `packages/contact-center/station-login/src/station-login/index.tsx` (+ `station-login.types.ts`) | Not "sign-in" in identifiers. |
| buddy agents | Other agents available as consult/transfer targets, loaded via `store.getBuddyAgents()` into the task hook as `BuddyDetails[]`. | `packages/contact-center/task/src/helper.ts` (`loadBuddyAgents`, `buddyAgents`) | Not "peers" / "colleagues". |
| queue | A routing destination for tasks; a transfer/consult target type and a task metadata field. | `packages/contact-center/task/src/task.types.ts` (`QUEUE: 'queue'`); store `currentConsultQueueId`, `allowConsultToQueue` in `store/src/store.ts` | Not "skill group". |
| entry point | A routing entry destination; a transfer/consult target type for tasks. | `packages/contact-center/task/src/task.types.ts` (`ENTRY_POINT: 'entryPoint'`) | One concept; write `entryPoint` in code. |
| wrapup code | A configured post-interaction disposition code applied at task end; modeled as `IWrapupCode`. | `packages/contact-center/store/src/store.ts` (`wrapupCodes: IWrapupCode[]`); surfaced in `CallControlCAD` | Not "disposition" in identifiers. |
| r2wc / Web Component | The `@r2wc/react-to-web-component` wrapper that turns each React widget into a framework-agnostic custom element registered via `customElements.define`. | `packages/contact-center/cc-widgets/src/wc.ts` | "r2wc" is the library; the output is a custom element / Web Component. |
| withMetrics | HOC from `@webex/cc-ui-logging` that wraps a widget export to emit usage/telemetry metrics. | `packages/contact-center/ui-logging/src/withMetrics.tsx` (exported from `ui-logging/src/index.ts`) | Not a generic "logger wrapper". |
| metricsLogger | The telemetry logger utility (and `WidgetMetrics` type) behind `withMetrics`. | `packages/contact-center/ui-logging/src/metricsLogger.ts` | — |
| ErrorBoundary | `react-error-boundary` boundary wrapping every widget export; its `onError` routes to `store.onErrorCallback('WidgetName', error)` with a non-throwing fallback. | pattern in `ai-docs/patterns/react-patterns.md`; realized in `task/src/CallControlCAD/index.tsx` | — |
| `store.cc` | The held SDK Contact Center instance (`observable.ref`); the only path to SDK methods/events (e.g. `store.cc.on(...)`). | `packages/contact-center/store/src/store.ts` (`cc: IContactCenter`) | Never import the SDK directly. |
| V1 agent state | The existing agent-wide state model where one state applies to all channels simultaneously. The `UserState` widget uses this model. | `packages/contact-center/user-state/` | Not "legacy state" in identifiers. |
| V2 agent state / granular agent state | A per-channel state model (WXCC-15791) where each channel (Voice, Chat, Email, Social) has an independent availability. The `GranularAgentState` widget uses this model. | `packages/contact-center/granular-agent-state/`; SDK `cc.getChannelStates()` | Synonymous with "granular agent state". |
| channel availability | Whether a specific channel (Voice, Chat, Email, Social) is set to Available or Idle (with a reason code) under the V2 model. | `packages/contact-center/cc-components/src/components/GranularAgentState/` | Not "channel state" in identifiers (the SDK uses `AgentChannelTypeStates`). |
| V1/V2 routing | The SDK reads `agentConfig.manageChannelAvailability === true` directly for every V1/V2 decision — no intermediate state or pinning. | SDK `cc.ts`; store reads via `cc.getAgentStateControl().active` | Not "pinned version" — the flag is the single source of truth. |
| bridging (V2→V1) | In V2 sessions, the SDK also emits old V1 `agent:stateChange` events from per-channel states so existing V1 consumers (like `UserState`) keep working without modification. | SDK `services/agent/types.ts` | Not "proxying" / "forwarding". |
| GranularAgentState | The V2 per-channel agent state widget (WXCC-15791); distinct from `UserState` (V1). Mounted when `store.isGranularAgentStateActive` is `true`. | `packages/contact-center/granular-agent-state/src/index.ts` | Not "UserStateV2" / "ChannelState". |
| `manageChannelAvailability` | Agent profile flag from the backend that determines V1 vs V2. When `true`, the SDK uses V2; when `false`/absent, V1. | SDK `AgentProfile.manageChannelAvailability`; store reads via `refreshAgentStateControl()` | Not a store/widget flag — it originates from the agent profile. |
| `store.isGranularAgentStateActive` | MobX observable boolean derived from `cc.getAgentStateControl().active`. Gates whether hosts/samples mount `GranularAgentState` (V2) or `UserState` (V1). | `packages/contact-center/store/src/store.ts` | Not "isV2" / "isGranularEnabled". |

## Abbreviations & Acronyms

| Abbreviation | Expansion | Meaning in this repo |
|---|---|---|
| CC | Contact Center | The Webex Contact Center product family; prefix of the CC widget packages (`@webex/cc-*`). |
| SDK | Software Development Kit | The `@webex/contact-center` SDK, reached only via `store.cc`. |
| r2wc | react-to-web-component | `@r2wc/react-to-web-component`, used in `cc-widgets/src/wc.ts` to emit custom elements. |
| HOC | Higher-Order Component | React wrapping pattern; used for `observer()` and `withMetrics`. |
| MobX | (product name) | The reactive state library backing the store; mutations go through `runInAction`. |
| RTL | React Testing Library | Component/unit test library paired with Jest. |
| PnP | Plug'n'Play | Yarn 4.5.1 module resolution mode used by this monorepo (no `node_modules` by default). |
| CAD | Call-Associated Data | Interaction metadata surfaced by the CallControlCAD widget. |
| E2E | End-to-End | Playwright browser tests under `playwright/`. |
| PII | Personally Identifiable Information | Must never be logged (see `RULES.md` Logging/Security). |
| RONA | Redirect On No Answer | An agent state value referenced in state handling. |
| DN | Dial Number | The agent's telephony dial number (`store.dialNumber`); a station-login device option. |

## Maintenance
- When a new domain concept is introduced (new entity, event, state), add it here in the same change.
- Cross-reference: module specs → `SPEC_INDEX.md`; contracts → [`CONTRACTS.md`](CONTRACTS.md); SDK surface → `@webex/contact-center` types (`node_modules/@webex/contact-center/dist/types/index.d.ts`).
