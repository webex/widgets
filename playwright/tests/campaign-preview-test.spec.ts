import {test, expect} from '@playwright/test';
import {TestManager} from '../test-manager';
import {CAMPAIGN_TEST_IDS} from '../constants';
import {
  injectCampaignPreviewTask,
  removeCampaignPreviewTask,
  stubCampaignPreviewActions,
  getCampaignActionCounts,
  waitForCampaignTaskVisible,
  waitForCampaignTaskHidden,
  clickCampaignAccept,
  clickCampaignSkip,
  clickCampaignRemove,
  clickCampaignCancel,
  injectNonPreviewCampaignTask,
} from '../Utils/campaignPreviewUtils';

export default function createCampaignPreviewTests() {
  test.describe('Campaign Preview - Task Rendering', () => {
    let testManager: TestManager;

    test.beforeAll(async ({browser}, testInfo) => {
      const projectName = testInfo.project.name;
      testManager = new TestManager(projectName);
      await testManager.setupForCampaignPreview(browser);
    });

    test.afterAll(async () => {
      await testManager.cleanup();
    });

    test.afterEach(async () => {
      // Clean up any injected tasks between tests
      await removeCampaignPreviewTask(testManager.agent1Page).catch(() => {});
    });

    test('should render campaign preview task when injected into task list', async () => {
      await stubCampaignPreviewActions(testManager.agent1Page);
      await injectCampaignPreviewTask(testManager.agent1Page);
      await waitForCampaignTaskVisible(testManager.agent1Page);

      // Verify core UI elements are rendered
      await expect(testManager.agent1Page.getByTestId(CAMPAIGN_TEST_IDS.LIST_ITEM).first()).toBeVisible();
      await expect(testManager.agent1Page.getByTestId(CAMPAIGN_TEST_IDS.TITLE).first()).toBeVisible();
      await expect(testManager.agent1Page.getByTestId(CAMPAIGN_TEST_IDS.ACCEPT_BUTTON).first()).toBeVisible();
      await expect(testManager.agent1Page.getByTestId(CAMPAIGN_TEST_IDS.SKIP_REMOVE).first()).toBeVisible();
    });

    test('should display customer name and phone number', async () => {
      await stubCampaignPreviewActions(testManager.agent1Page);
      await injectCampaignPreviewTask(testManager.agent1Page, {
        customerName: 'Alice Johnson',
        ani: '+15551234567',
        dn: '+15559876543',
      });
      await waitForCampaignTaskVisible(testManager.agent1Page);

      const title = testManager.agent1Page.getByTestId(CAMPAIGN_TEST_IDS.TITLE).first();
      await expect(title).toContainText('Alice Johnson');

      const phone = testManager.agent1Page.getByTestId(CAMPAIGN_TEST_IDS.PHONE).first();
      await expect(phone).toBeVisible();
    });

    test('should render global variables panel in expanded area', async () => {
      await stubCampaignPreviewActions(testManager.agent1Page);
      await injectCampaignPreviewTask(testManager.agent1Page, {
        globalVariables: {Campaign: 'Spring Promo', Region: 'West'},
      });
      await waitForCampaignTaskVisible(testManager.agent1Page);

      const expandedArea = testManager.agent1Page.getByTestId(CAMPAIGN_TEST_IDS.EXPANDED).first();
      await expect(expandedArea).toBeVisible();

      const variablesPanel = testManager.agent1Page.getByTestId(CAMPAIGN_TEST_IDS.GLOBAL_VARIABLES_PANEL).first();
      await expect(variablesPanel).toBeVisible();
    });

    test('should render cancel button in browser mode', async () => {
      await stubCampaignPreviewActions(testManager.agent1Page);
      await injectCampaignPreviewTask(testManager.agent1Page);
      await waitForCampaignTaskVisible(testManager.agent1Page);

      const cancelBtn = testManager.agent1Page.getByTestId(CAMPAIGN_TEST_IDS.CANCEL_BUTTON).first();
      await expect(cancelBtn).toBeVisible();
      await expect(cancelBtn).toBeEnabled();
    });

    test('should render popover component', async () => {
      await stubCampaignPreviewActions(testManager.agent1Page);
      await injectCampaignPreviewTask(testManager.agent1Page);
      await waitForCampaignTaskVisible(testManager.agent1Page);

      const popover = testManager.agent1Page.getByTestId(CAMPAIGN_TEST_IDS.POPOVER).first();
      await expect(popover).toBeAttached();
    });
  });

  test.describe('Campaign Preview - Accept Action', () => {
    let testManager: TestManager;

    test.beforeAll(async ({browser}, testInfo) => {
      const projectName = testInfo.project.name;
      testManager = new TestManager(projectName);
      await testManager.setupForCampaignPreview(browser);
    });

    test.afterAll(async () => {
      await testManager.cleanup();
    });

    test.afterEach(async () => {
      await removeCampaignPreviewTask(testManager.agent1Page).catch(() => {});
    });

    test('should accept campaign preview contact', async () => {
      await stubCampaignPreviewActions(testManager.agent1Page);
      await injectCampaignPreviewTask(testManager.agent1Page);
      await waitForCampaignTaskVisible(testManager.agent1Page);

      await clickCampaignAccept(testManager.agent1Page);

      // After accept, the connecting button should appear and accept button should be gone
      await expect(
        testManager.agent1Page.getByTestId(CAMPAIGN_TEST_IDS.CONNECTING_BUTTON).first()
      ).toBeVisible({timeout: 5000});

      // Skip and remove buttons should be disabled after accept
      const skipBtn = testManager.agent1Page.getByTestId(CAMPAIGN_TEST_IDS.SKIP_BUTTON).first();
      const removeBtn = testManager.agent1Page.getByTestId(CAMPAIGN_TEST_IDS.REMOVE_BUTTON).first();
      await expect(skipBtn).toBeDisabled();
      await expect(removeBtn).toBeDisabled();

      // Verify the SDK action was called
      const counts = await getCampaignActionCounts(testManager.agent1Page);
      expect(counts.accept).toBe(1);
    });

    test('should show handle time after accept', async () => {
      await stubCampaignPreviewActions(testManager.agent1Page);
      await injectCampaignPreviewTask(testManager.agent1Page);
      await waitForCampaignTaskVisible(testManager.agent1Page);

      await clickCampaignAccept(testManager.agent1Page);

      // Handle time element should become visible after accepting
      const handleTime = testManager.agent1Page.getByTestId(CAMPAIGN_TEST_IDS.HANDLE_TIME).first();
      await expect(handleTime).toBeVisible({timeout: 5000});
    });

    test('should show error dialog when accept fails', async () => {
      await stubCampaignPreviewActions(testManager.agent1Page, 'accept');
      await injectCampaignPreviewTask(testManager.agent1Page);
      await waitForCampaignTaskVisible(testManager.agent1Page);

      await clickCampaignAccept(testManager.agent1Page);

      // Error dialog should appear
      const errorDialog = testManager.agent1Page.getByTestId(CAMPAIGN_TEST_IDS.ERROR_DIALOG).first();
      await expect(errorDialog).toBeVisible({timeout: 5000});

      // Dismiss the error dialog
      const okButton = testManager.agent1Page.getByTestId(CAMPAIGN_TEST_IDS.ERROR_DIALOG_OK).first();
      await expect(okButton).toBeVisible();
      await okButton.click();

      // Error dialog should close
      await expect(errorDialog).toBeHidden({timeout: 5000});

      // Buttons should be re-enabled after error dismissal
      const acceptBtn = testManager.agent1Page.getByTestId(CAMPAIGN_TEST_IDS.ACCEPT_BUTTON).first();
      await expect(acceptBtn).toBeVisible();
      await expect(acceptBtn).toBeEnabled();
    });
  });

  test.describe('Campaign Preview - Skip Action', () => {
    let testManager: TestManager;

    test.beforeAll(async ({browser}, testInfo) => {
      const projectName = testInfo.project.name;
      testManager = new TestManager(projectName);
      await testManager.setupForCampaignPreview(browser);
    });

    test.afterAll(async () => {
      await testManager.cleanup();
    });

    test.afterEach(async () => {
      await removeCampaignPreviewTask(testManager.agent1Page).catch(() => {});
    });

    test('should skip campaign preview contact', async () => {
      await stubCampaignPreviewActions(testManager.agent1Page);
      await injectCampaignPreviewTask(testManager.agent1Page);
      await waitForCampaignTaskVisible(testManager.agent1Page);

      await clickCampaignSkip(testManager.agent1Page);

      // All buttons should be disabled after skip
      const acceptBtn = testManager.agent1Page.getByTestId(CAMPAIGN_TEST_IDS.ACCEPT_BUTTON).first();
      const skipBtn = testManager.agent1Page.getByTestId(CAMPAIGN_TEST_IDS.SKIP_BUTTON).first();
      const removeBtn = testManager.agent1Page.getByTestId(CAMPAIGN_TEST_IDS.REMOVE_BUTTON).first();
      await expect(acceptBtn).toBeDisabled();
      await expect(skipBtn).toBeDisabled();
      await expect(removeBtn).toBeDisabled();

      // Verify the SDK action was called
      const counts = await getCampaignActionCounts(testManager.agent1Page);
      expect(counts.skip).toBe(1);
    });

    test('should render skip button disabled when configured', async () => {
      await stubCampaignPreviewActions(testManager.agent1Page);
      await injectCampaignPreviewTask(testManager.agent1Page, {
        skipDisabled: 'true',
      });
      await waitForCampaignTaskVisible(testManager.agent1Page);

      const skipBtn = testManager.agent1Page.getByTestId(CAMPAIGN_TEST_IDS.SKIP_BUTTON).first();
      await expect(skipBtn).toBeDisabled();

      // Accept and remove should still be enabled
      const acceptBtn = testManager.agent1Page.getByTestId(CAMPAIGN_TEST_IDS.ACCEPT_BUTTON).first();
      const removeBtn = testManager.agent1Page.getByTestId(CAMPAIGN_TEST_IDS.REMOVE_BUTTON).first();
      await expect(acceptBtn).toBeEnabled();
      await expect(removeBtn).toBeEnabled();
    });

    test('should show error dialog when skip fails', async () => {
      await stubCampaignPreviewActions(testManager.agent1Page, 'skip');
      await injectCampaignPreviewTask(testManager.agent1Page);
      await waitForCampaignTaskVisible(testManager.agent1Page);

      await clickCampaignSkip(testManager.agent1Page);

      const errorDialog = testManager.agent1Page.getByTestId(CAMPAIGN_TEST_IDS.ERROR_DIALOG).first();
      await expect(errorDialog).toBeVisible({timeout: 5000});

      const okButton = testManager.agent1Page.getByTestId(CAMPAIGN_TEST_IDS.ERROR_DIALOG_OK).first();
      await okButton.click();
      await expect(errorDialog).toBeHidden({timeout: 5000});
    });
  });

  test.describe('Campaign Preview - Remove Action', () => {
    let testManager: TestManager;

    test.beforeAll(async ({browser}, testInfo) => {
      const projectName = testInfo.project.name;
      testManager = new TestManager(projectName);
      await testManager.setupForCampaignPreview(browser);
    });

    test.afterAll(async () => {
      await testManager.cleanup();
    });

    test.afterEach(async () => {
      await removeCampaignPreviewTask(testManager.agent1Page).catch(() => {});
    });

    test('should remove campaign preview contact', async () => {
      await stubCampaignPreviewActions(testManager.agent1Page);
      await injectCampaignPreviewTask(testManager.agent1Page);
      await waitForCampaignTaskVisible(testManager.agent1Page);

      await clickCampaignRemove(testManager.agent1Page);

      // All buttons should be disabled after remove
      const acceptBtn = testManager.agent1Page.getByTestId(CAMPAIGN_TEST_IDS.ACCEPT_BUTTON).first();
      const skipBtn = testManager.agent1Page.getByTestId(CAMPAIGN_TEST_IDS.SKIP_BUTTON).first();
      const removeBtn = testManager.agent1Page.getByTestId(CAMPAIGN_TEST_IDS.REMOVE_BUTTON).first();
      await expect(acceptBtn).toBeDisabled();
      await expect(skipBtn).toBeDisabled();
      await expect(removeBtn).toBeDisabled();

      // Verify the SDK action was called
      const counts = await getCampaignActionCounts(testManager.agent1Page);
      expect(counts.remove).toBe(1);
    });

    test('should render remove button disabled when configured', async () => {
      await stubCampaignPreviewActions(testManager.agent1Page);
      await injectCampaignPreviewTask(testManager.agent1Page, {
        removeDisabled: 'true',
      });
      await waitForCampaignTaskVisible(testManager.agent1Page);

      const removeBtn = testManager.agent1Page.getByTestId(CAMPAIGN_TEST_IDS.REMOVE_BUTTON).first();
      await expect(removeBtn).toBeDisabled();

      // Accept and skip should still be enabled
      const acceptBtn = testManager.agent1Page.getByTestId(CAMPAIGN_TEST_IDS.ACCEPT_BUTTON).first();
      const skipBtn = testManager.agent1Page.getByTestId(CAMPAIGN_TEST_IDS.SKIP_BUTTON).first();
      await expect(acceptBtn).toBeEnabled();
      await expect(skipBtn).toBeEnabled();
    });

    test('should show error dialog when remove fails', async () => {
      await stubCampaignPreviewActions(testManager.agent1Page, 'remove');
      await injectCampaignPreviewTask(testManager.agent1Page);
      await waitForCampaignTaskVisible(testManager.agent1Page);

      await clickCampaignRemove(testManager.agent1Page);

      const errorDialog = testManager.agent1Page.getByTestId(CAMPAIGN_TEST_IDS.ERROR_DIALOG).first();
      await expect(errorDialog).toBeVisible({timeout: 5000});

      const okButton = testManager.agent1Page.getByTestId(CAMPAIGN_TEST_IDS.ERROR_DIALOG_OK).first();
      await okButton.click();
      await expect(errorDialog).toBeHidden({timeout: 5000});
    });
  });

  test.describe('Campaign Preview - Cancel Action', () => {
    let testManager: TestManager;

    test.beforeAll(async ({browser}, testInfo) => {
      const projectName = testInfo.project.name;
      testManager = new TestManager(projectName);
      await testManager.setupForCampaignPreview(browser);
    });

    test.afterAll(async () => {
      await testManager.cleanup();
    });

    test.afterEach(async () => {
      await removeCampaignPreviewTask(testManager.agent1Page).catch(() => {});
    });

    test('should cancel campaign preview contact', async () => {
      await stubCampaignPreviewActions(testManager.agent1Page);
      await injectCampaignPreviewTask(testManager.agent1Page);
      await waitForCampaignTaskVisible(testManager.agent1Page);

      await clickCampaignCancel(testManager.agent1Page);

      // Cancel button should become disabled after clicking
      const cancelBtn = testManager.agent1Page.getByTestId(CAMPAIGN_TEST_IDS.CANCEL_BUTTON).first();
      await expect(cancelBtn).toBeDisabled({timeout: 5000});

      // All action buttons should be disabled
      const acceptBtn = testManager.agent1Page.getByTestId(CAMPAIGN_TEST_IDS.ACCEPT_BUTTON).first();
      const skipBtn = testManager.agent1Page.getByTestId(CAMPAIGN_TEST_IDS.SKIP_BUTTON).first();
      const removeBtn = testManager.agent1Page.getByTestId(CAMPAIGN_TEST_IDS.REMOVE_BUTTON).first();
      await expect(acceptBtn).toBeDisabled();
      await expect(skipBtn).toBeDisabled();
      await expect(removeBtn).toBeDisabled();
    });
  });

  test.describe('Campaign Preview - Timeout Behavior', () => {
    let testManager: TestManager;

    test.beforeAll(async ({browser}, testInfo) => {
      const projectName = testInfo.project.name;
      testManager = new TestManager(projectName);
      await testManager.setupForCampaignPreview(browser);
    });

    test.afterAll(async () => {
      await testManager.cleanup();
    });

    test.afterEach(async () => {
      await removeCampaignPreviewTask(testManager.agent1Page).catch(() => {});
    });

    test('should auto-accept UI state on timeout with ACCEPT auto-action', async () => {
      await stubCampaignPreviewActions(testManager.agent1Page);
      // Inject with a very short timeout so countdown expires quickly
      await injectCampaignPreviewTask(testManager.agent1Page, {
        autoAction: 'ACCEPT',
        offerTimeout: String(Date.now() + 2000),
      });
      await waitForCampaignTaskVisible(testManager.agent1Page);

      // Wait for countdown to expire and auto-accept UI to engage
      // The connecting button should appear as if accepted
      await expect(
        testManager.agent1Page.getByTestId(CAMPAIGN_TEST_IDS.CONNECTING_BUTTON).first()
      ).toBeVisible({timeout: 10000});

      // All buttons should be disabled after auto-accept
      const skipBtn = testManager.agent1Page.getByTestId(CAMPAIGN_TEST_IDS.SKIP_BUTTON).first();
      const removeBtn = testManager.agent1Page.getByTestId(CAMPAIGN_TEST_IDS.REMOVE_BUTTON).first();
      await expect(skipBtn).toBeDisabled();
      await expect(removeBtn).toBeDisabled();
    });

    test('should disable all buttons on timeout with SKIP auto-action', async () => {
      await stubCampaignPreviewActions(testManager.agent1Page);
      await injectCampaignPreviewTask(testManager.agent1Page, {
        autoAction: 'SKIP',
        offerTimeout: String(Date.now() + 2000),
      });
      await waitForCampaignTaskVisible(testManager.agent1Page);

      // Wait for timeout — all buttons should become disabled
      await expect(
        testManager.agent1Page.getByTestId(CAMPAIGN_TEST_IDS.ACCEPT_BUTTON).first()
      ).toBeDisabled({timeout: 10000});

      const skipBtn = testManager.agent1Page.getByTestId(CAMPAIGN_TEST_IDS.SKIP_BUTTON).first();
      const removeBtn = testManager.agent1Page.getByTestId(CAMPAIGN_TEST_IDS.REMOVE_BUTTON).first();
      await expect(skipBtn).toBeDisabled();
      await expect(removeBtn).toBeDisabled();
    });

    test('should disable all buttons on timeout with REMOVE auto-action', async () => {
      await stubCampaignPreviewActions(testManager.agent1Page);
      await injectCampaignPreviewTask(testManager.agent1Page, {
        autoAction: 'REMOVE',
        offerTimeout: String(Date.now() + 2000),
      });
      await waitForCampaignTaskVisible(testManager.agent1Page);

      // Wait for timeout — all buttons should become disabled
      await expect(
        testManager.agent1Page.getByTestId(CAMPAIGN_TEST_IDS.ACCEPT_BUTTON).first()
      ).toBeDisabled({timeout: 10000});

      const skipBtn = testManager.agent1Page.getByTestId(CAMPAIGN_TEST_IDS.SKIP_BUTTON).first();
      const removeBtn = testManager.agent1Page.getByTestId(CAMPAIGN_TEST_IDS.REMOVE_BUTTON).first();
      await expect(skipBtn).toBeDisabled();
      await expect(removeBtn).toBeDisabled();
    });
  });

  test.describe('Campaign Preview - Campaign Type Differentiation', () => {
    let testManager: TestManager;

    test.beforeAll(async ({browser}, testInfo) => {
      const projectName = testInfo.project.name;
      testManager = new TestManager(projectName);
      await testManager.setupForCampaignPreview(browser);
    });

    test.afterAll(async () => {
      await testManager.cleanup();
    });

    test.afterEach(async () => {
      // Clean up both preview and non-preview tasks
      await removeCampaignPreviewTask(testManager.agent1Page, 'non-preview-predictive-e2e-001').catch(() => {});
      await removeCampaignPreviewTask(testManager.agent1Page, 'non-preview-progressive-e2e-001').catch(() => {});
      await removeCampaignPreviewTask(testManager.agent1Page).catch(() => {});
    });

    test('should NOT render CampaignTask for predictive campaign type', async () => {
      await injectNonPreviewCampaignTask(testManager.agent1Page, 'predictive');

      // CampaignTask component should NOT appear for predictive campaigns
      // Wait briefly to confirm it doesn't render
      await testManager.agent1Page.waitForTimeout(2000);
      const campaignTask = testManager.agent1Page.getByTestId(CAMPAIGN_TEST_IDS.TASK).first();
      await expect(campaignTask).toBeHidden();
    });

    test('should NOT render CampaignTask for progressive campaign type', async () => {
      await injectNonPreviewCampaignTask(testManager.agent1Page, 'progressive');

      // CampaignTask component should NOT appear for progressive campaigns
      await testManager.agent1Page.waitForTimeout(2000);
      const campaignTask = testManager.agent1Page.getByTestId(CAMPAIGN_TEST_IDS.TASK).first();
      await expect(campaignTask).toBeHidden();
    });

    test('should render CampaignTask for STANDARD_PREVIEW_CAMPAIGN outbound type', async () => {
      await stubCampaignPreviewActions(testManager.agent1Page);
      await injectCampaignPreviewTask(testManager.agent1Page, {
        outboundType: 'STANDARD_PREVIEW_CAMPAIGN',
        campaignType: 'preview_standard',
      });
      await waitForCampaignTaskVisible(testManager.agent1Page);

      await expect(testManager.agent1Page.getByTestId(CAMPAIGN_TEST_IDS.TASK).first()).toBeVisible();
    });

    test('should render CampaignTask for DIRECT_PREVIEW_CAMPAIGN outbound type', async () => {
      await stubCampaignPreviewActions(testManager.agent1Page);
      await injectCampaignPreviewTask(testManager.agent1Page, {
        interactionId: 'direct-preview-e2e-001',
        outboundType: 'DIRECT_PREVIEW_CAMPAIGN',
        campaignType: 'preview_direct',
      });
      await waitForCampaignTaskVisible(testManager.agent1Page);

      await expect(testManager.agent1Page.getByTestId(CAMPAIGN_TEST_IDS.TASK).first()).toBeVisible();

      // Clean up
      await removeCampaignPreviewTask(testManager.agent1Page, 'direct-preview-e2e-001');
    });
  });

  test.describe('Campaign Preview - Task Removal', () => {
    let testManager: TestManager;

    test.beforeAll(async ({browser}, testInfo) => {
      const projectName = testInfo.project.name;
      testManager = new TestManager(projectName);
      await testManager.setupForCampaignPreview(browser);
    });

    test.afterAll(async () => {
      await testManager.cleanup();
    });

    test.afterEach(async () => {
      await removeCampaignPreviewTask(testManager.agent1Page).catch(() => {});
    });

    test('should remove campaign task from UI when task is removed from store', async () => {
      await stubCampaignPreviewActions(testManager.agent1Page);
      await injectCampaignPreviewTask(testManager.agent1Page);
      await waitForCampaignTaskVisible(testManager.agent1Page);

      // Remove the task from store
      await removeCampaignPreviewTask(testManager.agent1Page);

      // Campaign task should disappear
      await waitForCampaignTaskHidden(testManager.agent1Page);
    });
  });
}
