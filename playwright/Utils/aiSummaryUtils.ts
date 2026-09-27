import {expect, Page, test as base} from '@playwright/test';
import {spawn, spawnSync} from 'node:child_process';
import nodeCrypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import type {AISummaryStatusDetail} from '@webex/cc-widgets';
import type {AISummaryStoreObservation} from '../../widgets-samples/cc/samples-cc-react-app/src/aiSummaryE2E';
import {aiSummaryFixtures} from '../../packages/contact-center/test-fixtures/src/aiSummaryFixtures';
import {
  AI_SUMMARY_STRUCTURAL_CASES,
  AI_SUMMARY_VISUAL_FONT_MANIFEST,
  AISummaryStructuralAssertion,
  AI_SUMMARY_VISUAL_CASES,
  AISummaryVisualArgs,
  AISummaryStructuralCase,
  AISummaryVisualCase,
  AISummaryVisualFontManifest,
  AISummaryResolvedVisualEvidenceIdentity,
  UXScreenshotId,
  UXSourceId,
  assertAISummaryVisualRegistry,
  resolveAISummaryVisualEvidenceIdentity,
} from '../visual/ai-summary-visual-cases';

const aiSummaryBrowserFixtures = aiSummaryFixtures;

type AISummaryFixtureGroups = typeof aiSummaryBrowserFixtures;
type AISummaryScenarioSelection = {
  [Group in keyof AISummaryFixtureGroups]: {
    readonly group: Group;
    readonly member: keyof AISummaryFixtureGroups[Group] & string;
  };
}[keyof AISummaryFixtureGroups];

export type AISummaryBrowserScenario = readonly [AISummaryScenarioSelection, ...AISummaryScenarioSelection[]];

export type AISummaryAxeInclude = {
  readonly selector: string;
};

export const AI_SUMMARY_TIMEOUT_SCENARIO = [
  {group: 'errors', member: 'timeout'},
] as const satisfies AISummaryBrowserScenario;

export const AI_SUMMARY_STALE_TIMESTAMP_SCENARIO = [
  {group: 'ordering', member: 'presentLowerTimestamp'},
] as const satisfies AISummaryBrowserScenario;

export const AI_SUMMARY_OWNERSHIP_CHANGE_SCENARIO = [
  {group: 'transfers', member: 'agentAToBToC'},
] as const satisfies AISummaryBrowserScenario;

export const AI_SUMMARY_RESPONSE_FAILURE_SCENARIO = [
  {group: 'postWrapUpSend', member: 'rejected'},
] as const satisfies AISummaryBrowserScenario;

export const AI_SUMMARY_RECEIVER_BROWSER_CARD = {
  ...aiSummaryBrowserFixtures.receivingMidCall.adaptiveCard,
  adaptiveCard: {
    type: 'AdaptiveCard',
    version: '1.5',
    backgroundImage: 'https://example.invalid/background.png',
    body: [
      {type: 'TextBlock', text: 'Browser receiver summary'},
      {type: 'TextBlock', text: 'Action-stripped detail remains visible.'},
      {
        type: 'ImageSet',
        images: [{url: 'https://example.invalid/tracker.png', altText: 'Remote tracker'}],
      },
      {
        type: 'Media',
        poster: 'https://example.invalid/poster.png',
        sources: [{url: 'https://example.invalid/video.mp4', mimeType: 'video/mp4'}],
      },
      {
        type: 'ActionSet',
        actions: [
          {type: 'Action.Submit', title: 'Embedded Copy', id: 'copyButton'},
          {type: 'Action.Submit', title: 'Embedded Like', id: 'likeButton'},
        ],
      },
    ],
    actions: [{type: 'Action.Submit', title: 'Top-level action', id: 'topLevelAction'}],
    selectAction: {type: 'Action.Submit', title: 'Card select action', id: 'selectAction'},
  },
} as const;

const UX_PHASE = process.env.PROG_MINI_JS_UX_PHASE === 'review_fix' ? 'review_fix' : 'implementation';
const PROVIDED_RENDER_ATTEMPT_ID = process.env.PROG_MINI_JS_UX_RENDER_ATTEMPT_ID;
if (PROVIDED_RENDER_ATTEMPT_ID && !/^[a-f0-9]{64}$/.test(PROVIDED_RENDER_ATTEMPT_ID)) {
  throw new Error('PROG_MINI_JS_UX_RENDER_ATTEMPT_ID must be a SHA-256 token');
}
const RENDER_ATTEMPT_ID = PROVIDED_RENDER_ATTEMPT_ID ?? nodeCrypto.randomBytes(32).toString('hex');
const runGitRevParse = (args: readonly string[]): string => {
  const result = spawnSync('git', args, {
    cwd: process.cwd(),
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'pipe'],
    timeout: 60_000,
  });
  if (result.error) {
    throw new Error(`git ${args.join(' ')} failed: ${result.error.message}`);
  }
  if (result.status !== 0) {
    throw new Error(`git ${args.join(' ')} failed: ${(result.stderr || '').trim()}`);
  }
  const stdout = result.stdout.trim();
  if (!stdout) {
    throw new Error(`git ${args.join(' ')} returned no output`);
  }
  return stdout;
};
const TARGET_WORKTREE_ROOT = path.resolve(runGitRevParse(['rev-parse', '--show-toplevel']));
const COMMON_GIT_DIR = path.resolve(runGitRevParse(['rev-parse', '--path-format=absolute', '--git-common-dir']));
if (path.basename(COMMON_GIT_DIR) !== '.git') {
  throw new Error(`Git common directory must resolve to a .git directory: ${COMMON_GIT_DIR}`);
}
const COMMON_CHECKOUT_ROOT = path.dirname(COMMON_GIT_DIR);
const RESULTS_ROOT = path.join(COMMON_CHECKOUT_ROOT, '.matrix/results/prog-mini-js');
const VISUAL_PLAN_PATH = path.join(
  RESULTS_ROOT,
  UX_PHASE === 'review_fix' ? 'ux_visual_comparison_review_fix_plan.json' : 'ux_visual_comparison_plan.json'
);
const PHASE_RENDER_ROOT = path.join(RESULTS_ROOT, 'ux-visual', UX_PHASE.replace('_', '-'));
const OUTPUT_ROOT = path.join(PHASE_RENDER_ROOT, 'attempts', RENDER_ATTEMPT_ID);
const LOCAL_HTTP_HOSTS = new Set(['127.0.0.1', 'localhost', '[::1]', '::1']);
const SHA256_PATTERN = /^[a-f0-9]{64}$/;
const MB_FLOW_TIMEOUT_MS = 60_000;
const MB_FLOW_OUTPUT_LIMIT_BYTES = 512_000;
const AI_SUMMARY_CAPTURE_READY_TIMEOUT_MS = 10_000;
const sha256 = (value: Buffer | string): string => nodeCrypto.createHash('sha256').update(value).digest('hex');
const AI_SUMMARY_FONT_BY_EMITTED_PATH = new Map<string, AISummaryVisualFontManifest['fonts'][number]>(
  AI_SUMMARY_VISUAL_FONT_MANIFEST.fonts.map((font) => [font.emittedUrlPath, font])
);
const aiSummaryRuntimeIssues = new WeakMap<
  Page,
  {readonly pageErrors: string[]; readonly unhandledRejectionRecords: string[]}
>();

export const installAISummaryRejectionCapture = async (
  page: Page,
  record: (message: string) => void
): Promise<void> => {
  await page.exposeBinding('__recordAISummaryUnhandledRejection', (_source, message: string) => record(message));
  await page.addInitScript(() => {
    const win = window as unknown as {
      __AI_SUMMARY_UNHANDLED_REJECTIONS__?: string[];
      __recordAISummaryUnhandledRejection?: (message: string) => Promise<void>;
    };
    win.__AI_SUMMARY_UNHANDLED_REJECTIONS__ = [];
    window.addEventListener('unhandledrejection', (event) => {
      const reason: unknown = event.reason;
      let message: string;
      try {
        message =
          reason instanceof Error
            ? reason.stack || reason.message
            : typeof reason === 'string'
              ? reason
              : JSON.stringify(reason) || 'unknown unhandled rejection';
      } catch {
        message = Object.prototype.toString.call(reason);
      }
      win.__AI_SUMMARY_UNHANDLED_REJECTIONS__?.push(message);
      void win.__recordAISummaryUnhandledRejection?.(message);
    });
  });
};

export const test = base.extend<{page: Page}>({
  page: async ({context, page}, use) => {
    const pageErrors: string[] = [];
    const unhandledRejectionRecords: string[] = [];
    const blockedNetworkRequests: string[] = [];
    const fontNetworkFailures: string[] = [];
    aiSummaryRuntimeIssues.set(page, {pageErrors, unhandledRejectionRecords});
    await context.route('**/*', async (route) => {
      const request = route.request();
      let parsedURL: URL;
      try {
        parsedURL = new URL(request.url());
      } catch {
        await route.continue();
        return;
      }
      if (
        (parsedURL.protocol === 'http:' || parsedURL.protocol === 'https:') &&
        !LOCAL_HTTP_HOSTS.has(parsedURL.hostname)
      ) {
        blockedNetworkRequests.push(`${request.method()} ${parsedURL.href}`);
        await route.abort('blockedbyclient');
        return;
      }
      if (
        (parsedURL.protocol === 'http:' || parsedURL.protocol === 'https:') &&
        LOCAL_HTTP_HOSTS.has(parsedURL.hostname) &&
        /\.(?:woff2?|ttf|otf|eot)$/i.test(parsedURL.pathname)
      ) {
        const fontManifestEntry = AI_SUMMARY_FONT_BY_EMITTED_PATH.get(parsedURL.pathname);
        if (!fontManifestEntry) {
          fontNetworkFailures.push(`Unexpected local font ${request.method()} ${parsedURL.href}`);
          await route.abort('blockedbyclient');
          return;
        }
        const response = await route.fetch();
        const body = await response.body();
        const responseURL = new URL(response.url());
        const actualHash = sha256(body);
        if (!response.ok()) {
          fontNetworkFailures.push(`Font response failed ${response.status()} ${parsedURL.href}`);
          await route.abort('blockedbyclient');
          return;
        }
        if (responseURL.origin !== parsedURL.origin || responseURL.pathname !== fontManifestEntry.emittedUrlPath) {
          fontNetworkFailures.push(`Font response URL mismatch ${response.url()} for ${parsedURL.href}`);
          await route.abort('blockedbyclient');
          return;
        }
        if (actualHash !== fontManifestEntry.sha256) {
          fontNetworkFailures.push(
            `Font hash drift ${parsedURL.pathname}: expected ${fontManifestEntry.sha256}, got ${actualHash}`
          );
          await route.abort('blockedbyclient');
          return;
        }
        await route.fulfill({response, body});
        return;
      }
      await route.continue();
    });
    page.on('pageerror', (error) => {
      pageErrors.push(error.stack || error.message);
    });
    await installAISummaryRejectionCapture(page, (message) => unhandledRejectionRecords.push(message));
    try {
      await use(page);
      const unhandledRejections = await page
        .evaluate(
          () =>
            (window as unknown as {__AI_SUMMARY_UNHANDLED_REJECTIONS__?: string[]})
              .__AI_SUMMARY_UNHANDLED_REJECTIONS__ ?? []
        )
        .catch(() => []);
      expect(blockedNetworkRequests, `Non-local HTTP(S) requests: ${blockedNetworkRequests.join(', ')}`).toEqual([]);
      expect(fontNetworkFailures, `Font network failures: ${fontNetworkFailures.join(', ')}`).toEqual([]);
      expect([...pageErrors, ...unhandledRejectionRecords, ...unhandledRejections]).toEqual([]);
    } finally {
      await context.unroute('**/*').catch(() => undefined);
      aiSummaryRuntimeIssues.delete(page);
    }
  },
});

type VisualComparisonArtifact = {
  readonly sourceId: UXSourceId;
  readonly screenshotId: UXScreenshotId;
  readonly evidenceIdentity: AISummaryResolvedVisualEvidenceIdentity;
  readonly stateId: string;
  readonly caseRoot: string;
  readonly comparisonReport: {
    readonly diff_sha256: string;
    readonly pixel_diff_percent: number;
    readonly rendered_sha256: string;
    readonly target_sha256: string;
  };
  readonly sourceEntry: {
    readonly source_id: string;
    readonly reference: string;
    readonly root_node_id?: string;
    readonly pixel_perfect_target?: boolean;
  };
  readonly viewport: {
    readonly width: number;
    readonly height: number;
  };
};

type VisualPlanSourceEntry = {
  readonly source_id: string;
  readonly authority_source_id?: UXSourceId;
  readonly kind?: string;
  readonly screenshot_id?: UXScreenshotId;
  readonly state_id?: string;
  readonly variant_id?: string;
  readonly reference: string;
  readonly root_node_id?: string;
  readonly input_sha256?: string;
  readonly scene_graph_sha256?: string;
  readonly text_content_sha256?: string;
  readonly pixel_perfect_target?: boolean;
  readonly source_capture_required?: boolean;
};

type VisualPlan = {
  readonly phase: string;
  readonly plan_sha256: string;
  readonly evidence_generation_id: string;
  readonly product_sha256_at_prepare: string;
  readonly uxInputRoot: string;
  readonly render_directory: string;
  readonly receipt_schema_version?: number;
  readonly figma_acquisition_mode?: string;
  readonly source_identity_sha256: string;
  readonly source_manifest_sha256?: string;
  readonly figma_json_sources?: unknown[];
  readonly masks?: unknown[];
  readonly sources?: readonly VisualPlanSourceEntry[];
  readonly pixel_diff_max_percent?: number;
  readonly maximum_visual_iterations?: number;
  readonly iteration_handoff_path?: string;
};

type VisualEvidenceContext = {
  readonly targetRoot: string;
  readonly commonCheckoutRoot: string;
  readonly planPath: string;
  readonly phaseRenderRoot: string;
  readonly outputRoot: string;
  readonly renderAttemptId: string;
  readonly productSha256: string;
  readonly plan: VisualPlan;
};

type StructuralEvidenceArtifact = {
  readonly structuralCase: AISummaryStructuralCase;
  readonly caseRoot: string;
  readonly classification: Record<string, unknown>;
  readonly domPath: string;
  readonly accessibilityPath: string;
};

export type CaptureBounds = {x: number; y: number; width: number; height: number};

/** Browser observations, not a visual-fidelity verdict. Never scroll or restyle here. */
export const observeCaptureFraming = async (page: Page, bounds: CaptureBounds, requiredSelectors: string[]) =>
  page.evaluate(
    ({bounds, requiredSelectors}) => {
      const rect = (r: DOMRect) => ({x: r.x, y: r.y, width: r.width, height: r.height});
      const contains = (outer: typeof bounds, inner: typeof bounds) =>
        inner.width > 0 &&
        inner.height > 0 &&
        inner.x >= outer.x - 0.5 &&
        inner.y >= outer.y - 0.5 &&
        inner.x + inner.width <= outer.x + outer.width + 0.5 &&
        inner.y + inner.height <= outer.y + outer.height + 0.5;
      const viewport = {x: 0, y: 0, width: innerWidth, height: innerHeight};
      const observations = requiredSelectors.map((selector) => {
        const nodes = document.querySelectorAll(selector);
        const node = nodes.length === 1 ? nodes[0] : null;
        if (!node) return {selector, passed: false, reason: `expected one element, found ${nodes.length}`};
        const box = rect(node.getBoundingClientRect());
        const clippedBy: string[] = [];
        let visible = true;
        for (let ancestor: Element | null = node; ancestor; ancestor = ancestor.parentElement) {
          const style = getComputedStyle(ancestor);
          if (style.visibility !== 'visible' || style.display === 'none' || Number(style.opacity) === 0)
            visible = false;
          if (ancestor === node) continue;
          const outer = ancestor.getBoundingClientRect();
          const clipX = /auto|scroll|hidden|clip/.test(style.overflowX);
          const clipY = /auto|scroll|hidden|clip/.test(style.overflowY);
          if (
            (clipX && (box.x < outer.x - 0.5 || box.x + box.width > outer.right + 0.5)) ||
            (clipY && (box.y < outer.y - 0.5 || box.y + box.height > outer.bottom + 0.5))
          ) {
            clippedBy.push(`${ancestor.tagName}.${ancestor.className}`);
          }
        }
        return {
          selector,
          bounds: box,
          visible,
          clippedBy,
          passed: visible && contains(bounds, box) && contains(viewport, box) && clippedBy.length === 0,
        };
      });
      return {
        bounds,
        viewport,
        scroll: {x: scrollX, y: scrollY},
        observations,
        passed:
          requiredSelectors.length > 0 &&
          // Playwright's non-fullPage clip and DOM rectangles are viewport-relative.
          // A scrolled sample host is valid; clipped or drifting panel chrome is not.
          contains(viewport, bounds) &&
          observations.every((entry) => entry.passed),
      };
    },
    {bounds, requiredSelectors}
  );

const DEFAULT_WIDGET_SELECTION = {
  stationLogin: false,
  stationLoginProfile: false,
  userState: false,
  incomingTask: false,
  taskList: false,
  callControl: true,
  callControlCAD: false,
  outdialCall: false,
  realtimeTranscript: false,
  aiAssistant: true,
};

const stableStringify = (value: unknown): string => {
  if (Array.isArray(value)) {
    return `[${value.map((item) => stableStringify(item)).join(',')}]`;
  }
  if (value && typeof value === 'object') {
    return `{${Object.keys(value as Record<string, unknown>)
      .sort()
      .map((key) => `${JSON.stringify(key)}:${stableStringify((value as Record<string, unknown>)[key])}`)
      .join(',')}}`;
  }
  return JSON.stringify(value) ?? 'null';
};

const AI_SUMMARY_VISUAL_FONT_MANIFEST_HASH = sha256(stableStringify(AI_SUMMARY_VISUAL_FONT_MANIFEST));

const ensureDir = (dir: string): void => {
  fs.mkdirSync(dir, {recursive: true});
};

const writeJsonAtomic = (filePath: string, value: unknown): void => {
  ensureDir(path.dirname(filePath));
  const tempPath = `${filePath}.${process.pid}.${Date.now()}.tmp`;
  fs.writeFileSync(tempPath, `${JSON.stringify(value, null, 2)}\n`);
  fs.renameSync(tempPath, filePath);
};

const withRecordSha256 = <T extends Record<string, unknown>>(record: T): T & {readonly record_sha256: string} => {
  const hashable: Record<string, unknown> = {...record};
  delete hashable.record_sha256;
  return {
    ...record,
    record_sha256: sha256(stableStringify(hashable)),
  };
};

const getRepositoryRoot = (): string => TARGET_WORKTREE_ROOT;

const toCommonCheckoutRelativePath = (absolutePath: string): string => {
  const relative = path.relative(COMMON_CHECKOUT_ROOT, absolutePath).split(path.sep).join('/');
  if (!relative || relative.startsWith('../') || path.isAbsolute(relative)) {
    throw new Error(`Generated evidence path escapes common checkout root: ${absolutePath}`);
  }
  return relative;
};

const readPngDimensions = (filePath: string): {width: number; height: number} => {
  const bytes = fs.readFileSync(filePath);
  if (
    bytes.length < 24 ||
    bytes.readUInt32BE(0) !== 0x89504e47 ||
    bytes.readUInt32BE(4) !== 0x0d0a1a0a ||
    bytes.toString('ascii', 12, 16) !== 'IHDR'
  ) {
    throw new Error(`Not a PNG file: ${filePath}`);
  }
  return {
    width: bytes.readUInt32BE(16),
    height: bytes.readUInt32BE(20),
  };
};

const getRequiredMBFlowBin = (): string => {
  const mbFlowBin = process.env.MB_FLOW_BIN;
  if (!mbFlowBin || !path.isAbsolute(mbFlowBin)) {
    throw new Error('MB_FLOW_BIN must be an absolute executable path for AI Summary UX evidence');
  }
  fs.accessSync(mbFlowBin, fs.constants.X_OK);
  return mbFlowBin;
};

const resolvePlanPath = (root: string, value: string): string =>
  path.isAbsolute(value) ? path.resolve(value) : path.resolve(root, value);

let cachedVisualPlan: VisualPlan | undefined;
const readVisualPlan = (): VisualPlan => {
  if (cachedVisualPlan) {
    return cachedVisualPlan;
  }
  if (!fs.existsSync(VISUAL_PLAN_PATH)) {
    throw new Error(`Missing UX visual-comparison plan: ${VISUAL_PLAN_PATH}`);
  }
  const plan = JSON.parse(fs.readFileSync(VISUAL_PLAN_PATH, 'utf8')) as VisualPlan;
  if (plan.phase !== UX_PHASE) {
    throw new Error(`UX visual-comparison plan phase ${plan.phase} does not match ${UX_PHASE}`);
  }
  if (!SHA256_PATTERN.test(plan.plan_sha256) || !SHA256_PATTERN.test(plan.evidence_generation_id)) {
    throw new Error(`UX visual-comparison plan has invalid hash identity: ${VISUAL_PLAN_PATH}`);
  }
  const plannedInputRoot = fs.realpathSync(resolvePlanPath(COMMON_CHECKOUT_ROOT, plan.uxInputRoot));
  const targetRoot = fs.realpathSync(TARGET_WORKTREE_ROOT);
  if (plannedInputRoot !== targetRoot) {
    throw new Error(
      `UX visual-comparison plan uxInputRoot ${plannedInputRoot} does not match target worktree ${targetRoot}`
    );
  }
  const plannedRenderRoot = resolvePlanPath(COMMON_CHECKOUT_ROOT, plan.render_directory);
  if (plannedRenderRoot !== PHASE_RENDER_ROOT) {
    throw new Error(
      `UX visual-comparison plan render_directory ${plannedRenderRoot} does not match ${PHASE_RENDER_ROOT}`
    );
  }
  cachedVisualPlan = plan;
  return plan;
};

const getTextNodeIds = (sourceId: UXSourceId): string[] => {
  const sceneReceipt = getUXReceiptFile(sourceId, 'sceneGraph');
  const scene = JSON.parse(fs.readFileSync(sceneReceipt.absolutePath, 'utf8'));
  const nodes = Array.isArray(scene.nodes) ? scene.nodes : [];
  return nodes
    .filter((node: {type?: string; id?: string}) => node.type === 'TEXT' && typeof node.id === 'string')
    .map((node: {id: string}) => node.id)
    .slice(0, 12);
};

const getReceipt = () => {
  const receiptPath = path.join(getRepositoryRoot(), 'design/default/sdk_package_lock.json');
  return JSON.parse(fs.readFileSync(receiptPath, 'utf8'));
};

const getUXReceiptFile = (sourceId: UXSourceId, kind: 'sceneGraph' | 'textContent' | 'screenshot') => {
  const receipt = getReceipt();
  const entry = receipt.ux?.files?.find((file) => file.sourceId === sourceId && file.kind === kind);
  if (!entry) {
    throw new Error(`Missing sealed UX receipt entry for ${sourceId}/${kind}`);
  }
  const absolutePath = path.resolve(getRepositoryRoot(), entry.path);
  if (!absolutePath.startsWith(`${path.resolve(getRepositoryRoot())}${path.sep}`)) {
    throw new Error(`Sealed UX path escapes repository root: ${entry.path}`);
  }
  const bytes = fs.readFileSync(absolutePath);
  const actualHash = sha256(bytes);
  if (actualHash !== entry.sha256) {
    throw new Error(`Sealed UX hash drift for ${entry.path}`);
  }
  return {...entry, absolutePath, actualHash};
};

const actionFromStateId = (stateId: string): string => stateId.split(':').at(-1) ?? '';

type AISummaryBridgeSettlementQueue = 'midCall' | 'postCall' | 'midCallResponse' | 'postCallResponse' | 'clipboard';

type AISummaryBridgeSettlement =
  | {readonly type: 'resolve'; readonly payload?: unknown}
  | {readonly type: 'reject'; readonly reason?: unknown}
  | {readonly type: 'pending'}
  | {readonly type: 'deferred'; readonly id: string};

type AISummaryBridgeScenarioReplay = {
  readonly scenario: AISummaryBrowserScenario;
  readonly outcome?: 'resolve' | 'reject';
};

const AI_SUMMARY_SOURCE_WRAPUP_CODES = [
  {id: 'aux-code-account-freeze-unfreeze', name: 'Account freeze/unfreeze', isSystem: false, isDefault: false},
  {id: 'aux-code-account-information-update', name: 'Account information update', isSystem: false, isDefault: false},
  {id: 'aux-code-business-account-inquiry', name: 'Business account inquiry', isSystem: false, isDefault: false},
  {id: 'aux-code-commercial-card-services', name: 'Commercial card services', isSystem: false, isDefault: false},
  {id: 'aux-code-card-replacement-request', name: 'Card replacement request', isSystem: false, isDefault: false},
  {id: 'aux-code-credit-limit-inquiry', name: 'Credit limit inquiry', isSystem: false, isDefault: false},
  {id: 'aux-code-credit-card-activation', name: 'Credit card activation', isSystem: false, isDefault: false},
  {id: 'aux-code-credit-card-application', name: 'Credit card application', isSystem: false, isDefault: false},
  {id: 'aux-code-credit-card-cancellation', name: 'Credit card cancellation', isSystem: false, isDefault: false},
  {id: 'aux-code-debit-card-application', name: 'Debit card application', isSystem: false, isDefault: false},
] as const;

const AI_SUMMARY_SOURCE_WRAPUP_REASON = AI_SUMMARY_SOURCE_WRAPUP_CODES[0].name;

type AISummarySDKMockOptions = {
  readonly scenarios?: Partial<Record<AISummaryBridgeSettlementQueue, AISummaryBridgeScenarioReplay>>;
  readonly visualInventory?: boolean;
};

type AISummaryRuntimePrivacyRecord = {
  readonly api: string;
  readonly method: string;
};

export type AISummaryE2EWebexConstructorProbe = {
  readonly version: 1;
  readonly packageEntry: '@webex/contact-center';
  readonly constructorVersion?: string;
  readonly hasAuthorization: boolean;
  readonly hasCc: boolean;
  readonly hasSameInstanceAuthorizationAndCc: boolean;
  readonly errorName?: string;
};

export type AISummaryStatusDiagnostics = {
  readonly statusDetails?: readonly AISummaryStatusDetail[];
  readonly statusCallbackThrowCount?: number;
  readonly statusAttributeCallbackCalls?: {
    readonly dashed: number;
    readonly undashed: number;
  };
  readonly webexConstructorProbe?: AISummaryE2EWebexConstructorProbe;
};

export type AISummaryHostPrivacySnapshot = {
  readonly url: string;
  readonly cookie: string;
  readonly localStorage: readonly [string, string | null][];
  readonly sessionStorage: readonly [string, string | null][];
};

export type AISummaryRuntimePrivacyAudit = {
  readonly records: readonly AISummaryRuntimePrivacyRecord[];
};

const createAISummaryBridgeSettlements = (
  scenarios: AISummarySDKMockOptions['scenarios'] = {}
): Partial<Record<AISummaryBridgeSettlementQueue, AISummaryBridgeSettlement[]>> => {
  const settlements: Partial<Record<AISummaryBridgeSettlementQueue, AISummaryBridgeSettlement[]>> = {};
  for (const [queue, replay] of Object.entries(scenarios) as [
    AISummaryBridgeSettlementQueue,
    AISummaryBridgeScenarioReplay,
  ][]) {
    const outcome = replay.outcome ?? 'resolve';
    settlements[queue] = replay.scenario.flatMap((selection) =>
      scenarioPayloadsForQueue(getAISummaryScenarioPayload(selection), outcome).map((payload) =>
        outcome === 'resolve' ? {type: 'resolve', payload} : {type: 'reject', reason: payload}
      )
    );
  }
  return settlements;
};

export const installAISummarySDKMock = async (page: Page, options: AISummarySDKMockOptions = {}): Promise<void> => {
  const initialSettlements = createAISummaryBridgeSettlements(options.scenarios);
  const sourceWrapupCodes = options.visualInventory ? AI_SUMMARY_SOURCE_WRAPUP_CODES : null;
  await page.addInitScript(
    ({selectedWidgets, fixtures, initialSettlements, sourceWrapupCodes}) => {
      window.localStorage.setItem('selectedWidgets', JSON.stringify(selectedWidgets));
      window.localStorage.setItem('currentTheme', 'LIGHT');

      const listeners = new Map();
      const taskListeners = new Map();
      const aiSummaryStatusStates = {
        'mid-call': new Set(['available', 'unavailable']),
        'post-call': new Set(['available', 'unavailable', 'submitted', 'response-failed']),
      };
      const normalizeStatusDetail = (detail) => {
        if (!detail || typeof detail !== 'object') {
          throw new Error('AI Summary status detail must be an object');
        }
        const candidate = detail;
        const kind = candidate.kind;
        const state = candidate.state;
        const allowedStates = aiSummaryStatusStates[kind];
        if (
          !allowedStates ||
          !allowedStates.has(state) ||
          Object.keys(candidate).some((key) => !['kind', 'state'].includes(key))
        ) {
          throw new Error('AI Summary status detail failed the browser allowlist');
        }
        return {kind, state};
      };
      const normalizeWebexConstructorProbe = (probe) => {
        if (!probe || typeof probe !== 'object') {
          throw new Error('Webex constructor probe must be an object');
        }
        if (probe.version !== 1 || probe.packageEntry !== '@webex/contact-center') {
          throw new Error('Webex constructor probe came from an unexpected package entry');
        }
        return {
          version: 1,
          packageEntry: '@webex/contact-center',
          constructorVersion: typeof probe.constructorVersion === 'string' ? probe.constructorVersion : undefined,
          hasAuthorization: probe.hasAuthorization === true,
          hasCc: probe.hasCc === true,
          hasSameInstanceAuthorizationAndCc: probe.hasSameInstanceAuthorizationAndCc === true,
          errorName: typeof probe.errorName === 'string' ? probe.errorName : undefined,
        };
      };
      const diagnostics = {
        version: 1,
        initializedThroughHostWebex: false,
        webexInitFallbackUsed: false,
        requestCounts: {midCall: 0, postCall: 0, postCallResponse: 0, midCallResponse: 0},
        telephonyCalls: {consult: 0, transfer: 0, wrapup: 0},
        clipboardWrites: 0,
        statusDetails: [],
        statusCallbackThrowCount: 0,
        statusCallbackShouldThrow: false,
        statusAttributeCallbackCalls: {dashed: 0, undashed: 0},
        responseStatus: [],
        lastPostCallResponse: undefined,
        webexConstructorProbe: undefined,
      };
      const settlementQueues = {
        midCall: [...(initialSettlements.midCall ?? [])],
        postCall: [...(initialSettlements.postCall ?? [])],
        midCallResponse: [...(initialSettlements.midCallResponse ?? [])],
        postCallResponse: [...(initialSettlements.postCallResponse ?? [])],
        clipboard: [...(initialSettlements.clipboard ?? [])],
      };
      const deferredSettlements = new Map();
      const recordClipboardWrite = (text: string) => {
        diagnostics.clipboardWrites += 1;
        const win = window as unknown as {__AI_SUMMARY_CLIPBOARD_WRITES__?: string[]};
        win.__AI_SUMMARY_CLIPBOARD_WRITES__ = [...(win.__AI_SUMMARY_CLIPBOARD_WRITES__ ?? []), text];
      };
      const createDeferredSettlementPromise = (settlement) =>
        new Promise((resolve, reject) => {
          deferredSettlements.set(settlement.id, {resolve, reject});
        });
      Object.defineProperty(navigator, 'clipboard', {
        configurable: true,
        value: {
          writeText: (text: string) => {
            const settlement = settlementQueues.clipboard.shift() || {type: 'resolve'};
            if (settlement.type === 'pending') {
              return new Promise(() => undefined);
            }
            if (settlement.type === 'deferred') {
              return createDeferredSettlementPromise(settlement).then((payload) => {
                recordClipboardWrite(text);
                return payload;
              });
            }
            if (settlement.type === 'reject') {
              return Promise.reject(settlement.reason || new Error('clipboard rejected'));
            }
            recordClipboardWrite(text);
            return Promise.resolve(settlement.payload);
          },
        },
      });

      const fallbackPayload = {
        midCall: fixtures.initiatingMidCall.typedSections,
        postCall: fixtures.postCall.structured,
        midCallResponse: undefined,
        postCallResponse: undefined,
      };

      const createSettlementPromise = (queueName, fallback) => {
        const settlement = settlementQueues[queueName].shift() || {type: 'resolve', payload: fallback};
        const withSDKDeadline = (promise: Promise<unknown>): Promise<unknown> => {
          if (queueName !== 'midCall' && queueName !== 'postCall') return promise;
          // The installed SDK owns this deadline. Emulate that behavior only at
          // the SDK boundary; production widget code must not create a timer.
          let timer: ReturnType<typeof setTimeout>;
          const timeout = new Promise<never>((_resolve, reject) => {
            timer = setTimeout(() => reject(fixtures.errors.timeout), 15000);
          });
          return Promise.race([promise, timeout]).finally(() => clearTimeout(timer));
        };
        if (settlement.type === 'pending') {
          return withSDKDeadline(new Promise(() => undefined));
        }
        if (settlement.type === 'deferred') {
          return withSDKDeadline(
            new Promise((resolve, reject) => {
              deferredSettlements.set(settlement.id, {resolve, reject});
            })
          );
        }
        if (settlement.type === 'reject') {
          return Promise.reject(settlement.reason || {message: `${queueName} rejected`});
        }
        return Promise.resolve('payload' in settlement ? settlement.payload : fallback);
      };

      const on = (store, event, callback) => {
        const current = store.get(event) || [];
        current.push(callback);
        store.set(event, current);
      };
      const off = (store, event, callback) => {
        if (!callback) {
          store.delete(event);
          return;
        }
        store.set(
          event,
          (store.get(event) || []).filter((candidate) => candidate !== callback)
        );
      };
      const emit = (store, event, payload) => {
        for (const callback of store.get(event) || []) {
          callback(payload);
        }
      };

      const enabledControl = {isVisible: true, isEnabled: true};
      const hiddenControl = {isVisible: false, isEnabled: false};
      const controlsForPhase = (phase) => ({
        activeLeg: 'main',
        main:
          phase === 'wrapup'
            ? {
                accept: hiddenControl,
                decline: hiddenControl,
                hold: hiddenControl,
                transfer: hiddenControl,
                consult: hiddenControl,
                end: hiddenControl,
                mute: hiddenControl,
                recording: hiddenControl,
                wrapup: enabledControl,
                conference: hiddenControl,
                exitConference: hiddenControl,
                mergeToConference: hiddenControl,
                consultTransfer: hiddenControl,
                transferConference: hiddenControl,
                endConsult: hiddenControl,
                switch: hiddenControl,
              }
            : {
                accept: hiddenControl,
                decline: hiddenControl,
                hold: enabledControl,
                transfer: enabledControl,
                consult: enabledControl,
                end: enabledControl,
                mute: enabledControl,
                recording: enabledControl,
                wrapup: hiddenControl,
                conference: hiddenControl,
                exitConference: hiddenControl,
                mergeToConference: hiddenControl,
                consultTransfer: hiddenControl,
                transferConference: hiddenControl,
                endConsult: hiddenControl,
                switch: hiddenControl,
              },
        consult: {
          accept: hiddenControl,
          decline: hiddenControl,
          hold: hiddenControl,
          transfer: hiddenControl,
          consult: hiddenControl,
          end: hiddenControl,
          mute: hiddenControl,
          recording: hiddenControl,
          wrapup: hiddenControl,
          conference: hiddenControl,
          exitConference: hiddenControl,
          mergeToConference: hiddenControl,
          consultTransfer: hiddenControl,
          transferConference: hiddenControl,
          endConsult: hiddenControl,
          switch: hiddenControl,
        },
        consultTransferDestinations: {
          consult: ['agent', 'queue', 'dialNumber', 'entryPoint'],
          transfer: ['agent', 'queue', 'dialNumber', 'entryPoint'],
        },
      });

      const createTask = () => {
        const task = {
          data: {
            interactionId: 'interaction-main-1',
            agentId: 'agent-a',
            owner: 'agent-a',
            channelType: 'telephony',
            mediaResourceId: 'interaction-main-1',
            interaction: {
              mediaType: 'telephony',
              state: 'connected',
              owner: 'agent-a',
              mainInteractionId: 'interaction-main-1',
              interactionId: 'leg-main-1',
              media: {
                'interaction-main-1': {
                  mType: 'mainCall',
                  mediaResourceId: 'interaction-main-1',
                  isHold: false,
                  participants: ['agent-a', 'customer-1'],
                },
              },
              participants: {
                'agent-a': {id: 'agent-a', name: 'Agent A', pType: 'Agent', hasJoined: true, hasLeft: false},
                'customer-1': {
                  id: 'customer-1',
                  name: 'Customer',
                  pType: 'Customer',
                  hasJoined: true,
                  hasLeft: false,
                },
              },
            },
            isConferenceInProgress: false,
            wrapUpRequired: false,
          },
          uiControls: controlsForPhase('connected'),
          aiSummaryCapabilities: {
            midCallEnabled: new URLSearchParams(window.location.search).get('mock-mid-call-enabled') !== 'false',
            postCallEnabled: new URLSearchParams(window.location.search).get('mock-post-call-enabled') !== 'false',
          },
          on: (event, callback) => on(taskListeners, event, callback),
          off: (event, callback) => off(taskListeners, event, callback),
          emit: (event, payload) => emit(taskListeners, event, payload),
          hold: () => Promise.resolve({}),
          resume: () => Promise.resolve({}),
          end: () => Promise.resolve({}),
          wrapup: () => {
            diagnostics.telephonyCalls.wrapup += 1;
            return Promise.resolve({});
          },
          pauseRecording: () => Promise.resolve({}),
          resumeRecording: () => Promise.resolve({}),
          toggleMute: () => Promise.resolve({}),
          consult: () => {
            diagnostics.telephonyCalls.consult += 1;
            return Promise.resolve({});
          },
          transfer: () => {
            diagnostics.telephonyCalls.transfer += 1;
            return Promise.resolve({});
          },
          consultTransfer: () => Promise.resolve({}),
          consultConference: () => Promise.resolve({}),
          transferConference: () => Promise.resolve({}),
          endConsult: () => Promise.resolve({}),
          requestMidCallSummary: (actionType) => {
            diagnostics.requestCounts.midCall += 1;
            const fallback = {
              ...fallbackPayload.midCall,
              timestamp: Date.now(),
              sections: {
                ...fallbackPayload.midCall.sections,
                reasonForTransferOrConsult:
                  actionType === 'TRANSFER' ? 'Customer needs a transfer.' : 'Customer needs billing help.',
              },
            };
            return createSettlementPromise('midCall', fallback);
          },
          sendMidCallSummaryResponse: (response, actionType) => {
            diagnostics.requestCounts.midCallResponse += 1;
            diagnostics.responseStatus.push({kind: 'midCall', actionType, response});
            return createSettlementPromise('midCallResponse', undefined);
          },
          requestPostCallSummary: () => {
            diagnostics.requestCounts.postCall += 1;
            return createSettlementPromise('postCall', {...fallbackPayload.postCall, timestamp: Date.now()});
          },
          sendPostCallSummaryResponse: (response) => {
            diagnostics.requestCounts.postCallResponse += 1;
            diagnostics.lastPostCallResponse = response;
            diagnostics.responseStatus.push({kind: 'postCall', response});
            return createSettlementPromise('postCallResponse', undefined);
          },
        };
        return task;
      };

      const task = createTask();
      const tasks = {'interaction-main-1': task};
      const activeWrapupCodes =
        Array.isArray(sourceWrapupCodes) && sourceWrapupCodes.length > 0
          ? sourceWrapupCodes
          : [
              {id: 'aux-code-billing-follow-up', name: 'Billing follow-up', isSystem: false, isDefault: false},
              {id: 'aux-code-resolved', name: 'Resolved', isSystem: false, isDefault: false},
            ];
      const profile = {
        teams: [{teamId: 'team-1', teamName: 'Team 1'}],
        defaultDn: '1000',
        dn: '1000',
        forceDefaultDn: false,
        forceDefaultDnForAgent: false,
        regexUS: '',
        regexOther: '',
        agentId: 'agent-a',
        agentName: 'Agent A',
        agentMailId: 'agent@example.com',
        agentProfileID: 'profile-1',
        dialPlan: {type: 'adhocDial', dialPlanEntity: []},
        multimediaProfileId: 'mm-1',
        skillProfileId: 'skill-1',
        siteId: 'site-1',
        enterpriseId: 'enterprise-1',
        privacyShieldVisible: false,
        idleCodes: [{id: '0', name: 'Available', isSystem: true, isDefault: true}],
        idleCodesList: [],
        idleCodesAccess: 'ALL',
        wrapupCodes: activeWrapupCodes,
        defaultWrapupCode: activeWrapupCodes[0].id,
        wrapUpData: {wrapUpProps: {autoWrapup: false, autoWrapupInterval: 0, wrapUpReasonList: []}},
        orgId: 'org-1',
        isOutboundEnabledForTenant: false,
        isOutboundEnabledForAgent: false,
        isAdhocDialingEnabled: true,
        isAgentAvailableAfterOutdial: false,
        isCampaignManagementEnabled: false,
        outDialEp: '',
        isEndTaskEnabled: true,
        isEndConsultEnabled: true,
        agentDbId: 'agent-db-1',
        allowConsultToQueue: true,
        agentPersonalStatsEnabled: false,
        isTimeoutDesktopInactivityEnabled: false,
        timeoutDesktopInactivityMins: 30,
        loginVoiceOptions: ['BROWSER'],
        deviceType: 'BROWSER',
        currentTeamId: 'team-1',
        webRtcEnabled: true,
        lostConnectionRecoveryTimeout: 30000,
        maskSensitiveData: false,
        isAgentLoggedIn: true,
        lastStateAuxCodeId: '0',
        lastStateChangeTimestamp: Date.now(),
        lastIdleCodeChangeTimestamp: Date.now(),
      };

      const cc = {
        LoggerProxy: {
          log: () => undefined,
          info: () => undefined,
          warn: () => undefined,
          error: () => undefined,
          trace: () => undefined,
        },
        on: (event, callback) => on(listeners, event, callback),
        off: (event, callback) => off(listeners, event, callback),
        emit: (event, payload) => emit(listeners, event, payload),
        register: () => {
          diagnostics.initializedThroughHostWebex = true;
          tasks['interaction-main-1'] = task;
          setTimeout(() => {
            emit(listeners, 'agent:stationLoginSuccess', profile);
            emit(listeners, 'agent:dnRegistered', profile);
            emit(listeners, 'task:hydrate', task);
          }, 0);
          return Promise.resolve(profile);
        },
        deregister: () => Promise.resolve(),
        stationLogin: () => Promise.resolve({}),
        stationLogout: () => {
          delete tasks['interaction-main-1'];
          cc.emit('agent:logoutSuccess', {});
          return Promise.resolve({data: {}});
        },
        setAgentState: () => Promise.resolve({data: {auxCodeId: '0'}}),
        getBuddyAgents: () =>
          Promise.resolve({
            data: {
              agentList: [
                {
                  agentId: 'billing-agent',
                  agentName: 'Billing Agent',
                  state: 'Available',
                  teamId: 'team-1',
                  siteId: 'site-1',
                  dn: '1001',
                },
                {
                  agentId: 'support-agent',
                  agentName: 'Support Agent',
                  state: 'Available',
                  teamId: 'team-1',
                  siteId: 'site-1',
                  dn: '1002',
                },
                {
                  agentId: 'accounts-agent',
                  agentName: 'Accounts Agent',
                  state: 'Available',
                  teamId: 'team-1',
                  siteId: 'site-1',
                  dn: '1003',
                },
                {
                  agentId: 'webex-agent',
                  agentName: 'Webex Agent',
                  state: 'Available',
                  teamId: 'team-1',
                  siteId: 'site-1',
                  dn: '1004',
                },
                {
                  agentId: 'card-services-agent',
                  agentName: 'Card Services Agent',
                  state: 'Available',
                  teamId: 'team-1',
                  siteId: 'site-1',
                  dn: '1005',
                },
                {
                  agentId: 'retention-agent',
                  agentName: 'Retention Agent',
                  state: 'Available',
                  teamId: 'team-1',
                  siteId: 'site-1',
                  dn: '1006',
                },
                {
                  agentId: 'activation-agent',
                  agentName: 'Activation Agent',
                  state: 'Available',
                  teamId: 'team-1',
                  siteId: 'site-1',
                  dn: '1007',
                },
                {
                  agentId: 'fraud-agent',
                  agentName: 'Fraud Agent',
                  state: 'Available',
                  teamId: 'team-1',
                  siteId: 'site-1',
                  dn: '1008',
                },
              ],
            },
            meta: {page: 0, pageSize: 25, totalPages: 1},
          }),
        getQueues: () =>
          Promise.resolve({
            data: [{id: 'billing-queue', name: 'Billing Queue'}],
            meta: {page: 0, pageSize: 25, totalPages: 1},
          }),
        getEntryPoints: () =>
          Promise.resolve({
            data: [{id: 'billing-entry', name: 'Billing Entry', type: 'Voice', isActive: true}],
            meta: {page: 0, pageSize: 25, totalPages: 1},
          }),
        addressBook: {
          getEntries: () =>
            Promise.resolve({
              data: [{id: 'dial-1', name: 'Billing Line', number: '18005550100'}],
              meta: {page: 0, pageSize: 25, totalPages: 1},
            }),
        },
        taskManager: {getAllTasks: () => tasks},
        getAccessToken: () => Promise.resolve('ai-summary-e2e-token'),
        userPreference: {getUserPreference: () => Promise.resolve({preferences: {}})},
        webex: {internal: {newMetrics: {submitBehavioralEvent: () => undefined}}},
      };

      const bridge = {
        version: 1,
        webex: {
          cc,
          authorization: {initiateLogin: () => undefined},
          logger: cc.LoggerProxy,
          config: {cc: {enableWxBetterTogether: false}},
          once: (event, callback) => {
            if (event === 'ready') {
              setTimeout(callback, 0);
            }
          },
        },
        diagnostics,
        task,
        emitTask: (event, payload) => task.emit(event, payload),
        emitCC: (event, payload) => cc.emit(event, payload),
        setTaskPhase: (phase) => {
          task.uiControls = controlsForPhase(phase);
          task.data.interaction.state = phase === 'wrapup' ? 'wrapup' : 'connected';
          task.emit('task:ui-controls-updated', task.uiControls);
        },
        setOwner: async (agentId: string) => {
          await cc.stationLogout();
          profile.agentId = agentId;
          task.data.agentId = agentId;
          task.data.interaction.owner = agentId;
          for (const participant of Object.values(task.data.interaction.participants)) {
            if (participant.pType === 'Agent') participant.hasLeft = true;
          }
          task.data.interaction.participants[agentId] = {
            id: agentId,
            name: 'Synthetic agent',
            pType: 'Agent',
            hasJoined: true,
            hasLeft: false,
          };
          task.data.interaction.media['interaction-main-1'].participants = [agentId, 'customer-1'];
          const registerAgent = window.__WEBEX_CC_AI_SUMMARY_E2E__?.registerAgent;
          if (!registerAgent) throw new Error('Sample registration callback is not installed');
          await registerAgent();
          cc.emit('task:merged', task);
        },
        setCapabilities: ({midCallEnabled, postCallEnabled, actionTimestamp}) => {
          task.aiSummaryCapabilities = {midCallEnabled, postCallEnabled};
          task.emit('task:featureEnablement', {
            interactionId: task.data.interactionId,
            midCallEnabled,
            postCallEnabled,
            actionTimestamp: actionTimestamp ?? Date.now(),
          });
        },
        enqueueSettlement: (queue, settlement) => {
          settlementQueues[queue].push(settlement);
        },
        resolveDeferred: (id, payload) => {
          const deferred = deferredSettlements.get(id);
          if (!deferred) {
            throw new Error(`Unknown AI Summary deferred settlement: ${id}`);
          }
          deferredSettlements.delete(id);
          deferred.resolve(payload);
        },
        rejectDeferred: (id, reason) => {
          const deferred = deferredSettlements.get(id);
          if (!deferred) {
            throw new Error(`Unknown AI Summary deferred settlement: ${id}`);
          }
          deferredSettlements.delete(id);
          deferred.reject(reason);
        },
        mutateTask: (mutation) => {
          if (mutation === 'hold') {
            task.data.interaction.media['interaction-main-1'].isHold = true;
            task.emit('task:hold', task);
            return;
          }
          if (mutation === 'resume') {
            task.data.interaction.media['interaction-main-1'].isHold = false;
            task.emit('task:resume', task);
            return;
          }
          if (mutation === 'transfer-owner') {
            task.data.interaction.owner = 'agent-b';
            task.data.interaction.participants['agent-b'] = {
              id: 'agent-b',
              name: 'Agent B',
              pType: 'Agent',
              hasJoined: true,
              hasLeft: false,
            };
            task.data.interaction.media['interaction-main-1'].participants = ['agent-b', 'customer-1'];
            cc.emit('task:merged', task);
            return;
          }
          if (mutation === 'conference-start') {
            task.data.isConferenceInProgress = true;
            task.data.interaction.owner = 'agent-a';
            task.data.interaction.participants['agent-b'] = {
              id: 'agent-b',
              name: 'Agent B',
              pType: 'Agent',
              hasJoined: true,
              hasLeft: false,
            };
            task.data.interaction.media['interaction-main-1'].participants = ['agent-a', 'agent-b', 'customer-1'];
            task.emit('task:conferenceStarted', task);
            return;
          }
          if (mutation === 'wrapped-up') {
            task.emit('task:wrappedup', task);
          }
        },
        recordAISummaryStatusDetail: (detail) => {
          diagnostics.statusDetails.push(normalizeStatusDetail(detail));
          if (diagnostics.statusCallbackShouldThrow) {
            diagnostics.statusCallbackThrowCount += 1;
            throw new Error('AI Summary status callback isolation probe');
          }
        },
        setStatusCallbackThrows: (shouldThrow) => {
          diagnostics.statusCallbackShouldThrow = shouldThrow === true;
        },
        recordWebexConstructorProbe: (probe) => {
          diagnostics.webexConstructorProbe = normalizeWebexConstructorProbe(probe);
        },
        recordStatusAttributeCallback: (attribute) => {
          if (attribute === 'dashed' || attribute === 'undashed') {
            diagnostics.statusAttributeCallbackCalls[attribute] += 1;
          }
        },
        getDiagnostics: () => JSON.parse(JSON.stringify(diagnostics)),
      };

      Object.defineProperty(window, '__WEBEX_CC_AI_SUMMARY_E2E__', {
        configurable: true,
        value: bridge,
      });
    },
    {
      selectedWidgets: DEFAULT_WIDGET_SELECTION,
      fixtures: aiSummaryBrowserFixtures,
      initialSettlements,
      sourceWrapupCodes,
    }
  );
};

export const getAISummaryBridgeDiagnostics = async (page: Page) =>
  page.evaluate(() => {
    const bridge = (window as unknown as {__WEBEX_CC_AI_SUMMARY_E2E__?: {getDiagnostics?: () => unknown}})
      .__WEBEX_CC_AI_SUMMARY_E2E__;
    return bridge?.getDiagnostics?.();
  });

export const observeAISummaryStore = async (page: Page): Promise<AISummaryStoreObservation> =>
  page.evaluate(() => {
    const read = window.__WEBEX_CC_AI_SUMMARY_E2E__?.readSummaryState;
    if (!read) throw new Error('AI Summary store observer is not installed');
    return read();
  });

export const replayAISummaryOwnershipHop = async (page: Page, hopIndex: 0 | 1): Promise<void> => {
  const selection = AI_SUMMARY_OWNERSHIP_CHANGE_SCENARIO[0];
  const hop = aiSummaryFixtures[selection.group][selection.member].hops[hopIndex];
  await enqueueAISummaryBridgeSettlement(page, 'midCall', {type: 'deferred', id: `owner-hop-${hopIndex}`});
  await page.evaluate(
    ({hop}) => {
      const bridge = window.__WEBEX_CC_AI_SUMMARY_E2E__;
      if (!bridge?.setOwner) throw new Error('AI Summary ownership bridge is not installed');
      return bridge.setOwner(hop.toAgentId);
    },
    {hop}
  );
  await expect(page.getByTestId('call-control-container')).toBeVisible();
  await page.getByTestId('call-control:consult').click();
  await expect(page.getByTestId('ai-summary:generating')).toBeVisible();
};

export const setAISummaryStatusCallbackThrows = async (page: Page, shouldThrow: boolean): Promise<void> => {
  await page.evaluate((nextShouldThrow) => {
    const bridge = (
      window as unknown as {
        __WEBEX_CC_AI_SUMMARY_E2E__?: {setStatusCallbackThrows?: (value: boolean) => void};
      }
    ).__WEBEX_CC_AI_SUMMARY_E2E__;
    if (!bridge?.setStatusCallbackThrows) {
      throw new Error('AI Summary E2E bridge is not installed');
    }
    bridge.setStatusCallbackThrows(nextShouldThrow);
  }, shouldThrow);
};

export const installAISummaryStatusAttributeCallbacks = async (page: Page): Promise<void> => {
  await page.evaluate(() => {
    const win = window as unknown as {
      __WEBEX_CC_AI_SUMMARY_E2E__?: {recordStatusAttributeCallback?: (attribute: 'dashed' | 'undashed') => void};
      __aiSummaryDashedStatusAttribute?: () => void;
      __aiSummaryUndashedStatusAttribute?: () => void;
    };
    if (!win.__WEBEX_CC_AI_SUMMARY_E2E__?.recordStatusAttributeCallback) {
      throw new Error('AI Summary E2E bridge is not installed');
    }
    win.__aiSummaryDashedStatusAttribute = () => {
      win.__WEBEX_CC_AI_SUMMARY_E2E__?.recordStatusAttributeCallback?.('dashed');
    };
    win.__aiSummaryUndashedStatusAttribute = () => {
      win.__WEBEX_CC_AI_SUMMARY_E2E__?.recordStatusAttributeCallback?.('undashed');
    };
    const element = document.querySelector('widget-cc-call-control');
    if (!element) {
      throw new Error('AI Summary public CallControl element is not mounted');
    }
    element.setAttribute('on-aisummary-status-change', '__aiSummaryDashedStatusAttribute');
    element.setAttribute('onaisummarystatuschange', '__aiSummaryUndashedStatusAttribute');
  });
};

export const snapshotAISummaryHostPrivacyState = async (page: Page): Promise<AISummaryHostPrivacySnapshot> =>
  page.evaluate(() => {
    const storageEntries = (storage: Storage): [string, string | null][] =>
      Array.from({length: storage.length}, (_value, index) => storage.key(index))
        .filter((key): key is string => key !== null)
        .sort()
        .map((key) => [key, storage.getItem(key)]);

    return {
      url: window.location.href,
      cookie: document.cookie,
      localStorage: storageEntries(window.localStorage),
      sessionStorage: storageEntries(window.sessionStorage),
    };
  });

export const installAISummaryRuntimePrivacySpies = async (
  page: Page,
  expectedSessionCleanupKeys: readonly string[] = []
): Promise<void> =>
  page.evaluate(
    ({expectedSessionCleanupKeys}) => {
      const win = window as unknown as {
        __AI_SUMMARY_RUNTIME_PRIVACY__?: {records: AISummaryRuntimePrivacyRecord[]};
      };
      const audit = {records: [] as AISummaryRuntimePrivacyRecord[]};
      win.__AI_SUMMARY_RUNTIME_PRIVACY__ = audit;
      const record = (api: string, method: string) => audit.records.push({api, method});
      const wrapMethod = <Owner extends object, Key extends keyof Owner>(
        owner: Owner | undefined,
        key: Key,
        api: string,
        method: string
      ) => {
        if (!owner) {
          return;
        }
        const original = owner[key];
        if (typeof original !== 'function') {
          return;
        }
        Object.defineProperty(owner, key, {
          configurable: true,
          value: function wrappedAISummaryPrivacyMethod(this: unknown, ...args: unknown[]) {
            // Legacy hold timers delete their own session keys during wrap-up.
            // Classify only explicitly named deletions, never writes or other keys;
            // keep every operation visible in the audit without recording content.
            const expectedCleanup =
              api === 'Storage' &&
              method === 'removeItem' &&
              this === window.sessionStorage &&
              typeof args[0] === 'string' &&
              expectedSessionCleanupKeys.includes(args[0]);
            record(expectedCleanup ? 'ExpectedSessionCleanup' : api, method);
            return Reflect.apply(original as (...methodArgs: unknown[]) => unknown, this, args);
          },
        });
      };

      for (const method of ['setItem', 'removeItem', 'clear'] as const) {
        wrapMethod(Storage.prototype, method, 'Storage', method);
      }
      if (window.indexedDB) {
        for (const method of ['open', 'deleteDatabase'] as const) {
          wrapMethod(window.indexedDB, method, 'IndexedDB', method);
        }
      }
      if ('IDBDatabase' in window) {
        for (const method of ['createObjectStore', 'deleteObjectStore'] as const) {
          wrapMethod(IDBDatabase.prototype, method, 'IndexedDB', method);
        }
      }
      if ('IDBObjectStore' in window) {
        for (const method of ['add', 'put', 'delete', 'clear'] as const) {
          wrapMethod(IDBObjectStore.prototype, method, 'IndexedDB', method);
        }
      }
      for (const method of ['pushState', 'replaceState'] as const) {
        wrapMethod(History.prototype, method, 'History', method);
      }

      const cookieDescriptor =
        Object.getOwnPropertyDescriptor(Document.prototype, 'cookie') ||
        Object.getOwnPropertyDescriptor(HTMLDocument.prototype, 'cookie');
      if (cookieDescriptor?.set || cookieDescriptor?.get) {
        Object.defineProperty(document, 'cookie', {
          configurable: true,
          get: () => cookieDescriptor.get?.call(document) ?? '',
          set: (value: string) => {
            record('Document', 'cookie');
            cookieDescriptor.set?.call(document, value);
          },
        });
      }
    },
    {expectedSessionCleanupKeys}
  );

export const getAISummaryRuntimePrivacyAudit = async (page: Page): Promise<AISummaryRuntimePrivacyAudit> =>
  page.evaluate(
    () =>
      (window as unknown as {__AI_SUMMARY_RUNTIME_PRIVACY__?: AISummaryRuntimePrivacyAudit})
        .__AI_SUMMARY_RUNTIME_PRIVACY__ ?? {records: []}
  );

const getAISummaryScenarioPayload = (selection: AISummaryScenarioSelection): unknown => {
  const group = aiSummaryBrowserFixtures[selection.group];
  const payload = Object.entries(group).find(([member]) => member === selection.member)?.[1];
  if (payload === undefined) {
    throw new Error(`Unknown AI Summary browser scenario: ${selection.group}:${selection.member}`);
  }
  return payload;
};

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

const scenarioPayloadsForQueue = (payload: unknown, outcome: 'resolve' | 'reject'): readonly unknown[] => {
  if (outcome === 'resolve' && isRecord(payload) && isRecord(payload.previous) && isRecord(payload.incoming)) {
    return [payload.previous, payload.incoming];
  }
  if (outcome === 'reject' && isRecord(payload) && Array.isArray(payload.sendCalls)) {
    const firstSendCall = payload.sendCalls[0];
    if (isRecord(firstSendCall) && isRecord(firstSendCall.settlement)) {
      return [firstSendCall.settlement.reason ?? payload];
    }
  }
  return [payload];
};

export const enqueueAISummaryBridgeSettlement = async (
  page: Page,
  queue: AISummaryBridgeSettlementQueue,
  settlement: AISummaryBridgeSettlement
): Promise<void> => {
  await page.evaluate(
    ({queue, settlement}) => {
      const bridge = (
        window as unknown as {
          __WEBEX_CC_AI_SUMMARY_E2E__?: {
            enqueueSettlement?: (queue: string, settlement: unknown) => void;
          };
        }
      ).__WEBEX_CC_AI_SUMMARY_E2E__;
      if (!bridge?.enqueueSettlement) {
        throw new Error('AI Summary E2E bridge is not installed');
      }
      bridge.enqueueSettlement(queue, settlement);
    },
    {queue, settlement}
  );
};

export const enqueueAISummaryBridgeScenario = async (
  page: Page,
  queue: AISummaryBridgeSettlementQueue,
  scenario: AISummaryBrowserScenario,
  outcome: 'resolve' | 'reject' = 'resolve'
): Promise<void> => {
  for (const selection of scenario) {
    const payload = getAISummaryScenarioPayload(selection);
    for (const queuePayload of scenarioPayloadsForQueue(payload, outcome)) {
      await enqueueAISummaryBridgeSettlement(
        page,
        queue,
        outcome === 'resolve' ? {type: 'resolve', payload: queuePayload} : {type: 'reject', reason: queuePayload}
      );
    }
  }
};

export const resolveAISummaryBridgeDeferred = async (page: Page, id: string, payload: unknown): Promise<void> => {
  await page.evaluate(
    ({id, payload}) => {
      const bridge = (
        window as unknown as {
          __WEBEX_CC_AI_SUMMARY_E2E__?: {resolveDeferred?: (id: string, payload: unknown) => void};
        }
      ).__WEBEX_CC_AI_SUMMARY_E2E__;
      if (!bridge?.resolveDeferred) {
        throw new Error('AI Summary E2E bridge is not installed');
      }
      bridge.resolveDeferred(id, payload);
    },
    {id, payload}
  );
};

export const rejectAISummaryBridgeDeferred = async (page: Page, id: string, reason: unknown): Promise<void> => {
  await page.evaluate(
    ({id, reason}) => {
      const bridge = (
        window as unknown as {
          __WEBEX_CC_AI_SUMMARY_E2E__?: {rejectDeferred?: (id: string, reason: unknown) => void};
        }
      ).__WEBEX_CC_AI_SUMMARY_E2E__;
      if (!bridge?.rejectDeferred) {
        throw new Error('AI Summary E2E bridge is not installed');
      }
      bridge.rejectDeferred(id, reason);
    },
    {id, reason}
  );
};

export const emitReceiverAISummaryBrowserCard = async (
  page: Page,
  payload: unknown = AI_SUMMARY_RECEIVER_BROWSER_CARD
): Promise<void> => {
  await page.evaluate(
    ({payload}) => {
      const bridge = (
        window as unknown as {
          __WEBEX_CC_AI_SUMMARY_E2E__?: {emitTask?: (event: string, eventPayload: unknown) => void};
        }
      ).__WEBEX_CC_AI_SUMMARY_E2E__;
      if (!bridge?.emitTask) {
        throw new Error('AI Summary E2E bridge is not installed');
      }
      bridge.emitTask('task:midCallSummaryReceived', payload);
    },
    {payload}
  );
};

export const disableAISummaryBridgeCapability = async (page: Page): Promise<void> => {
  await page.evaluate(() => {
    const bridge = (
      window as unknown as {
        __WEBEX_CC_AI_SUMMARY_E2E__?: {
          emitTask?: (event: string, eventPayload: unknown) => void;
          setCapabilities?: (capabilities: {midCallEnabled: boolean; postCallEnabled: boolean}) => void;
        };
      }
    ).__WEBEX_CC_AI_SUMMARY_E2E__;
    if (!bridge) {
      throw new Error('AI Summary E2E bridge is not installed');
    }
    if (bridge.setCapabilities) {
      bridge.setCapabilities({midCallEnabled: false, postCallEnabled: false});
      return;
    }
    bridge.emitTask?.('task:featureEnablement', {
      interactionId: 'interaction-main-1',
      midCallEnabled: false,
      postCallEnabled: false,
    });
  });
};

export const setAISummaryBridgeCapability = async (
  page: Page,
  capabilities: {readonly midCallEnabled: boolean; readonly postCallEnabled: boolean; readonly actionTimestamp?: number}
): Promise<void> => {
  await page.evaluate(
    ({capabilities}) => {
      const bridge = (
        window as unknown as {
          __WEBEX_CC_AI_SUMMARY_E2E__?: {
            setCapabilities?: (nextCapabilities: {
              midCallEnabled: boolean;
              postCallEnabled: boolean;
              actionTimestamp?: number;
            }) => void;
          };
        }
      ).__WEBEX_CC_AI_SUMMARY_E2E__;
      if (!bridge?.setCapabilities) {
        throw new Error('AI Summary E2E bridge is not installed');
      }
      bridge.setCapabilities(capabilities);
    },
    {capabilities}
  );
};

export const setAISummaryBridgeTaskPhase = async (page: Page, phase: 'connected' | 'wrapup'): Promise<void> => {
  await page.evaluate(
    ({phase}) => {
      const bridge = (
        window as unknown as {
          __WEBEX_CC_AI_SUMMARY_E2E__?: {setTaskPhase?: (nextPhase: string) => void};
        }
      ).__WEBEX_CC_AI_SUMMARY_E2E__;
      if (!bridge?.setTaskPhase) {
        throw new Error('AI Summary E2E bridge is not installed');
      }
      bridge.setTaskPhase(phase);
    },
    {phase}
  );
};

export const mutateAISummaryBridgeTask = async (
  page: Page,
  mutation: 'hold' | 'resume' | 'transfer-owner' | 'conference-start' | 'wrapped-up'
): Promise<void> => {
  await page.evaluate(
    ({mutation}) => {
      const bridge = (
        window as unknown as {
          __WEBEX_CC_AI_SUMMARY_E2E__?: {mutateTask?: (nextMutation: string) => void};
        }
      ).__WEBEX_CC_AI_SUMMARY_E2E__;
      if (!bridge?.mutateTask) {
        throw new Error('AI Summary E2E bridge is not installed');
      }
      bridge.mutateTask(mutation);
    },
    {mutation}
  );
};

const isMidCallState = (stateId: string): boolean =>
  stateId.startsWith('JNY-001:') || stateId.startsWith('mid-call:') || stateId.startsWith('initiating:');

const evidencePanelSelector = (stateId: string): string =>
  isMidCallState(stateId) ? '[data-testid="consult-transfer:summary"]' : '[data-testid="wrap-up-summary"]';

const evidenceRootSelector = (stateId: string): string =>
  isMidCallState(stateId) ? '.agent-popover:has([data-testid="consult-transfer:summary"])' : '.wrapup-popover';

type VisualStateAssertion = {
  readonly assertion_id: string;
  readonly passed: true;
  readonly evidence: string;
};

type AISummaryFontResponseHash = {
  readonly emittedUrlPath: string;
  readonly url: string;
  readonly sha256: string;
};

type AISummaryLoadedFontFace = {
  readonly family: string;
  readonly status: FontFace['status'];
  readonly style: string;
  readonly weight: string;
  readonly stretch: string;
};

export type AISummaryCaptureReadiness = {
  readonly fontsReady: true;
  readonly fontManifest: AISummaryVisualFontManifest;
  readonly fontManifestHash: string;
  readonly hostSelector: string;
  readonly computedFontFamily: string;
  readonly computedFirstFamily: string;
  readonly responseHashes: readonly AISummaryFontResponseHash[];
  readonly loadedFaces: readonly AISummaryLoadedFontFace[];
};

type AISummaryCaptureCropOptions =
  | readonly number[]
  | {readonly sourceOrigin?: readonly number[]; readonly panelWidth?: number};

const isReadonlyNumberArray = (value: AISummaryCaptureCropOptions): value is readonly number[] => Array.isArray(value);

const productionComponentsForState = (stateId: string): string[] => [
  'CallControlComponent',
  isMidCallState(stateId) ? 'ConsultTransferPopoverComponent' : 'WrapUpSummary',
  'AISummary',
];

const withTimeout = async <T>(promise: Promise<T>, timeoutMs: number, label: string): Promise<T> => {
  let timeout: ReturnType<typeof setTimeout> | undefined;
  try {
    return await Promise.race([
      promise,
      new Promise<never>((_resolve, reject) => {
        timeout = setTimeout(() => reject(new Error(`${label} timed out after ${timeoutMs} ms`)), timeoutMs);
      }),
    ]);
  } finally {
    if (timeout) {
      clearTimeout(timeout);
    }
  }
};

const assertAISummaryFontReadinessRecord = (value: unknown, label: string): void => {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new Error(`${label} font readiness must be an object`);
  }
  const record = value as Partial<AISummaryCaptureReadiness>;
  assertJsonValue(record.fontManifest, AI_SUMMARY_VISUAL_FONT_MANIFEST, `${label} font manifest`);
  if (record.fontManifestHash !== AI_SUMMARY_VISUAL_FONT_MANIFEST_HASH || record.fontsReady !== true) {
    throw new Error(`${label} font readiness is stale or incomplete`);
  }
  if (record.computedFirstFamily !== 'Inter') {
    throw new Error(`${label} did not render with Inter first: ${record.computedFontFamily ?? 'unknown'}`);
  }
  const responseHashes = Array.isArray(record.responseHashes) ? record.responseHashes : [];
  for (const font of AI_SUMMARY_VISUAL_FONT_MANIFEST.fonts) {
    const responseHash = responseHashes.find((entry) => entry.emittedUrlPath === font.emittedUrlPath);
    if (!responseHash || responseHash.sha256 !== font.sha256) {
      throw new Error(`${label} missing verified font response for ${font.emittedUrlPath}`);
    }
  }
};

export const awaitAISummaryCaptureReady = async (
  page: Page,
  hostSelector: string = AI_SUMMARY_VISUAL_FONT_MANIFEST.hostSelector
): Promise<AISummaryCaptureReadiness> =>
  withTimeout(
    page.evaluate(
      async ({manifest, manifestHash, hostSelector}) => {
        const normalizeFamily = (family: string): string => family.trim().replace(/^["']|["']$/g, '');
        const digestHex = async (bytes: ArrayBuffer): Promise<string> => {
          const browserCrypto = globalThis.crypto;
          if (!browserCrypto?.subtle) {
            throw new Error('Browser SubtleCrypto is required for AI Summary font hashing');
          }
          const hash = await browserCrypto.subtle.digest('SHA-256', bytes);
          return Array.from(new Uint8Array(hash))
            .map((value) => value.toString(16).padStart(2, '0'))
            .join('');
        };
        const assertSameManifest = (actual: unknown): void => {
          if (JSON.stringify(actual) !== JSON.stringify(manifest)) {
            throw new Error('AI Summary Inter font manifest is missing or mismatched in the sample host');
          }
        };

        if (!('fonts' in document) || typeof FontFace === 'undefined') {
          throw new Error('CSS Font Loading API is required for AI Summary visual capture');
        }
        const host = document.querySelector(hostSelector);
        if (!(host instanceof Element)) {
          throw new Error(`AI Summary font host is missing: ${hostSelector}`);
        }
        assertSameManifest(
          (window as unknown as {__WEBEX_CC_AI_SUMMARY_FONT_MANIFEST__?: unknown}).__WEBEX_CC_AI_SUMMARY_FONT_MANIFEST__
        );
        await (window as unknown as {__WEBEX_CC_AI_SUMMARY_FONT_READY__?: Promise<void>})
          .__WEBEX_CC_AI_SUMMARY_FONT_READY__;

        const responseHashes = await Promise.all(
          manifest.fonts.map(async (font) => {
            const fontURL = new URL(font.emittedUrlPath, window.location.href);
            if (fontURL.origin !== window.location.origin || fontURL.pathname !== font.emittedUrlPath) {
              throw new Error(`AI Summary Inter font URL is not same-origin and manifest-owned: ${fontURL.href}`);
            }
            const response = await fetch(fontURL.href, {cache: 'no-store'});
            if (!response.ok) {
              throw new Error(`AI Summary Inter font failed to load: ${response.status} ${fontURL.href}`);
            }
            const responseURL = new URL(response.url);
            if (responseURL.origin !== fontURL.origin || responseURL.pathname !== font.emittedUrlPath) {
              throw new Error(`AI Summary Inter font loaded from unexpected URL: ${response.url}`);
            }
            const bytes = await response.arrayBuffer();
            const actualHash = await digestHex(bytes);
            if (actualHash !== font.sha256) {
              throw new Error(`AI Summary Inter font hash drift: expected ${font.sha256}, got ${actualHash}`);
            }
            const loadedFace = await new FontFace(font.family, `url("${fontURL.href}") format("${font.format}")`, {
              display: font.display,
              stretch: font.stretch,
              style: font.style,
              weight: font.weight,
            }).load();
            (document.fonts as FontFaceSet & {add: (font: FontFace) => void}).add(loadedFace);
            for (const requiredFace of font.requiredFaces) {
              const cssFont = `${requiredFace.style} ${requiredFace.weight} ${requiredFace.sizePx}px "${font.family}"`;
              await document.fonts.load(cssFont, font.sampleGlyphs);
              if (!document.fonts.check(cssFont, font.sampleGlyphs)) {
                throw new Error(`AI Summary Inter face did not pass glyph check: ${cssFont}`);
              }
            }
            return {
              emittedUrlPath: font.emittedUrlPath,
              url: fontURL.href,
              sha256: actualHash,
            };
          })
        );

        await document.fonts.ready;
        if (document.fonts.status !== 'loaded') {
          throw new Error(`AI Summary Inter fonts did not settle: ${document.fonts.status}`);
        }
        const computedFontFamily = getComputedStyle(host).fontFamily;
        const computedFirstFamily = normalizeFamily(computedFontFamily.split(',')[0] ?? '');
        if (computedFirstFamily !== 'Inter') {
          throw new Error(`AI Summary host rendered with fallback font family: ${computedFontFamily}`);
        }
        const loadedFaces = Array.from(document.fonts).map((fontFace) => ({
          family: normalizeFamily(fontFace.family),
          status: fontFace.status,
          style: fontFace.style,
          weight: fontFace.weight,
          stretch: fontFace.stretch,
        }));
        for (const font of manifest.fonts) {
          if (!loadedFaces.some((face) => face.family === font.family && face.status === 'loaded')) {
            throw new Error(`AI Summary Inter font face is not loaded: ${font.family}`);
          }
        }
        return {
          fontsReady: true,
          fontManifest: manifest,
          fontManifestHash: manifestHash,
          hostSelector,
          computedFontFamily,
          computedFirstFamily,
          responseHashes,
          loadedFaces,
        };
      },
      {manifest: AI_SUMMARY_VISUAL_FONT_MANIFEST, manifestHash: AI_SUMMARY_VISUAL_FONT_MANIFEST_HASH, hostSelector}
    ),
    AI_SUMMARY_CAPTURE_READY_TIMEOUT_MS,
    'AI Summary Inter font readiness'
  );

const AI_SUMMARY_CANONICAL_COPY_POST_CALL = {
  conversationId: 'interaction-main-1',
  timestamp: 3100,
  languageCode: 'en-US',
  areTranscriptsAvailable: true,
  sections: {
    initialContactReason: 'Help activating a new Webex plan.',
    additionalContactReasons: 'Inquiry about transferring meeting history from a previous Webex account.',
    additionalContext: 'Customer also asked about transferring meeting history.',
    keyActionsTaken: 'Guided activation via browser\nLinked plan to correct account',
    nextSteps: 'Support team resolving sync issue (48 hrs)\nCustomer will get email + SMS once done',
  },
  summaryText: 'Help activating a new Webex plan. Guided activation via browser.',
  resolution: 'Activation complete. Meeting history transfer pending sync fix (unsolved).',
} as const;

const AI_SUMMARY_SOURCE_MID_CALL_PLAIN_TEXT = {
  conversationId: 'interaction-main-1',
  timestamp: 2200,
  languageCode: 'en-US',
  areTranscriptsAvailable: true,
  summaryText:
    'Customer Joanna Smith called regarding her order #12345, reporting that the package was delayed beyond the ' +
    'promised delivery date and had not arrived. The agent reviewed the order status, apologized for the ' +
    'inconvenience, and confirmed the shipment was still in transit with an updated expected delivery date. The ' +
    'customer also asked about compensation for the delay, and the agent explained the refund or credit policy. The ' +
    'issue remains unresolved, and the agent should follow up with the logistics team if the package is not delivered ' +
    'by the new date.',
} as const;

const AI_SUMMARY_SOURCE_POST_CALL_PLAIN_TEXT = {
  conversationId: 'interaction-main-1',
  timestamp: 3200,
  languageCode: 'en-US',
  areTranscriptsAvailable: true,
  summaryText:
    'Customer called in regarding a misplaced debit card and concerns over potential fraud. Customer mentioned last ' +
    'using the card yesterday at a Wells Fargo ATM and has not seen it since. No unauthorized transactions were ' +
    'observed so far.\n\n' +
    'Agent verified the account using security questions, placed a temporary hold on the card, and offered to issue a ' +
    'replacement debit card. Agent explained that the new card should arrive within 3-5 business days and reviewed how ' +
    'to monitor account activity.\n\n' +
    'Customer needs to confirm whether to proceed with a replacement card. Agent should follow up if customer reports ' +
    'any unauthorized activity or if the card is found.\n\n' +
    'Resolved\n',
} as const;

const setupAISummaryE2EHost = async (
  page: Page,
  panelWidth?: number,
  options?: AISummarySDKMockOptions,
  initialCapabilities?: {midCallEnabled: boolean; postCallEnabled: boolean}
): Promise<void> => {
  await installAISummarySDKMock(page, options);
  const query = new URLSearchParams({'ai-summary-e2e': '1'});
  if (initialCapabilities) {
    query.set('mock-mid-call-enabled', String(initialCapabilities.midCallEnabled));
    query.set('mock-post-call-enabled', String(initialCapabilities.postCallEnabled));
  }
  await page.goto(`/?${query}`);
  if (panelWidth) {
    await page.evaluate((width) => {
      document.documentElement.style.setProperty('--cc-summary-panel-width', `${width}px`);
    }, panelWidth);
  }
  await page.getByTestId('samples:init-widgets-button').click();
  await expect(page.getByTestId('call-control-container')).toBeVisible();
};

const openMidCallAISummary = async (page: Page, action: 'CONSULT' | 'TRANSFER' = 'CONSULT'): Promise<void> => {
  await page.getByTestId(action === 'TRANSFER' ? 'call-control:transfer' : 'call-control:consult').click();
  await expect(page.locator('.agent-popover-content--voice')).toBeVisible();
};

const openPostCallAISummary = async (page: Page): Promise<void> => {
  await setAISummaryBridgeTaskPhase(page, 'wrapup');
  await page.getByTestId('call-control:wrapup-button').click();
};

const commitPostCallReason = async (page: Page, reason = 'Billing follow-up'): Promise<void> => {
  const panel = page.getByTestId('wrap-up-summary');
  await expect(panel).toBeVisible();
  await panel.getByRole('radio', {name: reason, exact: true}).click();
};

const configureStructuralPostCallContent = async (
  page: Page,
  payload: unknown = aiSummaryBrowserFixtures.postCall.structured,
  reason = 'Billing follow-up'
): Promise<void> => {
  await enqueueAISummaryBridgeSettlement(page, 'postCall', {type: 'resolve', payload});
  await openPostCallAISummary(page);
  await commitPostCallReason(page, reason);
  await expect(page.getByTestId('ai-summary:content')).toBeVisible();
};

const configureStructuralMidCallContent = async (
  page: Page,
  action: 'CONSULT' | 'TRANSFER' = 'CONSULT',
  payload: unknown = aiSummaryBrowserFixtures.initiatingMidCall.typedSections
): Promise<void> => {
  await enqueueAISummaryBridgeSettlement(page, 'midCall', {type: 'resolve', payload});
  await openMidCallAISummary(page, action);
  await expect(page.getByTestId('consult-transfer:summary')).toBeVisible();
  await expect(page.getByTestId('ai-summary:content')).toBeVisible();
};

export const prepareAISummaryCapture = async (
  page: Page,
  stateId: string,
  sourceSize: {width: number; height: number},
  cropOptions: AISummaryCaptureCropOptions = [0, 0]
) => {
  // Targets are panel crops, not sample-host viewports. Negative source origins
  // retain the target's tooltip overhang rather than clipping it away.
  const sourceOrigin = isReadonlyNumberArray(cropOptions) ? cropOptions : (cropOptions.sourceOrigin ?? [0, 0]);
  const panelWidth = isReadonlyNumberArray(cropOptions)
    ? sourceSize.width + sourceOrigin[0]
    : (cropOptions.panelWidth ?? sourceSize.width + sourceOrigin[0]);
  const logicalViewport = {
    width: sourceSize.width + 160,
    height: Math.floor((sourceSize.height + sourceOrigin[1]) / 0.8),
  };
  await page.setViewportSize(logicalViewport);
  await driveAISummaryState(page, stateId, panelWidth, {visualInventory: true});
  const midCall = isMidCallState(stateId);
  const rootSelector = evidenceRootSelector(stateId);
  await awaitAISummaryCaptureReady(page, evidencePanelSelector(stateId));
  const root = page.locator(rootSelector);
  await expect(root).toHaveCount(1);
  const panel = await root.boundingBox();
  if (!panel) throw new Error(`Capture panel missing for ${stateId}`);
  const bounds: CaptureBounds = {
    x: panel.x + sourceOrigin[0],
    y: panel.y + sourceOrigin[1],
    ...sourceSize,
  };
  const selectors = [
    rootSelector,
    ...(midCall
      ? [
          '.agent-popover-title',
          '.agent-popover [aria-label="Close popover"]',
          '.consult-category-radios',
          '.consult-search-row',
          '.consult-transfer-summary__heading',
        ]
      : ['.wrap-up-summary__header', '.wrap-up-summary__actions']),
  ];
  const action = actionFromStateId(stateId);
  if (!['generating', 'error'].includes(action)) selectors.push('[data-testid="ai-summary:actions"]');
  if (action.endsWith('-hover')) selectors.push('.ai-summary [role="tooltip"]');
  return {logicalViewport, bounds, selectors};
};

const passedAssertion = (assertionId: string, evidence: string): VisualStateAssertion => ({
  assertion_id: assertionId,
  passed: true,
  evidence,
});

export const observeAISummaryDestinationPlaceholder = async (page: Page) =>
  page.getByRole('textbox', {name: 'Search destinations', exact: true}).evaluate((input: HTMLInputElement) => {
    const style = getComputedStyle(input);
    const placeholderStyle = getComputedStyle(input, '::placeholder');
    const context = document.createElement('canvas').getContext('2d');
    if (!context) throw new Error('Placeholder text measurement is unavailable');
    // Computed font shorthand may include values unsupported by canvas; using
    // it can silently retain the default 10px canvas font and miss clipping.
    const measuredFont = `${placeholderStyle.fontStyle} ${placeholderStyle.fontWeight} ${placeholderStyle.fontSize} ${placeholderStyle.fontFamily}`;
    context.font = measuredFont;
    const spacing = parseFloat(placeholderStyle.letterSpacing) || 0;
    return {
      text: input.placeholder,
      font: context.font,
      measuredFont,
      textWidth: context.measureText(input.placeholder).width + spacing * Math.max(0, input.placeholder.length - 1),
      contentWidth: input.clientWidth - parseFloat(style.paddingLeft) - parseFloat(style.paddingRight),
    };
  });

const assertAISummaryVisualState = async (
  page: Page,
  stateId: string,
  sourceCapture = false
): Promise<VisualStateAssertion[]> => {
  const assertions = [
    passedAssertion(`state:${stateId}`, `Production bridge host reached ${stateId}.`),
    ...productionComponentsForState(stateId).map((component) =>
      passedAssertion(`component:${component}`, `${component} is in the rendered production component chain.`)
    ),
  ];
  const action = stateId.split(':').at(-1) ?? '';
  const summary = page.locator('[data-testid^="ai-summary:"]').first();
  await expect(summary).toBeVisible();

  if (sourceCapture && stateId === 'JNY-001:mid-call-summary') {
    const heading = page.locator('.consult-transfer-summary__heading');
    const headingBox = await heading.boundingBox();
    const content = page.getByTestId('ai-summary:content');
    const contentBox = await content.boundingBox();
    const lineHeight = await content.evaluate((node) => parseFloat(getComputedStyle(node).lineHeight));
    expect(headingBox?.height).toBeLessThanOrEqual(lineHeight * 1.5);
    expect(contentBox?.height).toBeGreaterThanOrEqual(lineHeight * 4);
    await expect(page.locator('.consult-close-button mdc-icon[name="cancel-regular"]')).toBeVisible();
    await expect(page.locator('.agent-list .hover-button').first()).toHaveCSS('opacity', '1');
    await expect(page.getByRole('button', {name: 'Select Billing Agent', exact: true})).toBeVisible();
    const placeholder = await observeAISummaryDestinationPlaceholder(page);
    expect(placeholder.textWidth, JSON.stringify(placeholder)).toBeLessThanOrEqual(placeholder.contentWidth);
    assertions.push(
      passedAssertion('layout:consult-placeholder-readable', JSON.stringify(placeholder)),
      passedAssertion(
        'layout:consult-summary-readable',
        'Inline heading, visible close icon and at least four summary text lines.'
      ),
      passedAssertion(
        'interaction:destination-hover-visible',
        'First destination row hovered; its selection affordance is visible.'
      )
    );
  }

  if (action === 'like-hover') {
    await expect(page.getByRole('tooltip', {name: 'This is helpful', exact: true})).toBeVisible();
    assertions.push(passedAssertion('interaction:hover-visible', 'Like hover tooltip "This is helpful" is visible.'));
  } else if (action === 'dislike-hover') {
    await expect(page.getByRole('tooltip', {name: "This isn't helpful", exact: true})).toBeVisible();
    assertions.push(
      passedAssertion('interaction:hover-visible', 'Dislike hover tooltip "This isn\'t helpful" is visible.')
    );
  } else if (action === 'copy-hover') {
    await expect(page.getByRole('tooltip', {name: 'Copy Summary', exact: true})).toBeVisible();
    assertions.push(passedAssertion('interaction:hover-visible', 'Copy hover tooltip "Copy Summary" is visible.'));
  } else if (action === 'like-selected') {
    await expect(page.getByRole('tooltip')).toHaveCount(0);
    await expect(page.getByRole('button', {name: 'This is helpful', exact: true})).toHaveAttribute(
      'aria-pressed',
      'true'
    );
    assertions.push(
      passedAssertion('interaction:selected-visible', 'Like control exposes its selected state with aria-pressed=true.')
    );
  } else if (action === 'dislike-selected') {
    await expect(page.getByRole('tooltip')).toHaveCount(0);
    await expect(page.getByRole('button', {name: "This isn't helpful", exact: true})).toHaveAttribute(
      'aria-pressed',
      'true'
    );
    assertions.push(
      passedAssertion(
        'interaction:selected-visible',
        'Dislike control exposes its selected state with aria-pressed=true.'
      )
    );
  } else if (action === 'copy-selected' || action === 'copy-confirmed') {
    await expect(page.getByRole('button', {name: 'Copy Summary', exact: true})).toHaveText('Copied');
    assertions.push(
      passedAssertion('interaction:copy-confirmed-visible', 'Copy control visibly confirms the completed copy action.')
    );
  } else if (action === 'editing') {
    const editors = summary.locator('textarea:not([disabled])');
    expect(await editors.count()).toBeGreaterThan(0);
    assertions.push(
      passedAssertion('interaction:editing-visible', 'At least one enabled production summary editor is visible.')
    );
  } else if (action === 'generating' || action.startsWith('pending-')) {
    await expect(page.getByTestId('ai-summary:generating')).toBeVisible();
    assertions.push(passedAssertion('interaction:generating-visible', 'The production generating state is visible.'));
  } else if (action.includes('error') || action === 'response-failed') {
    await expect(page.getByTestId('ai-summary:error')).toBeVisible();
    assertions.push(passedAssertion('interaction:error-visible', 'The production error state is visible.'));
    if (stateId === 'JNY-002:error') {
      await expect(page.getByRole('button', {name: 'Complete Wrap-Up', exact: true})).toBeEnabled();
      await expect(page.getByRole('button', {name: 'Retry', exact: true})).toBeVisible();
      assertions.push(
        passedAssertion(
          'requirement:completion-enabled',
          'REQ-009 intentionally overrides the target disabled completion control; fresh generation Retry remains available.'
        )
      );
    }
  }

  return assertions;
};

const clearIncidentalSearchFocus = async (page: Page, stateId: string): Promise<void> => {
  // Only these source states depict an unfocused search field. Never blur a
  // copy/hover control or a structural keyboard/editing scenario.
  if (stateId === 'JNY-001:mid-call-summary') {
    await page.locator('.agent-popover-content--voice').focus();
    return;
  }
  if (
    ![
      'JNY-002:generating',
      'JNY-002:editing',
      'JNY-002:error',
      'post-call:generation-error-completion-escape',
    ].includes(stateId)
  )
    return;
  // Focus stays inside the popover, so its focus trap does not put it back in
  // the search box on the next frame. No CSS or DOM is injected for screenshots.
  await page.getByTestId('wrap-up-summary').focus();
};

type AISummaryDriveOptions = {
  readonly visualInventory?: boolean;
};

export const driveAISummaryState = async (
  page: Page,
  stateId: string,
  panelWidth?: number,
  driveOptions: AISummaryDriveOptions = {}
): Promise<void> => {
  // Initial-ineligibility scenarios hydrate an ineligible Task. Live revocation
  // is covered separately; do not race an event against initial subscription.
  const initialCapabilities = stateId.startsWith('mid-call:omitted-')
    ? {midCallEnabled: false, postCallEnabled: true}
    : stateId === 'post-call:legacy-ineligible'
      ? {midCallEnabled: true, postCallEnabled: false}
      : undefined;
  const postCallReason = driveOptions.visualInventory ? AI_SUMMARY_SOURCE_WRAPUP_REASON : 'Billing follow-up';
  await setupAISummaryE2EHost(
    page,
    panelWidth,
    driveOptions.visualInventory ? {visualInventory: true} : undefined,
    initialCapabilities
  );

  switch (stateId) {
    case 'JNY-001:mid-call-summary':
      await configureStructuralMidCallContent(
        page,
        'CONSULT',
        driveOptions.visualInventory ? AI_SUMMARY_SOURCE_MID_CALL_PLAIN_TEXT : undefined
      );
      await page.locator('.agent-list .call-control-list-item').first().hover();
      break;
    case 'JNY-002:generating':
      await enqueueAISummaryBridgeSettlement(page, 'postCall', {type: 'pending'});
      await openPostCallAISummary(page);
      await commitPostCallReason(page, postCallReason);
      await expect(page.getByTestId('ai-summary:generating')).toBeVisible();
      break;
    case 'JNY-002:editing':
      await configureStructuralPostCallContent(
        page,
        driveOptions.visualInventory
          ? AI_SUMMARY_SOURCE_POST_CALL_PLAIN_TEXT
          : aiSummaryBrowserFixtures.postCall.plainText,
        postCallReason
      );
      await expect(page.getByRole('textbox', {name: 'Summary', exact: true})).toBeVisible();
      break;
    case 'JNY-002:like-hover':
      await configureStructuralPostCallContent(page, AI_SUMMARY_CANONICAL_COPY_POST_CALL, postCallReason);
      await page.getByRole('button', {name: 'This is helpful', exact: true}).hover();
      break;
    case 'JNY-002:like-selected':
      await configureStructuralPostCallContent(page, AI_SUMMARY_CANONICAL_COPY_POST_CALL, postCallReason);
      await page.getByRole('button', {name: 'This is helpful', exact: true}).click();
      await page.locator('.wrap-up-summary__title').click();
      await expect(page.getByRole('tooltip')).toHaveCount(0);
      if (!driveOptions.visualInventory) {
        await expect(page.getByText('Pending submission', {exact: true})).toBeVisible();
      }
      break;
    case 'JNY-002:dislike-hover':
      await configureStructuralPostCallContent(page, AI_SUMMARY_CANONICAL_COPY_POST_CALL, postCallReason);
      await page.getByRole('button', {name: "This isn't helpful", exact: true}).hover();
      break;
    case 'JNY-002:dislike-selected':
      await configureStructuralPostCallContent(page, AI_SUMMARY_CANONICAL_COPY_POST_CALL, postCallReason);
      await page.getByRole('button', {name: "This isn't helpful", exact: true}).click();
      await page.locator('.wrap-up-summary__title').click();
      await expect(page.getByRole('tooltip')).toHaveCount(0);
      if (!driveOptions.visualInventory) {
        await expect(page.getByText('Pending submission', {exact: true})).toBeVisible();
      }
      break;
    case 'JNY-002:copy-hover':
      await configureStructuralPostCallContent(page, AI_SUMMARY_CANONICAL_COPY_POST_CALL, postCallReason);
      await page.getByRole('button', {name: 'Copy Summary', exact: true}).hover();
      break;
    case 'JNY-002:copy-selected':
    case 'JNY-002:copy-confirmed':
      await configureStructuralPostCallContent(page, AI_SUMMARY_CANONICAL_COPY_POST_CALL, postCallReason);
      await page.getByRole('button', {name: 'Copy Summary', exact: true}).click();
      await expect(page.getByRole('button', {name: 'Copy Summary', exact: true})).toHaveText('Copied');
      break;
    case 'JNY-002:error':
      await enqueueAISummaryBridgeSettlement(page, 'postCall', {
        type: 'reject',
        reason: aiSummaryBrowserFixtures.errors.generic,
      });
      await openPostCallAISummary(page);
      await commitPostCallReason(page, postCallReason);
      await expect(page.getByTestId('ai-summary:error')).toBeVisible();
      break;
    case 'post-call:canonical-copy':
      await configureStructuralPostCallContent(page, AI_SUMMARY_CANONICAL_COPY_POST_CALL);
      break;
    case 'receiver:adaptive-card-ready':
      await emitReceiverAISummaryBrowserCard(page);
      await expect(page.getByRole('button', {name: 'View summary', exact: true})).toBeVisible();
      await page.getByTestId('ai-assistant:view-summary').click();
      await expect(page.getByTestId('ai-assistant:receiver-summary')).toContainText('Browser receiver summary');
      break;
    case 'receiver:unrenderable-card':
      await page.evaluate(
        ({payload}) => {
          const bridge = (
            window as unknown as {
              __WEBEX_CC_AI_SUMMARY_E2E__?: {emitTask?: (event: string, eventPayload: unknown) => void};
            }
          ).__WEBEX_CC_AI_SUMMARY_E2E__;
          if (!bridge?.emitTask) throw new Error('AI Summary E2E bridge is not installed');
          bridge.emitTask('task:midCallSummaryReceived', payload);
        },
        {payload: aiSummaryBrowserFixtures.receivingMidCall.typedOnlyUnsupported}
      );
      await expect(page.getByRole('button', {name: 'View summary', exact: true})).toBeVisible();
      await page.getByTestId('ai-assistant:view-summary').click();
      await expect(page.getByTestId('ai-summary:unavailable')).toBeVisible();
      break;
    case 'summary:hidden-authorization':
      await enqueueAISummaryBridgeSettlement(page, 'midCall', {
        type: 'reject',
        reason: aiSummaryBrowserFixtures.errors.unauthorized,
      });
      await openMidCallAISummary(page);
      await expect(page.locator('[data-testid^="ai-summary:"]')).toHaveCount(0);
      break;
    case 'summary:hidden-initialization':
      await enqueueAISummaryBridgeSettlement(page, 'midCall', {
        type: 'reject',
        reason: aiSummaryBrowserFixtures.errors.initialization,
      });
      await openMidCallAISummary(page);
      await expect(page.locator('[data-testid^="ai-summary:"]')).toHaveCount(0);
      break;
    case 'mid-call:omitted-consult':
      await openMidCallAISummary(page, 'CONSULT');
      await expect(page.getByTestId('consult-transfer:summary')).toHaveCount(0);
      break;
    case 'mid-call:omitted-transfer':
      await openMidCallAISummary(page, 'TRANSFER');
      await expect(page.getByTestId('consult-transfer:summary')).toHaveCount(0);
      break;
    case 'mid-call:transfer-summary-panel':
      await configureStructuralMidCallContent(page, 'TRANSFER');
      break;
    case 'mid-call:generating':
    case 'mid-call:pending-consult':
      await enqueueAISummaryBridgeSettlement(page, 'midCall', {type: 'pending'});
      await openMidCallAISummary(page, 'CONSULT');
      await expect(page.getByTestId('ai-summary:generating')).toBeVisible();
      break;
    case 'mid-call:pending-transfer':
      await enqueueAISummaryBridgeSettlement(page, 'midCall', {type: 'pending'});
      await openMidCallAISummary(page, 'TRANSFER');
      await expect(page.getByTestId('ai-summary:generating')).toBeVisible();
      break;
    case 'mid-call:editing':
      await configureStructuralMidCallContent(page, 'CONSULT', aiSummaryBrowserFixtures.initiatingMidCall.plainText);
      break;
    case 'mid-call:like-hover':
      await configureStructuralMidCallContent(page);
      await page.getByRole('button', {name: 'This is helpful', exact: true}).hover();
      break;
    case 'mid-call:like-selected':
      await configureStructuralMidCallContent(page);
      await page.getByRole('button', {name: 'This is helpful', exact: true}).click();
      await expect(page.getByRole('button', {name: 'This is helpful', exact: true})).toHaveAttribute(
        'aria-pressed',
        'true'
      );
      break;
    case 'mid-call:dislike-hover':
      await configureStructuralMidCallContent(page);
      await page.getByRole('button', {name: "This isn't helpful", exact: true}).hover();
      break;
    case 'mid-call:dislike-selected':
      await configureStructuralMidCallContent(page);
      await page.getByRole('button', {name: "This isn't helpful", exact: true}).click();
      await expect(page.getByRole('button', {name: "This isn't helpful", exact: true})).toHaveAttribute(
        'aria-pressed',
        'true'
      );
      break;
    case 'mid-call:copy-hover':
      await configureStructuralMidCallContent(page);
      await page.getByRole('button', {name: 'Copy Summary', exact: true}).hover();
      break;
    case 'mid-call:copy-confirmed':
      await configureStructuralMidCallContent(page);
      await page.getByRole('button', {name: 'Copy Summary', exact: true}).click();
      await expect(page.getByRole('button', {name: 'Copy Summary', exact: true})).toHaveText('Copied');
      break;
    case 'mid-call:generation-error':
      await enqueueAISummaryBridgeSettlement(page, 'midCall', {
        type: 'reject',
        reason: aiSummaryBrowserFixtures.errors.generic,
      });
      await openMidCallAISummary(page);
      await expect(page.getByTestId('ai-summary:error')).toBeVisible();
      break;
    case 'initiating:unavailable':
      await enqueueAISummaryBridgeSettlement(page, 'midCall', {
        type: 'resolve',
        payload: aiSummaryBrowserFixtures.initiatingMidCall.cardOnlyUnsupported,
      });
      await openMidCallAISummary(page, 'CONSULT');
      await expect(page.getByTestId('ai-summary:unavailable')).toBeVisible();
      break;
    case 'post-call:unavailable':
      await enqueueAISummaryBridgeSettlement(page, 'postCall', {
        type: 'resolve',
        payload: aiSummaryBrowserFixtures.postCall.cardOnlyUnsupported,
      });
      await openPostCallAISummary(page);
      await commitPostCallReason(page);
      await expect(page.getByTestId('ai-summary:unavailable')).toBeVisible();
      break;
    case 'post-call:generation-error-completion-escape':
      await enqueueAISummaryBridgeSettlement(page, 'postCall', {
        type: 'reject',
        reason: aiSummaryBrowserFixtures.errors.generic,
      });
      await openPostCallAISummary(page);
      await commitPostCallReason(page);
      await expect(page.getByTestId('ai-summary:error')).toBeVisible();
      break;
    case 'post-call:zero-match-reason-query':
      await openPostCallAISummary(page);
      await page.getByPlaceholder('Search topic').fill('does-not-exist');
      break;
    case 'post-call:outcome-absent':
      await configureStructuralPostCallContent(page, aiSummaryBrowserFixtures.postCall.resolutionAbsent);
      await page.getByRole('button', {name: 'Copy Summary', exact: true}).click();
      break;
    case 'post-call:feedback-pending':
      await configureStructuralPostCallContent(page);
      await page.getByRole('button', {name: 'This is helpful', exact: true}).click();
      await expect(page.getByText('Pending submission', {exact: true})).toBeVisible();
      break;
    case 'post-call:feedback-not-confirmed':
      await enqueueAISummaryBridgeSettlement(page, 'postCallResponse', {
        type: 'reject',
        reason: aiSummaryBrowserFixtures.postWrapUpSend.rejected.sendCalls[0].settlement.reason,
      });
      await configureStructuralPostCallContent(page);
      await page.getByRole('button', {name: 'This is helpful', exact: true}).click();
      await page.getByRole('button', {name: 'Complete Wrap-Up', exact: true}).click();
      await expect(page.getByText('Submission not confirmed', {exact: true})).toBeVisible();
      break;
    case 'post-call:response-submitted':
      await configureStructuralPostCallContent(page);
      await page.getByRole('button', {name: 'Complete Wrap-Up', exact: true}).click();
      await expect(page.getByText('Submission not confirmed', {exact: true})).toHaveCount(0);
      break;
    case 'post-call:response-failed':
      await enqueueAISummaryBridgeSettlement(page, 'postCallResponse', {
        type: 'reject',
        reason: aiSummaryBrowserFixtures.postWrapUpSend.rejected.sendCalls[0].settlement.reason,
      });
      await configureStructuralPostCallContent(page);
      await page.getByRole('button', {name: 'Complete Wrap-Up', exact: true}).click();
      await expect(page.getByText('Submission not confirmed', {exact: true})).toBeVisible();
      const completedButton = page.getByRole('button', {name: 'Complete Wrap-Up', exact: true});
      await expect(completedButton).toBeDisabled();
      await completedButton.dispatchEvent('click');
      expect(await getAISummaryBridgeDiagnostics(page)).toMatchObject({
        requestCounts: {postCallResponse: 1},
        telephonyCalls: {wrapup: 1},
      });
      break;
    case 'post-call:legacy-ineligible':
      await setAISummaryBridgeTaskPhase(page, 'wrapup');
      await page.getByTestId('call-control:wrapup-button').click();
      await expect(page.getByTestId('call-control:wrapup-select')).toBeVisible();
      break;
    case 'lifecycle:interaction-hold-retains':
      await configureStructuralMidCallContent(page);
      await page.getByRole('button', {name: 'Copy Summary', exact: true}).click();
      const beforeHold = await observeAISummaryStore(page);
      await mutateAISummaryBridgeTask(page, 'hold');
      expect(await observeAISummaryStore(page)).toEqual(beforeHold);
      await mutateAISummaryBridgeTask(page, 'resume');
      expect(await observeAISummaryStore(page)).toEqual(beforeHold);
      await expect(page.getByTestId('ai-summary:content')).toContainText('Customer needs billing help');
      break;
    case 'lifecycle:transfer-ownership':
      await configureStructuralMidCallContent(page);
      await replayAISummaryOwnershipHop(page, 0);
      await expect(page.getByTestId('ai-summary:content')).toHaveCount(0);
      break;
    case 'lifecycle:conference-ownership':
      await configureStructuralMidCallContent(page);
      await page.getByRole('button', {name: 'Copy Summary', exact: true}).click();
      const beforeConference = (await observeAISummaryStore(page)).states[0];
      await mutateAISummaryBridgeTask(page, 'conference-start');
      await expect(page.getByTestId('consult-transfer:summary')).toBeVisible();
      expect((await observeAISummaryStore(page)).states[0].counters).toEqual(beforeConference.counters);
      await enqueueAISummaryBridgeSettlement(page, 'midCall', {
        type: 'resolve',
        payload: {
          conversationId: 'interaction-main-1',
          timestamp: Date.now() + 10000,
          summaryText: 'Conference replacement summary',
        },
      });
      await page.evaluate(() => window.__WEBEX_CC_AI_SUMMARY_E2E__?.requestMidCallSummary?.());
      await expect(page.getByTestId('ai-summary:content')).toContainText('Conference replacement summary');
      break;
    default:
      throw new Error(`Unknown AI Summary deterministic state: ${stateId}`);
  }

  await awaitAISummaryCaptureReady(page);
  await page.waitForTimeout(50);
};

export const auditAISummaryAccessibility = async (page: Page, include: AISummaryAxeInclude): Promise<unknown> => {
  const axePath = require.resolve('axe-core/axe.min.js');
  const axeSource = fs.readFileSync(axePath, 'utf8');
  await page.addScriptTag({content: axeSource});
  const result = await page.evaluate(async ({selector}) => {
    if (!selector || typeof selector !== 'string') {
      throw new Error('AISummaryAxeInclude.selector is required');
    }
    const nodes = Array.from(document.querySelectorAll(selector));
    if (nodes.length !== 1 || !(nodes[0] instanceof Element) || !nodes[0].isConnected) {
      throw new Error(`Axe include selector must resolve to one connected element: ${selector}`);
    }
    if (!window.axe) {
      throw new Error('axe-core did not install');
    }
    return window.axe.run(
      {
        include: [selector],
      },
      {
        runOnly: {
          type: 'tag',
          values: ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22a', 'wcag22aa'],
        },
      }
    );
  }, include);
  const violations = (result as {violations?: unknown[]}).violations ?? [];
  expect(violations).toEqual([]);
  return result;
};

const getStructuralAccessibilitySelector = (structuralCase: AISummaryStructuralCase): string => {
  if (structuralCase.mode === 'mid-call-receiver') {
    return '[data-testid="ai-assistant:panel"]';
  }
  if (structuralCase.stateId === 'post-call:legacy-ineligible') {
    return '.wrapup-popover';
  }
  if (structuralCase.mode === 'mid-call-initiator') {
    return '.agent-popover-content--voice';
  }
  if (structuralCase.mode === 'post-call') {
    return '[data-testid="wrap-up-summary"]';
  }
  return '[data-testid="call-control-container"]';
};

const assertStructuralStateAssertion = async (page: Page, assertion: AISummaryStructuralAssertion): Promise<void> => {
  if (assertion.kind !== 'state') {
    return;
  }
  const diagnostics = (await getAISummaryBridgeDiagnostics(page)) as
    | {
        clipboardWrites?: number;
        requestCounts?: {midCall?: number; postCall?: number; midCallResponse?: number; postCallResponse?: number};
        responseStatus?: unknown[];
      }
    | undefined;
  const clipboardWrites = diagnostics?.clipboardWrites ?? 0;
  const requestCounts = diagnostics?.requestCounts ?? {};
  switch (assertion.expected) {
    case 'midCall:1':
      expect(requestCounts.midCall).toBe(1);
      break;
    case 'mid-call:+1':
      expect(clipboardWrites).toBe(1);
      break;
    case 'post-call:outcome-absent-excludes-outcome': {
      expect(clipboardWrites).toBe(1);
      const writes = await page.evaluate(
        () => (window as unknown as {__AI_SUMMARY_CLIPBOARD_WRITES__?: string[]}).__AI_SUMMARY_CLIPBOARD_WRITES__ ?? []
      );
      expect(writes).toHaveLength(1);
      expect(writes[0]).not.toContain('Outcome');
      break;
    }
    case 'mid-call-feedback-confirmed':
      expect(requestCounts.midCallResponse).toBe(1);
      break;
    case 'post-call-response-failed-no-resend':
      expect(requestCounts.postCallResponse).toBe(1);
      break;
    case 'post-call-generation-error-completion-enabled':
      await expect(page.getByRole('button', {name: 'Complete Wrap-Up', exact: true})).not.toBeDisabled();
      break;
    case 'hold-retains-content':
      expect(requestCounts.midCall).toBe(1);
      await expect(page.getByTestId('ai-summary:content')).toBeVisible();
      break;
    case 'transfer-successor-zero':
      expect(requestCounts.midCall).toBe(2);
      await expect(page.getByTestId('ai-summary:content')).toHaveCount(0);
      const successorStates = (await observeAISummaryStore(page)).states;
      expect(successorStates).toHaveLength(1);
      expect(successorStates[0]).toMatchObject({
        ownerKey: {agentId: 'agent-b'},
        counters: {viewed: 0, edited: 0, copied: 0},
      });
      break;
    case 'conference-retains-until-replacement':
      expect(requestCounts.midCall).toBe(2);
      await expect(page.getByTestId('ai-summary:content')).toContainText('Conference replacement summary');
      break;
    default:
      expect(assertion.expected, `Unhandled structural state assertion ${assertion.key}`).toBe('');
  }
};

const assertAISummaryStructuralAssertion = async (
  page: Page,
  assertion: AISummaryStructuralAssertion
): Promise<void> => {
  if (assertion.kind === 'state') {
    await assertStructuralStateAssertion(page, assertion);
    return;
  }
  const expectedPresent = assertion.expected === 'present';
  if (assertion.kind === 'testId') {
    const locator = page.getByTestId(assertion.testId);
    if (expectedPresent) {
      await expect(locator.first(), assertion.description).toBeVisible();
    } else {
      await expect(locator, assertion.description).toHaveCount(0);
    }
    return;
  }
  if (assertion.kind === 'selector') {
    const locator = page.locator(assertion.selector);
    if (expectedPresent) {
      await expect(locator.first(), assertion.description).toBeVisible();
    } else {
      await expect(locator, assertion.description).toHaveCount(0);
    }
    return;
  }
  if (assertion.kind === 'role') {
    const locator = page.getByRole(assertion.role, {name: assertion.name, exact: assertion.exact});
    if (expectedPresent) {
      await expect(locator.first(), assertion.description).toBeVisible();
    } else {
      await expect(locator, assertion.description).toHaveCount(0);
    }
    return;
  }
  const locator = page.getByText(assertion.text, {exact: true});
  if (expectedPresent) {
    await expect(locator.first(), assertion.description).toBeVisible();
  } else {
    await expect(locator, assertion.description).toHaveCount(0);
  }
};

export const assertAISummaryStructuralCase = async (
  page: Page,
  structuralCase: AISummaryStructuralCase
): Promise<VisualStateAssertion[]> => {
  if (!structuralCase.evidenceReason || structuralCase.assertions.length === 0) {
    throw new Error(`Structural case ${structuralCase.stateId} is missing its evidence reason or assertions`);
  }
  const assertions: VisualStateAssertion[] = [
    passedAssertion(
      `structural-reason:${structuralCase.evidenceReason}`,
      `Structural-only case declares ${structuralCase.evidenceReason}.`
    ),
  ];
  for (const assertion of structuralCase.assertions) {
    await assertAISummaryStructuralAssertion(page, assertion);
    assertions.push(
      passedAssertion(
        `structural:${assertion.kind}:${'expected' in assertion ? assertion.expected : 'state'}:${assertion.description}`,
        assertion.description
      )
    );
  }
  return assertions;
};

const sanitizeProcessOutput = (value: string): string =>
  value
    .replace(/\x1B\[[0-?]*[ -/]*[@-~]/g, '')
    .replace(/[^\x09\x0a\x0d\x20-\x7e]/g, '?')
    .slice(0, MB_FLOW_OUTPUT_LIMIT_BYTES);

const attachProcessStderr = async (label: string, stderr: string): Promise<void> => {
  try {
    await test.info().attach(`${label}-stderr.txt`, {
      body: stderr || '(empty stderr)',
      contentType: 'text/plain',
    });
  } catch {
    // test.info() is unavailable outside Playwright test bodies and hooks.
  }
};

const appendCapped = (
  current: string,
  chunk: Buffer,
  seenBytes: number
): {readonly value: string; readonly seenBytes: number; readonly truncated: boolean} => {
  const nextSeenBytes = seenBytes + chunk.length;
  const remaining = Math.max(0, MB_FLOW_OUTPUT_LIMIT_BYTES - Buffer.byteLength(current));
  if (remaining <= 0) {
    return {value: current, seenBytes: nextSeenBytes, truncated: true};
  }
  const nextChunk = chunk.subarray(0, remaining).toString('utf8');
  return {
    value: current + nextChunk,
    seenBytes: nextSeenBytes,
    truncated: chunk.length > remaining || nextSeenBytes > MB_FLOW_OUTPUT_LIMIT_BYTES,
  };
};

const runBoundedProcess = async (
  executable: string,
  args: readonly string[],
  cwd: string
): Promise<{
  readonly stdout: string;
  readonly stderr: string;
  readonly stdoutTruncated: boolean;
  readonly stderrTruncated: boolean;
  readonly exitCode: number | null;
  readonly signal: NodeJS.Signals | null;
  readonly timedOut: boolean;
  readonly spawnError?: Error;
}> =>
  new Promise((resolve) => {
    let stdout = '';
    let stderr = '';
    let stdoutBytes = 0;
    let stderrBytes = 0;
    let stdoutTruncated = false;
    let stderrTruncated = false;
    let timedOut = false;
    let spawnError: Error | undefined;
    const child = spawn(executable, args, {
      cwd,
      stdio: ['ignore', 'pipe', 'pipe'],
    });
    const timer = setTimeout(() => {
      timedOut = true;
      child.kill('SIGKILL');
    }, MB_FLOW_TIMEOUT_MS);
    child.stdout.on('data', (chunk: Buffer) => {
      const next = appendCapped(stdout, chunk, stdoutBytes);
      stdout = next.value;
      stdoutBytes = next.seenBytes;
      stdoutTruncated = stdoutTruncated || next.truncated;
    });
    child.stderr.on('data', (chunk: Buffer) => {
      const next = appendCapped(stderr, chunk, stderrBytes);
      stderr = next.value;
      stderrBytes = next.seenBytes;
      stderrTruncated = stderrTruncated || next.truncated;
    });
    child.once('error', (error) => {
      spawnError = error;
    });
    child.once('close', (exitCode, signal) => {
      clearTimeout(timer);
      resolve({
        stdout: sanitizeProcessOutput(stdout),
        stderr: sanitizeProcessOutput(stderr),
        stdoutTruncated,
        stderrTruncated,
        exitCode,
        signal,
        timedOut,
        spawnError,
      });
    });
  });

const runMBFlow = async (args: readonly string[], cwd = COMMON_CHECKOUT_ROOT): Promise<string> => {
  const result = await runBoundedProcess(getRequiredMBFlowBin(), args, cwd);
  const label = `mb-flow-${args[1] ?? args[0] ?? 'command'}`;
  const abnormal =
    result.spawnError ||
    result.timedOut ||
    result.signal ||
    result.exitCode !== 0 ||
    result.stdoutTruncated ||
    result.stderrTruncated ||
    !result.stdout.trim();
  if (abnormal) {
    await attachProcessStderr(label, result.stderr);
    throw new Error(
      `${label} failed` +
        ` (exit=${result.exitCode ?? 'none'}, signal=${result.signal ?? 'none'}, timedOut=${result.timedOut})` +
        (result.spawnError ? `: ${result.spawnError.message}` : '') +
        (result.stderr ? `: ${result.stderr}` : '')
    );
  }
  return result.stdout;
};

const runMBFlowJson = async <T extends Record<string, unknown>>(
  args: readonly string[],
  cwd = COMMON_CHECKOUT_ROOT
): Promise<T> => {
  const output = await runMBFlow(args, cwd);
  try {
    const parsed = JSON.parse(output) as unknown;
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
      throw new Error('result is not a JSON object');
    }
    return parsed as T;
  } catch (error) {
    await attachProcessStderr(`mb-flow-${args[1] ?? args[0] ?? 'json'}-invalid-json`, output);
    throw new Error(`Invalid JSON from mb-flow ${args.join(' ')}: ${error}`);
  }
};

let productFingerprintPromise: Promise<string> | undefined;

const readProductFingerprint = async (): Promise<string> => {
  const parsed = await runMBFlowJson<{product_sha256?: unknown}>(
    ['prog-mini-js', 'ux-visual-product-fingerprint'],
    TARGET_WORKTREE_ROOT
  );
  if (typeof parsed.product_sha256 !== 'string' || !SHA256_PATTERN.test(parsed.product_sha256)) {
    throw new Error('Missing product fingerprint for UX visual receipt');
  }
  return parsed.product_sha256;
};

const getProductFingerprint = (): Promise<string> => {
  productFingerprintPromise ??= readProductFingerprint();
  return productFingerprintPromise;
};

let attemptOutputRootPrepared = false;

const getVisualEvidenceContext = async (): Promise<VisualEvidenceContext> => ({
  targetRoot: TARGET_WORKTREE_ROOT,
  commonCheckoutRoot: COMMON_CHECKOUT_ROOT,
  planPath: VISUAL_PLAN_PATH,
  phaseRenderRoot: PHASE_RENDER_ROOT,
  outputRoot: OUTPUT_ROOT,
  renderAttemptId: RENDER_ATTEMPT_ID,
  productSha256: await getProductFingerprint(),
  plan: readVisualPlan(),
});

const prepareAttemptOutputRoot = (context: VisualEvidenceContext): void => {
  if (attemptOutputRootPrepared) {
    return;
  }
  const attemptPath = path.join(context.outputRoot, 'attempt-context.json');
  const binding = {
    schemaVersion: 1,
    phase: UX_PHASE,
    renderAttemptId: context.renderAttemptId,
    planSha256: context.plan.plan_sha256,
    evidenceGenerationId: context.plan.evidence_generation_id,
    productSha256: context.productSha256,
    targetWorktreeRoot: context.targetRoot,
    commonCheckoutRoot: context.commonCheckoutRoot,
  };
  if (fs.existsSync(attemptPath)) {
    if (stableStringify(readJsonRecord(attemptPath)) !== stableStringify(binding)) {
      throw new Error('Refusing to reuse a visual attempt with different input bindings');
    }
  } else {
    ensureDir(context.outputRoot);
    writeJsonAtomic(attemptPath, binding);
  }
  attemptOutputRootPrepared = true;
};

const recreateEvidenceDirectory = (context: VisualEvidenceContext, caseRoot: string): void => {
  const resolved = path.resolve(caseRoot);
  const attemptRoot = path.resolve(context.outputRoot);
  if (resolved !== attemptRoot && !resolved.startsWith(`${attemptRoot}${path.sep}`)) {
    throw new Error(`Evidence case path escapes the current render attempt: ${caseRoot}`);
  }
  fs.rmSync(resolved, {recursive: true, force: true});
  ensureDir(resolved);
};

const exportSealedScreenshot = async (
  context: VisualEvidenceContext,
  sourceId: UXSourceId,
  screenshotId: UXScreenshotId,
  targetPath: string
): Promise<void> => {
  const output = path.relative(context.phaseRenderRoot, targetPath);
  if (!output || output.startsWith(`..${path.sep}`) || path.isAbsolute(output)) {
    throw new Error(`Target evidence path escapes the ${UX_PHASE} render directory`);
  }
  const exported = await runMBFlowJson<{
    readonly source_id?: unknown;
    readonly screenshot_id?: unknown;
    readonly sha256?: unknown;
  }>([
    'prog-mini-js',
    'export-ux-screenshot',
    '--source',
    sourceId,
    '--screenshot',
    screenshotId,
    '--phase',
    UX_PHASE,
    '--output',
    output.split(path.sep).join('/'),
    '--ux-input-root',
    context.targetRoot,
  ]);
  if (
    exported.source_id !== sourceId ||
    exported.screenshot_id !== screenshotId ||
    !SHA256_PATTERN.test(String(exported.sha256))
  ) {
    throw new Error(`Invalid export-ux-screenshot result for ${sourceId}/${screenshotId}`);
  }
};

const compareRenderedScreenshot = async (
  context: VisualEvidenceContext,
  evidenceIdentity: AISummaryResolvedVisualEvidenceIdentity,
  sourceHashes: {readonly sceneGraph: string; readonly textContent: string; readonly screenshot: string},
  captureReadiness: AISummaryCaptureReadiness,
  renderedPath: string,
  diffPath: string,
  reportPath: string
): Promise<VisualComparisonArtifact['comparisonReport']> => {
  const {sourceId, screenshotId} = evidenceIdentity.declared;
  const parsed = await runMBFlowJson<{
    readonly diff_sha256?: unknown;
    readonly pixel_diff_percent?: unknown;
    readonly rendered_sha256?: unknown;
    readonly target_sha256?: unknown;
  }>([
    'prog-mini-js',
    'compare-ux-images',
    '--source',
    sourceId,
    '--screenshot',
    screenshotId,
    '--phase',
    UX_PHASE,
    '--rendered',
    renderedPath,
    '--diff',
    diffPath,
    '--report',
    reportPath,
    '--ux-input-root',
    context.targetRoot,
  ]);
  if (
    typeof parsed.diff_sha256 !== 'string' ||
    typeof parsed.rendered_sha256 !== 'string' ||
    typeof parsed.target_sha256 !== 'string' ||
    !SHA256_PATTERN.test(parsed.diff_sha256) ||
    !SHA256_PATTERN.test(parsed.rendered_sha256) ||
    !SHA256_PATTERN.test(parsed.target_sha256) ||
    typeof parsed.pixel_diff_percent !== 'number' ||
    parsed.pixel_diff_percent < 0 ||
    parsed.pixel_diff_percent > 100
  ) {
    throw new Error(`Invalid compare-ux-images result for ${sourceId}/${screenshotId}`);
  }
  const report = readJsonRecord(reportPath);
  const normalizedReport: Record<string, unknown> = {
    ...report,
    comparison_id: `${evidenceIdentity.scenarioId}:deterministic`,
    comparison_identity: evidenceIdentity.scenarioId,
    screen_id: evidenceIdentity.scenarioId,
    declared_screen_id: evidenceIdentity.declared.registryKey,
    registry_key: evidenceIdentity.registryKey,
    declared_identity: evidenceIdentity.declared,
    canonical_identity: evidenceIdentity.canonical,
    source_hashes: sourceHashes,
    font_manifest: AI_SUMMARY_VISUAL_FONT_MANIFEST,
    font_manifest_hash: AI_SUMMARY_VISUAL_FONT_MANIFEST_HASH,
    font_readiness: captureReadiness,
    fontsReady: captureReadiness.fontsReady,
  };
  if (evidenceIdentity.declaredToCanonicalAlias) {
    normalizedReport.declared_to_canonical_alias = evidenceIdentity.declaredToCanonicalAlias;
  }
  // The host may rerun the comparator at reportPath after finalization. Preserve
  // the identity-bearing observation separately so the raw receipt stays bound.
  writeJsonAtomic(path.join(path.dirname(reportPath), 'comparison.identity.json'), withRecordSha256(normalizedReport));
  return {
    diff_sha256: parsed.diff_sha256,
    pixel_diff_percent: parsed.pixel_diff_percent,
    rendered_sha256: parsed.rendered_sha256,
    target_sha256: parsed.target_sha256,
  };
};

const buildFigmaJsonStateMap = (plan: {
  figma_json_sources?: unknown[];
  phase: string;
  source_identity_sha256: string;
}) => {
  const implementationFiles = [
    'packages/contact-center/cc-components/src/components/AISummary/ai-summary.tsx',
    'packages/contact-center/cc-components/src/components/task/CallControl/CallControlCustom/consult-transfer-popover.tsx',
    'packages/contact-center/cc-components/src/components/task/CallControl/CallControlCustom/wrap-up-summary.tsx',
    'packages/contact-center/task/src/ai-summary-mid-call.ts',
    'packages/contact-center/task/src/ai-summary-post-call.ts',
  ].filter((relativePath) => fs.existsSync(path.join(getRepositoryRoot(), relativePath)));

  const states = (plan.figma_json_sources ?? []).flatMap((rawSource) => {
    const source = rawSource as {
      source_id: UXSourceId;
      root_node_id: string;
      state_ids: string[];
      screenshots?: {screenshot_id: UXScreenshotId; state_id: string}[];
    };
    const textNodeIds = getTextNodeIds(source.source_id);
    return source.state_ids.map((fullStateId) => {
      const [journeyId, stateId] = fullStateId.split(':', 2);
      return {
        journey_id: journeyId,
        state_id: stateId,
        source_id: source.source_id,
        figma_state_root_node_id: source.root_node_id,
        screenshot_ids: (source.screenshots ?? [])
          .filter((screenshot) => screenshot.state_id === fullStateId)
          .map((screenshot) => screenshot.screenshot_id),
        consulted_node_ids: [source.root_node_id, ...textNodeIds].slice(0, 12),
        text_node_ids: textNodeIds,
        implementation_files: implementationFiles,
        source_conflicts:
          source.source_id === 'UX-002'
            ? [
                'Sealed text JSON contains a U+005F separator artifact; production renders the requirement-correct U+2014 separator.',
              ]
            : [],
      };
    });
  });

  const stateMap = {
    schema_version: 1,
    phase: plan.phase,
    source_identity_sha256: plan.source_identity_sha256,
    mcp_used: false,
    states,
    map_sha256: '',
  };

  return {
    ...stateMap,
    map_sha256: sha256(stableStringify(stateMap)),
  };
};

const readJsonRecord = (filePath: string): Record<string, unknown> => {
  const value = JSON.parse(fs.readFileSync(filePath, 'utf8')) as unknown;
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new Error(`Expected JSON object: ${filePath}`);
  }
  return value as Record<string, unknown>;
};

const listFilesNamed = (dir: string, fileName: string): string[] => {
  if (!fs.existsSync(dir)) {
    return [];
  }
  const entries = fs.readdirSync(dir, {withFileTypes: true});
  return entries.flatMap((entry) => {
    const entryPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      return listFilesNamed(entryPath, fileName);
    }
    return entry.isFile() && entry.name === fileName ? [entryPath] : [];
  });
};

const visualCaseRoot = (context: VisualEvidenceContext, visualCase: AISummaryVisualCase): string => {
  const identity = resolveAISummaryVisualEvidenceIdentity(visualCase);
  return path.join(context.outputRoot, ...identity.renderPath);
};

const planSourceForVisualCase = (
  context: VisualEvidenceContext,
  visualCase: AISummaryVisualCase
): VisualPlanSourceEntry => {
  const evidenceIdentity = resolveAISummaryVisualEvidenceIdentity(visualCase);
  const sourceEntry = (context.plan.sources ?? []).find(
    (entry) => entry.authority_source_id === visualCase.sourceId && entry.screenshot_id === visualCase.screenshotId
  );
  if (!sourceEntry?.source_id || !sourceEntry.state_id) {
    throw new Error(`Visual plan is missing ${visualCase.sourceId}/${visualCase.screenshotId}`);
  }
  if (sourceEntry.state_id !== visualCase.stateId) {
    throw new Error(
      `Visual plan state mismatch for ${visualCase.sourceId}/${visualCase.screenshotId}: ${sourceEntry.state_id}`
    );
  }
  if (sourceEntry.variant_id !== visualCase.variantId) {
    throw new Error(`Visual plan variant mismatch for ${visualCase.sourceId}/${visualCase.screenshotId}`);
  }
  if (sourceEntry.input_sha256 && sourceEntry.input_sha256 !== evidenceIdentity.declared.sha256) {
    throw new Error(`Visual plan screenshot hash mismatch for ${visualCase.sourceId}/${visualCase.screenshotId}`);
  }
  return sourceEntry;
};

const requireManifestBinding = (
  manifest: Record<string, unknown>,
  context: VisualEvidenceContext,
  label: string
): void => {
  const expected = {
    renderAttemptId: context.renderAttemptId,
    productSha256: context.productSha256,
    planSha256: context.plan.plan_sha256,
    evidenceGenerationId: context.plan.evidence_generation_id,
  };
  for (const [key, value] of Object.entries(expected)) {
    if (manifest[key] !== value) {
      throw new Error(`${label} ${key} is stale or mismatched`);
    }
  }
};

const parseComparisonReport = (reportPath: string): VisualComparisonArtifact['comparisonReport'] => {
  const comparisonReport = readJsonRecord(reportPath);
  const diffSha = comparisonReport.diff_sha256;
  const renderedSha = comparisonReport.rendered_sha256;
  const targetSha = comparisonReport.target_sha256;
  const pixelDiff = comparisonReport.pixel_diff_percent;
  if (
    typeof diffSha !== 'string' ||
    typeof renderedSha !== 'string' ||
    typeof targetSha !== 'string' ||
    !SHA256_PATTERN.test(diffSha) ||
    !SHA256_PATTERN.test(renderedSha) ||
    !SHA256_PATTERN.test(targetSha) ||
    typeof pixelDiff !== 'number'
  ) {
    throw new Error(`Invalid comparison report: ${reportPath}`);
  }
  return {
    diff_sha256: diffSha,
    pixel_diff_percent: pixelDiff,
    rendered_sha256: renderedSha,
    target_sha256: targetSha,
  };
};

const assertJsonValue = (actual: unknown, expected: unknown, label: string): void => {
  if (stableStringify(actual) !== stableStringify(expected)) {
    throw new Error(`${label} is stale or mismatched`);
  }
};

const collectVisualArtifacts = (context: VisualEvidenceContext): VisualComparisonArtifact[] => {
  const artifacts: VisualComparisonArtifact[] = [];
  const expectedPlanSourceIds = new Set<string>();
  const expectedCaseRoots = new Set<string>();
  for (const visualCase of AI_SUMMARY_VISUAL_CASES) {
    const evidenceIdentity = resolveAISummaryVisualEvidenceIdentity(visualCase);
    const sourceEntry = planSourceForVisualCase(context, visualCase);
    expectedPlanSourceIds.add(sourceEntry.source_id);
    const caseRoot = visualCaseRoot(context, visualCase);
    expectedCaseRoots.add(path.resolve(caseRoot));
    const renderedPath = path.join(caseRoot, 'rendered.png');
    const targetPath = path.join(caseRoot, 'target.png');
    const diffPath = path.join(caseRoot, 'diff.png');
    const reportPath = path.join(caseRoot, 'comparison.identity.json');
    const registryPath = path.join(caseRoot, 'registry.json');
    const domPath = path.join(caseRoot, 'dom.json');
    const accessibilityPath = path.join(caseRoot, 'accessibility.json');
    const missing = [renderedPath, targetPath, diffPath, reportPath, registryPath, domPath, accessibilityPath].filter(
      (filePath) => !fs.existsSync(filePath)
    );
    if (missing.length > 0) {
      throw new Error(
        `Visual evidence is incomplete for ${visualCase.sourceId}/${visualCase.screenshotId}: ${missing}`
      );
    }
    const registry = readJsonRecord(registryPath);
    if (registry.comparisonIdentitySha256 !== sha256(fs.readFileSync(reportPath))) {
      throw new Error(`Visual comparison identity hash mismatch for ${visualCase.sourceId}/${visualCase.screenshotId}`);
    }
    requireManifestBinding(registry, context, `registry ${visualCase.sourceId}/${visualCase.screenshotId}`);
    if (
      registry.sourceId !== visualCase.sourceId ||
      registry.screenshotId !== visualCase.screenshotId ||
      registry.registryKey !== evidenceIdentity.registryKey
    ) {
      throw new Error(`Visual registry tuple mismatch for ${visualCase.sourceId}/${visualCase.screenshotId}`);
    }
    assertJsonValue(
      registry.declaredIdentity,
      evidenceIdentity.declared,
      `registry declared identity ${visualCase.sourceId}/${visualCase.screenshotId}`
    );
    assertJsonValue(
      registry.canonicalIdentity,
      evidenceIdentity.canonical,
      `registry canonical identity ${visualCase.sourceId}/${visualCase.screenshotId}`
    );
    assertJsonValue(
      registry.declaredToCanonicalAlias ?? null,
      evidenceIdentity.declaredToCanonicalAlias ?? null,
      `registry evidence alias ${visualCase.sourceId}/${visualCase.screenshotId}`
    );
    assertJsonValue(
      registry.fontManifest,
      AI_SUMMARY_VISUAL_FONT_MANIFEST,
      `registry font manifest ${visualCase.sourceId}/${visualCase.screenshotId}`
    );
    if (registry.fontManifestHash !== AI_SUMMARY_VISUAL_FONT_MANIFEST_HASH) {
      throw new Error(
        `Visual registry font manifest hash mismatch for ${visualCase.sourceId}/${visualCase.screenshotId}`
      );
    }
    assertAISummaryFontReadinessRecord(
      registry.fontReadiness,
      `registry font readiness ${visualCase.sourceId}/${visualCase.screenshotId}`
    );
    const dom = readJsonRecord(domPath);
    if (dom.state_id !== visualCase.stateId) {
      throw new Error(`Visual DOM state mismatch for ${visualCase.sourceId}/${visualCase.screenshotId}`);
    }
    const comparisonReport = parseComparisonReport(reportPath);
    const comparisonRecord = readJsonRecord(reportPath);
    if (
      comparisonRecord.screen_id !== evidenceIdentity.scenarioId ||
      comparisonRecord.declared_screen_id !== evidenceIdentity.declared.registryKey ||
      comparisonRecord.comparison_identity !== evidenceIdentity.scenarioId ||
      comparisonRecord.registry_key !== evidenceIdentity.registryKey
    ) {
      throw new Error(`Visual comparison identity mismatch for ${visualCase.sourceId}/${visualCase.screenshotId}`);
    }
    assertJsonValue(
      comparisonRecord.declared_to_canonical_alias ?? null,
      evidenceIdentity.declaredToCanonicalAlias ?? null,
      `comparison evidence alias ${visualCase.sourceId}/${visualCase.screenshotId}`
    );
    assertJsonValue(
      comparisonRecord.font_manifest,
      AI_SUMMARY_VISUAL_FONT_MANIFEST,
      `comparison font manifest ${visualCase.sourceId}/${visualCase.screenshotId}`
    );
    if (
      comparisonRecord.font_manifest_hash !== AI_SUMMARY_VISUAL_FONT_MANIFEST_HASH ||
      comparisonRecord.fontsReady !== true
    ) {
      throw new Error(
        `Visual comparison font readiness mismatch for ${visualCase.sourceId}/${visualCase.screenshotId}`
      );
    }
    assertAISummaryFontReadinessRecord(
      comparisonRecord.font_readiness,
      `comparison font readiness ${visualCase.sourceId}/${visualCase.screenshotId}`
    );
    if (
      comparisonReport.rendered_sha256 !== sha256(fs.readFileSync(renderedPath)) ||
      comparisonReport.target_sha256 !== sha256(fs.readFileSync(targetPath)) ||
      comparisonReport.diff_sha256 !== sha256(fs.readFileSync(diffPath))
    ) {
      throw new Error(`Visual comparison hashes are stale for ${visualCase.sourceId}/${visualCase.screenshotId}`);
    }
    const viewport = readPngDimensions(renderedPath);
    artifacts.push({
      sourceId: visualCase.sourceId,
      screenshotId: visualCase.screenshotId,
      evidenceIdentity,
      stateId: visualCase.stateId,
      caseRoot,
      comparisonReport,
      sourceEntry,
      viewport,
    });
  }
  const unexpectedPlanEntries = (context.plan.sources ?? []).filter(
    (entry) => entry.source_id && !expectedPlanSourceIds.has(entry.source_id)
  );
  if (unexpectedPlanEntries.length > 0) {
    throw new Error(
      `Visual plan contains unowned screenshot sources: ${unexpectedPlanEntries.map((entry) => entry.source_id)}`
    );
  }
  const extraRegistries = listFilesNamed(context.outputRoot, 'registry.json').filter(
    (registryPath) => !expectedCaseRoots.has(path.dirname(path.resolve(registryPath)))
  );
  if (extraRegistries.length > 0) {
    throw new Error(`Unexpected visual registry records in current attempt: ${extraRegistries}`);
  }
  return artifacts;
};

const collectStructuralArtifacts = (context: VisualEvidenceContext): StructuralEvidenceArtifact[] => {
  const expectedCaseRoots = new Set<string>();
  const artifacts = AI_SUMMARY_STRUCTURAL_CASES.map((structuralCase) => {
    const caseRoot = path.join(context.outputRoot, 'structural', structuralCase.stateId);
    expectedCaseRoots.add(path.resolve(caseRoot));
    const classificationPath = path.join(caseRoot, 'classification.json');
    const domPath = path.join(caseRoot, 'dom.json');
    const accessibilityPath = path.join(caseRoot, 'accessibility.json');
    const missing = [classificationPath, domPath, accessibilityPath].filter((filePath) => !fs.existsSync(filePath));
    if (missing.length > 0) {
      throw new Error(`Structural evidence is incomplete for ${structuralCase.stateId}: ${missing}`);
    }
    const classification = readJsonRecord(classificationPath);
    requireManifestBinding(classification, context, `classification ${structuralCase.stateId}`);
    if (
      classification.stateId !== structuralCase.stateId ||
      classification.evidenceReason !== structuralCase.evidenceReason ||
      classification.screenshotBacked !== false ||
      classification.fabricatedPixelScore !== false
    ) {
      throw new Error(`Structural classification tuple mismatch for ${structuralCase.stateId}`);
    }
    if (structuralCase.sourceId === 'UX-010' && structuralCase.screenshotId === 'S10') {
      const sealedTriple = classification.sealedTriple;
      if (!sealedTriple || typeof sealedTriple !== 'object' || Array.isArray(sealedTriple)) {
        throw new Error('S10 structural evidence must bind the sealed UX triple');
      }
      const runtime = classification.runtime;
      if (!runtime || typeof runtime !== 'object' || Array.isArray(runtime)) {
        throw new Error('S10 structural evidence must include runtime issue counts');
      }
      const runtimeCounts = runtime as {runtimeErrorCount?: unknown; unhandledRejectionCount?: unknown};
      if (runtimeCounts.runtimeErrorCount !== 0 || runtimeCounts.unhandledRejectionCount !== 0) {
        throw new Error('S10 structural evidence must record zero runtime errors and rejections');
      }
    }
    return {structuralCase, caseRoot, classification, domPath, accessibilityPath};
  });
  const extraClassifications = listFilesNamed(
    path.join(context.outputRoot, 'structural'),
    'classification.json'
  ).filter((classificationPath) => !expectedCaseRoots.has(path.dirname(path.resolve(classificationPath))));
  if (extraClassifications.length > 0) {
    throw new Error(`Unexpected structural records in current attempt: ${extraClassifications}`);
  }
  return artifacts;
};

const buildRawVisualEvidence = (
  context: VisualEvidenceContext,
  artifacts: readonly VisualComparisonArtifact[]
): Record<string, unknown> => ({
  schema_version: 1,
  phase: context.plan.phase,
  plan_sha256: context.plan.plan_sha256,
  evidence_generation_id: context.plan.evidence_generation_id,
  render_attempt_id: context.renderAttemptId,
  product_sha256: context.productSha256,
  scenarios: artifacts.map((artifact) => {
    const renderedImage = path.join(artifact.caseRoot, 'rendered.png');
    const domPath = path.join(artifact.caseRoot, 'dom.json');
    const comparisonPath = path.join(artifact.caseRoot, 'comparison.identity.json');
    const scenario: Record<string, unknown> = {
      scenario_id: artifact.evidenceIdentity.declared.registryKey,
      state_id: artifact.stateId,
      source_ids: [artifact.sourceEntry.source_id],
      rendered_image: toCommonCheckoutRelativePath(renderedImage),
      rendered_sha256: sha256(fs.readFileSync(renderedImage)),
      dom_path: toCommonCheckoutRelativePath(domPath),
      dom_sha256: sha256(fs.readFileSync(domPath)),
      comparison_path: toCommonCheckoutRelativePath(comparisonPath),
      comparison_sha256: sha256(fs.readFileSync(comparisonPath)),
    };
    return scenario;
  }),
});

export const finalizeAISummaryVisualEvidence = async (): Promise<void> => {
  const context = await getVisualEvidenceContext();
  const artifacts = collectVisualArtifacts(context);
  collectStructuralArtifacts(context);
  const stateMap = buildFigmaJsonStateMap(context.plan);
  writeJsonAtomic(path.join(context.outputRoot, 'figma-json-state-map.json'), stateMap);
  writeJsonAtomic(path.join(context.outputRoot, 'raw-render.json'), buildRawVisualEvidence(context, artifacts));
  // The closed raw-render contract contains observations, not visual judgments.
  // Declared/canonical aliases remain in registry.json and comparison.identity.json.
  // Only the subsequent model inspection may write iteration_handoff_path or
  // claim that the source and render match; a pixel score is not that approval.
};

export const recordAISummaryVisual = async (
  page: Page,
  ...[sourceId, screenshotId]: AISummaryVisualArgs
): Promise<void> => {
  assertAISummaryVisualRegistry();
  const visualCase: AISummaryVisualCase | undefined = AI_SUMMARY_VISUAL_CASES.find(
    (entry) => entry.sourceId === sourceId && entry.screenshotId === screenshotId
  );
  if (!visualCase) {
    throw new Error(`Unknown AI Summary visual tuple: ${sourceId}/${screenshotId}`);
  }
  const evidenceIdentity = resolveAISummaryVisualEvidenceIdentity(visualCase);
  const screenshotReceipt = getUXReceiptFile(sourceId, 'screenshot');
  if (screenshotReceipt.sha256 !== visualCase.screenshotSha256) {
    throw new Error(`Visual registry hash mismatch for ${sourceId}/${screenshotId}`);
  }
  if (screenshotReceipt.sha256 !== evidenceIdentity.declared.sha256) {
    throw new Error(`Visual declared evidence hash mismatch for ${sourceId}/${screenshotId}`);
  }
  if (screenshotReceipt.sha256 !== evidenceIdentity.canonical.sha256) {
    throw new Error(`Visual canonical evidence hash mismatch for ${sourceId}/${screenshotId}`);
  }
  const sceneReceipt = getUXReceiptFile(sourceId, 'sceneGraph');
  const textReceipt = getUXReceiptFile(sourceId, 'textContent');
  const context = await getVisualEvidenceContext();
  prepareAttemptOutputRoot(context);
  const sourceEntry = planSourceForVisualCase(context, visualCase);
  const caseRoot = visualCaseRoot(context, visualCase);
  recreateEvidenceDirectory(context, caseRoot);
  const sourceDimensions = readPngDimensions(screenshotReceipt.absolutePath);
  const sourceScale = visualCase.scale;
  const stateId = visualCase.stateId;
  if (sourceDimensions.width % sourceScale !== 0 || sourceDimensions.height % sourceScale !== 0) {
    throw new Error(`Sealed screenshot ${sourceId}/${screenshotId} cannot be normalized at ${sourceScale}x`);
  }
  const sourceSize = {
    width: sourceDimensions.width / sourceScale,
    height: sourceDimensions.height / sourceScale,
  };
  const frame = await prepareAISummaryCapture(page, stateId, sourceSize, {
    sourceOrigin: visualCase.crop,
    panelWidth: visualCase.panelWidth,
  });
  const {logicalViewport} = frame;
  const deviceScaleFactor = await page.evaluate(() => window.devicePixelRatio);
  if (deviceScaleFactor !== sourceScale) {
    throw new Error(`Browser device scale ${deviceScaleFactor} does not match declared source scale ${sourceScale}`);
  }
  await exportSealedScreenshot(context, sourceId, screenshotId, path.join(caseRoot, 'target.png'));
  const framingBefore = await observeCaptureFraming(page, frame.bounds, frame.selectors);
  writeJsonAtomic(path.join(caseRoot, 'framing.json'), {before: framingBefore});
  if (!framingBefore.passed) {
    await page.screenshot({path: path.join(caseRoot, 'framing-failure.png')});
    throw new Error(`Capture framing failed for ${sourceId}/${screenshotId}: ${JSON.stringify(framingBefore)}`);
  }
  await assertAISummaryVisualState(page, stateId, true);
  const captureReadiness = await awaitAISummaryCaptureReady(page, evidencePanelSelector(stateId));
  await page.screenshot({path: path.join(caseRoot, 'rendered.png'), clip: frame.bounds});
  const framingAfter = await observeCaptureFraming(page, frame.bounds, frame.selectors);
  writeJsonAtomic(path.join(caseRoot, 'framing.json'), {before: framingBefore, after: framingAfter});
  if (!framingAfter.passed || stableStringify(framingBefore) !== stableStringify(framingAfter)) {
    throw new Error(`Capture framing changed during screenshot: ${sourceId}/${screenshotId}`);
  }
  const renderedDimensions = readPngDimensions(path.join(caseRoot, 'rendered.png'));
  if (renderedDimensions.width !== sourceDimensions.width || renderedDimensions.height !== sourceDimensions.height) {
    throw new Error(
      `Rendered ${renderedDimensions.width}x${renderedDimensions.height} image does not match physical ` +
        `${sourceDimensions.width}x${sourceDimensions.height} source capture`
    );
  }
  const stateAssertions = await assertAISummaryVisualState(page, stateId, true);
  stateAssertions.push(
    passedAssertion(
      'capture:framing-complete',
      'Panel, required landmarks and interaction treatment are inside the source-aligned capture before and after screenshot.'
    )
  );
  const descriptor = JSON.parse(
    fs.readFileSync(path.resolve(getRepositoryRoot(), 'playwright/visual/ai-summary-harness.json'), 'utf8')
  );
  const declaredScenario = descriptor.scenarios.find(
    (entry: {scenario_id: string}) => entry.scenario_id === `${sourceId}/${screenshotId}`
  );
  if (!declaredScenario || declaredScenario.state_id !== stateId) {
    throw new Error(`Harness scenario is missing or bound to another state: ${sourceId}/${screenshotId}`);
  }
  await expect(page.locator(declaredScenario.observed_selector)).toBeVisible();
  const observedAssertions = new Set(stateAssertions.map((entry) => entry.assertion_id));
  for (const expectedAssertion of declaredScenario.expected_assertions as string[]) {
    if (!observedAssertions.has(expectedAssertion)) {
      throw new Error(`Missing browser assertion ${expectedAssertion} for ${sourceId}/${screenshotId}`);
    }
  }
  const productionComponents = productionComponentsForState(stateId);
  const dom = await page.locator(evidenceRootSelector(stateId)).evaluate(
    (node, stateId) => ({
      state_id: stateId,
      capture_kind: 'production-route',
      synthetic_markup: false,
      text: document.body.textContent,
      htmlLength: document.body.outerHTML.length,
    }),
    stateId
  );
  writeJsonAtomic(path.join(caseRoot, 'dom.json'), {
    ...dom,
    production_components: productionComponents,
    state_assertions: stateAssertions,
    capture: {
      logical_viewport: logicalViewport,
      device_scale_factor: deviceScaleFactor,
      source_scale: sourceScale,
      physical_dimensions: renderedDimensions,
      kind: 'clip',
      bounds: frame.bounds,
      framing: {before: framingBefore, after: framingAfter},
      font_readiness: captureReadiness,
    },
  });
  const accessibility = await auditAISummaryAccessibility(page, {
    selector: evidencePanelSelector(stateId),
  });
  writeJsonAtomic(path.join(caseRoot, 'accessibility.json'), accessibility);
  const comparisonReport = await compareRenderedScreenshot(
    context,
    evidenceIdentity,
    {
      sceneGraph: sceneReceipt.sha256,
      textContent: textReceipt.sha256,
      screenshot: screenshotReceipt.sha256,
    },
    captureReadiness,
    path.join(caseRoot, 'rendered.png'),
    path.join(caseRoot, 'diff.png'),
    path.join(caseRoot, 'comparison.json')
  );
  writeJsonAtomic(path.join(caseRoot, 'registry.json'), {
    schemaVersion: 1,
    renderAttemptId: context.renderAttemptId,
    productSha256: context.productSha256,
    planSha256: context.plan.plan_sha256,
    evidenceGenerationId: context.plan.evidence_generation_id,
    sourceId,
    screenshotId,
    sourcePlanId: sourceEntry.source_id,
    canonicalEvidenceId: visualCase.canonicalEvidenceId,
    registryKey: evidenceIdentity.registryKey,
    declaredIdentity: evidenceIdentity.declared,
    canonicalIdentity: evidenceIdentity.canonical,
    declaredToCanonicalAlias: evidenceIdentity.declaredToCanonicalAlias,
    sourceHashes: {
      sceneGraph: sceneReceipt.sha256,
      textContent: textReceipt.sha256,
      screenshot: screenshotReceipt.sha256,
    },
    fontManifest: AI_SUMMARY_VISUAL_FONT_MANIFEST,
    fontManifestHash: AI_SUMMARY_VISUAL_FONT_MANIFEST_HASH,
    fontReadiness: captureReadiness,
    comparisonReport,
    comparisonIdentitySha256: sha256(fs.readFileSync(path.join(caseRoot, 'comparison.identity.json'))),
    metadata: {
      stateId,
      captureKind: 'production-route',
      productionComponents,
      syntheticMarkup: false,
      logicalViewport,
      physicalDimensions: renderedDimensions,
      deviceScaleFactor,
      scale: sourceScale,
      crop: visualCase.crop,
      scenario: visualCase.scenario,
      acceptanceOverride: visualCase.acceptanceOverride,
    },
  });
};

const getAISummaryRuntimeIssueCounts = async (
  page: Page
): Promise<{readonly runtimeErrorCount: number; readonly unhandledRejectionCount: number}> => {
  const runtimeIssues = aiSummaryRuntimeIssues.get(page);
  const browserUnhandledRejections = await page
    .evaluate(
      () =>
        (window as unknown as {__AI_SUMMARY_UNHANDLED_REJECTIONS__?: string[]}).__AI_SUMMARY_UNHANDLED_REJECTIONS__ ??
        []
    )
    .catch(() => []);
  return {
    runtimeErrorCount: runtimeIssues?.pageErrors.length ?? 0,
    unhandledRejectionCount: (runtimeIssues?.unhandledRejectionRecords.length ?? 0) + browserUnhandledRejections.length,
  };
};

export const recordAISummaryStructuralEvidence = async (
  page: Page,
  structuralCase: AISummaryStructuralCase
): Promise<void> => {
  const context = await getVisualEvidenceContext();
  prepareAttemptOutputRoot(context);
  const caseRoot = path.join(context.outputRoot, 'structural', structuralCase.stateId);
  recreateEvidenceDirectory(context, caseRoot);
  const stateAssertions = await assertAISummaryStructuralCase(page, structuralCase);
  const sealedTriple =
    structuralCase.sourceId === 'UX-010' && structuralCase.screenshotId === 'S10'
      ? {
          sourceId: structuralCase.sourceId,
          screenshotId: structuralCase.screenshotId,
          sceneGraph: getUXReceiptFile(structuralCase.sourceId, 'sceneGraph').sha256,
          textContent: getUXReceiptFile(structuralCase.sourceId, 'textContent').sha256,
          screenshot: getUXReceiptFile(structuralCase.sourceId, 'screenshot').sha256,
        }
      : undefined;
  const runtime =
    structuralCase.sourceId === 'UX-010' && structuralCase.screenshotId === 'S10'
      ? await getAISummaryRuntimeIssueCounts(page)
      : undefined;
  if (runtime && (runtime.runtimeErrorCount !== 0 || runtime.unhandledRejectionCount !== 0)) {
    throw new Error('S10 structural evidence observed runtime errors or unhandled rejections');
  }
  const dom = await page.evaluate(
    ({stateId, mode, stateAssertions, sealedTriple, runtime}) => {
      const hasAISummary = Boolean(document.querySelector('[data-testid^="ai-summary:"]'));
      return {
        state_id: stateId,
        capture_kind: 'production-route',
        production_components: [
          'Store',
          'CallControl',
          ...(mode === 'mid-call-receiver' ? ['AIAssistant'] : []),
          ...(hasAISummary ? ['AISummary'] : []),
        ],
        synthetic_markup: false,
        text: document.body.textContent,
        htmlLength: document.body.outerHTML.length,
        state_assertions: stateAssertions,
        sealed_triple: sealedTriple,
        runtime,
      };
    },
    {stateId: structuralCase.stateId, mode: structuralCase.mode, stateAssertions, sealedTriple, runtime}
  );
  writeJsonAtomic(path.join(caseRoot, 'dom.json'), dom);
  const accessibility = await auditAISummaryAccessibility(page, {
    selector: getStructuralAccessibilitySelector(structuralCase),
  });
  writeJsonAtomic(path.join(caseRoot, 'accessibility.json'), accessibility);
  writeJsonAtomic(path.join(caseRoot, 'classification.json'), {
    schemaVersion: 1,
    renderAttemptId: context.renderAttemptId,
    productSha256: context.productSha256,
    planSha256: context.plan.plan_sha256,
    evidenceGenerationId: context.plan.evidence_generation_id,
    ...structuralCase,
    screenshotBacked: false,
    fabricatedPixelScore: false,
    sealedTriple,
    runtime,
  });
};

export const recordAllAISummaryStructuralEvidence = async (page: Page): Promise<void> => {
  for (const structuralCase of AI_SUMMARY_STRUCTURAL_CASES) {
    await driveAISummaryState(page, structuralCase.stateId);
    await recordAISummaryStructuralEvidence(page, structuralCase);
  }
};

export const getAISummaryVisualCases = (): readonly AISummaryVisualCase[] => AI_SUMMARY_VISUAL_CASES;

declare global {
  interface Window {
    axe?: {
      run: (...args: unknown[]) => Promise<unknown>;
    };
  }
}
