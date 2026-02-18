# Multi-Party Conference Test Spec

## Source
- Confluence page: `CC Widgets Test Plan`
- URL: `https://confluence-eng-gpk2.cisco.com/conf/spaces/WSDK/pages/604864061/CC+Widgets+Test+Plan`
- Sections used:
  - `Multi-Party Conference Feature Test Matrix`
  - `TRANSFER CONFERENCE SCENARIOS`
  - `Switch Conference — Test Plan`

## Scope Rules
- Desktop login only.
- Do not include scenarios requiring:
  - more than 4 agents
  - `EP_DN`
  - dial-number flow
- Keep mandatory non-implemented cases:
  - `TC-17`
  - `TC-18`
  - `TC-19`

## Suite Layout
- `playwright/tests/conference-transfer-switch-test.spec.ts`
  - Shared implementation with grouped execution modes.
  - Group `mpc` runs MPC-only coverage.
  - Group `transfer-switch` runs Transfer + Switch coverage.
- `playwright/suites/conference-mpc-transfer-tests.spec.ts`
  - Calls shared module with `mpc`.
- `playwright/suites/conference-switch-tests.spec.ts`
  - Calls shared module with `transfer-switch`.

## Test Coverage Split
- `SET_7` (`conference-mpc-transfer-tests.spec.ts`)
  - `CTS-MPC-01..16`
- `SET_8` (`conference-switch-tests.spec.ts`)
  - `CTS-TC-01..05`
  - `CTS-SW-01..05`
  - `CTS-SKIP-TC14`
  - `CTS-SKIP-TC20`
  - `CTS-TODO-TC17`
  - `CTS-TODO-TC18`
  - `CTS-TODO-TC19`

## Mandatory State-Gating Pattern
Before initiating each inbound/consult leg:
- target agent -> `Available`
- all non-target agents -> `Meeting`
- verify state transition and state value before creating the call leg

Implemented by:
- `setAgentState(...)`
- `ensureAgentsIdle(...)`
- `prepareInboundTarget(...)`

Inbound entry path:
```typescript
await createCallTask(testManager.callerPage!, process.env[`${testManager.projectName}_ENTRY_POINT`]!);
await acceptIncomingTask(targetPage, TASK_TYPES.CALL, ACCEPT_TASK_TIMEOUT);
```

## Stability and Retry Mechanisms
Implemented in `playwright/tests/conference-transfer-switch-test.spec.ts`:
- Inbound accept retry:
  - `createInboundAndAccept(...)` retries up to 2 attempts.
- Consult open/select retry:
  - `consultAgentWithRetry(...)` retries up to 2 attempts.
- Base conference creation retry:
  - `createConferenceA1A2(...)` retries up to 2 attempts.
- Bounded cleanup:
  - `safeHandleStrayTasks(...)` wraps cleanup in `Promise.race(...)` with 30s cap.
- Runner-level retry:
  - Playwright project retries are set to `1` in `playwright.config.ts`.

## Timeout Guidance
Timeout values used by this suite:
- `test.describe.configure({timeout: 300000})` in conference test module.
- `ACCEPT_TASK_TIMEOUT = 60000`
- `AWAIT_TIMEOUT = 10000`
- `OPERATION_TIMEOUT = 30000`
- Global Playwright timeout remains configured in `playwright.config.ts`.

When tuning for infrastructure latency:
- increase operation-level constants first (`ACCEPT_TASK_TIMEOUT`, `AWAIT_TIMEOUT`)
- avoid broad global timeout increases unless all suites are affected

## Cleanup Pattern
Required cleanup lifecycle:
- `beforeEach`:
  - run `cleanupAllAgents()` (clean slate before every test).
- per-test:
  - each scenario uses `try/finally` with `cleanupAllAgents()` in `finally`.
- `afterAll`:
  - run `cleanupAllAgents()`
  - run `stationLogout(page, false)` for all 4 agent pages
  - run `testManager.cleanup()`

This prevents residue across tests and keeps station/session state deterministic.

## Skip/Todo Rationale
- `CTS-SKIP-TC14`
  - requires external DN (`EP_DN`) path, explicitly out of scope.
- `CTS-SKIP-TC20`
  - requires more than 4 agents, explicitly out of scope.
- `CTS-TODO-TC17`
  - negative transfer path where target cannot join main conference; requires deterministic fault orchestration not implemented in this suite.
- `CTS-TODO-TC18`
  - failure-path transfer scenario with backend-dependent behavior; deferred as non-deterministic for current UI automation boundary.
- `CTS-TODO-TC19`
  - ownership fallback/oldest participant behavior needs deterministic participant ordering controls not covered in current automation hooks.

## Environment and .env Generation
Base env keys:
```env
PW_ENTRY_POINT7=+13104247513
PW_ENTRY_POINT8=13108414225
```

User sets are defined in `playwright/test-data.ts` and are the source of truth:
- `SET_7`: `user25,user26,user27,user28`
- `SET_8`: `user29,user30,user31,user32`

`playwright/global.setup.ts` calls `UpdateENVWithUserSets()` and auto-populates:
- `SET_X_AGENTY_USERNAME`
- `SET_X_AGENTY_EXTENSION_NUMBER`
- `SET_X_AGENTY_NAME`
- `SET_X_ENTRY_POINT`
- `SET_X_EMAIL_ENTRY_POINT`
- `SET_X_QUEUE_NAME`
- `SET_X_CHAT_URL`

OAuth run also writes:
- `SET_X_AGENTY_ACCESS_TOKEN`

Example generated structure:
```env
SET_8_AGENT1_USERNAME=user29@ccsdk.wbx.ai
SET_8_AGENT1_EXTENSION_NUMBER=1029
SET_8_AGENT1_NAME=User29 Agent29
SET_8_AGENT2_USERNAME=user30@ccsdk.wbx.ai
SET_8_AGENT2_EXTENSION_NUMBER=1030
SET_8_AGENT2_NAME=User30 Agent30
SET_8_AGENT3_USERNAME=user31@ccsdk.wbx.ai
SET_8_AGENT3_EXTENSION_NUMBER=1031
SET_8_AGENT3_NAME=User31 Agent31
SET_8_AGENT4_USERNAME=user32@ccsdk.wbx.ai
SET_8_AGENT4_EXTENSION_NUMBER=1032
SET_8_AGENT4_NAME=User32 Agent32
SET_8_ENTRY_POINT=13108414225
SET_8_AGENT1_ACCESS_TOKEN=...
SET_8_AGENT2_ACCESS_TOKEN=...
SET_8_AGENT3_ACCESS_TOKEN=...
SET_8_AGENT4_ACCESS_TOKEN=...
```

Note:
- if OAuth dependency is disabled/skipped, `SET_7/SET_8` access-token keys must already exist in `.env`.

## Execution Totals
- `SET_7`: `16` runnable tests
- `SET_8`: `15` total (`10` runnable + `5` skip/todo)
- Combined: `31` total

## Parallel Run
```bash
yarn test:e2e --project=SET_7 --project=SET_8
```
