# AI Summary deterministic browser verification

The `AI Summary Deterministic` project in the root Playwright config owns an
isolated local sample server and bundled headless Chromium. No live agent account
or OAuth is required. Opt-in runs (`AI_SUMMARY_E2E=1`) bind the sample server to
`127.0.0.1` on `AI_SUMMARY_E2E_PORT` or `3001`, reject ports outside `1-65535`,
disable server reuse, and force the top-level Playwright worker count to one.
Unflagged runs retain the original `localhost:3000` command, URL, baseURL and
reuse behavior; only the exact AI Summary specs are ignored by existing projects.
The deterministic project uses Playwright's managed browser/context fixtures and
pins `en-US`, light color scheme, and reduced motion. Interaction journeys use
device scale factor `1`; the visual evidence suite uses the descriptor's `2x`
scale so physical PNG dimensions match the sealed source images.

`Utils/aiSummaryUtils.ts` drives screenshot-backed, structural and journey states
through the opt-in sample-host bridge. The bridge is installed before document
scripts, the sample app initializes only through `store.init({webex})` on
`?ai-summary-e2e=1`, and ordinary navigation leaves the bridge unused. The visual
bridge exposes the SDK-shaped `cc`, `authorization`, logger and ready callback
members that the sample host probes, so constructor diagnostics stay local and do
not trigger live discovery. The visual
evidence manager derives the target worktree and common-checkout roots through
Git, reads the prepared plan only from the common checkout, and refuses to write
when `uxInputRoot` or `render_directory` diverge from those canonical roots.
Each run uses a fresh or supplied attempt id under the plan render directory,
recreates every generated case directory, and binds case manifests to that
attempt, the plan, and the current product fingerprint. Structural receipts are
assertion gated: each registry entry declares an evidence reason plus typed
present/absent/role/state assertions, and the DOM/accessibility/classification
files are written only after those assertions pass.

`suites/ai-summary-tests.spec.ts` owns all generated visual and structural
evidence and final fail-closed aggregation. `tests/ai-summary-test.spec.ts` adds
behavioral regression coverage for the voice destination radio group, editable
plain/keyed summaries, read-only Outcome, icon actions and visible hover feedback.
These behavioral checks are distinct from hash-bound host render evidence and
final pixel/visual acceptance. They neither change the target screenshots nor
waive visual differences.
Finalization emits only the closed raw-render observation contract and source
state map. Declared/canonical aliases stay in per-case registry/comparison
sidecars, not as unsupported raw scenario fields. It does not create a final
visual receipt or iteration handoff: only the subsequent model inspection may
claim source/render inspection and visual acceptance.

Visual evidence uses panel-relative clips, not the entire sample viewport. The
sealed source dimensions and crop origin (including tooltip overhang) determine
the clip; panel width is normally derived from that clip, with an explicit
source-root width only when the screenshot includes interaction overhang outside
the panel. The host viewport accommodates the production 80vh panel. The bridge
driver sets only the supported panel-width custom property before the real widget
is opened, without substituting production markup or screenshot-only component
styling. Geometry and fonts settle before locator-driven interaction; no resize or
scroll reset is performed after establishing hover, focus or copy-confirmation
state. Browser-side font response hashes are computed with `globalThis.crypto`
inside the page context; the Node crypto module stays outside `page.evaluate`.

The SDK bridge returns buddy agents in the installed SDK's `data.agentList`
envelope; the consult browser check requires all seeded destination rows. The
sample declares its local Inter font at `.app.mds-typography`, where Momentum's
typography variables are defined, so the root's font choice is not shadowed.
Font readiness continues to verify the declared family, loaded faces and asset
hashes. Receiver drivers verify the activation button before opening the panel;
the resulting structural assertions verify the open panel and the same injected
card text, without requiring its now-removed closed-state trigger.

`Utils/aiSummaryUtils.ts` observes required panel/header/action landmarks before
and after capture, checking crop and viewport containment, clipping ancestors,
visibility and stable geometry across the capture (including document scroll).
Nonzero document scroll is allowed because Playwright's clip is viewport-relative.
A failure emits `framing.json` and a
diagnostic viewport PNG, but cannot produce an accepted raw render receipt.
`capture:framing-complete` is a required assertion in every scenario descriptor.
Browser tests cover off-screen, ancestor-clipped, hidden and missing landmarks,
plus production consult, plain/structured summary, hover and copy states. Short
viewport regressions also assert the scoped voice and wrap-up scroll owners,
visible heading/action landmarks, keyboard reachability of Complete Wrap-Up, and
that an unrelated legacy `agent-popover-content` keeps its baseline overflow. These
checks establish framing and interaction identity, not final visual fidelity.

All CC imports in the sample, including `@webex/cc-ai-assistant`, resolve to
workspace source. Loading that package from an old bundled `dist/index.js` also
injects stale AISummary styles, overriding the current candidate. The sample
webpack configuration is therefore a declared render input. Browser regression
checks verify computed editor borders/resizing as well as DOM functionality.
Momentum React's `*.svg?svgr` imports require a named `ReactComponent` export;
the sample declares SVGR plus its existing file loader for that query, separately
from ordinary image URL assets. The zero-result reason-search regression checks
the real clear icon, its minimum hit area and its clearing behavior.

Copy confirmation survives pointer re-entry caused by its own width change;
the production 1500ms confirmation lifetime and blur reset remain unchanged.
Focus normalization is restricted to the source-backed generating/plain-edit/error
scenarios: focus moves to the production popover container, not out of its focus
trap. Copy, hover, keyboard and structural search scenarios are never blanket-blurred.
Regression tests exercise search keyboard focus, copy confirmation and blur reset,
keyed click-to-edit behavior, and visible Next Steps in the compact summary preview.
Diagnostic screenshots from operator repairs are not final flow visual approval;
the resumed host and visual task must produce fresh attempt-bound evidence.
All ten sources have real PNG captures and code-computed differences. S10's
measurement is diagnostic: enabled Complete Wrap-Up intentionally overrides the
disabled target treatment. Its separate structural evidence retains the sealed
UX-010 triple, requirement-availability classification, accessibility and zero
runtime-error/rejection counts. The screenshot case explicitly checks enabled
completion and visible Retry. Neither its measured score nor browser success
grants visual approval or relaxes any existing threshold.
UX-007 uses descriptor identity `UX-007/S07-UX` in raw-render records. Its local
`S07`/`dl` render directory and hash-equal alias remain in registry/comparison
sidecars. Final receipts use only fields supported by the flow schema; the
release verifier checks alias provenance through those bound files. It requires
ten source comparisons, including S10, without requiring forbidden alias fields.

Target S01's Organization category lacks a current SDK destination mapping;
only the four supported destinations are enabled. The operator approved this
intentional target difference on 2026-09-25; visual receipts must disclose it,
not claim that Organization was implemented or invent an SDK capability.

S01 also checks the visible close icon, source voice radio display labels, a
one-line source-sized summary heading, the full visible destination placeholder,
and enough content height for four text lines. It focuses the containing voice
panel, then hovers the first destination row to reproduce the target affordance;
it does not synthesize DOM, inject styles, or perform the destination action.
That scenario's descriptor requires the layout and destination-hover assertions.
The browser regression closes the panel through its real callback, verifies the
four SDK destination radios fit at the source width, confirms the voice reload
control is absent from the search row, and separately opens consult through the
sample bridge to assert exactly one mid-call request. It distinguishes circular
hover styling from filled-icon-only feedback selection. Other keyboard/interaction
states retain their focus policy.

The deterministic page fixture rejects every non-local HTTP(S) request, records
`pageerror` and browser `unhandledrejection` events for every AI Summary scenario,
and fails after the scenario if any list is non-empty. Timeout, stale ordering,
ownership change, response-failure, clipboard and post-call feedback constants are
consumed by bridge-driven journeys, not by registry self-checks.

The memory-only privacy journey installs its storage, cookie, IndexedDB, History
and Clipboard spies only after the legitimate sample-host bootstrap and initial
configuration writes complete. It snapshots the host URL, cookie string and web
storage entries, then drives a real post-call request, edit, copy, feedback,
summary replacement, wrap-up and summary unmount. The assertions require no
persistence or URL/cookie mutation records, unchanged host state, exactly one
user-initiated clipboard write, and no follow-up clipboard write after the
1500 ms copy confirmation timer, replacement or unmount.
# Post-review capture repair (2026-09-27)

The integrated sample host may scroll while opening a popover. Playwright's
non-full-page screenshot clip and DOM rectangles are both viewport-relative;
a nonzero document scroll offset alone is not clipping. Require the entire crop,
heading, actions and declared tooltip to fit, and compare the complete framing
observation (including scroll offset) before and after capture to reject drift.
Do not scroll, restyle, crop away content or mask a failed framing check.

Worker restarts reuse an attempt directory only when its input bindings match
exactly. They must preserve other scenarios' evidence instead of deleting the
whole attempt. The SDK constructor version is a bundled Webex version; package
identity is checked against the sealed installed Contact Center manifest.

## Alpha repair verification (2026-09-27)

`yarn tsc -p playwright/tsconfig.ai-summary.json` checks both AI Summary suites,
their fixture selections, registry and root configuration without emitting code.
Scenario selections use the original closed two-level D1 fixture groups. There
are no browser-only fixture aliases. The deterministic project passes reduced
motion through Playwright's typed context options.

Each structural state also has an independent browser regression that executes
its driver and assertions, then attaches observed production store state. The
sample exposes read-only ownership/counter observations and normal store request
and registration callbacks only behind `ai-summary-e2e=1`. No observations are
used to fabricate store contents. SDK mocks alone provide deferred settlements,
telephony call counts and the SDK-owned 15-second generation deadline. Packed
SDK contract tests remain necessary to prove the real SDK deadline implementation.

The rejection guard is tested with an actual unhandled native `Promise.reject`
on an isolated page, using the same listener installed for feature journeys.
Feature pages must record zero unhandled rejections, page errors and nonlocal
network requests. Ordinary navigation must leave Init disabled and constructor
probe diagnostics absent. The injected constructor capability test explicitly
describes its mock boundary; it does not claim real constructor execution.

Coverage includes pending pre-action response ordering and duplicate-action
guards, concurrent post-call generation, SDK timeout/retry, completion after a
generation error, response tombstone cleanup, hold/resume counter and focus
retention, authentic owner transitions, and 240/300/320px layouts. Clipboard
replacement proof keeps the same receiver Copy button focused while a direct
SDK card event replaces content; no blur, reason selection or timer advancement
can satisfy the reset assertion accidentally.

Cross-agent D1 replay performs the SDK logout event, normal sample registration
with the next authenticated profile, and a deferred successor request. The test
observes zero successor counters before revealing the new response, then one
view after real reveal. Conference-host changes do not impersonate a change in
authenticated summary owner. A separate real host checkbox unmount/remount
preserves receiver content/counters and counts the next explicit reveal.

S01 placeholder readability is measured using the loaded placeholder font and
canvas text width against the input's actual content box; input scrollWidth does
not measure clipped placeholder text. Selected Like/Dislike capture drivers
click the panel heading after selection and assert that no tooltip remains.

`comparison.identity.json` preserves the original normalized comparator output,
canonical alias and font observations. Its self hash and registry file hash bind
the sidecar; raw-render records point to this immutable file. The host may rewrite
`comparison.json` with raw comparator fields without destroying that identity.
The release verifier still requires current comparator target/rendered/diff
digests and measured difference to agree, including actual rendered/diff bytes.
Prior attempts remain historical evidence and do not establish current readiness.
