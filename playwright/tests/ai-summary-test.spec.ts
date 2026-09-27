import {expect, type Locator, type Page} from '@playwright/test';
import fs from 'node:fs';
import path from 'node:path';
import {
  AI_SUMMARY_RECEIVER_BROWSER_CARD,
  AI_SUMMARY_RESPONSE_FAILURE_SCENARIO,
  AI_SUMMARY_STALE_TIMESTAMP_SCENARIO,
  AI_SUMMARY_TIMEOUT_SCENARIO,
  auditAISummaryAccessibility,
  assertAISummaryStructuralCase,
  disableAISummaryBridgeCapability,
  driveAISummaryState,
  emitReceiverAISummaryBrowserCard,
  enqueueAISummaryBridgeScenario,
  enqueueAISummaryBridgeSettlement,
  getAISummaryRuntimePrivacyAudit,
  getAISummaryBridgeDiagnostics,
  installAISummaryStatusAttributeCallbacks,
  installAISummaryRuntimePrivacySpies,
  installAISummaryRejectionCapture,
  installAISummarySDKMock,
  mutateAISummaryBridgeTask,
  observeCaptureFraming,
  observeAISummaryDestinationPlaceholder,
  observeAISummaryStore,
  awaitAISummaryCaptureReady,
  prepareAISummaryCapture,
  rejectAISummaryBridgeDeferred,
  resolveAISummaryBridgeDeferred,
  replayAISummaryOwnershipHop,
  setAISummaryStatusCallbackThrows,
  setAISummaryBridgeCapability,
  setAISummaryBridgeTaskPhase,
  snapshotAISummaryHostPrivacyState,
  test,
  type AISummaryStatusDiagnostics,
} from '../Utils/aiSummaryUtils';
import {AI_SUMMARY_STRUCTURAL_CASE_REGISTRY, AI_SUMMARY_VISUAL_FONT_MANIFEST} from '../visual/ai-summary-visual-cases';

const getOverflowMetrics = async (locator: Locator) =>
  locator.evaluate((node) => {
    const element = node as HTMLElement;
    const style = getComputedStyle(element);
    return {
      overflowX: style.overflowX,
      overflowY: style.overflowY,
      scrollHeight: element.scrollHeight,
      clientHeight: element.clientHeight,
      scrollWidth: element.scrollWidth,
      clientWidth: element.clientWidth,
    };
  });

const startAISummaryHost = async (page: Page, installOptions?: Parameters<typeof installAISummarySDKMock>[1]) => {
  await installAISummarySDKMock(page, installOptions);
  await page.goto('/?ai-summary-e2e=1');
  await page.getByTestId('samples:init-widgets-button').click();
  await expect(page.getByTestId('call-control-container')).toBeVisible();
};

const getAISummaryDiagnostics = async (page: Page) =>
  (await getAISummaryBridgeDiagnostics(page)) as {
    clipboardWrites?: number;
    lastPostCallResponse?: {numberOfTimesCopied?: number; feedback?: string; wrapUpCode?: string};
    requestCounts?: {postCall?: number; postCallResponse?: number};
  } & AISummaryStatusDiagnostics;

const expectClipboardWriteCount = async (page: Page, expected: number) => {
  await expect.poll(async () => (await getAISummaryDiagnostics(page)).clipboardWrites ?? 0).toBe(expected);
};

const expectAISummaryStatusDetails = async (
  page: Page,
  expected: NonNullable<AISummaryStatusDiagnostics['statusDetails']>
) => {
  await expect.poll(async () => (await getAISummaryDiagnostics(page)).statusDetails ?? []).toEqual(expected);
};

test.describe('AI Summary deterministic browser journeys', () => {
  test.setTimeout(30000);
  test('native unhandled promise rejection is observed by the production test guard', async ({browser}) => {
    const context = await browser.newContext();
    try {
      const probe = await context.newPage();
      const records: string[] = [];
      const pageErrors: string[] = [];
      probe.on('pageerror', (error) => pageErrors.push(error.message));
      await installAISummaryRejectionCapture(probe, (message) => records.push(message));
      await probe.goto('data:text/html,<title>Rejection guard negative control</title>');
      await probe.evaluate(() => {
        void Promise.reject(new Error('AI Summary native rejection control'));
      });
      await expect
        .poll(() => records.some((record) => record.includes('AI Summary native rejection control')))
        .toBe(true);
      await expect.poll(() => pageErrors).toContain('AI Summary native rejection control');
    } finally {
      await context.close();
    }
  });
  for (const structuralCase of AI_SUMMARY_STRUCTURAL_CASE_REGISTRY) {
    test(`observes structural contract ${structuralCase.stateId}`, async ({page}) => {
      await driveAISummaryState(page, structuralCase.stateId);
      const assertions = await assertAISummaryStructuralCase(page, structuralCase);
      await test.info().attach('structural-observation.json', {
        contentType: 'application/json',
        body: JSON.stringify({stateId: structuralCase.stateId, assertions, store: await observeAISummaryStore(page)}),
      });
    });
  }
  test('Inter font is installed same-origin before visual and e2e capture', async ({page}) => {
    await page.goto('/?ai-summary-visual=JNY-002:like-hover&ai-summary-panel-width=400');
    const visualHostSelector = '[data-ai-summary-evidence-root="JNY-002:like-hover"]';
    await expect(page.locator(visualHostSelector)).toBeVisible();
    const visualReadiness = await awaitAISummaryCaptureReady(page, visualHostSelector);
    expect(visualReadiness.fontManifest).toEqual(AI_SUMMARY_VISUAL_FONT_MANIFEST);
    expect(visualReadiness.computedFirstFamily).toBe('Inter');
    expect(visualReadiness.responseHashes).toEqual([
      {
        emittedUrlPath: '/fonts/Inter.var.woff2',
        url: expect.stringMatching(/^http:\/\/127\.0\.0\.1:\d+\/fonts\/Inter\.var\.woff2$/),
        sha256: AI_SUMMARY_VISUAL_FONT_MANIFEST.fonts[0].sha256,
      },
    ]);

    const frame = await prepareAISummaryCapture(page, 'JNY-002:like-hover', {width: 403, height: 624});
    const e2eReadiness = await awaitAISummaryCaptureReady(page, '[data-testid="wrap-up-summary"]');
    expect(e2eReadiness.fontManifest).toEqual(AI_SUMMARY_VISUAL_FONT_MANIFEST);
    expect(e2eReadiness.computedFirstFamily).toBe('Inter');
    expect(frame.bounds).toMatchObject({width: 403, height: 624});
  });

  test('consult source framing preserves heading, summary space and working close control', async ({page}) => {
    const frame = await prepareAISummaryCapture(page, 'JNY-001:mid-call-summary', {width: 482, height: 582});
    const panel = page.locator('.agent-popover');
    await expect(panel.locator('.agent-list .call-control-list-item')).toHaveCount(8);
    const summary = page.getByTestId('consult-transfer:summary');
    const heading = summary.locator('.consult-transfer-summary__heading');
    const headingBox = await heading.boundingBox();
    const contentBox = await summary.locator('.ai-summary__content').boundingBox();
    await page.screenshot({path: test.info().outputPath('consult-source-layout.png'), clip: frame.bounds});
    expect(headingBox?.height).toBeLessThanOrEqual(26);
    expect(contentBox?.height).toBeGreaterThanOrEqual(110);
    const close = panel.getByRole('button', {name: 'Close popover', exact: true});
    await expect(close).toBeVisible();
    await expect(close.locator('mdc-icon[name="cancel-regular"]')).toBeVisible();
    await expect(panel.locator('.consult-search-icon')).toBeVisible();
    await expect(panel.getByTestId('consult-reload-button')).toHaveCount(0);
    const search = panel.getByRole('textbox', {name: 'Search destinations', exact: true});
    await expect(search).toHaveAttribute('placeholder', 'Search by name, queue, entry point or phone number');
    const placeholderMetrics = await observeAISummaryDestinationPlaceholder(page);
    await test.info().attach('S01-placeholder-metrics.json', {
      contentType: 'application/json',
      body: JSON.stringify(placeholderMetrics),
    });
    expect(placeholderMetrics.textWidth, JSON.stringify(placeholderMetrics)).toBeLessThanOrEqual(
      placeholderMetrics.contentWidth
    );
    const categories = panel.getByRole('radiogroup', {name: 'Destination category'});
    await expect(categories.getByRole('radio', {name: 'Agent', exact: true})).toBeChecked();
    await expect(categories.getByRole('radio', {name: 'Queues', exact: true})).toBeVisible();
    await expect(categories.getByRole('radio', {name: 'Dial number', exact: true})).toBeVisible();
    await expect(categories.getByRole('radio', {name: 'Entry point', exact: true})).toBeVisible();
    await expect(categories.getByRole('radio', {name: 'Organization', exact: true})).toHaveCount(0);
    await expect(panel.getByText('1001', {exact: true})).toBeVisible();
    const radioRows = await panel
      .getByRole('radio')
      .evaluateAll((radios) => radios.map((radio) => radio.getBoundingClientRect().top));
    expect(new Set(radioRows).size).toBe(1);
    await close.click();
    await expect(summary).toBeHidden();
    await expect(page.getByTestId('call-control:consult')).toBeFocused();
  });

  test('framing observations reject offscreen, missing and ancestor-clipped controls', async ({page}) => {
    await page.setViewportSize({width: 400, height: 400});
    // Isolated observer regression only: never published as product render evidence.
    await page.setContent('<div id="panel"><button id="action">Action</button></div>');
    const bounds = {x: 0, y: 0, width: 400, height: 400};
    expect((await observeCaptureFraming(page, bounds, ['#action'])).passed).toBe(true);
    expect((await observeCaptureFraming(page, bounds, ['#missing'])).passed).toBe(false);
    await page.locator('#panel').evaluate((node) => {
      node.setAttribute('style', 'height:1px;overflow:hidden');
    });
    expect((await observeCaptureFraming(page, bounds, ['#action'])).passed).toBe(false);
    await page.locator('#panel').evaluate((node) => {
      node.setAttribute('style', 'transform:translateY(-50px)');
    });
    expect((await observeCaptureFraming(page, bounds, ['#action'])).passed).toBe(false);
    await page.locator('#panel').evaluate((node) => {
      node.setAttribute('style', 'opacity:0');
    });
    expect((await observeCaptureFraming(page, bounds, ['#action'])).passed).toBe(false);
  });

  test('short viewport scopes voice panel overflow without changing legacy popovers', async ({page}) => {
    await page.setViewportSize({width: 642, height: 360});
    await driveAISummaryState(page, 'JNY-001:mid-call-summary', 482);

    const shell = page.locator('.agent-popover-content--voice');
    const shellBox = await shell.boundingBox();
    expect(shellBox?.height).toBeLessThanOrEqual(360 * 0.8 + 2);
    await expect(shell.locator('.agent-popover-title')).toBeInViewport();
    await expect(shell.locator('.consult-category-radios')).toBeInViewport();
    await expect(shell.locator('.consult-search-row')).toBeInViewport();
    await expect(shell.locator('.consult-transfer-summary__heading')).toBeInViewport();
    await expect(shell.getByTestId('ai-summary:actions')).toBeInViewport();

    const destinationMetrics = await getOverflowMetrics(shell.locator('.consult-list-container'));
    expect(destinationMetrics.overflowX).toBe('hidden');
    expect(destinationMetrics.overflowY).toBe('auto');
    expect(destinationMetrics.scrollHeight).toBeGreaterThan(destinationMetrics.clientHeight);

    const summaryMetrics = await getOverflowMetrics(shell.getByTestId('ai-summary:content'));
    expect(summaryMetrics.clientHeight).toBeGreaterThan(0);
    expect(summaryMetrics.overflowX).toBe('hidden');
    expect(summaryMetrics.overflowY).toBe('auto');
    expect(summaryMetrics.clientWidth).toBeGreaterThanOrEqual(summaryMetrics.scrollWidth);

    const legacyOverflow = await shell.evaluate((root) => {
      const baseline = document.createElement('div');
      baseline.className = 'agent-popover';
      const legacy = document.createElement('div');
      legacy.className = 'agent-popover-content';
      legacy.setAttribute('data-testid', 'legacy-popover-content');
      legacy.setAttribute('style', 'width:80px;height:40px');
      const overhang = document.createElement('div');
      overhang.setAttribute('style', 'width:160px;height:80px');
      legacy.append(overhang);
      baseline.append(legacy);
      document.body.append(baseline);
      const computed = getComputedStyle(legacy);
      const overflow = {x: computed.overflowX, y: computed.overflowY};
      root.append(legacy);
      baseline.remove();
      return overflow;
    });
    const legacyMetrics = await getOverflowMetrics(page.getByTestId('legacy-popover-content'));
    expect(legacyMetrics.overflowX).toBe(legacyOverflow.x);
    expect(legacyMetrics.overflowY).toBe(legacyOverflow.y);
  });

  test('short viewport keeps wrap-up scroll regions and completion reachable', async ({page}) => {
    await page.setViewportSize({width: 563, height: 360});
    await driveAISummaryState(page, 'JNY-002:like-selected', 400);

    const panel = page.getByTestId('wrap-up-summary');
    const panelBox = await panel.boundingBox();
    expect(panelBox?.height).toBeLessThanOrEqual(360 * 0.8 + 2);
    await expect(panel.locator('.wrap-up-summary__header')).toBeInViewport();

    await panel.getByRole('button', {name: 'Search wrap-up reasons', exact: true}).click();
    const reasonMetrics = await getOverflowMetrics(panel.locator('.wrap-up-summary__reason-group'));
    expect(reasonMetrics.overflowX).toBe('hidden');
    expect(reasonMetrics.overflowY).toBe('auto');
    expect(reasonMetrics.scrollHeight).toBeGreaterThan(reasonMetrics.clientHeight);

    // The SDK journey seeds two reasons; target-image fixtures use a separate inventory.
    await panel.getByRole('radio', {name: 'Resolved', exact: true}).click();
    const complete = panel.getByRole('button', {name: 'Complete Wrap-Up', exact: true});
    await expect(complete).not.toBeDisabled();
    await expect(complete).toBeInViewport();
    await expect(panel.getByTestId('ai-summary:actions')).toBeInViewport();

    const contentMetrics = await getOverflowMetrics(panel.getByTestId('ai-summary:content'));
    expect(contentMetrics.overflowX).toBe('hidden');
    expect(contentMetrics.overflowY).toBe('auto');
    expect(contentMetrics.scrollHeight).toBeGreaterThan(contentMetrics.clientHeight);

    await panel.getByRole('button', {name: 'Search wrap-up reasons', exact: true}).focus();
    let completeFocused = false;
    for (let index = 0; index < 12; index += 1) {
      completeFocused = await complete.evaluate((node) => node === document.activeElement);
      if (completeFocused) {
        break;
      }
      await page.keyboard.press('Tab');
    }
    expect(completeFocused).toBe(true);
    expect(
      await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth)
    ).toBe(true);
  });

  test('feedback hover is circular and selected feedback uses the filled icon without hover paint', async ({page}) => {
    await prepareAISummaryCapture(page, 'JNY-002:like-hover', {width: 403, height: 624});
    const feedbackGroup = page.locator('.ai-summary__feedback-group');
    const separator = page.locator('.ai-summary__action-separator');
    const like = page.getByRole('button', {name: 'This is helpful', exact: true});
    await expect(feedbackGroup).toHaveCSS('width', '44px');
    await expect(feedbackGroup).toHaveCSS('height', '20px');
    await expect(feedbackGroup).toHaveCSS('gap', '4px');
    await expect(separator).toHaveCSS('width', '4px');
    await expect(separator).toHaveCSS('height', '4px');
    await expect(separator).toHaveCSS('opacity', '0.46');
    await expect(like).toHaveCSS('width', '20px');
    await expect(like).toHaveCSS('height', '20px');
    await expect(like).toHaveCSS('border-radius', '50%');
    await expect(like).not.toHaveAttribute('title', /.+/);
    await expect(page.getByRole('tooltip')).toHaveCount(1);
    const tooltip = page.getByRole('tooltip', {name: 'This is helpful', exact: true});
    await expect(tooltip).toHaveCSS('padding-top', '12px');
    await prepareAISummaryCapture(page, 'JNY-002:like-selected', {width: 403, height: 624});
    await expect(like).toHaveAttribute('aria-pressed', 'true');
    await expect(like.locator('mdc-icon')).toHaveAttribute('name', 'like-filled');
    await expect(like).toHaveCSS('background-color', 'rgba(0, 0, 0, 0)');
    await expect(page.getByRole('tooltip')).toHaveCount(0);
    await prepareAISummaryCapture(page, 'JNY-002:dislike-selected', {width: 403, height: 622});
    const dislike = page.getByRole('button', {name: "This isn't helpful", exact: true});
    await expect(dislike).toHaveAttribute('aria-pressed', 'true');
    await expect(dislike.locator('mdc-icon')).toHaveAttribute('name', 'dislike-filled');
    await expect(page.getByRole('tooltip')).toHaveCount(0);
  });

  test('action tooltip is pointer-reachable and Escape-dismissed without focus movement', async ({page}) => {
    await prepareAISummaryCapture(page, 'JNY-002:like-hover', {width: 403, height: 624});
    const like = page.getByRole('button', {name: 'This is helpful', exact: true});
    const tooltip = page.getByRole('tooltip', {name: 'This is helpful', exact: true});
    await expect(tooltip).toHaveCSS('pointer-events', 'auto');

    await tooltip.hover();
    await expect(tooltip).toBeVisible();

    await like.focus();
    await expect(like).toBeFocused();
    await page.keyboard.press('Escape');
    await expect(page.getByRole('tooltip', {name: 'This is helpful', exact: true})).toHaveCount(0);
    await expect(like).toBeFocused();
  });

  test('capture framing keeps the panel heading and actions in view', async ({page}) => {
    const framingCases: readonly {
      state: string;
      width: number;
      height: number;
      sourceOrigin: readonly [number, number];
      panelWidth?: number;
    }[] = [
      {state: 'JNY-001:mid-call-summary', width: 482, height: 582, sourceOrigin: [0, 0]},
      {state: 'JNY-002:editing', width: 443, height: 621, sourceOrigin: [0, 0]},
      {state: 'JNY-002:like-hover', width: 403, height: 624, sourceOrigin: [0, 0]},
      {state: 'JNY-002:dislike-hover', width: 433, height: 621, sourceOrigin: [-2, -1], panelWidth: 400},
      {state: 'JNY-002:copy-hover', width: 441, height: 632, sourceOrigin: [-39, -9]},
      {state: 'JNY-002:copy-selected', width: 403, height: 624, sourceOrigin: [0, 0]},
    ];

    for (const {state, width, height, sourceOrigin, panelWidth} of framingCases) {
      const frame = await prepareAISummaryCapture(page, state, {width, height}, {sourceOrigin, panelWidth});
      const observed = await observeCaptureFraming(page, frame.bounds, frame.selectors);
      await page.screenshot({path: test.info().outputPath(`${state.replace(':', '-')}.png`)});
      expect(observed, JSON.stringify(observed)).toMatchObject({passed: true});
      await page.screenshot({path: test.info().outputPath(`${state.replace(':', '-')}-panel.png`), clip: frame.bounds});
    }
  });

  test('bridge isolation keeps ordinary navigation off the version-1 sample-host bridge', async ({page}) => {
    await installAISummarySDKMock(page);
    await page.goto('/');
    await expect(page.getByTestId('samples:init-widgets-button')).toBeVisible();
    await expect(page.getByTestId('samples:init-widgets-button')).toBeDisabled();
    const ordinaryDiagnostics = (await getAISummaryBridgeDiagnostics(page)) as {
      initializedThroughHostWebex?: boolean;
      webexInitFallbackUsed?: boolean;
      webexConstructorProbe?: unknown;
    };
    expect(ordinaryDiagnostics).toMatchObject({
      initializedThroughHostWebex: false,
      webexInitFallbackUsed: false,
    });
    expect(ordinaryDiagnostics.webexConstructorProbe).toBeUndefined();

    await page.goto('/?ai-summary-e2e=1');
    await page.getByTestId('samples:init-widgets-button').click();
    await expect(page.getByTestId('call-control-container')).toBeVisible();

    const diagnostics = await getAISummaryBridgeDiagnostics(page);
    expect(diagnostics).toMatchObject({
      version: 1,
      initializedThroughHostWebex: true,
      webexInitFallbackUsed: false,
    });
    await page.getByTestId('call-control:consult').click();
    await expect(page.getByTestId('consult-transfer:summary')).toBeVisible();
    await expect
      .poll(async () => {
        const latestDiagnostics = (await getAISummaryBridgeDiagnostics(page)) as {
          requestCounts?: {midCall?: number};
        };
        return latestDiagnostics?.requestCounts?.midCall ?? 0;
      })
      .toBe(1);
    const afterConsultDiagnostics = (await getAISummaryBridgeDiagnostics(page)) as {
      requestCounts?: {midCall?: number; postCall?: number; midCallResponse?: number; postCallResponse?: number};
    };
    expect(afterConsultDiagnostics?.requestCounts).toEqual({
      midCall: 1,
      postCall: 0,
      midCallResponse: 0,
      postCallResponse: 0,
    });
  });

  test('AI summary status public callback delivers ordered allowlisted details and no boundary emissions', async ({
    page,
  }) => {
    await startAISummaryHost(page);
    const publicCallControl = page.locator('widget-cc-call-control');
    await expect(publicCallControl).toHaveCount(1);
    expect(
      await publicCallControl.evaluate(
        (node) => typeof (node as HTMLElement & {onAISummaryStatusChange?: unknown}).onAISummaryStatusChange
      )
    ).toBe('function');
    await expectAISummaryStatusDetails(page, []);

    await setAISummaryBridgeCapability(page, {
      midCallEnabled: true,
      postCallEnabled: true,
      actionTimestamp: 100,
    });
    await mutateAISummaryBridgeTask(page, 'hold');
    await mutateAISummaryBridgeTask(page, 'resume');
    await expectAISummaryStatusDetails(page, []);

    await enqueueAISummaryBridgeSettlement(page, 'midCall', {type: 'resolve'});
    await page.getByTestId('call-control:consult').click();
    await expect(page.getByTestId('consult-transfer:summary')).toBeVisible();
    await expectAISummaryStatusDetails(page, [{kind: 'mid-call', state: 'available'}]);
    await page.locator('.agent-popover-content--voice').getByRole('button', {name: 'Close popover'}).click();

    await setAISummaryBridgeTaskPhase(page, 'wrapup');
    await page.getByTestId('call-control:wrapup-button').click();
    await page.getByRole('radio', {name: 'Billing follow-up', exact: true}).click();
    await expectAISummaryStatusDetails(page, [
      {kind: 'mid-call', state: 'available'},
      {kind: 'post-call', state: 'available'},
    ]);
    await page.getByRole('button', {name: 'Complete Wrap-Up', exact: true}).click();
    await expectAISummaryStatusDetails(page, [
      {kind: 'mid-call', state: 'available'},
      {kind: 'post-call', state: 'available'},
      {kind: 'post-call', state: 'submitted'},
    ]);

    const details = (await getAISummaryDiagnostics(page)).statusDetails ?? [];
    expect(details.map((detail) => Object.keys(detail).sort())).toEqual([
      ['kind', 'state'],
      ['kind', 'state'],
      ['kind', 'state'],
    ]);
  });

  test('AI summary status public callback isolates throws, acknowledges once, and ignores inert attributes', async ({
    page,
  }) => {
    await startAISummaryHost(page);
    await installAISummaryStatusAttributeCallbacks(page);
    await setAISummaryStatusCallbackThrows(page, true);

    await enqueueAISummaryBridgeSettlement(page, 'midCall', {type: 'resolve'});
    await page.getByTestId('call-control:consult').click();
    await expectAISummaryStatusDetails(page, [{kind: 'mid-call', state: 'available'}]);
    await expect.poll(async () => (await getAISummaryDiagnostics(page)).statusCallbackThrowCount ?? 0).toBe(1);
    expect((await getAISummaryDiagnostics(page)).statusAttributeCallbackCalls).toEqual({dashed: 0, undashed: 0});

    await mutateAISummaryBridgeTask(page, 'hold');
    await mutateAISummaryBridgeTask(page, 'resume');
    await expectAISummaryStatusDetails(page, [{kind: 'mid-call', state: 'available'}]);

    await setAISummaryStatusCallbackThrows(page, false);
    await page.locator('.agent-popover-content--voice').getByRole('button', {name: 'Close popover'}).click();
    await setAISummaryBridgeTaskPhase(page, 'wrapup');
    await page.getByTestId('call-control:wrapup-button').click();
    await page.getByRole('radio', {name: 'Billing follow-up', exact: true}).click();
    await expectAISummaryStatusDetails(page, [
      {kind: 'mid-call', state: 'available'},
      {kind: 'post-call', state: 'available'},
    ]);
    await expect.poll(async () => (await getAISummaryDiagnostics(page)).statusCallbackThrowCount ?? 0).toBe(1);
    expect((await getAISummaryDiagnostics(page)).statusAttributeCallbackCalls).toEqual({dashed: 0, undashed: 0});
  });

  test('injected SDK bridge exposes host capabilities and installed package matches the seal', async ({page}) => {
    await startAISummaryHost(page);

    await expect
      .poll(async () => (await getAISummaryDiagnostics(page)).webexConstructorProbe)
      .toEqual(
        expect.objectContaining({
          version: 1,
          packageEntry: '@webex/contact-center',
          hasAuthorization: true,
          hasCc: true,
          hasSameInstanceAuthorizationAndCc: true,
        })
      );
    const probe = (await getAISummaryDiagnostics(page)).webexConstructorProbe;
    // Webex.version belongs to the bundled Webex constructor, not the CC package.
    expect(probe?.constructorVersion).toMatch(/^\d+\.\d+\.\d+/);
    const lock = JSON.parse(fs.readFileSync(path.resolve('design/default/sdk_package_lock.json'), 'utf8'));
    let sdkRoot = path.dirname(require.resolve('@webex/contact-center'));
    while (!fs.existsSync(path.join(sdkRoot, 'package.json'))) {
      const parent = path.dirname(sdkRoot);
      if (parent === sdkRoot) throw new Error('Cannot locate the installed Contact Center package manifest');
      sdkRoot = parent;
    }
    const installed = JSON.parse(fs.readFileSync(path.join(sdkRoot, 'package.json'), 'utf8'));
    expect(lock.sdk.status).toBe('sealed');
    expect(installed.name).toBe('@webex/contact-center');
    expect(installed.version).toBe(lock.sdk.version);
  });

  test('receiver summary branch stays reachable, inert and resource-sanitized in the sample host', async ({page}) => {
    await page.addInitScript(() => {
      Object.defineProperty(navigator, 'clipboard', {
        configurable: true,
        value: {
          writeText: async (text: string) => {
            const win = window as unknown as {__AI_SUMMARY_CLIPBOARD_WRITES__?: string[]};
            win.__AI_SUMMARY_CLIPBOARD_WRITES__ = [...(win.__AI_SUMMARY_CLIPBOARD_WRITES__ ?? []), text];
          },
        },
      });
    });
    await installAISummarySDKMock(page);
    await page.goto('/?ai-summary-e2e=1');
    await page.getByTestId('samples:init-widgets-button').click();
    await expect(page.getByTestId('call-control-container')).toBeVisible();

    await emitReceiverAISummaryBrowserCard(page);
    const trigger = page.getByTestId('ai-assistant:view-summary');
    await expect(trigger).toBeVisible();
    await expect(page.getByTestId('ai-assistant:launcher')).toBeVisible();

    await trigger.click();
    const receiver = page.getByTestId('ai-assistant:receiver-summary');
    await expect(receiver).toContainText('Browser receiver summary');
    expect(
      await page.getByTestId('ai-assistant:panel').evaluate((panel) => panel.contains(document.activeElement))
    ).toBe(true);
    await expect(receiver).toContainText('Action-stripped detail remains visible.');
    await expect(page.getByTestId('ai-assistant:landing')).toHaveCount(0);
    await expect(page.getByTestId('ai-assistant:view-summary')).toHaveCount(0);
    await expect(receiver.getByRole('button', {name: 'Embedded Copy', exact: true})).toHaveCount(0);
    await expect(receiver.getByRole('button', {name: 'Embedded Like', exact: true})).toHaveCount(0);
    await expect(receiver.getByRole('button', {name: 'Top-level action', exact: true})).toHaveCount(0);

    const remoteResourceUrls = await receiver.evaluate((node) =>
      Array.from(node.querySelectorAll<HTMLElement>('*')).flatMap((element) =>
        [element.getAttribute('src'), element.getAttribute('poster'), getComputedStyle(element).backgroundImage]
          .filter((value): value is string => Boolean(value))
          .filter((value) => value.includes('example.invalid'))
      )
    );
    expect(remoteResourceUrls).toEqual([]);

    await receiver.getByRole('button', {name: 'Copy Summary', exact: true}).click();
    await expect
      .poll(() =>
        page.evaluate(
          () =>
            ((window as unknown as {__AI_SUMMARY_CLIPBOARD_WRITES__?: string[]}).__AI_SUMMARY_CLIPBOARD_WRITES__ ?? [])
              .length
        )
      )
      .toBe(1);
    const clipboardWrites = await page.evaluate(
      () => (window as unknown as {__AI_SUMMARY_CLIPBOARD_WRITES__?: string[]}).__AI_SUMMARY_CLIPBOARD_WRITES__ ?? []
    );
    expect(clipboardWrites[0]).toContain('Browser receiver summary');
    expect(clipboardWrites[0]).not.toContain('Embedded');
    const diagnostics = (await getAISummaryBridgeDiagnostics(page)) as {
      requestCounts?: {midCall?: number; postCall?: number; midCallResponse?: number; postCallResponse?: number};
    };
    expect(diagnostics?.requestCounts).toEqual({
      midCall: 0,
      postCall: 0,
      midCallResponse: 0,
      postCallResponse: 0,
    });
  });

  test('runtime rejection capture remains empty for controlled SDK and clipboard failures', async ({page}) => {
    await startAISummaryHost(page);
    await enqueueAISummaryBridgeSettlement(page, 'postCall', {
      type: 'reject',
      reason: {message: 'controlled post-call failure'},
    });
    await setAISummaryBridgeTaskPhase(page, 'wrapup');
    await page.getByTestId('call-control:wrapup-button').click();
    await page.getByRole('radio', {name: 'Billing follow-up', exact: true}).click();
    await expect(page.getByTestId('ai-summary:error')).toBeVisible();

    await page.reload();
    await startAISummaryHost(page);
    await enqueueAISummaryBridgeSettlement(page, 'clipboard', {
      type: 'reject',
      reason: {message: 'controlled clipboard failure'},
    });
    await setAISummaryBridgeTaskPhase(page, 'wrapup');
    await page.getByTestId('call-control:wrapup-button').click();
    await page.getByRole('radio', {name: 'Billing follow-up', exact: true}).click();
    await page.getByRole('button', {name: 'Copy Summary', exact: true}).click();
    await expect(page.getByRole('button', {name: 'Copy Summary', exact: true})).toHaveText('Copy Summary');
    await expect
      .poll(() =>
        page.evaluate(
          () =>
            (window as unknown as {__AI_SUMMARY_UNHANDLED_REJECTIONS__?: string[]})
              .__AI_SUMMARY_UNHANDLED_REJECTIONS__ ?? []
        )
      )
      .toEqual([]);
  });

  test('SDK deadline bounds pending post-call work and Retry admits only one new request', async ({page}) => {
    await page.clock.install({time: new Date('2026-01-01T00:00:00Z')});
    await startAISummaryHost(page);
    await enqueueAISummaryBridgeSettlement(page, 'postCall', {type: 'deferred', id: 'timed-out-generation'});
    await setAISummaryBridgeTaskPhase(page, 'wrapup');
    await page.getByTestId('call-control:wrapup-button').click();
    await page.clock.pauseAt(new Date('2026-01-01T00:00:10Z'));
    await page.getByRole('radio', {name: 'Billing follow-up', exact: true}).click();
    await expect(page.getByTestId('ai-summary:generating')).toBeVisible();
    await page.clock.runFor(14999);
    await expect(page.getByTestId('ai-summary:generating')).toBeVisible();
    await page.clock.runFor(1);
    await expect(page.getByTestId('ai-summary:error')).toBeVisible();
    await enqueueAISummaryBridgeSettlement(page, 'postCall', {type: 'deferred', id: 'retry-generation'});
    await page.getByRole('button', {name: 'Retry', exact: true}).click();
    await expect(page.getByTestId('ai-summary:generating')).toBeVisible();
    await expect(page.getByRole('button', {name: 'Retry', exact: true})).toHaveCount(0);
    await expect(page.getByTestId('wrap-up-summary')).toHaveCount(1);
    await expect.poll(async () => (await getAISummaryDiagnostics(page)).requestCounts?.postCall).toBe(2);
    await resolveAISummaryBridgeDeferred(page, 'timed-out-generation', {
      conversationId: 'interaction-main-1',
      timestamp: 9000,
      summaryText: 'Stale timeout settlement',
    });
    await expect(page.getByTestId('ai-summary:generating')).toBeVisible();
    await resolveAISummaryBridgeDeferred(page, 'retry-generation', {
      conversationId: 'interaction-main-1',
      timestamp: 1000,
      summaryText: 'Fresh retry settlement',
    });
    await expect(page.getByTestId('ai-summary:content')).toContainText('Fresh retry settlement');
    await expect(page.getByTestId('ai-summary:content')).not.toContainText('Stale timeout settlement');
  });

  test('consult waits for pre-action response and blocks repeat actions until settlement', async ({page}) => {
    await startAISummaryHost(page);
    await page.getByTestId('call-control:consult').click();
    await expect(page.getByTestId('ai-summary:content')).toBeVisible();
    await enqueueAISummaryBridgeSettlement(page, 'midCallResponse', {type: 'deferred', id: 'pre-action-response'});
    const destination = page.locator('.agent-list .call-control-list-item').first();
    await destination.hover();
    const action = destination.getByRole('button');
    await action.click();
    await expect(action).toBeDisabled();
    await action.dispatchEvent('click');
    expect(await getAISummaryBridgeDiagnostics(page)).toMatchObject({
      requestCounts: {midCallResponse: 1},
      telephonyCalls: {consult: 0, transfer: 0},
    });
    await resolveAISummaryBridgeDeferred(page, 'pre-action-response', undefined);
    await expect
      .poll(() => getAISummaryBridgeDiagnostics(page))
      .toMatchObject({
        requestCounts: {midCallResponse: 1},
        telephonyCalls: {consult: 1, transfer: 0},
      });
  });

  test('generation-error completion escapes without summary response and failed responses clear on wrap-up', async ({
    page,
  }) => {
    await driveAISummaryState(page, 'post-call:generation-error-completion-escape');
    await page.getByRole('button', {name: 'Complete Wrap-Up', exact: true}).click();
    await expect
      .poll(() => getAISummaryBridgeDiagnostics(page))
      .toMatchObject({
        requestCounts: {postCallResponse: 0},
        telephonyCalls: {wrapup: 1},
      });
    await driveAISummaryState(page, 'post-call:response-failed');
    expect((await observeAISummaryStore(page)).states.some((state) => state.feedbackStatus === 'not-confirmed')).toBe(
      true
    );
    await mutateAISummaryBridgeTask(page, 'wrapped-up');
    await expect.poll(async () => (await observeAISummaryStore(page)).states).toEqual([]);
    expect(await getAISummaryBridgeDiagnostics(page)).toMatchObject({requestCounts: {postCallResponse: 1}});
  });

  test('concurrent direct post-call requests share one panel and accept only the latest generation', async ({page}) => {
    await startAISummaryHost(page);
    await setAISummaryBridgeTaskPhase(page, 'wrapup');
    await page.getByTestId('call-control:wrapup-button').click();
    await page.getByRole('radio', {name: 'Billing follow-up', exact: true}).click();
    await enqueueAISummaryBridgeSettlement(page, 'postCall', {type: 'deferred', id: 'direct-first'});
    await enqueueAISummaryBridgeSettlement(page, 'postCall', {type: 'deferred', id: 'direct-second'});
    await page.evaluate(() => {
      const request = window.__WEBEX_CC_AI_SUMMARY_E2E__?.requestPostCallSummary;
      if (!request) throw new Error('Summary store request bridge unavailable');
      void request(100);
      void request(101);
    });
    await expect(page.getByTestId('wrap-up-summary')).toHaveCount(1);
    await resolveAISummaryBridgeDeferred(page, 'direct-second', {
      conversationId: 'interaction-main-1',
      timestamp: 100,
      summaryText: 'Latest direct generation',
    });
    await expect(page.getByTestId('ai-summary:content')).toContainText('Latest direct generation');
    await resolveAISummaryBridgeDeferred(page, 'direct-first', {
      conversationId: 'interaction-main-1',
      timestamp: 9000,
      summaryText: 'Obsolete direct generation',
    });
    await expect(page.getByTestId('ai-summary:content')).toContainText('Latest direct generation');
    await expect(page.getByTestId('ai-summary:content')).not.toContainText('Obsolete direct generation');
    await expect(page.getByTestId('wrap-up-summary')).toHaveCount(1);
  });

  test('hold and resume preserve receiver focus, summary counters and owner without another generation', async ({
    page,
  }) => {
    await startAISummaryHost(page);
    await emitReceiverAISummaryBrowserCard(page);
    await page.getByTestId('ai-assistant:view-summary').click();
    const copy = page.getByRole('button', {name: 'Copy Summary', exact: true});
    await copy.click();
    await expect(copy).toHaveText('Copied');
    const before = await observeAISummaryStore(page);
    expect(before.states).toHaveLength(1);
    expect(before.states[0].counters).toMatchObject({viewed: 1, copied: 1});
    for (const mutation of ['hold', 'resume'] as const) {
      await mutateAISummaryBridgeTask(page, mutation);
      await expect(copy).toBeFocused();
      await expect(page.getByTestId('ai-assistant:receiver-summary')).toContainText('Browser receiver summary');
      expect(await observeAISummaryStore(page)).toEqual(before);
    }
    expect(await getAISummaryBridgeDiagnostics(page)).toMatchObject({requestCounts: {midCall: 0, postCall: 0}});
  });

  for (const height of [300, 240]) {
    test(`wrap-up completion remains within the panel and ${height}px viewport`, async ({page}) => {
      await page.setViewportSize({width: 563, height});
      await driveAISummaryState(page, 'post-call:canonical-copy', 400);
      const panel = page.getByTestId('wrap-up-summary');
      const complete = panel.getByRole('button', {name: 'Complete Wrap-Up', exact: true});
      const panelBounds = await panel.boundingBox();
      const completeBounds = await complete.boundingBox();
      expect(panelBounds).not.toBeNull();
      expect(completeBounds).not.toBeNull();
      expect(panelBounds!.height).toBeLessThanOrEqual(height * 0.8 + 2);
      expect(completeBounds!.y).toBeGreaterThanOrEqual(panelBounds!.y);
      expect(completeBounds!.y + completeBounds!.height).toBeLessThanOrEqual(panelBounds!.y + panelBounds!.height);
      await expect(complete).toBeInViewport({ratio: 1});
      await complete.focus();
      await expect(complete).toBeFocused();
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    });
  }

  test('receiver widget remount keeps owner content and counters with one new explicit view', async ({page}) => {
    await startAISummaryHost(page);
    await emitReceiverAISummaryBrowserCard(page);
    await page.getByTestId('ai-assistant:view-summary').click();
    await page.getByRole('button', {name: 'Copy Summary', exact: true}).click();
    const before = (await observeAISummaryStore(page)).states[0];
    expect(before.counters).toMatchObject({viewed: 1, copied: 1});
    await page.getByTestId('samples:widget-aiAssistant').uncheck();
    await expect(page.getByTestId('ai-assistant:receiver-summary')).toHaveCount(0);
    expect((await observeAISummaryStore(page)).states[0]).toEqual(before);
    await page.getByTestId('samples:widget-aiAssistant').check();
    await page.getByTestId('ai-assistant:view-summary').click();
    await expect(page.getByTestId('ai-assistant:receiver-summary')).toContainText('Browser receiver summary');
    const after = (await observeAISummaryStore(page)).states[0];
    expect(after.ownerKey).toEqual(before.ownerKey);
    expect(after.contentRevision).toBe(before.contentRevision);
    expect(after.counters).toEqual({...before.counters, viewed: 2});
    expect(await getAISummaryBridgeDiagnostics(page)).toMatchObject({requestCounts: {midCall: 0, postCall: 0}});
  });

  test('production host restores focus when the focused consult summary control is removed', async ({page}) => {
    await installAISummarySDKMock(page);
    await page.goto('/?ai-summary-e2e=1');
    await page.getByTestId('samples:init-widgets-button').click();
    await expect(page.getByTestId('call-control-container')).toBeVisible();

    await page.getByTestId('call-control:consult').click();
    const panel = page.locator('.agent-popover-content--voice');
    await expect(page.getByTestId('consult-transfer:summary')).toBeVisible();
    const lastSummaryControl = page.getByRole('button', {name: "This isn't helpful", exact: true});
    await lastSummaryControl.focus();
    await expect(lastSummaryControl).toBeFocused();

    await disableAISummaryBridgeCapability(page);

    await expect(page.getByTestId('consult-transfer:summary')).toHaveCount(0);
    await expect(panel).toBeFocused();
  });

  test('production host restores focus when the focused wrap-up summary control is removed', async ({page}) => {
    await installAISummarySDKMock(page);
    await page.goto('/?ai-summary-e2e=1');
    await page.getByTestId('samples:init-widgets-button').click();
    await expect(page.getByTestId('call-control-container')).toBeVisible();

    await setAISummaryBridgeTaskPhase(page, 'wrapup');
    await page.getByTestId('call-control:wrapup-button').click();
    const panel = page.getByTestId('wrap-up-summary');
    await expect(panel).toBeVisible();
    await panel.getByRole('radio', {name: 'Billing follow-up', exact: true}).click();
    await expect(panel.getByTestId('ai-summary:actions')).toBeVisible();
    await expect
      .poll(async () => {
        const diagnostics = (await getAISummaryBridgeDiagnostics(page)) as {
          requestCounts?: {postCall?: number};
        };
        return diagnostics?.requestCounts?.postCall ?? 0;
      })
      .toBe(1);
    const lastSummaryControl = panel.getByRole('button', {name: "This isn't helpful", exact: true});
    await lastSummaryControl.focus();
    await expect(lastSummaryControl).toBeFocused();

    await disableAISummaryBridgeCapability(page);

    await expect(panel.getByTestId('wrap-up-summary:body')).toHaveCount(0);
    await expect(panel).toHaveCount(0);
    await expect(page.getByTestId('call-control:wrapup-panel')).toBeFocused();
    const diagnostics = (await getAISummaryBridgeDiagnostics(page)) as {
      requestCounts?: {midCall?: number; postCall?: number; midCallResponse?: number; postCallResponse?: number};
    };
    expect(diagnostics?.requestCounts).toEqual({
      midCall: 0,
      postCall: 1,
      midCallResponse: 0,
      postCallResponse: 0,
    });
  });

  test('production host restores focus when the focused receiver summary control is removed', async ({page}) => {
    await installAISummarySDKMock(page);
    await page.goto('/?ai-summary-e2e=1');
    await page.getByTestId('samples:init-widgets-button').click();
    await expect(page.getByTestId('call-control-container')).toBeVisible();

    await emitReceiverAISummaryBrowserCard(page);
    await page.getByTestId('ai-assistant:view-summary').click();
    const panel = page.getByTestId('ai-assistant:panel');
    await expect(page.getByTestId('ai-assistant:receiver-summary')).toBeVisible();
    const lastSummaryControl = page.getByRole('button', {name: "This isn't helpful", exact: true});
    await lastSummaryControl.focus();
    await expect(lastSummaryControl).toBeFocused();

    await disableAISummaryBridgeCapability(page);

    await expect(page.getByTestId('ai-assistant:receiver-summary')).toHaveCount(0);
    await expect(panel).toBeFocused();
  });

  test('capability revocation hides summaries without resetting selected destinations', async ({page}) => {
    await startAISummaryHost(page);
    await enqueueAISummaryBridgeSettlement(page, 'midCall', {type: 'resolve'});
    await page.getByTestId('call-control:consult').click();
    const panel = page.locator('.agent-popover-content--voice');
    const categories = panel.getByRole('radiogroup', {name: 'Destination category'});
    await expect(page.getByTestId('consult-transfer:summary')).toBeVisible();
    await categories.getByRole('radio', {name: 'Queues', exact: true}).check();
    await expect(categories.getByRole('radio', {name: 'Queues', exact: true})).toBeChecked();

    await setAISummaryBridgeCapability(page, {midCallEnabled: false, postCallEnabled: true});

    await expect(page.getByTestId('consult-transfer:summary')).toHaveCount(0);
    await expect(categories.getByRole('radio', {name: 'Queues', exact: true})).toBeChecked();

    await setAISummaryBridgeCapability(page, {midCallEnabled: true, postCallEnabled: true});
    await panel.getByRole('button', {name: 'Close popover', exact: true}).click();
    await enqueueAISummaryBridgeSettlement(page, 'midCall', {type: 'resolve'});
    await page.getByTestId('call-control:consult').click();
    await expect(page.getByTestId('consult-transfer:summary')).toBeVisible();
  });

  test('reason keyboard navigation commits once and preserves pending reopen latch', async ({page}) => {
    await startAISummaryHost(page);
    await enqueueAISummaryBridgeSettlement(page, 'postCall', {type: 'pending'});
    await setAISummaryBridgeTaskPhase(page, 'wrapup');
    await page.getByTestId('call-control:wrapup-button').click();
    const panel = page.getByTestId('wrap-up-summary');
    const firstReason = panel.getByRole('radio', {name: 'Billing follow-up', exact: true});
    await firstReason.focus();
    await page.keyboard.press('ArrowDown');
    await page.keyboard.press('Enter');
    await expect(page.getByTestId('ai-summary:generating')).toBeVisible();

    await page.keyboard.press('Escape');
    await expect(panel).toBeHidden();
    await page.getByTestId('call-control:wrapup-button').click();
    await expect(page.getByTestId('ai-summary:generating')).toBeVisible();
    const diagnostics = (await getAISummaryBridgeDiagnostics(page)) as {
      requestCounts?: {postCall?: number};
    };
    expect(diagnostics.requestCounts?.postCall).toBe(1);
  });

  test('a newly committed reason accepts its own generation even with a lower source timestamp', async ({page}) => {
    await startAISummaryHost(page);
    await enqueueAISummaryBridgeScenario(page, 'postCall', AI_SUMMARY_STALE_TIMESTAMP_SCENARIO);
    await setAISummaryBridgeTaskPhase(page, 'wrapup');
    await page.getByTestId('call-control:wrapup-button').click();
    await page.getByRole('radio', {name: 'Billing follow-up', exact: true}).click();
    await expect(page.getByTestId('ai-summary:content')).toContainText('newer');

    await page.keyboard.press('Escape');
    await expect(page.getByTestId('wrap-up-summary')).toBeHidden();
    await page.getByTestId('call-control:wrapup-button').click();
    await page.getByRole('radio', {name: 'Resolved', exact: true}).click();

    // A new explicit reason is a new generation; timestamps only compete within a generation.
    await expect(page.getByTestId('ai-summary:content')).toContainText('older');
    await expect(page.getByTestId('ai-summary:content')).not.toContainText('newer');
    const diagnostics = (await getAISummaryBridgeDiagnostics(page)) as {requestCounts?: {postCall?: number}};
    expect(diagnostics.requestCounts?.postCall).toBe(2);
  });

  test('reopening a pending mid-call summary retains the single request and its settlement', async ({page}) => {
    await startAISummaryHost(page);
    await enqueueAISummaryBridgeSettlement(page, 'midCall', {type: 'deferred', id: 'older-mid-call'});
    await page.getByTestId('call-control:consult').click();
    await expect(page.getByTestId('ai-summary:generating')).toBeVisible();
    await page.locator('.agent-popover-content--voice').getByRole('button', {name: 'Close popover'}).click();

    await page.getByTestId('call-control:consult').click();
    await expect(page.getByTestId('ai-summary:generating')).toBeVisible();
    const diagnostics = (await getAISummaryBridgeDiagnostics(page)) as {requestCounts?: {midCall?: number}};
    expect(diagnostics.requestCounts?.midCall).toBe(1);

    await resolveAISummaryBridgeDeferred(page, 'older-mid-call', {
      conversationId: 'interaction-main-1',
      timestamp: 10,
      summaryText: 'Retained pending request summary',
    });

    await expect(page.getByTestId('ai-summary:content')).toContainText('Retained pending request summary');
  });

  test('integrated D1 timeout scenario exposes a recoverable generation error', async ({page}) => {
    await startAISummaryHost(page, {
      scenarios: {postCall: {scenario: AI_SUMMARY_TIMEOUT_SCENARIO, outcome: 'reject'}},
    });
    await setAISummaryBridgeTaskPhase(page, 'wrapup');
    await page.getByTestId('call-control:wrapup-button').click();
    await page.getByRole('radio', {name: 'Billing follow-up', exact: true}).click();
    await expect(page.getByTestId('ai-summary:error')).toBeVisible();
  });

  test('integrated D1 timestamp scenario starts with the higher timestamp payload', async ({page}) => {
    await startAISummaryHost(page, {
      scenarios: {postCall: {scenario: AI_SUMMARY_STALE_TIMESTAMP_SCENARIO}},
    });
    await setAISummaryBridgeTaskPhase(page, 'wrapup');
    await page.getByTestId('call-control:wrapup-button').click();
    await page.getByRole('radio', {name: 'Billing follow-up', exact: true}).click();
    await expect(page.getByTestId('ai-summary:content')).toContainText('newer');
    await expect(page.getByTestId('ai-summary:content')).not.toContainText('older');
  });

  test('integrated D1 response failure does not retry an at-most-once submission', async ({page}) => {
    await startAISummaryHost(page, {
      scenarios: {postCallResponse: {scenario: AI_SUMMARY_RESPONSE_FAILURE_SCENARIO, outcome: 'reject'}},
    });
    await setAISummaryBridgeTaskPhase(page, 'wrapup');
    await page.getByTestId('call-control:wrapup-button').click();
    await page.getByRole('radio', {name: 'Billing follow-up', exact: true}).click();
    await expect(page.getByTestId('ai-summary:content')).toBeVisible();
    await page.getByRole('button', {name: 'Complete Wrap-Up', exact: true}).click();
    await expect(page.getByText('Submission not confirmed', {exact: true})).toBeVisible();
    await expect(page.getByRole('button', {name: 'Retry', exact: true})).toHaveCount(0);
    const responseDiagnostics = (await getAISummaryBridgeDiagnostics(page)) as {
      requestCounts?: {postCallResponse?: number};
    };
    expect(responseDiagnostics.requestCounts?.postCallResponse).toBe(1);
  });

  test('integrated D1 ownership change removes the previous owner summary', async ({page}) => {
    await startAISummaryHost(page);
    await page.getByTestId('call-control:consult').click();
    await page.getByRole('button', {name: 'Copy Summary', exact: true}).click();
    await expect.poll(async () => (await observeAISummaryStore(page)).states[0]?.counters.copied).toBe(1);
    for (const hopIndex of [0, 1] as const) {
      await replayAISummaryOwnershipHop(page, hopIndex);
      await expect(page.getByTestId('ai-summary:content')).toHaveCount(0);
      const states = (await observeAISummaryStore(page)).states;
      expect(states).toHaveLength(1);
      expect(states[0]).toMatchObject({
        ownerKey: {agentId: hopIndex === 0 ? 'agent-b' : 'agent-c'},
        counters: {viewed: 0, edited: 0, copied: 0},
      });
      await resolveAISummaryBridgeDeferred(page, `owner-hop-${hopIndex}`, {
        conversationId: 'interaction-main-1',
        timestamp: 2200 + hopIndex,
        summaryText: `Authenticated successor ${hopIndex} summary`,
      });
      await expect(page.getByTestId('ai-summary:content')).toContainText(`Authenticated successor ${hopIndex} summary`);
      await expect.poll(async () => (await observeAISummaryStore(page)).states[0].counters.viewed).toBe(1);
    }
  });

  test('same-agent conference retains authenticated owner and the selected destination node', async ({page}) => {
    await startAISummaryHost(page);
    await page.getByTestId('call-control:consult').click();
    const destination = page.getByRole('radio', {name: 'Queues', exact: true});
    await destination.check();
    const originalNode = await destination.elementHandle();
    const before = (await observeAISummaryStore(page)).states[0];
    await mutateAISummaryBridgeTask(page, 'conference-start');
    const after = (await observeAISummaryStore(page)).states[0];
    expect(after.ownerKey).toEqual(before.ownerKey);
    expect(after.counters).toEqual(before.counters);
    await expect(destination).toBeChecked();
    expect(await destination.evaluate((node, prior) => node === prior, originalNode)).toBe(true);
  });

  test('conference carry-forward and clipboard fulfillment/rejection counters stay scoped', async ({page}) => {
    await startAISummaryHost(page);
    await enqueueAISummaryBridgeSettlement(page, 'midCall', {type: 'resolve'});
    await page.getByTestId('call-control:consult').click();
    await page.getByRole('button', {name: 'Copy Summary', exact: true}).click();
    await expect(page.getByRole('button', {name: 'Copy Summary', exact: true})).toHaveText('Copied');
    await mutateAISummaryBridgeTask(page, 'conference-start');
    await expect(page.getByTestId('consult-transfer:summary')).toBeVisible();
    await page.locator('.agent-popover-content--voice').getByRole('button', {name: 'Close popover'}).click();

    await emitReceiverAISummaryBrowserCard(page);
    await page.getByTestId('ai-assistant:view-summary').click();
    await page.getByTestId('ai-assistant:receiver-summary').getByRole('button', {name: 'Copy Summary'}).click();
    await page.getByTestId('ai-assistant:header-close').click();

    await setAISummaryBridgeTaskPhase(page, 'wrapup');
    await page.getByTestId('call-control:wrapup-button').click();
    await page.getByRole('radio', {name: 'Billing follow-up', exact: true}).click();
    await page.getByTestId('wrap-up-summary').getByRole('button', {name: 'Copy Summary'}).click();
    const fulfilledDiagnostics = (await getAISummaryBridgeDiagnostics(page)) as {clipboardWrites?: number};
    expect(fulfilledDiagnostics.clipboardWrites).toBe(3);

    await page.evaluate(() => {
      Object.defineProperty(navigator, 'clipboard', {
        configurable: true,
        value: {writeText: () => Promise.reject(new Error('clipboard unavailable'))},
      });
    });
    await page.getByTestId('wrap-up-summary').getByRole('button', {name: 'Copy Summary'}).click();
    const rejectedDiagnostics = (await getAISummaryBridgeDiagnostics(page)) as {clipboardWrites?: number};
    expect(rejectedDiagnostics.clipboardWrites).toBe(3);
  });

  test('integrated clipboard lifecycle proves pending, rejection, copied counter and reset boundaries', async ({
    page,
  }) => {
    await page.clock.install({time: new Date('2026-01-01T00:00:00Z')});
    await startAISummaryHost(page);
    await setAISummaryBridgeTaskPhase(page, 'wrapup');
    await page.getByTestId('call-control:wrapup-button').click();
    await page.getByRole('radio', {name: 'Billing follow-up', exact: true}).click();
    const copy = page.getByRole('button', {name: 'Copy Summary', exact: true});
    await expect(copy).toHaveText('Copy Summary');
    await page.clock.pauseAt(new Date('2026-01-01T00:00:10Z'));

    await enqueueAISummaryBridgeSettlement(page, 'clipboard', {type: 'deferred', id: 'clipboard-rejection'});
    await copy.click();
    await expect(copy).toHaveText('Copy Summary');
    await expectClipboardWriteCount(page, 0);
    await rejectAISummaryBridgeDeferred(page, 'clipboard-rejection', {message: 'clipboard rejected'});
    await expect(copy).toHaveText('Copy Summary');
    await expectClipboardWriteCount(page, 0);

    await enqueueAISummaryBridgeSettlement(page, 'clipboard', {type: 'resolve'});
    await copy.click();
    await expect(copy).toHaveText('Copied');
    await expectClipboardWriteCount(page, 1);
    await page.clock.runFor(1499);
    await expect(copy).toHaveText('Copied');
    await page.clock.runFor(1);
    await expect(copy).toHaveText('Copy Summary');

    await enqueueAISummaryBridgeSettlement(page, 'clipboard', {type: 'resolve'});
    await copy.click();
    await expect(copy).toHaveText('Copied');
    await page.clock.runFor(1000);
    await expect(copy).toHaveText('Copied');
    await enqueueAISummaryBridgeSettlement(page, 'clipboard', {type: 'resolve'});
    await copy.click();
    await expect(copy).toHaveText('Copied');
    await expectClipboardWriteCount(page, 3);
    await page.clock.runFor(1499);
    await expect(copy).toHaveText('Copied');
    await page.clock.runFor(1);
    await expect(copy).toHaveText('Copy Summary');

    await enqueueAISummaryBridgeSettlement(page, 'clipboard', {type: 'resolve'});
    await copy.click();
    await expect(copy).toHaveText('Copied');
    await expectClipboardWriteCount(page, 4);
    await copy.focus();
    await page.keyboard.press('Tab');
    await expect(copy).toHaveText('Copy Summary');

    await page.getByRole('button', {name: 'Complete Wrap-Up', exact: true}).click();
    await expect
      .poll(async () => (await getAISummaryDiagnostics(page)).lastPostCallResponse?.numberOfTimesCopied)
      .toBe(4);

    await page.clock.resume();
    await page.reload();
    await startAISummaryHost(page);
    await emitReceiverAISummaryBrowserCard(page);
    await page.getByTestId('ai-assistant:view-summary').click();
    await page.clock.pauseAt(new Date('2026-01-01T00:00:20Z'));
    const replacementCopy = page.getByRole('button', {name: 'Copy Summary', exact: true});
    await replacementCopy.click();
    await expect(replacementCopy).toHaveText('Copied');
    await expect(replacementCopy).toBeFocused();
    const originalCopyNode = await replacementCopy.elementHandle();
    await emitReceiverAISummaryBrowserCard(page, {
      ...AI_SUMMARY_RECEIVER_BROWSER_CARD,
      timestamp: 4000,
      adaptiveCard: {
        type: 'AdaptiveCard',
        version: '1.5',
        body: [{type: 'TextBlock', text: 'Replacement receiver summary'}],
      },
    });
    await expect(page.getByTestId('ai-assistant:receiver-summary')).toContainText('Replacement receiver summary');
    expect(await replacementCopy.evaluate((node, prior) => node === prior, originalCopyNode)).toBe(true);
    await expect(replacementCopy).toBeFocused();
    await expect(replacementCopy).toHaveText('Copy Summary');
  });

  test('summary journey stays memory-only and never writes clipboard after visual reset, replacement or unmount', async ({
    page,
  }) => {
    await page.clock.install({time: new Date('2026-01-01T00:00:00Z')});
    await startAISummaryHost(page);
    const bootstrapHostState = await snapshotAISummaryHostPrivacyState(page);
    // The ordinary call timer deletes these existing session keys on wrap-up.
    // No summary storage, writes, clears, or other key deletions are allowed.
    await installAISummaryRuntimePrivacySpies(page, [
      'cc-widget-hold-anchor:leg-main-1',
      'cc-widget-consult-hold-anchor:leg-main-1',
    ]);

    await page.clock.pauseAt(new Date('2026-01-01T00:00:30Z'));
    await setAISummaryBridgeTaskPhase(page, 'wrapup');
    await page.getByTestId('call-control:wrapup-button').click();
    const panel = page.getByTestId('wrap-up-summary');
    await panel.getByRole('radio', {name: 'Billing follow-up', exact: true}).click();
    await expect(panel.getByTestId('ai-summary:content')).toContainText(
      'Customer called about an invoice discrepancy.'
    );

    await panel.getByRole('button', {name: 'Edit Initial contact reason', exact: true}).click();
    const editor = panel.getByRole('textbox', {name: 'Initial contact reason', exact: true});
    await editor.fill('Edited memory-only summary draft.');
    await expect(editor).toHaveValue('Edited memory-only summary draft.');

    const copy = panel.getByRole('button', {name: 'Copy Summary', exact: true});
    await copy.click();
    await expect(copy).toHaveText('Copied');
    await expectClipboardWriteCount(page, 1);
    await page.clock.runFor(1500);
    await expect(copy).toHaveText('Copy Summary');
    await expectClipboardWriteCount(page, 1);

    const like = panel.getByRole('button', {name: 'This is helpful', exact: true});
    await like.click();
    await expect(like).toHaveAttribute('aria-pressed', 'true');
    await expect(page.getByText('Pending submission', {exact: true})).toBeVisible();

    await enqueueAISummaryBridgeSettlement(page, 'postCall', {
      type: 'resolve',
      payload: {
        conversationId: 'interaction-main-1',
        timestamp: 5000,
        languageCode: 'en-US',
        areTranscriptsAvailable: true,
        sections: {
          initialContactReason: 'Replacement memory-only summary.',
          nextSteps: 'Finish wrap-up without persistence.',
        },
        summaryText: 'Replacement memory-only summary.',
        resolution: 'Resolved without persistence.',
      },
    });
    await panel.getByRole('button', {name: 'Search wrap-up reasons', exact: true}).click();
    await panel.getByRole('radio', {name: 'Resolved', exact: true}).click();
    await expect(panel.getByTestId('ai-summary:content')).toContainText('Replacement memory-only summary.');
    await expectClipboardWriteCount(page, 1);

    await page.getByRole('button', {name: 'Complete Wrap-Up', exact: true}).click();
    await expect
      .poll(async () => (await getAISummaryDiagnostics(page)).lastPostCallResponse?.wrapUpCode)
      .toBe('aux-code-resolved');
    await disableAISummaryBridgeCapability(page);
    await expect(panel.getByTestId('wrap-up-summary:body')).toHaveCount(0);
    await page.clock.runFor(1500);
    await expectClipboardWriteCount(page, 1);

    const privacy = await getAISummaryRuntimePrivacyAudit(page);
    expect(privacy.records.length).toBeGreaterThan(0);
    for (const operation of privacy.records) {
      expect(operation).toEqual({api: 'ExpectedSessionCleanup', method: 'removeItem'});
    }
    expect(await snapshotAISummaryHostPrivacyState(page)).toEqual(bootstrapHostState);
  });

  test('privacy audit distinguishes exact legacy cleanup from forbidden persistence operations', async ({page}) => {
    await startAISummaryHost(page);
    await installAISummaryRuntimePrivacySpies(page, ['known-legacy-key']);
    await page.evaluate(() => {
      sessionStorage.removeItem('known-legacy-key');
      sessionStorage.removeItem('other-key');
      localStorage.removeItem('known-legacy-key');
      sessionStorage.setItem('known-legacy-key', 'synthetic-test-value');
    });
    expect(await getAISummaryRuntimePrivacyAudit(page)).toEqual({
      records: [
        {api: 'ExpectedSessionCleanup', method: 'removeItem'},
        {api: 'Storage', method: 'removeItem'},
        {api: 'Storage', method: 'removeItem'},
        {api: 'Storage', method: 'setItem'},
      ],
    });
  });

  test('rejected feedback leaves selected state unchanged', async ({page}) => {
    await startAISummaryHost(page);
    await enqueueAISummaryBridgeSettlement(page, 'midCallResponse', {
      type: 'reject',
      reason: {message: 'feedback rejected'},
    });
    await enqueueAISummaryBridgeSettlement(page, 'midCall', {type: 'resolve'});
    await page.getByTestId('call-control:consult').click();
    const like = page.getByRole('button', {name: 'This is helpful', exact: true});
    await like.click();
    await expect(like).toHaveAttribute('aria-pressed', 'false');
  });

  test('integrated post-call feedback transitions cover pending, not-confirmed, confirmed and reselection', async ({
    page,
  }) => {
    await startAISummaryHost(page);
    await setAISummaryBridgeTaskPhase(page, 'wrapup');
    await page.getByTestId('call-control:wrapup-button').click();
    await page.getByRole('radio', {name: 'Billing follow-up', exact: true}).click();
    const like = page.getByRole('button', {name: 'This is helpful', exact: true});
    const dislike = page.getByRole('button', {name: "This isn't helpful", exact: true});

    await like.click();
    await expect(like).toHaveAttribute('aria-pressed', 'true');
    await expect(dislike).toHaveAttribute('aria-pressed', 'false');
    const pendingStatus = page.getByText('Pending submission', {exact: true});
    await expect(pendingStatus).toBeVisible();
    const pendingDescriptionId = await pendingStatus.getAttribute('id');
    expect(pendingDescriptionId).toBeTruthy();
    await expect(like).toHaveAttribute('aria-describedby', pendingDescriptionId as string);
    await expect(dislike).toHaveAttribute('aria-describedby', pendingDescriptionId as string);

    await dislike.click();
    await expect(like).toHaveAttribute('aria-pressed', 'false');
    await expect(dislike).toHaveAttribute('aria-pressed', 'true');
    await expect(pendingStatus).toBeVisible();
    await dislike.click();
    await expect(dislike).toHaveAttribute('aria-pressed', 'true');
    await expect(pendingStatus).toBeVisible();

    await enqueueAISummaryBridgeSettlement(page, 'postCallResponse', {
      type: 'reject',
      reason: {message: 'post-call feedback response failed'},
    });
    await page.getByRole('button', {name: 'Complete Wrap-Up', exact: true}).click();
    const notConfirmedStatus = page.getByText('Submission not confirmed', {exact: true});
    await expect(notConfirmedStatus).toBeVisible();
    const notConfirmedDescriptionId = await notConfirmedStatus.getAttribute('id');
    expect(notConfirmedDescriptionId).toBeTruthy();
    await expect(like).toHaveAttribute('aria-describedby', notConfirmedDescriptionId as string);
    await expect(dislike).toHaveAttribute('aria-describedby', notConfirmedDescriptionId as string);
    await expect.poll(async () => (await getAISummaryDiagnostics(page)).requestCounts?.postCallResponse).toBe(1);

    await page.reload();
    await startAISummaryHost(page);
    await setAISummaryBridgeTaskPhase(page, 'wrapup');
    await page.getByTestId('call-control:wrapup-button').click();
    await page.getByRole('radio', {name: 'Billing follow-up', exact: true}).click();
    const confirmedLike = page.getByRole('button', {name: 'This is helpful', exact: true});
    await confirmedLike.click();
    await expect(page.getByText('Pending submission', {exact: true})).toBeVisible();
    await page.getByRole('button', {name: 'Complete Wrap-Up', exact: true}).click();
    await expect(page.getByText('Pending submission', {exact: true})).toHaveCount(0);
    await expect(page.getByText('Submission not confirmed', {exact: true})).toHaveCount(0);
    await expect
      .poll(async () => (await getAISummaryDiagnostics(page)).lastPostCallResponse?.feedback)
      .toBe('thumbs_up');
  });

  test('320px and forced-colors layouts keep scoped overflow and accessibility', async ({page}) => {
    await page.setViewportSize({width: 320, height: 640});
    await driveAISummaryState(page, 'post-call:outcome-absent');
    const panel = page.getByTestId('wrap-up-summary');
    const expandedMetrics = await getOverflowMetrics(panel.getByTestId('ai-summary:content'));
    expect(expandedMetrics.overflowX).toBe('hidden');
    expect(expandedMetrics.clientWidth).toBeGreaterThan(0);
    await panel.getByRole('button', {name: 'Search wrap-up reasons', exact: true}).click();
    const collapsedMetrics = await getOverflowMetrics(panel.locator('.wrap-up-summary__reason-group'));
    expect(collapsedMetrics.overflowX).toBe('hidden');
    await page.emulateMedia({forcedColors: 'active'});
    await expect(panel.getByRole('button', {name: 'Complete Wrap-Up', exact: true})).toBeInViewport({ratio: 1});
    const overflow = await page.evaluate(() => ({
      viewport: innerWidth,
      documentWidth: document.documentElement.scrollWidth,
      elements: Array.from(document.querySelectorAll('body *'))
        .filter((node) => {
          const rect = node.getBoundingClientRect();
          return rect.width > 0 && rect.right > innerWidth + 1;
        })
        .slice(0, 12)
        .map((node) => ({
          tag: node.tagName,
          className: String(node.className),
          right: node.getBoundingClientRect().right,
        })),
    }));
    expect(overflow.documentWidth, JSON.stringify(overflow)).toBeLessThanOrEqual(overflow.viewport);
    await auditAISummaryAccessibility(page, {selector: '[data-testid="wrap-up-summary"]'});
  });

  test('canonical labels and punctuation are delimiter-free in DOM and accessibility text', async ({page}) => {
    await driveAISummaryState(page, 'post-call:canonical-copy');
    const panel = page.getByTestId('wrap-up-summary');
    await panel.getByRole('button', {name: 'Search wrap-up reasons'}).click();
    await expect(panel.getByPlaceholder('Search topic')).toBeVisible();
    const complete = panel.getByRole('button', {name: 'Complete Wrap-Up', exact: true});
    await expect(complete).toContainText('Complete Wrap-Up');
    await expect(complete).toHaveAttribute('title', 'Complete Wrap-Up');
    await expect(panel.getByRole('button', {name: 'Edit Initial contact reason'})).toContainText(
      /Help activating a new Webex plan/
    );
    await expect(panel).not.toContainText('%');
    await expect(panel).not.toContainText('_');
    await page.evaluate(() => {
      Object.defineProperty(navigator, 'clipboard', {
        configurable: true,
        value: {
          writeText: async (text: string) => {
            const win = window as unknown as {__AI_SUMMARY_CLIPBOARD_WRITES__?: string[]};
            win.__AI_SUMMARY_CLIPBOARD_WRITES__ = [...(win.__AI_SUMMARY_CLIPBOARD_WRITES__ ?? []), text];
          },
        },
      });
    });
    await panel.getByRole('button', {name: 'Copy Summary', exact: true}).click();
    await expect
      .poll(() =>
        page.evaluate(() => {
          const win = window as unknown as {__AI_SUMMARY_CLIPBOARD_WRITES__?: string[]};
          return win.__AI_SUMMARY_CLIPBOARD_WRITES__ ?? [];
        })
      )
      .toEqual([
        [
          'Initial contact reason: Help activating a new Webex plan.',
          'Additional contact reason(s): Inquiry about transferring meeting history from a previous Webex account.',
          'Additional context: Customer also asked about transferring meeting history.',
          'Key Actions Taken: Guided activation via browser\nLinked plan to correct account',
          'Outcome: Activation complete. Meeting history transfer pending sync fix (unsolved).',
          'Next Steps: Support team resolving sync issue (48 hrs)\nCustomer will get email + SMS once done',
        ].join('\n\n'),
      ]);
    await auditAISummaryAccessibility(page, {selector: '[data-testid="wrap-up-summary"]'});
  });

  test('production bridge host preserves voice categories, editable content and icon actions', async ({page}) => {
    await page.setViewportSize({width: 482, height: 582});
    await driveAISummaryState(page, 'JNY-001:mid-call-summary');
    await page.screenshot({path: test.info().outputPath('S01-diagnostic.png')});
    const categories = page.getByRole('radiogroup', {name: 'Destination category'});
    await expect(categories.getByRole('radio')).toHaveCount(4);
    await categories.getByRole('radio', {name: 'Queues', exact: true}).check();
    await expect(categories.getByRole('radio', {name: 'Queues', exact: true})).toBeChecked();
    await categories.getByRole('radio', {name: 'Agent', exact: true}).check();
    await expect(categories.getByRole('radio', {name: 'Agent', exact: true})).toBeChecked();
    await expect(categories.getByRole('radio', {name: 'Dial number', exact: true})).toBeVisible();
    await expect(categories.getByRole('radio', {name: 'Entry point', exact: true})).toBeVisible();

    await page.setViewportSize({width: 443, height: 621});
    await driveAISummaryState(page, 'JNY-002:editing');
    // Collapsed reason selection does not add a duplicate divider above the title.
    await expect(page.getByTestId('wrap-up-summary:body')).toHaveCSS('border-top-width', '0px');
    await page.screenshot({path: test.info().outputPath('S03-diagnostic.png')});
    const surface = page.getByTestId('ai-summary:editor-surface');
    await expect(surface).toHaveCSS('border-top-width', '1px');
    const editor = surface.getByRole('textbox', {name: 'Summary', exact: true});
    await expect(editor).toHaveCSS('border-top-width', '0px');
    await expect(editor).toHaveCSS('resize', 'none');
    await editor.fill('Edited summary retained through a controlled render.');
    await expect(editor).toHaveValue('Edited summary retained through a controlled render.');
    for (const label of ['Copy Summary', 'This is helpful', "This isn't helpful"]) {
      const action = surface.getByRole('button', {name: label, exact: true});
      await expect(action.locator('mdc-icon')).toBeVisible();
      await expect(action).not.toHaveAttribute('title', /.+/);
    }
    await surface.getByRole('button', {name: 'This is helpful', exact: true}).hover();
    await expect(page.getByRole('tooltip')).toHaveCount(1);
    await expect(page.getByRole('tooltip', {name: 'This is helpful', exact: true})).toBeVisible();

    await driveAISummaryState(page, 'JNY-002:like-selected');
    await page.getByRole('button', {name: 'Edit Initial contact reason'}).click();
    const keyed = page.getByRole('textbox', {name: 'Initial contact reason'});
    await keyed.fill('Edited keyed section');
    await expect(keyed).toHaveValue('Edited keyed section');
    await expect(page.getByRole('button', {name: 'Edit Next Steps'})).toContainText(/48 hrs/);
    await expect(page.getByRole('textbox', {name: 'Outcome'})).toHaveCount(0);
    await page.setViewportSize({width: 403, height: 624});
    await driveAISummaryState(page, 'JNY-002:like-hover');
    await page.screenshot({path: test.info().outputPath('S04-diagnostic.png')});
    for (const state of ['dislike-hover', 'dislike-selected', 'copy-hover', 'copy-selected', 'generating', 'error']) {
      await driveAISummaryState(page, `JNY-002:${state}`);
    }
    await driveAISummaryState(page, 'post-call:zero-match-reason-query');
    await expect(page.getByText('No wrap-up reasons match your search.')).toBeVisible();
    const clearSearch = page.getByTestId('wrap-up-summary').getByRole('button', {name: 'Clear search', exact: true});
    await expect(clearSearch.locator('svg')).toBeVisible();
    const clearBounds = await clearSearch.boundingBox();
    expect(clearBounds?.width).toBeGreaterThanOrEqual(24);
    expect(clearBounds?.height).toBeGreaterThanOrEqual(24);
    await clearSearch.click();
    await expect(page.getByRole('textbox', {name: 'Search wrap-up reasons', exact: true})).toHaveValue('');
    await expect(page.getByText('No wrap-up reasons match your search.')).toHaveCount(0);
  });

  test('capture focus policy preserves keyboard, search editing and copy confirmation', async ({page}) => {
    await prepareAISummaryCapture(page, 'JNY-002:generating', {width: 442, height: 621});
    const search = page.getByRole('textbox', {name: 'Search wrap-up reasons'});
    await expect(search).not.toBeFocused();
    await page.screenshot({
      path: test.info().outputPath('S02-panel.png'),
      clip: (await prepareAISummaryCapture(page, 'JNY-002:generating', {width: 442, height: 621})).bounds,
    });
    await page.keyboard.press('Tab');
    await expect(search).toBeFocused();
    await driveAISummaryState(page, 'post-call:zero-match-reason-query');
    await expect(page.getByPlaceholder('Search topic')).toBeFocused();

    await driveAISummaryState(page, 'JNY-002:like-selected');
    const reasonTrigger = page.getByRole('button', {name: 'Search wrap-up reasons', exact: true});
    await reasonTrigger.focus();
    await reasonTrigger.click();
    await expect(page.getByRole('textbox', {name: 'Search wrap-up reasons', exact: true})).toBeFocused();
    await page.getByRole('radio', {name: 'Resolved', exact: true}).click();
    await expect(reasonTrigger).toBeFocused();

    const frame = await prepareAISummaryCapture(page, 'JNY-002:copy-selected', {width: 403, height: 624});
    const copy = page.getByRole('button', {name: 'Copy Summary', exact: true});
    await expect(copy).toHaveClass(/ai-summary__copy-button--confirmed/);
    await expect(copy.locator('mdc-icon')).toHaveAttribute('name', 'check-bold');
    await expect(page.getByRole('button', {name: 'Edit Next Steps'})).toBeInViewport();
    const bullets = page.locator('.ai-summary__section-preview .ai-summary__readonly-list > span');
    await expect(bullets).toHaveCount(4);
    for (const bullet of await bullets.all()) {
      await expect(bullet).toHaveCSS('display', 'list-item');
      await expect(bullet).toHaveCSS('list-style-type', 'disc');
    }
    await page.screenshot({path: test.info().outputPath('S09-panel.png'), clip: frame.bounds});
    // Confirmed pointer state must not be achieved by disabling keyboard focus.
    await copy.focus();
    await page.keyboard.press('Tab');
    await expect(page.getByRole('button', {name: 'This is helpful', exact: true})).toBeFocused();
    expect(await copy.evaluate((node) => node.classList.contains('ai-summary__copy-button--confirmed'))).toBe(false);
  });
});
