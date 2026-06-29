# Security Baseline — webex-widgets (Contact Center)

> Start here → root [`AGENTS.md`](../AGENTS.md) (agent entry) · router [`SPEC_INDEX.md`](SPEC_INDEX.md) · system [`ARCHITECTURE.md`](ARCHITECTURE.md). Then this doc; per-feature security design lives in each feature's design doc.
> Context-efficiency: link to canonical docs — don't duplicate them; load on demand, not upfront.

> Read before changing anything that touches input, identity, data, or external calls. Don't weaken a
> documented control without an explicit, approved decision (record it as an ADR).

This repo is a client-side React/Web-Component widget library. It hosts no network service: there is no HTTP server, no endpoints, no sessions or cookies issued by this code. The authenticated Webex session and its tokens are owned by the host application and the `@webex/contact-center` SDK; widgets reach the SDK only through the store (`store.cc.*`).

## Trust Boundaries
| Boundary | Untrusted side | Trusted side | What is enforced at the crossing |
|---|---|---|---|
| Widget initialization | Host application (passes `webexConfig` + `access_token`, or a pre-initialized `webex` object) | Store | `Store.init()` accepts `InitParams` and hands credentials straight to `Webex.init()`; widgets never parse or store the raw token (`packages/contact-center/store/src/store.ts:132-151`) |
| Widget props / events | Host application (event callbacks, JSON props passed to custom elements) | Widget React tree | r2wc coerces declared prop types (`function`, `json`, `boolean`, `string`); only declared props are wired (`packages/contact-center/cc-widgets/src/wc.ts:8-78`) |
| SDK data into UI | `@webex/contact-center` SDK (task/agent/profile payloads via events) | Store + widgets | All SDK access funnels through the store wrapper; widgets consume MobX observables, never the SDK directly (`packages/contact-center/store/src/storeEventsWrapper.ts`) |
| Browser DOM rendering | SDK-supplied strings (names, phone numbers, transcript text) | React DOM | React escapes interpolated text by default; no `dangerouslySetInnerHTML` in widget render paths |

## Authentication & Authorization Model
- **Authentication:** Owned by the host app and the Webex SDK, not this repo. The host supplies either a live `webex` instance or `{webexConfig, access_token}`; the store passes the token to `Webex.init({credentials: {access_token}})` and otherwise treats identity as opaque (`packages/contact-center/store/src/store.ts:144-151`). Token retrieval for downstream SDK features delegates to the SDK: `getAccessToken()` calls `webex.credentials.getUserToken()` (`packages/contact-center/store/src/storeEventsWrapper.ts:988-998`).
- **Authorization:** Owned by the SDK / back end. The store surfaces the agent's capabilities as read-only feature flags derived from the SDK-provided `Profile` (`packages/contact-center/store/src/util.ts:3-36`); widgets use these only to show/hide UI. There is no access-decision logic enforced in this repo.
- **Default posture:** Widgets are inert until the host completes `Store.init()`; with no valid host-supplied session the SDK never initializes (`Webex.init` rejects after a 6s timeout — `packages/contact-center/store/src/store.ts:140-142`), so no agent data flows.

## Secret & Credential Handling
- Secrets source: None stored in this repo. The `access_token` is provided at runtime by the host application; no vault, env-baked secret, or connection string exists in source. A grep of `packages/contact-center/*/src` finds token references only in the store init/retrieval paths above and as a transient in-memory `jwtToken` in Digital Channels (fetched via `getAccessToken`, held in component state, never persisted — `packages/contact-center/cc-digital-channels/src/helper.ts:76-83`).
- Injection: Passed in by the host at `Store.init()` and forwarded directly to the SDK; the access token is never copied into the MobX store, logs, or persistent storage.
- Rotation: Owned by the host/SDK (`webex.credentials.getUserToken()` is re-queried on demand); this repo does not cache tokens, so it has no rotation responsibility.
- **Hard rule:** never commit secrets, tokens, keys, or connection strings; never log them.

## Data Classification & Handling
| Data class | Examples | Storage rule | Logging rule | In transit |
|---|---|---|---|---|
| Auth credential | `access_token` (host-supplied), SDK user token | Never persisted; passed to SDK only, held transiently in memory | Never log — confirmed: only error/status strings are logged in token paths, never the token value (`packages/contact-center/store/src/storeEventsWrapper.ts:994-998`) | Carried by the SDK over its own HTTPS transport; not handled by this repo |
| Agent/customer PII | Caller name, phone number (DNIS/ANI), task/interaction data, transcript text, address-book entries | Held in memory as MobX observables only; no datastore in this repo | Never log raw PII; widget log lines carry `{module, method}` context, not payloads | SDK-owned HTTPS |
| Telemetry props | Widget metrics props passed to `metricsLogger` | Not persisted by this repo | **Risk: props are NOT sanitized today** — `metricsLogger` documents this explicitly (`packages/contact-center/ui-logging/src/metricsLogger.ts:73-76`). Do not pass PII-bearing objects as metrics props; see Known Sensitive Areas | Telemetry sink owned by host/SDK |

## Input Validation & Output Encoding Posture
- Untrusted input enters only via host-supplied custom-element props/events (type-coerced by r2wc — `packages/contact-center/cc-widgets/src/wc.ts`) and via SDK event payloads (typed through `store.types`). Rendered output goes through React, which escapes interpolated text by sink; widget render paths use no `dangerouslySetInnerHTML`. There are no SQL/shell/query sinks in this client library, so parameterization is N/A.

## Known Sensitive Areas & Accepted Risks
| Area | Risk | Mitigation / why accepted | Owner |
|---|---|---|---|
| `ui-logging` metrics props | Widget props are logged without sanitization (`metricsLogger.ts:73-76`) | Callers must not pass PII-bearing objects as metrics props; sanitization is a documented future enhancement | cc-ui-logging maintainers |
| `getAccessToken()` SDK gap | `webex.credentials.getUserToken()` is `@ts-expect-error`-typed (SDK API not yet typed) (`storeEventsWrapper.ts:990-992`) | Token value is returned to the caller and never logged; failures log only an error message | cc-store maintainers |

## Reporting & Review
- Security-relevant changes (anything touching the store init/credential path, the `@webex/contact-center` SDK boundary, logging, or the public export/custom-element surface) require review by the package CODEOWNERS on the `next`-targeted PR, following `.github/PULL_REQUEST_TEMPLATE.md` (FedRAMP/GAI sections). Suspected vulnerabilities: report through the Webex internal security channel, not a public issue.
- Cross-reference: stable public surface → [`CONTRACTS.md`](CONTRACTS.md); current dependencies → [`SERVICE_STATE.md`](SERVICE_STATE.md).
