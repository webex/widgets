# Multi-Party Conference Spec

Implementation spec based on:
- `Multi-Party Conference Feature Test Matrix`
- `TRANSFER CONFERENCE SCENARIOS`
- `Switch Conference — Test Plan`

## Metadata
```yaml
test_key: conference-transfer-switch
author: Contact Center QA Automation
date: 2026-02-17
status: Implemented and Stabilized
source_page:
  title: CC Widgets Test Plan
  url: https://confluence-eng-gpk2.cisco.com/conf/spaces/WSDK/pages/604864061/CC+Widgets+Test+Plan
  page_id: 604864061
source_sections:
  - Multi-Party Conference Feature Test Matrix
  - TRANSFER CONFERENCE SCENARIOS
  - Switch Conference — Test Plan
new_user_set: SET_7
new_suite_file: playwright/suites/conference-transfer-switch-tests.spec.ts
new_test_file: playwright/tests/conference-transfer-switch-test.spec.ts
```

## User Constraints Applied
- Exclude scenarios requiring more than 4 agents.
- Exclude scenarios involving `EP_DN`.
- Exclude scenarios requiring dial-number flow.
- Keep `TC-17`, `TC-18`, and `TC-19` non-implemented.
- Use `user25`, `user26`, `user27`, `user28` with existing naming pattern.
- Use desktop login mode only.
- Keep before-test slate clean with stray-task handling.
- Perform stray-task handling and station logout in `afterAll`.

## Environment
Root `.env` entries used by this suite:
```env
PW_ENTRY_POINT7=+13104247513
PW_SKIP_OAUTH=true
```

## SET_7 Definition
`playwright/test-data.ts`:
```typescript
SET_7: {
  AGENTS: {
    AGENT1: {username: 'user25', extension: '1025', agentName: 'User25 Agent25'},
    AGENT2: {username: 'user26', extension: '1026', agentName: 'User26 Agent26'},
    AGENT3: {username: 'user27', extension: '1027', agentName: 'User27 Agent27'},
    AGENT4: {username: 'user28', extension: '1028', agentName: 'User28 Agent28'},
  },
  ENTRY_POINT: env.PW_ENTRY_POINT7,
  TEST_SUITE: 'conference-transfer-switch-tests.spec.ts',
}
```

## Suite Files
- `playwright/suites/conference-transfer-switch-tests.spec.ts`
- `playwright/tests/conference-transfer-switch-test.spec.ts`

## ID Coverage Implemented
- `CTS-MPC-01..16`
- `CTS-TC-01..05`
- `CTS-SW-01..05`
- `CTS-SKIP-TC14`
- `CTS-SKIP-TC20`
- `CTS-TODO-TC17`
- `CTS-TODO-TC18`
- `CTS-TODO-TC19`

## Runtime Totals
Current suite totals in `SET_7`:
- Total: `31`
- Executed: `26`
- Skipped/Non-implemented: `5`

Skipped/Non-implemented reasons:
- `TC14`: excluded (`EP_DN` / external DN)
- `TC20`: excluded (>4 agents)
- `TC17`, `TC18`, `TC19`: intentionally non-implemented (`test.fixme`)

## Execution Model
### Desktop-only setup
```typescript
await testManager.setupForConferenceDesktop(browser);
```

### Mandatory inbound pattern
```typescript
await createCallTask(testManager.callerPage!, process.env[`${testManager.projectName}_ENTRY_POINT`]!);
await acceptIncomingTask(targetAgentPage, TASK_TYPES.CALL, ACCEPT_TASK_TIMEOUT);
```

### Mandatory state gating before each call leg
- Target agent -> `Available`
- Non-target agents -> `Meeting`
- Verify states before call initiation

## Lifecycle
### `beforeEach`
- Clean all active pages with safe stray-task handling.
- Guard against closed pages.

### `afterAll`
- Clean all pages with safe stray-task handling.
- Run `stationLogout(..., false)` for all agents.
- Run `testManager.cleanup()`.

## Stability Rules Implemented
To keep these tests non-flaky:
- Retry inbound creation/accept path once when incoming task is missed.
- Retry consult initiation once when consult control is transiently unavailable.
- Retry full base conference creation (`A1+A2+customer`) once on transient UI race.
- Bound `handleStrayTasks` with timeout (`Promise.race`) to avoid long cleanup stalls.
- Keep assertions state/UI-first and avoid forced pass behavior.

## Skip/Todo Handling
Implemented as:
```typescript
test.skip('CTS-SKIP-TC14 ...');
test.skip('CTS-SKIP-TC20 ...');
test.fixme('CTS-TODO-TC17 ...', async () => {});
test.fixme('CTS-TODO-TC18 ...', async () => {});
test.fixme('CTS-TODO-TC19 ...', async () => {});
```

## Notes
- This suite intentionally focuses on in-scope conference/transfer/switch behavior for up to 4 agents.
- Audio-quality/assertion-heavy scenarios are not force-implemented where deterministic UI/state validation is the agreed boundary.
