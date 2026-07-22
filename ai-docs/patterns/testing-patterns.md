<!-- ───────────────────────────────
  Template:     Pattern
  Template-ID:  pattern
  Generates:    ai-docs/patterns/testing-patterns.md
  Description:  Testing conventions from real code — Jest+RTL store mocking, renderHook, data-testid, snapshots, Playwright TestManager + Utils functions.
  Library ver:  0.1.0-draft
  Last updated: 2026-07-01
─────────────────────────────── -->

# Pattern: Testing conventions

> Start here → repo root [`AGENTS.md`](../../AGENTS.md) (agent entry) · router [`SPEC_INDEX.md`](../SPEC_INDEX.md). This is an `ai-docs/patterns/` file; the folder [README](./README.md) explains the per-pattern shape and routing.
> Context-efficiency: link to canonical docs — don't duplicate them. Unit tests: Jest + React Testing Library, per package under `tests/`. E2E: Playwright under `playwright/`.

Language/layer group: **Testing**. Each section below is one pattern in the standard shape.

---

## Mock `@webex/cc-store` at the module boundary (widget tests)

**When to use:** A widget test that renders a widget which imports the store default export. Replace the
store with an inline mock object so the component's store reads are deterministic.

**Correct**
```typescript
// from packages/contact-center/user-state/tests/user-state/index.tsx
import store from '@webex/cc-store';

jest.mock('@webex/cc-store', () => {
  return {
    cc: {on: jest.fn(), off: jest.fn()},
    idleCodes: [],
    agentId: 'testAgentId',
    logger: {log: jest.fn(), info: jest.fn(), error: jest.fn(), warn: jest.fn()},
    currentState: '0',
    onErrorCallback: jest.fn(),
  };
});
```

**Incorrect**
```typescript
// mutating the real singleton in a test instead of mocking it
import store from '@webex/cc-store';
store.idleCodes = [{id: '1', name: 'Available'}]; // leaks state across tests, needs a live SDK
```
**Why wrong:** The store default export wires up SDK event listeners; using the real singleton makes tests
order-dependent and couples them to SDK internals. Mocking at the module boundary isolates the widget.

**Where it appears**
- `packages/contact-center/user-state/tests/user-state/index.tsx` , `packages/contact-center/station-login/tests/station-login/index.tsx` , `packages/contact-center/task/tests/IncomingTask/index.tsx` (also `task/tests/{TaskList,OutdialCall,RealtimeTranscript}/index.tsx`, `cc-digital-channels/tests/digital-channels/index.tsx`)

**Edge cases / exceptions**
- The mock is an **inline object literal** in `jest.mock`, not a shared `mockStore` fixture. `@webex/test-fixtures` does **not** export a `mockStore`; its store-adjacent fixture is `mockCC` (a mock `IContactCenter` SDK instance) plus data fixtures (`mockProfile`, `mockTask`, `makeMockTask`, …). Use `mockCC` for the `cc` field and `@testing-library/jest-dom` for DOM matchers.

---

## Test hooks with `renderHook`

**When to use:** Unit-testing a `use*` hook's logic (state transitions, SDK calls, event handling) in
isolation, without rendering a widget.

**Correct**
```typescript
// from packages/contact-center/user-state/tests/helper.ts
import {renderHook, act, waitFor} from '@testing-library/react';
import {useUserState} from '../src/helper';
import {mockCC} from '@webex/test-fixtures';

const {result} = renderHook(() =>
  useUserState({cc: mockCC, idleCodes, agentId, currentState: 'Available', onStateChange, logger}),
);

await act(async () => {
  await result.current.setAgentStatus('2');
});
```

**Incorrect**
```typescript
// testing hook logic only through the widget DOM, so failures are hard to localize
render(<UserState onStateChange={fn} />);
fireEvent.click(screen.getByText('Available'));
```
**Why wrong:** Driving a hook only through the widget mixes render concerns with logic and makes it hard to
exercise edge cases (errors, timers) directly; `renderHook` targets the hook's return surface.

**Where it appears**
- `packages/contact-center/user-state/tests/helper.ts` , `packages/contact-center/station-login/tests/helper.ts` , `packages/contact-center/task/tests/helper.ts` (also `cc-digital-channels/tests/helper.ts`, `task/tests/utils/useHoldTimer.test.ts`, `cc-components/tests/hooks/useIntersectionObserver.test.ts`)

**Edge cases / exceptions**
- `renderHook`/`act`/`waitFor` come from `@testing-library/react` (not the deprecated `@testing-library/react-hooks`).
- Hook tests live in the package's `tests/helper.ts` (mirroring `src/helper.ts`), which is why they aren't `*.test.tsx`.

---

## Select by `data-testid`, not CSS

**When to use:** Locating elements in unit tests and Playwright specs. Components expose stable
`data-testid` attributes; tests query them.

**Correct**
```typescript
// component (packages/contact-center/cc-components/src/components/UserState/user-state.tsx)
<div className="user-state-container" data-testid="user-state-container">
// test
expect(screen.getByTestId('global-variables-panel')).toBeInTheDocument();
```

**Incorrect**
```typescript
container.querySelector('.user-state-container'); // brittle: breaks on a class rename
```
**Why wrong:** Class names are styling details that change freely; `data-testid` is a deliberate test
contract, so selectors stay stable across restyles.

**Where it appears**
- Components: `.../cc-components/src/components/UserState/user-state.tsx` , `.../cc-components/src/components/task/GlobalVariablesPanel/global-variables-panel.tsx` , `.../cc-components/src/components/StationLogin/station-login.tsx`
- Tests: `.../cc-components/tests/components/task/CampaignTask/campaign-variables-panel.test.tsx` and many others (`getByTestId` appears 80+ times across tests).

**Edge cases / exceptions**
- Text assertions (`getByText`, `findByText`) are fine for user-visible copy; reserve `data-testid` for structural/interactive elements.

---

## Snapshot presentational components

**When to use:** Locking the rendered markup of a pure `cc-components` component so unintended UI changes
show up in review.

**Correct**
```typescript
// from packages/contact-center/cc-components/tests/components/task/CampaignCountdown/campaign-countdown.snapshot.tsx
it('should match snapshot with 30 seconds timeout', () => {
  const {container} = render(<CampaignCountdownComponent timeoutInSeconds={30} />);
  expect(container).toMatchSnapshot();
});
```

**Incorrect**
```typescript
// snapshotting a stateful widget wired to the real store — snapshots churn nondeterministically
const {container} = render(<UserState onStateChange={jest.fn()} />);
expect(container).toMatchSnapshot();
```
**Why wrong:** Snapshots of components with live/async state produce noisy diffs and false failures; snapshot
the pure, props-driven `cc-components` render instead.

**Where it appears**
- `.../cc-components/tests/components/UserState/user-state.snapshot.tsx` , `.../cc-components/tests/components/StationLogin/station-login.snapshot.tsx` , `.../cc-components/tests/components/task/CampaignCountdown/campaign-countdown.snapshot.tsx` (snapshots stored under `__snapshots__/`)

**Edge cases / exceptions**
- Snapshot files use the `*.snapshot.tsx` naming (not `*.test.tsx`); behavior assertions still go in the regular test files.

---

## Playwright E2E: `TestManager` + standalone Utils functions

**When to use:** End-to-end specs under `playwright/tests/`. A per-project `TestManager` owns browser
setup/teardown; feature actions are **standalone async functions** imported from `playwright/Utils/`.

**Correct**
```typescript
// from playwright/tests/station-login-test.spec.ts
import {TestManager} from '../test-manager';
import {telephonyLogin, verifyLoginMode, ensureUserStateVisible} from '../Utils/stationLoginUtils';

test.describe('Station Login Tests - Dial Number Mode', () => {
  let testManager: TestManager;

  test.beforeAll(async ({browser}, testInfo) => {
    testManager = new TestManager(testInfo.project.name);
    await testManager.setupForStationLogin(browser);
  });

  test.afterAll(async () => { await testManager?.cleanup(); });
});
```
```typescript
// from playwright/Utils/stationLoginUtils.ts — utilities are exported functions, not a class
export const telephonyLogin = async (page: Page, mode: string, number?: string): Promise<void> => {
  /* ... */
};
```

**Incorrect**
```typescript
// per-feature Utils class with its own page — the repo moved away from this shape
class StationLoginUtils { constructor(private page: Page) {} async clickLogin() {/*...*/} }
```
**Why wrong:** The current suite centralizes multi-agent browser/session lifecycle in `TestManager` and
keeps actions as composable functions. A per-feature `Utils` class duplicates page/session handling that
`TestManager` already owns.

**Where it appears**
- Specs: `playwright/tests/station-login-test.spec.ts` , `playwright/tests/user-state-test.spec.ts` , `playwright/tests/incoming-task-and-controls-multi-session.spec.ts`
- Utils (function exports): `playwright/Utils/stationLoginUtils.ts` , `playwright/Utils/userStateUtils.ts` , `playwright/Utils/taskControlUtils.ts` (also `outdialUtils.ts`, `conferenceUtils.ts`, `incomingTaskUtils.ts`, …)
- Manager: `playwright/test-manager.ts`

**Edge cases / exceptions**
- **Legacy shape (do not follow):** an older per-feature `StationLoginUtils` *class* pattern appears in earlier docs/history. The current convention is `TestManager` + standalone functions; write new E2E code that way.

---

## Test commands

Run tests through the workspace scripts (from root `package.json`), never `npx jest` directly:

```bash
yarn test:unit         # tooling + cc-widgets + meetings-widget unit tests
yarn test:cc-widgets   # unit tests for all contact-center widget packages
yarn test:e2e          # Playwright E2E (yarn playwright test)
yarn test:styles       # style tests across workspaces
yarn workspace @webex/cc-user-state test:unit   # a single package
```

Each package's `test:unit` (and root `test:tooling`) pins `NODE_ENV=test` on the `jest`
invocation. Jest only defaults `NODE_ENV` to `test` when it is *unset*; in a CI pod that already
exports `NODE_ENV=production`, React loads its production build and `act(...)` throws
(`act(...) is not supported in production builds of React`). Pinning it keeps tests correct
regardless of the ambient environment.

**Where it appears**
- Root `package.json` `scripts` block (`test:unit`, `test:cc-widgets`, `test:e2e`, `test:styles`, `test:tooling`, `test:meetings-widget`).

**Edge cases / exceptions**
- Pre-commit hooks run the full unit suite, so commits can be slow — expected, not a failure.

---

## Related

- [React Patterns](./react-patterns.md) · [TypeScript Patterns](./typescript-patterns.md) · [MobX Patterns](./mobx-patterns.md)
