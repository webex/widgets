import {test, expect} from '@playwright/test';
import {TestManager} from '../test-manager';
import {CAMPAIGN_TEST_IDS} from '../constants';
import {
  injectCampaignPreviewTask,
  removeCampaignPreviewTask,
  stubCampaignPreviewActions,
  stubRefreshTaskList,
  restoreRefreshTaskList,
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
      await stubRefreshTaskList(testManager.agent1Page);
    });

    test.afterAll(async () => {
      await restoreRefreshTaskList(testManager.agent1Page).catch(() => {});
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

      // The expanded area is below the inline list item row
      const expandedArea = testManager.agent1Page.getByTestId(CAMPAIGN_TEST_IDS.EXPANDED).first();
      await expect(expandedArea).toBeVisible();

      // Scope to the expanded area to avoid matching the hidden popover's panel
      const variablesPanel = expandedArea.getByTestId(CAMPAIGN_TEST_IDS.GLOBAL_VARIABLES_PANEL);
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
      await stubRefreshTaskList(testManager.agent1Page);
    });

    test.afterAll(async () => {
      await restoreRefreshTaskList(testManager.agent1Page).catch(() => {});
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
      await stubRefreshTaskList(testManager.agent1Page);
    });

    test.afterAll(async () => {
      await restoreRefreshTaskList(testManager.agent1Page).catch(() => {});
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

      // After skip, the accept button is replaced by a status button showing "Skipping..."
      const connectingBtn = testManager.agent1Page.getByTestId(CAMPAIGN_TEST_IDS.CONNECTING_BUTTON).first();
      await expect(connectingBtn).toBeVisible();
      await expect(connectingBtn).toBeDisabled();

      const skipBtn = testManager.agent1Page.getByTestId(CAMPAIGN_TEST_IDS.SKIP_BUTTON).first();
      const removeBtn = testManager.agent1Page.getByTestId(CAMPAIGN_TEST_IDS.REMOVE_BUTTON).first();
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
      await stubRefreshTaskList(testManager.agent1Page);
    });

    test.afterAll(async () => {
      await restoreRefreshTaskList(testManager.agent1Page).catch(() => {});
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

      // After remove, the accept button is replaced by a status button showing "Removing..."
      const connectingBtn = testManager.agent1Page.getByTestId(CAMPAIGN_TEST_IDS.CONNECTING_BUTTON).first();
      await expect(connectingBtn).toBeVisible();
      await expect(connectingBtn).toBeDisabled();

      const skipBtn = testManager.agent1Page.getByTestId(CAMPAIGN_TEST_IDS.SKIP_BUTTON).first();
      const removeBtn = testManager.agent1Page.getByTestId(CAMPAIGN_TEST_IDS.REMOVE_BUTTON).first();
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
      await stubRefreshTaskList(testManager.agent1Page);
    });

    test.afterAll(async () => {
      await restoreRefreshTaskList(testManager.agent1Page).catch(() => {});
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
      await stubRefreshTaskList(testManager.agent1Page);
    });

    test.afterAll(async () => {
      await restoreRefreshTaskList(testManager.agent1Page).catch(() => {});
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

      // After timeout with SKIP auto-action, accept button is replaced by status button
      const connectingBtn = testManager.agent1Page.getByTestId(CAMPAIGN_TEST_IDS.CONNECTING_BUTTON).first();
      await expect(connectingBtn).toBeVisible({timeout: 10000});
      await expect(connectingBtn).toBeDisabled();

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

      // After timeout with REMOVE auto-action, accept button is replaced by status button
      const connectingBtn = testManager.agent1Page.getByTestId(CAMPAIGN_TEST_IDS.CONNECTING_BUTTON).first();
      await expect(connectingBtn).toBeVisible({timeout: 10000});
      await expect(connectingBtn).toBeDisabled();

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
      await stubRefreshTaskList(testManager.agent1Page);
    });

    test.afterAll(async () => {
      await restoreRefreshTaskList(testManager.agent1Page).catch(() => {});
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
      await stubRefreshTaskList(testManager.agent1Page);
    });

    test.afterAll(async () => {
      await restoreRefreshTaskList(testManager.agent1Page).catch(() => {});
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

  test.describe('Campaign Preview - Cancel Error', () => {
    let testManager: TestManager;

    test.beforeAll(async ({browser}, testInfo) => {
      const projectName = testInfo.project.name;
      testManager = new TestManager(projectName);
      await testManager.setupForCampaignPreview(browser);
      await stubRefreshTaskList(testManager.agent1Page);
    });

    test.afterAll(async () => {
      await restoreRefreshTaskList(testManager.agent1Page).catch(() => {});
      await testManager.cleanup();
    });

    test.afterEach(async () => {
      await removeCampaignPreviewTask(testManager.agent1Page).catch(() => {});
    });

    test('should show error dialog when cancel fails', async () => {
      await injectCampaignPreviewTask(testManager.agent1Page);
      await waitForCampaignTaskVisible(testManager.agent1Page);

      // Stub actions with cancel failure AFTER task injection so the task's end() gets overwritten
      await stubCampaignPreviewActions(testManager.agent1Page, 'cancel');

      await clickCampaignCancel(testManager.agent1Page);

      // Error dialog should appear with the cancel-specific title
      const errorDialog = testManager.agent1Page.getByTestId(CAMPAIGN_TEST_IDS.ERROR_DIALOG).first();
      await expect(errorDialog).toBeVisible({timeout: 5000});

      const errorTitle = testManager.agent1Page.getByTestId(CAMPAIGN_TEST_IDS.ERROR_DIALOG_TITLE).first();
      await expect(errorTitle).toContainText("Can't cancel contact");

      // Dismiss the error dialog
      const okButton = testManager.agent1Page.getByTestId(CAMPAIGN_TEST_IDS.ERROR_DIALOG_OK).first();
      await okButton.click();
      await expect(errorDialog).toBeHidden({timeout: 5000});

      // Cancel button should be re-enabled after error dismissal
      const cancelBtn = testManager.agent1Page.getByTestId(CAMPAIGN_TEST_IDS.CANCEL_BUTTON).first();
      await expect(cancelBtn).toBeVisible();
      await expect(cancelBtn).toBeEnabled();
    });
  });

  test.describe('Campaign Preview - Button Disabled Combinations', () => {
    let testManager: TestManager;

    test.beforeAll(async ({browser}, testInfo) => {
      const projectName = testInfo.project.name;
      testManager = new TestManager(projectName);
      await testManager.setupForCampaignPreview(browser);
      await stubRefreshTaskList(testManager.agent1Page);
    });

    test.afterAll(async () => {
      await restoreRefreshTaskList(testManager.agent1Page).catch(() => {});
      await testManager.cleanup();
    });

    test.afterEach(async () => {
      await removeCampaignPreviewTask(testManager.agent1Page).catch(() => {});
    });

    test('should render both skip and remove buttons disabled when both are configured', async () => {
      await stubCampaignPreviewActions(testManager.agent1Page);
      await injectCampaignPreviewTask(testManager.agent1Page, {
        skipDisabled: 'true',
        removeDisabled: 'true',
      });
      await waitForCampaignTaskVisible(testManager.agent1Page);

      const skipBtn = testManager.agent1Page.getByTestId(CAMPAIGN_TEST_IDS.SKIP_BUTTON).first();
      const removeBtn = testManager.agent1Page.getByTestId(CAMPAIGN_TEST_IDS.REMOVE_BUTTON).first();
      await expect(skipBtn).toBeDisabled();
      await expect(removeBtn).toBeDisabled();

      // Accept should still be enabled — it's the only action available
      const acceptBtn = testManager.agent1Page.getByTestId(CAMPAIGN_TEST_IDS.ACCEPT_BUTTON).first();
      await expect(acceptBtn).toBeEnabled();
    });
  });

  test.describe('Campaign Preview - Countdown Display', () => {
    let testManager: TestManager;

    test.beforeAll(async ({browser}, testInfo) => {
      const projectName = testInfo.project.name;
      testManager = new TestManager(projectName);
      await testManager.setupForCampaignPreview(browser);
      await stubRefreshTaskList(testManager.agent1Page);
    });

    test.afterAll(async () => {
      await restoreRefreshTaskList(testManager.agent1Page).catch(() => {});
      await testManager.cleanup();
    });

    test.afterEach(async () => {
      await removeCampaignPreviewTask(testManager.agent1Page).catch(() => {});
    });

    test('should display countdown timer before timeout', async () => {
      await stubCampaignPreviewActions(testManager.agent1Page);
      // Use a generous timeout so countdown is visible during assertion
      await injectCampaignPreviewTask(testManager.agent1Page, {
        offerTimeout: String(Date.now() + 60000),
      });
      await waitForCampaignTaskVisible(testManager.agent1Page);

      // The countdown is rendered inside the popover (timerDisplayMode=auto),
      // which opens on mouseenter. Hover the campaign task to trigger it.
      await testManager.agent1Page.getByTestId(CAMPAIGN_TEST_IDS.TASK).first().hover();
      const popover = testManager.agent1Page.getByTestId(CAMPAIGN_TEST_IDS.POPOVER).first();
      await expect(popover).toBeVisible({timeout: 5000});

      // Assert the countdown is visible and displays a plausible remaining value
      const countdown = testManager.agent1Page.getByTestId(CAMPAIGN_TEST_IDS.COUNTDOWN).first();
      await expect(countdown).toBeVisible({timeout: 5000});
      await expect(countdown).toContainText('Time left:');
    });
  });

  test.describe('Campaign Preview - Fallback Title', () => {
    let testManager: TestManager;

    test.beforeAll(async ({browser}, testInfo) => {
      const projectName = testInfo.project.name;
      testManager = new TestManager(projectName);
      await testManager.setupForCampaignPreview(browser);
      await stubRefreshTaskList(testManager.agent1Page);
    });

    test.afterAll(async () => {
      await restoreRefreshTaskList(testManager.agent1Page).catch(() => {});
      await testManager.cleanup();
    });

    test.afterEach(async () => {
      await removeCampaignPreviewTask(testManager.agent1Page).catch(() => {});
    });

    test('should use phone number as title when customer name is not provided', async () => {
      await stubCampaignPreviewActions(testManager.agent1Page);
      await injectCampaignPreviewTask(testManager.agent1Page, {
        customerName: '',
        ani: '+14085551234',
      });
      await waitForCampaignTaskVisible(testManager.agent1Page);

      // Title should fall back to ANI since customerName is empty
      const title = testManager.agent1Page.getByTestId(CAMPAIGN_TEST_IDS.TITLE).first();
      await expect(title).toContainText('+14085551234');

      // Phone subtitle should not be visible when it equals the title
      const phone = testManager.agent1Page.getByTestId(CAMPAIGN_TEST_IDS.PHONE).first();
      await expect(phone).toBeHidden();
    });
  });

  test.describe('Campaign Preview - Error Dialog Content', () => {
    let testManager: TestManager;

    test.beforeAll(async ({browser}, testInfo) => {
      const projectName = testInfo.project.name;
      testManager = new TestManager(projectName);
      await testManager.setupForCampaignPreview(browser);
      await stubRefreshTaskList(testManager.agent1Page);
    });

    test.afterAll(async () => {
      await restoreRefreshTaskList(testManager.agent1Page).catch(() => {});
      await testManager.cleanup();
    });

    test.afterEach(async () => {
      await removeCampaignPreviewTask(testManager.agent1Page).catch(() => {});
    });

    test('should display correct error title for accept failure', async () => {
      await stubCampaignPreviewActions(testManager.agent1Page, 'accept');
      await injectCampaignPreviewTask(testManager.agent1Page);
      await waitForCampaignTaskVisible(testManager.agent1Page);

      await clickCampaignAccept(testManager.agent1Page);

      const errorTitle = testManager.agent1Page.getByTestId(CAMPAIGN_TEST_IDS.ERROR_DIALOG_TITLE).first();
      await expect(errorTitle).toContainText("Can't accept contact");

      const errorMessage = testManager.agent1Page.getByTestId(CAMPAIGN_TEST_IDS.ERROR_DIALOG_MESSAGE).first();
      await expect(errorMessage).toBeVisible();

      // Dismiss
      await testManager.agent1Page.getByTestId(CAMPAIGN_TEST_IDS.ERROR_DIALOG_OK).first().click();
    });

    test('should display correct error title for skip failure', async () => {
      await stubCampaignPreviewActions(testManager.agent1Page, 'skip');
      await injectCampaignPreviewTask(testManager.agent1Page);
      await waitForCampaignTaskVisible(testManager.agent1Page);

      await clickCampaignSkip(testManager.agent1Page);

      const errorTitle = testManager.agent1Page.getByTestId(CAMPAIGN_TEST_IDS.ERROR_DIALOG_TITLE).first();
      await expect(errorTitle).toContainText("Can't skip contact");

      // Dismiss
      await testManager.agent1Page.getByTestId(CAMPAIGN_TEST_IDS.ERROR_DIALOG_OK).first().click();
    });

    test('should display correct error title for remove failure', async () => {
      await stubCampaignPreviewActions(testManager.agent1Page, 'remove');
      await injectCampaignPreviewTask(testManager.agent1Page);
      await waitForCampaignTaskVisible(testManager.agent1Page);

      await clickCampaignRemove(testManager.agent1Page);

      const errorTitle = testManager.agent1Page.getByTestId(CAMPAIGN_TEST_IDS.ERROR_DIALOG_TITLE).first();
      await expect(errorTitle).toContainText("Can't remove contact");

      // Dismiss
      await testManager.agent1Page.getByTestId(CAMPAIGN_TEST_IDS.ERROR_DIALOG_OK).first().click();
    });
  });

  test.describe('Campaign Preview - Re-offer After Skip', () => {
    let testManager: TestManager;

    test.beforeAll(async ({browser}, testInfo) => {
      const projectName = testInfo.project.name;
      testManager = new TestManager(projectName);
      await testManager.setupForCampaignPreview(browser);
      await stubRefreshTaskList(testManager.agent1Page);
    });

    test.afterAll(async () => {
      await restoreRefreshTaskList(testManager.agent1Page).catch(() => {});
      await testManager.cleanup();
    });

    test.afterEach(async () => {
      await removeCampaignPreviewTask(testManager.agent1Page).catch(() => {});
    });

    test('should reset buttons when a new contact is offered after skip', async () => {
      await stubCampaignPreviewActions(testManager.agent1Page);
      await injectCampaignPreviewTask(testManager.agent1Page, {
        offerTimeout: String(Date.now() + 60000),
      });
      await waitForCampaignTaskVisible(testManager.agent1Page);

      // Skip the first contact
      await clickCampaignSkip(testManager.agent1Page);

      // After skip, accept button is replaced by status button
      const connectingBtn = testManager.agent1Page.getByTestId(CAMPAIGN_TEST_IDS.CONNECTING_BUTTON).first();
      await expect(connectingBtn).toBeVisible();
      await expect(connectingBtn).toBeDisabled();

      // Simulate a new contact offer by updating the task's timeout timestamp
      // (the component resets state when timeoutTimestamp changes and task is not accepted)
      await testManager.agent1Page.evaluate(
        ({interactionId}) => {
          const storeWrapper = (window as unknown as Record<string, unknown>)['store'] as Record<string, unknown>;
          if (!storeWrapper) return;
          const store = storeWrapper.store as Record<string, unknown>;
          const taskList = store.taskList as Record<string, Record<string, unknown>>;
          const task = taskList[interactionId];
          if (!task) return;

          const data = task.data as Record<string, unknown>;
          const interaction = data.interaction as Record<string, unknown>;
          const cpd = interaction.callProcessingDetails as Record<string, string>;

          // Change the timeout to simulate a new contact offer
          cpd.campaignPreviewOfferTimeout = String(Date.now() + 60000);

          // Trigger MobX reactivity by reassigning taskList on inner store
          store.taskList = {...taskList};
        },
        {interactionId: 'campaign-preview-e2e-001'}
      );

      // After re-offer, accept button should reappear and become enabled again
      const acceptBtn = testManager.agent1Page.getByTestId(CAMPAIGN_TEST_IDS.ACCEPT_BUTTON).first();
      await expect(acceptBtn).toBeEnabled({timeout: 5000});

      // Skip and remove should also be re-enabled (based on their config, not disabled)
      const skipBtn = testManager.agent1Page.getByTestId(CAMPAIGN_TEST_IDS.SKIP_BUTTON).first();
      const removeBtn = testManager.agent1Page.getByTestId(CAMPAIGN_TEST_IDS.REMOVE_BUTTON).first();
      await expect(skipBtn).toBeEnabled({timeout: 5000});
      await expect(removeBtn).toBeEnabled({timeout: 5000});
    });
  });
}
