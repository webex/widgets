# cc-widgets — SPEC

> Start here → root [`AGENTS.md`](../../../../AGENTS.md) (agent entry) · router [`SPEC_INDEX.md`](../../../../ai-docs/SPEC_INDEX.md) · system [`ARCHITECTURE.md`](../../../../ai-docs/ARCHITECTURE.md). This is the module's canonical spec: orientation, requirements, design, flows, state, protocol, UI, data, and tests.
> Context-efficiency: link to canonical docs — don't duplicate them. Load specs on demand per `SPEC_INDEX.md`.

## Metadata
| Field | Value |
|---|---|
| Module id | `cc-widgets` |
| Source path(s) | `packages/contact-center/cc-widgets/src/` |
| Doc kind | Module spec |
| Coverage score | Pending coverage assessment |
| Generated from | `module-spec` @ SDLC template library `0.1.0-draft` |
| generated_by / approved_by / updated_at | generated_by `migration agent` / approved_by `pending` / updated_at `2026-06-29` |
| Validation status | not-run |

## Evidence Rules
Every generated requirement below must cite concrete source evidence using `file path`. Separate source
evidence, test evidence, examples, assumptions, and gaps so validators and future agents can distinguish
truth from context. Test evidence is preferred for WHY. Commit evidence is allowed only when the
repository policy says history is reliable, and must include the commit hash. If evidence is missing or
conflicting, ask a focused discovery question before finalizing the requirement; record unresolved answers
as approved unknowns only when the human explicitly defers or does not know.

## Source Material Register
| Source doc | Scope | Decision | Detail location or disposition |
|---|---|---|---|
| `ai-docs/_archive/pre-sdlc-migration/packages/contact-center/cc-widgets/ai-docs/AGENTS.md` | overview / API | migrated | Orientation → Overview/Purpose; React + Web Component export inventory → Public Surface; usage patterns → Use Cases; dual-bundle note → Export Stability / Host Integration. |
| `ai-docs/_archive/pre-sdlc-migration/packages/contact-center/cc-widgets/ai-docs/ARCHITECTURE.md` | architecture | reconciled | r2wc registration flow → Data Flow / Sequence Diagram(s); widget→tag mapping → Public Surface (corrected against `src/wc.ts`); troubleshooting → Pitfalls. Archived docs omitted the `RealTimeTranscript`, `DigitalChannels`, `CallControlCAD`, and `AIAssistant` (tag `widget-cc-ai-assistant`) exports/tags and the `hasCampaignPreviewEnabled` and `conferenceEnabled` prop mappings — current `src/index.ts` and `src/wc.ts` are source of truth. |

## Overview
`cc-widgets` is the aggregator and distribution surface for the Webex Contact Center widget suite. It
owns no widget UI or business logic of its own; instead it re-exports the React components produced by
the individual widget packages (`@webex/cc-station-login`, `@webex/cc-user-state`, `@webex/cc-task`,
`@webex/cc-digital-channels`, `@webex/cc-ai-assistant`) plus the shared MobX `store`, and it converts
those same React components into framework-agnostic custom elements via
`@r2wc/react-to-web-component` (r2wc).

The package has exactly two source files. `src/index.ts` is the React entry point (`main` /
`dist/index.js`): a re-export barrel that also imports Momentum UI base CSS so React consumers get
widget styling. `src/wc.ts` is the Web Component entry point (the `./wc` export / `dist/wc.js`): it wraps
each React widget with r2wc, declares the prop-type map per widget, and registers every wrapper as a
custom element (`widget-cc-*`) at module-load time.

A maintainer should start at `src/index.ts` to change the React/store public surface and at `src/wc.ts`
to add a widget, change a custom-element tag, or change how a prop crosses the Web Component boundary.
Because this package is pure aggregation, behavior changes almost always belong upstream in the widget
packages; changes here are about what is exported, under what name, and with what prop typing.

## Purpose / Responsibility
Owns the public distribution surface for the contact center widget suite: re-exports React widgets + the
shared `store`, and registers r2wc-wrapped custom elements. Does NOT own widget UI, business logic, store
state, or SDK access — those live upstream in the widget packages and `@webex/cc-store`.

## Stack
TypeScript 5.6.3, React 18 (peer `>=18.3.1`), `@r2wc/react-to-web-component` 2.0.3. Test stack: Jest
29.7.0 + jsdom + React Testing Library (configured in `package.json`, but no tests currently exist).
Build: `tsc` for type declarations and webpack 5 for the two bundles (`dist/index.js`, `dist/wc.js`).
No datastore or messaging.

## Folder / Package Structure
```
packages/contact-center/cc-widgets/src/
├── index.ts   # React entry — re-export barrel for widgets + store; imports Momentum UI CSS
└── wc.ts      # Web Component entry — r2wc wrappers + per-widget prop map + customElements registration
```

## Key Files (source of truth)
| File | Holds |
|---|---|
| `packages/contact-center/cc-widgets/src/index.ts` | Authoritative list of React exports and the Momentum CSS import. |
| `packages/contact-center/cc-widgets/src/wc.ts` | Authoritative custom-element tag names, the r2wc prop-type map per widget, and the registration loop. |
| `packages/contact-center/cc-widgets/package.json` | Export entry points (`.` → `dist/index.js`, `./wc` → `dist/wc.js`), version, dependency floors, and peer-dependency versions. |

## Public Surface
Two consumption modes share one package: React named imports from `@webex/cc-widgets`, and custom
elements registered by importing `@webex/cc-widgets/wc`. Widget prop/event contracts are owned by the
upstream widget packages; this module only re-exports them and maps a subset across the Web Component
boundary (see `src/wc.ts`).

| Contract ID | Type | Surface | Purpose | Compatibility / deprecation | Schema / detail link | Root index |
|---|---|---|---|---|---|---|
| `cc-widgets.StationLogin` | SDK | React export `StationLogin`; tag `widget-cc-station-login` (props `onLogin`, `onLogout`) | Agent station login UI | stable; removing/renaming export or tag = major | `src/index.ts`, `src/wc.ts` | [`CONTRACTS.md`](../../../../ai-docs/CONTRACTS.md) |
| `cc-widgets.UserState` | SDK | React export `UserState`; tag `widget-cc-user-state` (prop `onStateChange`) | Agent state management UI | stable; export/tag change = major | `src/index.ts`, `src/wc.ts` | [`CONTRACTS.md`](../../../../ai-docs/CONTRACTS.md) |
| `cc-widgets.IncomingTask` | SDK | React export `IncomingTask`; tag `widget-cc-incoming-task` (props `incomingTask:json`, `onAccepted`, `onRejected`) | Incoming task notification UI | stable; export/tag change = major | `src/index.ts`, `src/wc.ts` | [`CONTRACTS.md`](../../../../ai-docs/CONTRACTS.md) |
| `cc-widgets.CallControl` | SDK | React export `CallControl`; tag `widget-cc-call-control` (props `onHoldResume`, `onEnd`, `onWrapUp`, `onRecordingToggle`, `conferenceEnabled:boolean`) | Active-call control buttons | stable; export/tag change = major | `src/index.ts`, `src/wc.ts` | [`CONTRACTS.md`](../../../../ai-docs/CONTRACTS.md) |
| `cc-widgets.CallControlCAD` | SDK | React export `CallControlCAD`; tag `widget-cc-call-control-cad` (props `onHoldResume`, `onEnd`, `onWrapUp`, `onRecordingToggle`, `conferenceEnabled:boolean`) | CAD-enabled call control | stable; export/tag change = major | `src/index.ts`, `src/wc.ts` | [`CONTRACTS.md`](../../../../ai-docs/CONTRACTS.md) |
| `cc-widgets.TaskList` | SDK | React export `TaskList`; tag `widget-cc-task-list` (props `onTaskAccepted`, `onTaskDeclined`, `onTaskSelected`, `hasCampaignPreviewEnabled:boolean`) | Active tasks list UI | stable; export/tag change = major | `src/index.ts`, `src/wc.ts` | [`CONTRACTS.md`](../../../../ai-docs/CONTRACTS.md) |
| `cc-widgets.OutdialCall` | SDK | React export `OutdialCall`; tag `widget-cc-outdial-call` (no mapped props; store-driven) | Outbound dialing UI | stable; export/tag change = major | `src/index.ts`, `src/wc.ts` | [`CONTRACTS.md`](../../../../ai-docs/CONTRACTS.md) |
| `cc-widgets.RealTimeTranscript` | SDK | React export `RealTimeTranscript`; tag `widget-cc-realtime-transcript` (props `liveTranscriptEntries:json`, `className:string`) | Live transcript UI | stable; export/tag change = major | `src/index.ts`, `src/wc.ts` | [`CONTRACTS.md`](../../../../ai-docs/CONTRACTS.md) |
| `cc-widgets.DigitalChannels` | SDK | React export `DigitalChannels`; tag `widget-cc-digital-channels` (no mapped props; store-driven) | Digital channels UI | stable; export/tag change = major | `src/index.ts`, `src/wc.ts` | [`CONTRACTS.md`](../../../../ai-docs/CONTRACTS.md) |
| `cc-widgets.AIAssistant` | SDK | React export `AIAssistant`; tag `widget-cc-ai-assistant` (props `onOpen`, `onMinimize`, `onRestore`, `onClose`, `onFullScreenToggle`, `onRealTimeAssistReceived`, `className:string`) | AI assistant / real-time assist UI | stable; export/tag change = major | `src/index.ts`, `src/wc.ts` | [`CONTRACTS.md`](../../../../ai-docs/CONTRACTS.md) |
| `cc-widgets.store` | SDK | React export `store`; also re-exported from `src/wc.ts` | Shared MobX singleton (`@webex/cc-store`) callers init before mounting widgets | stable; the single shared store instance | `src/index.ts`, `src/wc.ts` | [`CONTRACTS.md`](../../../../ai-docs/CONTRACTS.md) |

Compatibility notes:
- Adding a new React export or a new `widget-cc-*` tag is additive (minor). Renaming/removing an export or
  tag, or renaming a mapped prop, is breaking (major).
- Web Component tags are registered guarded by `customElements.get(name)` — importing `./wc` twice is
  safe and does not throw a redefinition error (`src/wc.ts`).

### Component Mapping (widget package → React export → tag → mapped props)
This is the complete registration map from `src/index.ts` (React exports) and `src/wc.ts` (r2wc wrappers +
tags + prop maps). It is corrected against current code, which is the source of truth — the archived docs
omitted `CallControlCAD`, `RealTimeTranscript`, `DigitalChannels`, `AIAssistant` and the
`hasCampaignPreviewEnabled` / `conferenceEnabled` props.

| Widget package | React export | Web Component tag | Mapped props (r2wc type) |
|---|---|---|---|
| `@webex/cc-station-login` | `StationLogin` | `widget-cc-station-login` | `onLogin:function`, `onLogout:function` |
| `@webex/cc-user-state` | `UserState` | `widget-cc-user-state` | `onStateChange:function` |
| `@webex/cc-task` → IncomingTask | `IncomingTask` | `widget-cc-incoming-task` | `incomingTask:json`, `onAccepted:function`, `onRejected:function` |
| `@webex/cc-task` → TaskList | `TaskList` | `widget-cc-task-list` | `onTaskAccepted:function`, `onTaskDeclined:function`, `onTaskSelected:function`, `hasCampaignPreviewEnabled:boolean` |
| `@webex/cc-task` → CallControl | `CallControl` | `widget-cc-call-control` | `onHoldResume:function`, `onEnd:function`, `onWrapUp:function`, `onRecordingToggle:function`, `conferenceEnabled:boolean` |
| `@webex/cc-task` → CallControlCAD | `CallControlCAD` | `widget-cc-call-control-cad` | `onHoldResume:function`, `onEnd:function`, `onWrapUp:function`, `onRecordingToggle:function`, `conferenceEnabled:boolean` |
| `@webex/cc-task` → OutdialCall | `OutdialCall` | `widget-cc-outdial-call` | None (store-driven; empty prop map) |
| `@webex/cc-task` → RealTimeTranscript | `RealTimeTranscript` | `widget-cc-realtime-transcript` | `liveTranscriptEntries:json`, `className:string` |
| `@webex/cc-digital-channels` | `DigitalChannels` | `widget-cc-digital-channels` | None (store-driven; empty prop map) |
| `@webex/cc-ai-assistant` | `AIAssistant` | `widget-cc-ai-assistant` | `onOpen:function`, `onMinimize:function`, `onRestore:function`, `onClose:function`, `onFullScreenToggle:function`, `onRealTimeAssistReceived:function`, `className:string` |
| `@webex/cc-store` | `store` | (re-exported in both entries; not an element) | N/A |

### r2wc Type Mapping Rules
How each declared r2wc prop type crosses the Web Component boundary (`src/wc.ts`):

| React prop type | r2wc prop type | HTML attribute | JavaScript property |
|---|---|---|---|
| `() => void` (callback) | `'function'` | N/A — cannot be set via attribute | assign as property: `el.onLogin = fn` |
| `string` | implicit / `'string'` | `class-name="value"` (kebab-case) | `el.className = 'value'` |
| `boolean` | implicit / `'boolean'` | `conference-enabled` (presence) | `el.conferenceEnabled = true` |
| `object` | `'json'` | N/A — cannot be a string attribute | assign as property: `el.incomingTask = obj` |

The `props` map passed to `r2wc(Component, {props})` is what tells r2wc which coercion to apply; `function`
and `json` props MUST be assigned as element properties, not attributes, or the widget never receives them.

### Consumption examples
React named imports (`src/index.ts`):
```typescript
import {StationLogin, UserState, TaskList, store} from '@webex/cc-widgets';
import React from 'react';

function MyApp() {
  return (
    <div>
      <StationLogin onLogin={() => console.log('Logged in')} />
      <UserState onStateChange={(state) => console.log('State:', state)} />
      <TaskList onTaskSelected={(id) => console.log('Task:', id)} />
    </div>
  );
}
```

Web Component / HTML usage (`./wc` bundle, `src/wc.ts`):
```html
<!DOCTYPE html>
<html>
  <head>
    <title>Contact Center Widgets</title>
    <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/@momentum-ui/core/css/momentum-ui.min.css" />
  </head>
  <body>
    <widget-cc-station-login></widget-cc-station-login>
    <widget-cc-user-state></widget-cc-user-state>
    <widget-cc-task-list></widget-cc-task-list>

    <!-- Loading this bundle registers every widget-cc-* element at import time -->
    <script src="path/to/cc-widgets/dist/wc.js"></script>
    <script>
      // Initialize the shared store BEFORE using any widget
      const store = window['ccWidgetStore'];
      store.init({access_token: '<YOUR_ACCESS_TOKEN>', webexConfig: {/* ... */}});
    </script>
  </body>
</html>
```

Framework-agnostic embedding (Angular/Vue/vanilla) works the same — the custom elements render anywhere:
```html
<!-- Angular, Vue, or vanilla JS app -->
<div id="app">
  <widget-cc-user-state></widget-cc-user-state>
  <widget-cc-call-control></widget-cc-call-control>
</div>
<script src="cc-widgets/dist/wc.js"></script>
<script>
  store.init({webexConfig, access_token: '<YOUR_ACCESS_TOKEN>'});
</script>
```

## Requires (dependencies)
- Internal widget packages (workspace `*`): `@webex/cc-station-login`, `@webex/cc-user-state`,
  `@webex/cc-task` (provides `IncomingTask`, `TaskList`, `CallControl`, `CallControlCAD`, `OutdialCall`,
  `RealTimeTranscript`), `@webex/cc-digital-channels`, `@webex/cc-ai-assistant` (provides `AIAssistant`).
  Source: `package.json` dependencies, `src/index.ts`, `src/wc.ts`.
- `@webex/cc-store` (workspace `*`) — the shared MobX singleton re-exported to consumers.
- `@r2wc/react-to-web-component` `2.0.3` — React→custom-element conversion (`src/wc.ts`).
- Peer dependencies (host-provided): `react >=18.3.1`, `react-dom >=18.3.1`,
  `@momentum-ui/react-collaboration >=26.197.0`, `@momentum-ui/web-components ^2.26.20`
  (`package.json`). React/ReactDOM are peers so the host provides a single React instance.
- `@momentum-ui/core/css/momentum-ui.min.css` — base CSS imported in `src/index.ts` for React consumers.

## Requirements
| ID | WHAT | WHY | Source Evidence | Test / Example Evidence | Assumptions / Gaps | Confidence |
|---|---|---|---|---|---|---|
| `cc-widgets-R-001` | Re-export the React widgets `StationLogin`, `UserState`, `IncomingTask`, `CallControl`, `CallControlCAD`, `TaskList`, `OutdialCall`, `RealTimeTranscript`, `DigitalChannels`, `AIAssistant`, and `store` from the package root. | Single-package install: consumers import the whole suite + store from `@webex/cc-widgets` without tracking each widget package. | `packages/contact-center/cc-widgets/src/index.ts` | None found | No unit test exists (`tests/` absent; `passWithNoTests` set). | WEAK |
| `cc-widgets-R-002` | Register each widget as a custom element under a `widget-cc-*` tag (`widget-cc-user-state`, `widget-cc-station-login`, `widget-cc-incoming-task`, `widget-cc-task-list`, `widget-cc-call-control`, `widget-cc-outdial-call`, `widget-cc-call-control-cad`, `widget-cc-realtime-transcript`, `widget-cc-digital-channels`, `widget-cc-ai-assistant`) when `./wc` is loaded. | Framework-agnostic embedding: HTML/Angular/Vue/vanilla hosts use the suite without React. | `packages/contact-center/cc-widgets/src/wc.ts` | None found | No test verifies registration. | WEAK |
| `cc-widgets-R-003` | Guard each `customElements.define` with `customElements.get(name)` so re-importing the WC bundle does not throw a duplicate-definition error. | Importing the bundle more than once (multiple micro-frontends/scripts) must be idempotent. | `packages/contact-center/cc-widgets/src/wc.ts` | None found | No regression test for double-import. | WEAK |
| `cc-widgets-R-004` | Map complex/callback props across the WC boundary with explicit r2wc prop types: `function` callbacks, `json` for object props (`incomingTask`, `liveTranscriptEntries`), `boolean` (`hasCampaignPreviewEnabled`, `conferenceEnabled` on both `CallControl` and `CallControlCAD`), and `string` (`className`). | HTML attributes are strings only; functions and objects must be set as element properties with the right r2wc coercion or the widget won't receive them. | `packages/contact-center/cc-widgets/src/wc.ts` | None found | Prop maps are the WC public contract; no test asserts the type map. | WEAK |
| `cc-widgets-R-005` | Import Momentum UI base CSS in the React entry so React consumers get widget styling without a separate import. | Avoids unstyled widgets in React hosts (a documented prior support issue). | `packages/contact-center/cc-widgets/src/index.ts` | None found | CSS side-effect import is untested. | WEAK |
| `cc-widgets-R-006` | Treat React/ReactDOM as peer dependencies (`>=18.3.1`) rather than bundled runtime deps for the React export. | A single host React instance prevents "Invalid hook call" / duplicate-React failures. | `packages/contact-center/cc-widgets/package.json` | None found | Peer-dep enforcement is by package manager, not tested here. | WEAK |

## Design Overview
The module is a pure composition/distribution layer with two entry points and no internal state. The React
path (`index.ts`) is a tree-shakeable re-export barrel: the host bundler pulls actual widget code from the
workspace packages, so the React bundle is small and uses the host's React instance. The only side effect
is the Momentum CSS import.

The Web Component path (`wc.ts`) is self-contained. Each React widget is passed to `r2wc(Component, {props})`
to produce a custom-element class. The `props` map tells r2wc how to bridge each prop: `function` props are
assigned as element properties (callbacks/events), `json` props are parsed from attribute/property values
into objects, and `string`/`boolean` props coerce primitives. Widgets that read everything from the shared
store (`OutdialCall`, `DigitalChannels`) are wrapped with an empty prop map. A single `components` array
pairs each tag name with its wrapper, and a `forEach` registers them all, guarding with
`customElements.get` so registration is idempotent across repeated imports. Registration runs as an
import-time side effect — loading the module is what registers the elements.

This structure keeps one direction of dependency (widgets → cc-widgets) and concentrates the entire
public naming surface (export names, tag names, prop typing) in two small files, so changes are easy to
review and the rest of the suite stays decoupled from distribution concerns.

## Data Flow
Transport is in-process JavaScript module evaluation plus the browser CustomElements registry. There is no
network or messaging in this module — all SDK/state access happens downstream in the widgets via the shared
store.

```mermaid
graph LR
    subgraph WidgetPkgs["Widget packages (React components)"]
        SL["@webex/cc-station-login"]
        US["@webex/cc-user-state"]
        TASK["@webex/cc-task"]
        DC["@webex/cc-digital-channels"]
        AIA["@webex/cc-ai-assistant"]
        STORE["@webex/cc-store"]
    end

    subgraph CCW["cc-widgets"]
        IDX["index.ts<br/>re-export barrel + CSS"]
        WC["wc.ts<br/>r2wc wrap + register"]
    end

    subgraph Consumers["Consumers"]
        REACT["React host<br/>named imports"]
        DOM["Browser DOM<br/>widget-cc-* elements"]
    end

    SL --> IDX
    US --> IDX
    TASK --> IDX
    DC --> IDX
    AIA --> IDX
    STORE --> IDX

    SL --> WC
    US --> WC
    TASK --> WC
    DC --> WC
    AIA --> WC
    STORE --> WC

    IDX -->|named exports| REACT
    WC -->|customElements.define| DOM
```

## Sequence Diagram(s)
Sequence coverage:

| Operation group | Diagram | Failure / recovery coverage |
|---|---|---|
| Web Component registration + mount (`./wc` import → r2wc → custom element → React widget → store) | `Host registers custom element and r2wc mounts the React widget` | `alt` branch: tag already registered → registration is skipped (idempotent); store-not-initialized branch noted. |
| React re-export consumption | covered by Data Flow (trivial pass-through; no distinct sequence) | N/A — direct import, no runtime steps owned by this module. |

```mermaid
sequenceDiagram
    participant Host as Host page / app
    participant WC as wc.ts (module eval)
    participant R2WC as r2wc
    participant Reg as CustomElements registry
    participant Widget as React widget
    participant Store as @webex/cc-store

    Host->>WC: import '@webex/cc-widgets/wc'
    activate WC
    loop for each widget
        WC->>R2WC: r2wc(Component, {props})
        R2WC-->>WC: custom-element class
        WC->>Reg: customElements.get(name)
        alt not registered
            WC->>Reg: customElements.define(name, class)
        else already registered
            WC-->>WC: skip (idempotent)
        end
    end
    deactivate WC

    Host->>Reg: <widget-cc-...> in DOM / createElement
    Reg->>R2WC: instantiate custom element
    R2WC->>Widget: mount React component (props from attrs/props)
    Widget->>Store: observer reads store state (store.cc, agent state)
    Note over Widget,Store: If store.init not called first,<br/>widget renders but shows no data
    Store-->>Widget: state -> observer re-render
    Widget-->>Host: rendered widget + CustomEvents/callbacks
```

## Class / Component Relationships
```mermaid
graph TD
    subgraph react["React entry (index.ts)"]
        direction LR
        Barrel["re-export barrel"]
    end

    subgraph wc["WC entry (wc.ts)"]
        direction TB
        r2wc["r2wc()"]
        WebStationLogin["WebStationLogin"]
        WebUserState["WebUserState"]
        WebIncomingTask["WebIncomingTask"]
        WebTaskList["WebTaskList"]
        WebCallControl["WebCallControl"]
        WebCallControlCAD["WebCallControlCAD"]
        WebOutdialCall["WebOutdialCall"]
        WebRealTimeTranscript["WebRealTimeTranscript"]
        WebDigitalChannels["WebDigitalChannels"]
        WebAIAssistant["WebAIAssistant"]
        components["components[] {name, component}"]
    end

    StationLogin -->|r2wc| WebStationLogin
    UserState -->|r2wc| WebUserState
    IncomingTask -->|r2wc| WebIncomingTask
    TaskList -->|r2wc| WebTaskList
    CallControl -->|r2wc| WebCallControl
    CallControlCAD -->|r2wc| WebCallControlCAD
    OutdialCall -->|r2wc| WebOutdialCall
    RealTimeTranscript -->|r2wc| WebRealTimeTranscript
    DigitalChannels -->|r2wc| WebDigitalChannels
    AIAssistant -->|r2wc| WebAIAssistant

    WebStationLogin --> components
    WebUserState --> components
    WebIncomingTask --> components
    WebTaskList --> components
    WebCallControl --> components
    WebCallControlCAD --> components
    WebOutdialCall --> components
    WebRealTimeTranscript --> components
    WebDigitalChannels --> components
    WebAIAssistant --> components

    components -->|customElements.define| Registry["CustomElements registry"]

    StationLogin --> Barrel
    UserState --> Barrel
```

The React widget components (imported from the widget packages) are the only "classes" of substance;
`cc-widgets` adds no class of its own beyond the r2wc-generated wrapper classes (`Web*`). Each wrapper is
a `HTMLElement` subclass produced by `r2wc`. The `components` array is the registry manifest. `index.ts`
relates to the same widget components purely by re-export.

## Use Cases
- **UC-1 React host consumes the suite:** A React app imports `{ StationLogin, UserState, TaskList, store }`
  from `@webex/cc-widgets`, calls `store.init({...})`, then renders the widgets as JSX. Outcome: widgets
  render against the shared store with the host's React instance. Evidence: `src/index.ts`; archived
  example in `.../cc-widgets/ai-docs/AGENTS.md`. No test.
- **UC-2 Framework-agnostic host embeds Web Components:** An HTML/Angular/Vue/vanilla page loads the `./wc`
  bundle, initializes `store`, and places `<widget-cc-station-login>` etc. in the DOM, assigning callbacks
  as element properties (e.g. `el.onLogin = fn`). Outcome: r2wc mounts the React widget inside the custom
  element. Evidence: `src/wc.ts`; archived example in `.../cc-widgets/ai-docs/AGENTS.md`. No test.
- **UC-3 Add a new widget to the suite:** A maintainer adds the React export in `index.ts`, wraps the
  component with `r2wc` and a prop map in `wc.ts`, and appends `{name, component}` to the `components`
  array. Outcome: the widget is available in both consumption modes. Evidence: `src/index.ts`, `src/wc.ts`.
  No test.
- **UC-4 Share one store across micro-frontends:** A host imports `{StationLogin, UserState, store}`,
  calls `store.init({...})` once, and exposes it (`window.ccStore = store`) so independently loaded
  micro-frontends read the same singleton instead of initializing their own. Outcome: single source of
  truth for agent state/tasks across the page. Evidence: `src/index.ts` (`store` re-export). No test.

### Store initialization before widget use (both modes)
Widgets read the shared `store` singleton and render empty until it is initialized, so init must complete
before mounting:
```typescript
import {store} from '@webex/cc-widgets';

async function initialize() {
  await store.init({webexConfig, access_token: '<ACCESS_TOKEN>'});
  // Widgets are only ready after init resolves
  renderWidgets();
}
```

### Assigning Web Component event handlers as properties
Web Components use **property assignment** for callbacks (not `setAttribute` and not string attributes).
Assign the callback functions declared in the r2wc prop map directly to element properties, then append
to the DOM:
```javascript
// Create references to Web Components
const ccStationLogin = document.createElement('widget-cc-station-login');
const ccUserState = document.createElement('widget-cc-user-state');
const ccIncomingTask = document.createElement('widget-cc-incoming-task');
const ccTaskList = document.createElement('widget-cc-task-list');
const ccCallControl = document.createElement('widget-cc-call-control');

// Assign event-handler callbacks directly to properties
ccStationLogin.onLogin = () => showAgentDashboard();
ccStationLogin.onLogout = () => showLoginScreen();
ccUserState.onStateChange = (status) => updateStatusIndicator(status);
ccIncomingTask.onAccepted = () => console.log('Task accepted');
ccIncomingTask.onRejected = () => console.log('Task rejected');
ccTaskList.onTaskAccepted = () => console.log('Task accepted from task list');
ccTaskList.onTaskDeclined = () => console.log('Task declined from task list');
ccCallControl.onHoldResume = () => console.log('Hold/Resume toggled');
ccCallControl.onEnd = () => console.log('Call ended');
ccCallControl.onWrapUp = (params) => console.log('Wrap-up completed', params);

// Append after assigning handlers
document.body.appendChild(ccStationLogin);
document.body.appendChild(ccUserState);
document.body.appendChild(ccTaskList);
document.body.appendChild(ccCallControl);
```

## Pitfalls
- **WC props are properties, not attributes.** `function` and `json` props (callbacks, `incomingTask`,
  `liveTranscriptEntries`) must be assigned as element properties (`el.onLogin = fn`,
  `el.incomingTask = obj`), not via `setAttribute`/string attributes — otherwise the widget never receives
  them. Source: prop maps in `src/wc.ts`.
- **Don't load both bundles.** Loading the React export and the `wc.js` bundle together can produce two
  React instances → "Invalid hook call" and broken context. Choose one mode per host.
- **Store must be initialized before widgets show data.** Widgets render but stay empty if `store.init`
  was not called first; the store is a shared singleton, not initialized by this package.
- **Registration is an import-time side effect.** Elements only exist after `./wc` is evaluated. Elements
  added to the DOM before the bundle loads stay inert until definition; use
  `customElements.whenDefined(tag)` when racing.
- **Tag names are public API.** They live only in the `components` array in `src/wc.ts`; renaming a tag is
  a breaking change with no compile-time signal in consumer HTML.
- **Archived docs drift.** The pre-migration ARCHITECTURE/AGENTS docs omitted `CallControlCAD`,
  `RealTimeTranscript`, `DigitalChannels`, and `AIAssistant` tags and the `hasCampaignPreviewEnabled`
  and `conferenceEnabled` props. Trust `src/wc.ts` over those docs.

### Troubleshooting (common failure paths)

**1. Web Components not rendering.** Symptoms: custom elements show as `undefined`; elements appear as
empty tags. Possible causes: `wc.js` not loaded; script loaded after DOM parsing; custom elements not
supported. Solutions — ensure the bundle is loaded and verify the element is defined:
```html
<script src="path/to/wc.js"></script>
<!-- or as a module -->
<script type="module">
  import './path/to/wc.js';
</script>
<script>
  console.log(customElements.get('widget-cc-station-login'));
  // Should return a class definition, not undefined
</script>
```

**2. Props not updating in Web Components.** Symptoms: changing attributes doesn't update the widget;
callbacks not firing. Possible causes: using attributes instead of properties for complex types; incorrect
attribute names (camelCase vs kebab-case). Solution — use property assignment for `function` and `json`
props:
```javascript
const widget = document.querySelector('widget-cc-task-list');

// ❌ Wrong - functions can't be set via attributes
widget.setAttribute('onTaskSelected', myFunction);
// ✅ Correct - property assignment
widget.onTaskSelected = myFunction;

// ❌ Wrong - objects can't be string attributes
widget.setAttribute('incoming-task', JSON.stringify(task));
// ✅ Correct - property assignment
widget.incomingTask = task;
```

**3. Multiple React instances conflict.** Symptoms: "Invalid hook call" errors; React context not working;
duplicate React warning. Possible causes: both the React bundle and the WC bundle loaded; multiple React
versions in `node_modules`. Solution — choose exactly one consumption mode:
```typescript
// Option 1: React components only (React bundle)
import {StationLogin} from '@webex/cc-widgets';
// Do NOT also load wc.js

// Option 2: Web Components only (WC bundle)
// <script src="wc.js"></script>
// Do NOT also import '@webex/cc-widgets' in React

// Check for duplicate React
// yarn why react
```

**4. Store not initialized.** Symptoms: widgets render but show no data; console warnings about missing
`store.cc`. Possible causes: store not configured before widget use; SDK not initialized. Solution —
initialize before rendering and verify:
```typescript
import {store} from '@webex/cc-widgets';
import {ContactCenter} from '@webex/contact-center';

async function setup() {
  const cc = await ContactCenter.init({token, region});
  store.setCC(cc);
  console.log('Store initialized:', store.cc !== undefined);
  // Now render widgets
}
```

**5. Styles not loading.** Symptoms: components render but look unstyled; missing icons or layout.
Possible causes: Momentum UI CSS not imported; webpack not configured for CSS. Solution — import the
Momentum base CSS (the React entry does this automatically via `src/index.ts`; WC/other hosts add it):
```typescript
// In your app entry point
import '@momentum-ui/core/css/momentum-ui.min.css';
// Or via HTML:
// <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/@momentum-ui/core/css/momentum-ui.min.css">
```

**6. Web Component events not firing.** Symptoms: `addEventListener` doesn't work; no callbacks triggered.
Possible causes: wrong event name; listeners added before the element is defined; using React prop names
instead of event names. Solution — wait for definition and use the correct (lowercase) event name:
```javascript
customElements.whenDefined('widget-cc-station-login').then(() => {
  const widget = document.querySelector('widget-cc-station-login');
  // ✅ Correct event name (lowercase)
  widget.addEventListener('login', () => console.log('Login event fired'));
  // ❌ Wrong - 'onLogin' is the prop name, not the event name
});
```

## Module Do's / Don'ts
- DO: keep `cc-widgets` aggregation-only — re-export and register; put behavior changes in the upstream
  widget packages.
- DO: when adding a widget, update both `src/index.ts` (React export) and `src/wc.ts` (r2wc wrapper +
  prop map + `components` entry), keeping the `widget-cc-{name}` tag convention.
- DON'T: import the SDK or mutate store state here — access flows through the re-exported `store`.
- DON'T: register a custom element without the `customElements.get` guard (breaks idempotent re-import).
- DON'T: bundle React into the React (`index.js`) path — React/ReactDOM are peers.

## Export Stability
Two semver-sensitive surfaces: the React named exports in `src/index.ts` and the `widget-cc-*` tag names
plus their r2wc prop maps in `src/wc.ts`. Adding an export, a tag, or an optional mapped prop is a minor
(additive) change. Renaming or removing any export or tag, or renaming a mapped prop, is a major
(breaking) change. The type-declaration surface is published at `dist/types/index.d.ts` (`.`) and
`dist/types/wc.d.ts` (`./wc`), wired via the `exports`/`types` fields in `package.json`. Peer-dependency
floors (`react >=18.3.1`, Momentum versions) are part of the compatibility contract; raising a floor is a
potentially breaking change for hosts.

## Host Integration & Theming
This module is the host-mount surface for the widget suite.
- **Custom-element tags:** `widget-cc-user-state`, `widget-cc-station-login`, `widget-cc-incoming-task`,
  `widget-cc-task-list`, `widget-cc-call-control`, `widget-cc-call-control-cad`, `widget-cc-outdial-call`,
  `widget-cc-realtime-transcript`, `widget-cc-digital-channels`, `widget-cc-ai-assistant` (`src/wc.ts`).
- **Mount contract (WC mode):** load `@webex/cc-widgets/wc` (registers the elements at import time),
  initialize the shared `store`, then place the custom elements in the DOM and assign callbacks/objects as
  element properties.
- **Mount contract (React mode):** import widgets + `store` from `@webex/cc-widgets`, init `store`, render
  as JSX. The host provides React/ReactDOM (peers).
- **Theming:** React consumers get Momentum base styling via the `@momentum-ui/core` CSS imported in
  `src/index.ts`; hosts also need the Momentum peer packages (`@momentum-ui/react-collaboration`,
  `@momentum-ui/web-components`). Do not assume the host's framework version beyond the declared peer
  floors.

## Test-Case Strategy (module)
No tests exist for this package today (`tests/` is absent and `package.json` sets `passWithNoTests: true`).
Because the module is pure aggregation, the highest-value tests would assert the distribution contract
rather than widget behavior: (positive) importing `./wc` defines every expected `widget-cc-*` tag via
`customElements.get`; (negative) importing `./wc` twice does not throw and does not redefine an element
(idempotent guard). Secondary coverage: assert `index.ts` re-exports each expected symbol and `store`, and
that each r2wc wrapper is created with the documented prop-type map. Widget rendering/behavior is owned and
tested by the upstream widget packages, not here.

| Behavior / Requirement | Existing test evidence | Gap |
|---|---|---|
| `cc-widgets-R-001` (React re-exports present) | None found | No test asserts the export barrel surface. |
| `cc-widgets-R-002` (custom elements registered) | None found | No test asserts each `widget-cc-*` tag is defined after `./wc` import. |
| `cc-widgets-R-003` (idempotent registration) | None found | No test for double-import / `customElements.get` guard. |
| `cc-widgets-R-004` (r2wc prop-type map) | None found | No test asserts function/json/boolean/string prop mapping. |
| `cc-widgets-R-005` (Momentum CSS imported) | None found | No test for the CSS side-effect import. |
| `cc-widgets-R-006` (React/ReactDOM peers) | None found | Enforced by package manager only; no automated check here. |

## Traceability
- Repo architecture: [`ARCHITECTURE.md`](../../../../ai-docs/ARCHITECTURE.md) · Registry: [`SPEC_INDEX.md`](../../../../ai-docs/SPEC_INDEX.md) · Contracts: [`CONTRACTS.md`](../../../../ai-docs/CONTRACTS.md)
- Coverage state & contracts baseline: `.sdd/manifest.json`
