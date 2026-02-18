# Web Component Patterns

> Quick reference for LLMs working with Web Components in this repository.

---

## Rules

- **Conversion approach**
  - **MUST** use `@r2wc/react-to-web-component` (`r2wc`) for Contact Center widget web components
  - **MUST NOT** hand-roll custom element classes when a React widget already exists

- **Source location**
  - **MUST** define wrappers in `packages/contact-center/cc-widgets/src/wc.ts`
  - **MUST** keep React exports and Web Component exports separated (`src/index.ts` vs `src/wc.ts`)

- **Registration safety**
  - **MUST** guard registration with `customElements.get(name)` before `customElements.define(...)`
  - **MUST NOT** define the same custom element twice

- **Naming**
  - **MUST** use tag prefix `widget-cc-`
  - **MUST** keep tag names kebab-case and aligned with widget domain

- **Dependency boundaries**
  - **MUST** keep dependency flow one-directional: `cc-widgets -> widget packages -> cc-components -> store -> SDK`
  - **MUST NOT** import from `@webex/cc-widgets` inside widget packages or `cc-components`

---

## Standard Wrapper Pattern

```typescript
// packages/contact-center/cc-widgets/src/wc.ts
import r2wc from '@r2wc/react-to-web-component';
import {UserState} from '@webex/cc-user-state';

const WebUserState = r2wc(UserState, {
  props: {
    onStateChange: 'function',
  },
});

if (!customElements.get('widget-cc-user-state')) {
  customElements.define('widget-cc-user-state', WebUserState);
}
```

---

## Multi-Widget Registration Pattern

```typescript
const components = [
  {name: 'widget-cc-station-login', component: WebStationLogin},
  {name: 'widget-cc-user-state', component: WebUserState},
  {name: 'widget-cc-task-list', component: WebTaskList},
];

components.forEach(({name, component}) => {
  if (!customElements.get(name)) {
    customElements.define(name, component);
  }
});
```

Why this pattern:
- prevents duplicate registration errors
- keeps registration centralized
- scales as widgets are added

---

## Prop Mapping Pattern (r2wc)

Use explicit mapping for callback/object props.

```typescript
const WebIncomingTask = r2wc(IncomingTask, {
  props: {
    incomingTask: 'json',
    onAccepted: 'function',
    onRejected: 'function',
  },
});
```

Guidance:
- map callbacks as `'function'`
- map object payloads as `'json'`
- keep names aligned with React prop names

---

## Event/Callback Usage Pattern

In host apps, assign handlers as element properties.

```javascript
const el = document.querySelector('widget-cc-user-state');
el.onStateChange = (state) => {
  console.log('state', state);
};
```

---

## Store Initialization Pattern

Before using widgets in non-React hosts, initialize the shared store.

```javascript
const store = window['ccWidgetStore'];
await store.init({
  access_token: '<ACCESS_TOKEN>',
  webexConfig: {
    // sdk config
  },
});
```

---

## Add-New-Widget WC Checklist

- [ ] React widget export exists in its package
- [ ] Wrapper added in `packages/contact-center/cc-widgets/src/wc.ts`
- [ ] Correct prop mappings provided to `r2wc(...)`
- [ ] Tag name follows `widget-cc-*`
- [ ] Registration guarded by `customElements.get(...)`
- [ ] No circular dependency introduced
- [ ] Bundle still builds and component renders in sample app

---

## Related

- `packages/contact-center/cc-widgets/src/wc.ts`
- `packages/contact-center/cc-widgets/ai-docs/AGENTS.md`
- `packages/contact-center/cc-widgets/ai-docs/ARCHITECTURE.md`
- `ai-docs/patterns/react-patterns.md`
- `ai-docs/patterns/testing-patterns.md`

---

_Last Updated: 2026-02-18_
