# Service State (living) — webex-widgets (Contact Center)

> Start here → root [`AGENTS.md`](../AGENTS.md) (agent entry) · router [`SPEC_INDEX.md`](SPEC_INDEX.md) · system [`ARCHITECTURE.md`](ARCHITECTURE.md). Read this FIRST before adding a surface; stable contracts in [`CONTRACTS.md`](CONTRACTS.md).
> Context-efficiency: link to canonical docs — don't duplicate them; load on demand, not upfront.

> Source of truth for "does X already exist?" Keep current in the same change that adds/removes a surface.

This is a client-side widget library, not a network service. It exposes no HTTP endpoints, publishes/consumes no broker events, and owns no datastore — so the Current Endpoints, Current Events, Data Stores, and Rate Limits sections are dropped (no applicable content). All domain data is obtained at runtime from the `@webex/contact-center` SDK via the store. The as-built public surface (exports + custom elements) lives in [`CONTRACTS.md`](CONTRACTS.md).

## External Dependencies
| Dependency | Used for | Timeout / retry | Circuit breaker / fallback |
|---|---|---|---|
| `@webex/contact-center` SDK | Sole source of CC domain data and actions: agent login/state, tasks/call control, profile + feature flags, transcripts, access token (`webex.credentials.getUserToken()`). Accessed only through the store (`store.cc.*`, `packages/contact-center/store/src/storeEventsWrapper.ts`). | This repo owns no retry policy; the SDK owns its own timeouts/retries. The one timeout this repo holds is the 6s SDK-init guard in `Store.init()` (`packages/contact-center/store/src/store.ts:140-142`). | No breaker. On init failure `Store.init()` rejects; widgets remain inert and surface error UI. Token failures log an error and return without crashing (`packages/contact-center/store/src/storeEventsWrapper.ts:994-998`). |
| `react` / `react-dom` 18, `mobx` / `mobx-react-lite`, `@r2wc/react-to-web-component` | Runtime peers: component rendering, store reactivity, custom-element wrapping (`packages/contact-center/cc-widgets/src/wc.ts`). | N/A (in-process libraries) | N/A |

## Feature Flags (current)
Feature flags are not owned or defaulted by this repo — they are read from the SDK-provided agent `Profile` and surfaced read-only via `getFeatureFlags()` to drive UI visibility (`packages/contact-center/store/src/util.ts:13-60`). Defaults and ownership live with the back end / SDK profile; "Current default" below is therefore **SDK-provided (per-agent)**.

| Flag | Gates | Current default | Owner | Safe to remove when |
|---|---|---|---|---|
| `isOutboundEnabledForTenant` | Outdial UI at tenant level | SDK-provided (per-agent) | Webex CC back end | SDK stops emitting it on `Profile` |
| `isOutboundEnabledForAgent` | Outdial UI at agent level | SDK-provided | Webex CC back end | SDK stops emitting it |
| `isAdhocDialingEnabled` | Ad-hoc dial entry in OutdialCall | SDK-provided | Webex CC back end | SDK stops emitting it |
| `isCampaignManagementEnabled` | Campaign management UI | SDK-provided | Webex CC back end | SDK stops emitting it |
| `isEndTaskEnabled` | End-task action in CallControl | SDK-provided | Webex CC back end | SDK stops emitting it |
| `isEndConsultEnabled` | End-consult action | SDK-provided | Webex CC back end | SDK stops emitting it |
| `agentPersonalStatsEnabled` | Agent personal stats UI | SDK-provided | Webex CC back end | SDK stops emitting it |
| `isCallMonitoringEnabled` | Call monitoring controls | SDK-provided | Webex CC back end | SDK stops emitting it |
| `isMidCallMonitoringEnabled` | Mid-call monitoring controls | SDK-provided | Webex CC back end | SDK stops emitting it |
| `isBargeInEnabled` | Barge-in control | SDK-provided | Webex CC back end | SDK stops emitting it |
| `isManagedTeamsEnabled` | Managed-teams selection | SDK-provided | Webex CC back end | SDK stops emitting it |
| `isManagedQueuesEnabled` | Managed-queues selection | SDK-provided | Webex CC back end | SDK stops emitting it |
| `isSendMessageEnabled` | Send-message action | SDK-provided | Webex CC back end | SDK stops emitting it |
| `isAgentStateChangeEnabled` | Agent state change UI | SDK-provided | Webex CC back end | SDK stops emitting it |
| `isSignOutAgentsEnabled` | Sign-out-agents action | SDK-provided | Webex CC back end | SDK stops emitting it |
| `isTimeoutDesktopInactivityEnabled` | Desktop inactivity timeout behavior | SDK-provided | Webex CC back end | SDK stops emitting it |
| `isAnalyzerEnabled` | Analyzer-backed features | SDK-provided | Webex CC back end | SDK stops emitting it |
| `webRtcEnabled` | WebRTC (browser) device option | SDK-provided | Webex CC back end | SDK stops emitting it |
| `isRecordingManagementEnabled` | Recording toggle in CallControl | SDK-provided | Webex CC back end | SDK stops emitting it |
| `allowConsultToQueue` | Consult-to-queue option | SDK-provided | Webex CC back end | SDK stops emitting it |
| `isSuggestedResponsesEnabled` | AI suggested-response feature; derived by `getFeatureFlags()` projecting the first boolean found at `aiFeature.suggestedResponses.enable`, `agentConfig.aiFeature.suggestedResponses.enable`, or `isSuggestedResponsesEnabled` onto the flat `AI_FEATURE_SUGGESTED_RESPONSES_KEY` (`packages/contact-center/store/src/util.ts:45-57`, `packages/contact-center/store/src/constants.ts:21`) | SDK-provided | Webex CC back end | SDK stops emitting all three source paths |

## Compliance / Certifications
- FedRAMP: PR template (`.github/PULL_REQUEST_TEMPLATE.md`) compliance is mandatory and must not be regressed (COMPLETES, Change Type, test scenarios, GAI Policy, Checklist sections).
- PII: agent/customer PII (names, phone numbers, task/transcript data) passes through widgets at runtime and must never be logged or persisted — see [`SECURITY.md`](SECURITY.md). Metrics props are not yet sanitized — noted in the `havePropsChanged` JSDoc `@remarks` (`packages/contact-center/ui-logging/src/metricsLogger.ts:73-76`); do not pass PII-bearing objects to `metricsLogger`.

## Maintenance
- Update the relevant row in the same change that adds/changes/removes a surface, dependency, limit, or flag (e.g. add a flag here when `getFeatureFlags()` in `util.ts` gains a key).
- Cross-reference: stable contracts → [`CONTRACTS.md`](CONTRACTS.md); security posture → [`SECURITY.md`](SECURITY.md).
