import {test, Page, expect} from '@playwright/test';
import {TestManager} from '../test-manager';
import {changeUserState} from '../Utils/userStateUtils';
import {createCallTask, createChatTask, createEmailTask} from '../Utils/incomingTaskUtils';
import {TASK_TYPES, USER_STATES, WRAPUP_REASONS} from '../constants';
import {verifyTaskControls} from '../Utils/taskControlUtils';
import {submitWrapup} from '../Utils/wrapupUtils';
import {waitForState} from '../Utils/helperUtils';

let capturedLogs: string[] = [];

const labelToMediaType: Record<string, string> = {
  Call: 'telephony',
  Email: 'email',
  Chat: 'chat',
};

/**
 * Reads the handle time of ith task in the task list.
 * @param page Playwright Page object
 * @param index Index of the task in the task list (default is 0 for the first task)
 * @returns returns the handle time in seconds
 */

async function getCurrentHandleTime(page: Page, index: number = 0): Promise<number> {
  // find the task list item and read its interactionId
  const taskListItem = page.getByTestId('task-list').getByRole('listitem').nth(index);
  const interactionId = await taskListItem.getAttribute('id');

  // read the dynamic handle-time test-id
  const full = await page.getByTestId(`${interactionId}-handle-time`).textContent();

  // 2. Pull out the MM:SS via regex
  const match = full?.match(/(\d{2}:\d{2})/);
  const timer = match ? match[1] : null;

  // 3. (Optional) convert to total seconds
  const [m, s] = timer!.split(':').map(Number);
  return m * 60 + s;
}

/**
 * wait for and accept a specific task in the task list.
 * @param testManager : TestManager object
 * @param testId : testId of the task to accept
 */

async function waitForAndAcceptSpecificTask(testManager: TestManager, testId: string): Promise<void> {
  const timeoutMs = 60000,
    pollInterval = 2000;
  const start = Date.now();
  const type = testId.split('-').pop();
  while (Date.now() - start < timeoutMs) {
    const taskDiv = testManager.agent1Page.getByTestId(testId).first();
    const isVisible = await taskDiv.isVisible().catch(() => false);
    if (isVisible) {
      const acceptButton = taskDiv.getByTestId('task:accept-button').first();
      await expect(acceptButton).toBeVisible({timeout: 5000});
      await acceptButton.click({timeout: 3000});

      return;
    }
    await testManager.agent1Page.waitForTimeout(pollInterval);
  }
  throw new Error(`No incoming task found for ${testId} after ${timeoutMs / 1000} seconds`);
}

async function getTaskType(testManager: TestManager): Promise<string> {
  const callTimer = testManager.agent1Page.getByTestId('cc-cad:call-timer').first();
  const fullText = await callTimer.textContent();
  const mediaLabel = fullText!.split(' - ')[0].trim();
  return mediaLabel;
}

function setupConsoleLogging(page: Page): () => void {
  capturedLogs.length = 0;

  const consoleHandler = (msg) => {
    const logText = msg.text();
    if (logText.startsWith('onTaskSelected invoked for task with title :') && logText.includes(', and mediaType :')) {
      capturedLogs.push(logText);
    }
  };

  page.on('console', consoleHandler);
  return () => page.off('console', consoleHandler);
}

function escapeForRegExp(str?: string): string {
  if (!str) {
    return '';
  }
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

async function waitForConsoleLogs(
  logs: string[],
  title: string,
  mediaType: string,
  timeoutMs = 15000,
  intervalMs = 500
): Promise<void> {
  const escTitle = escapeForRegExp(title!);
  const escMedia = escapeForRegExp(mediaType!);
  const pattern = new RegExp(
    '^onTaskSelected invoked for task with title : ' + escTitle + ', and mediaType : ' + escMedia + '$'
  );

  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    if (logs.some((log) => pattern.test(log))) return;
    await new Promise((r) => setTimeout(r, intervalMs));
  }

  throw new Error(`Timed out waiting for console log matching "${pattern.source}"`);
}

export default function createTaskListTests() {
  test.describe('Task List Tests for different types of Task', () => {
    let testManager: TestManager;

    test.beforeEach(() => {
      capturedLogs.length = 0;
    });

    test.beforeAll(async ({browser}, testInfo) => {
      const projectName = testInfo.project.name;
      testManager = new TestManager(projectName);
      await testManager.setup(browser, {
        needsAgent1: true,
        needsCaller: true,
        needsChat: true,
        enableConsoleLogging: true,
      });
      setupConsoleLogging(testManager.agent1Page);
    });

    test('Verify Task List for incoming Call', async () => {
      await createCallTask(testManager.callerPage, process.env[`${testManager.projectName}_ENTRY_POINT`]!);
      await changeUserState(testManager.agent1Page, USER_STATES.AVAILABLE);
      let incomingTaskDiv = testManager.agent1Page.getByTestId('samples:incoming-task-telephony').first();
      await incomingTaskDiv.waitFor({state: 'visible', timeout: 40000});
      await testManager.agent1Page.waitForTimeout(1000);
      const taskListItem = testManager.agent1Page.getByTestId('task-list').getByRole('listitem').first();
      expect(taskListItem).toBeVisible();
      const taskListAcceptButton = taskListItem.getByTestId('task:accept-button').first();
      const taskListDeclineButton = taskListItem.getByTestId('task:decline-button').first();
      const title = await incomingTaskDiv.getByTestId('task:title').first().textContent();
      expect(await taskListItem.getByTestId('task:title').textContent()).toBe(title);
      await expect(incomingTaskDiv.getByTestId('task:accept-button')).toBeVisible();
      await expect(incomingTaskDiv.getByTestId('task:decline-button')).toBeVisible();
      await expect(taskListAcceptButton).toBeVisible();
      await expect(taskListDeclineButton).toBeVisible();
      await taskListAcceptButton.click();
      await testManager.agent1Page.waitForTimeout(1000);
      await expect(taskListAcceptButton).not.toBeVisible();
      await expect(taskListDeclineButton).not.toBeVisible();
      await testManager.agent1Page.waitForTimeout(5000);
      try {
        await verifyTaskControls(testManager.agent1Page, TASK_TYPES.CALL);
      } catch (error) {
        throw new Error(`Call control buttons verification failed: ${error.message}`);
      }
      await waitForState(testManager.agent1Page, USER_STATES.ENGAGED);
      await taskListItem.click();
      await waitForConsoleLogs(capturedLogs, title!, 'telephony');

      // now use interactionId for dynamic assertions
      const interactionId = await taskListItem.getAttribute('id');
      await expect(taskListItem.locator('[icon-name="handset-filled"]')).toBeVisible();
      await expect(testManager.agent1Page.getByTestId(`${interactionId}-state`)).toHaveText('Connected');
      await expect(testManager.agent1Page.getByTestId(`${interactionId}-handle-time`)).toBeVisible();
      await testManager.agent1Page
        .getByTestId('call-control:end-call')
        .first()
        .waitFor({state: 'visible', timeout: 5000});
      await testManager.agent1Page.getByTestId('call-control:end-call').first().click();
      await testManager.agent1Page.waitForTimeout(500);
      await submitWrapup(testManager.agent1Page, WRAPUP_REASONS.SALE);
      await waitForState(testManager.agent1Page, USER_STATES.AVAILABLE);
    });

    test('Verify Task List for incoming Chat Task', async () => {
      await createChatTask(testManager.chatPage, process.env[`${testManager.projectName}_CHAT_URL`]!);
      await changeUserState(testManager.agent1Page, USER_STATES.AVAILABLE);
      const incomingTaskDiv = testManager.agent1Page.getByTestId('samples:incoming-task-chat').first();
      await incomingTaskDiv.waitFor({state: 'visible', timeout: 60000});
      await testManager.agent1Page.waitForTimeout(1000);
      const taskListItem = testManager.agent1Page.getByTestId('task-list').getByRole('listitem').first();
      expect(taskListItem).toBeVisible();
      const taskListAcceptButton = taskListItem.getByTestId('task:accept-button').first();
      const taskListDeclineButton = taskListItem.getByTestId('task:decline-button').first();
      const title = await incomingTaskDiv.getByTestId('task:title').textContent();
      expect(await taskListItem.getByTestId('task:title').textContent()).toBe(title);
      await expect(incomingTaskDiv.getByTestId('task:accept-button')).toBeVisible();
      await expect(incomingTaskDiv.getByTestId('task:decline-button')).not.toBeVisible();
      await expect(taskListAcceptButton).toBeVisible();
      await expect(taskListDeclineButton).not.toBeVisible();
      await taskListAcceptButton.click();
      await testManager.agent1Page.waitForTimeout(1000);
      await waitForState(testManager.agent1Page, USER_STATES.ENGAGED);
      const prevtimer = await getCurrentHandleTime(testManager.agent1Page);
      await testManager.agent1Page.waitForTimeout(5000);
      const currentTimer = await getCurrentHandleTime(testManager.agent1Page);
      expect(currentTimer).toBeGreaterThan(prevtimer);
      expect(Math.abs(currentTimer - prevtimer + 1)).toBeGreaterThanOrEqual(5);
      try {
        await verifyTaskControls(testManager.agent1Page, TASK_TYPES.CHAT);
      } catch (error) {
        throw new Error(`Call control buttons verification failed: ${error.message}`);
      }
      await waitForConsoleLogs(capturedLogs, title!, 'chat');
      await expect(taskListAcceptButton).not.toBeVisible();
      await expect(taskListDeclineButton).not.toBeVisible();
      expect(await taskListItem.getByTestId('task:title').textContent()).toBe(title);
      await expect(taskListItem.locator('[icon-name="chat-filled"]')).toBeVisible();

      // Get interactionId for dynamic test IDs
      const interactionId = await taskListItem.getAttribute('id');
      await expect(testManager.agent1Page.getByTestId(`${interactionId}-state`)).toHaveText('Connected');
      await expect(testManager.agent1Page.getByTestId(`${interactionId}-handle-time`)).toBeVisible();
      await testManager.agent1Page
        .getByTestId('call-control:end-call')
        .first()
        .waitFor({state: 'visible', timeout: 5000});
      await testManager.agent1Page.getByTestId('call-control:end-call').first().click();
      await testManager.agent1Page.waitForTimeout(2000);
      await submitWrapup(testManager.agent1Page, WRAPUP_REASONS.SALE);
      await waitForState(testManager.agent1Page, USER_STATES.AVAILABLE);
    });

    test('Verify Task List for incoming Email Task', async () => {
      await createEmailTask(process.env[`${testManager.projectName}_EMAIL_ENTRY_POINT`]!);
      await changeUserState(testManager.agent1Page, USER_STATES.AVAILABLE);
      const incomingTaskDiv = testManager.agent1Page.getByTestId('samples:incoming-task-email').first();
      await incomingTaskDiv.waitFor({state: 'visible', timeout: 60000});
      await testManager.agent1Page.waitForTimeout(1000);
      const taskListItem = testManager.agent1Page.getByTestId('task-list').getByRole('listitem').first();
      expect(taskListItem).toBeVisible();
      const taskListAcceptButton = taskListItem.getByTestId('task:accept-button').first();
      const taskListDeclineButton = taskListItem.getByTestId('task:decline-button').first();
      const title = await incomingTaskDiv.getByTestId('task:title').textContent();
      expect(await taskListItem.getByTestId('task:title').textContent()).toBe(title);
      await expect(incomingTaskDiv.getByTestId('task:accept-button')).toBeVisible();
      await expect(incomingTaskDiv.getByTestId('task:decline-button')).not.toBeVisible();
      await expect(taskListAcceptButton).toBeVisible();
      await expect(taskListDeclineButton).not.toBeVisible();
      await taskListAcceptButton.click();
      await testManager.agent1Page.waitForTimeout(1000);
      const prevtimer = await getCurrentHandleTime(testManager.agent1Page);
      await testManager.agent1Page.waitForTimeout(5000);

      const currentTimer = await getCurrentHandleTime(testManager.agent1Page);
      expect(currentTimer).toBeGreaterThan(prevtimer);
      expect(Math.abs(currentTimer - prevtimer + 1)).toBeGreaterThanOrEqual(5);

      try {
        await verifyTaskControls(testManager.agent1Page, TASK_TYPES.EMAIL);
      } catch (error) {
        throw new Error(`Call control buttons verification failed: ${error.message}`);
      }

      await expect(taskListAcceptButton).not.toBeVisible();
      await expect(taskListDeclineButton).not.toBeVisible();
      await waitForState(testManager.agent1Page, USER_STATES.ENGAGED);
      await waitForConsoleLogs(capturedLogs, title!, 'email');
      expect(await taskListItem.getByTestId('task:title').textContent()).toBe(title);
      await expect(taskListItem.locator('[icon-name="email-filled"]')).toBeVisible();

      // Get interactionId for dynamic test IDs
      const interactionId = await taskListItem.getAttribute('id');
      await expect(testManager.agent1Page.getByTestId(`${interactionId}-state`)).toHaveText('Connected');
      await expect(testManager.agent1Page.getByTestId(`${interactionId}-handle-time`)).toBeVisible();
      await testManager.agent1Page
        .getByTestId('call-control:end-call')
        .first()
        .waitFor({state: 'visible', timeout: 5000});
      await testManager.agent1Page.getByTestId('call-control:end-call').first().click();
      await testManager.agent1Page.waitForTimeout(2000);
      await submitWrapup(testManager.agent1Page, WRAPUP_REASONS.SALE);
      await waitForState(testManager.agent1Page, USER_STATES.AVAILABLE);
    });

    test('Task List Test with Multiple Taks', async () => {
      await changeUserState(testManager.agent1Page, USER_STATES.MEETING);
      await waitForState(testManager.agent1Page, USER_STATES.MEETING);
      await Promise.all([
        createCallTask(testManager.callerPage, process.env[`${testManager.projectName}_ENTRY_POINT`]!),
        createChatTask(testManager.chatPage, process.env[`${testManager.projectName}_CHAT_URL`]!),
        createEmailTask(process.env[`${testManager.projectName}_EMAIL_ENTRY_POINT`]!),
      ]);

      await changeUserState(testManager.agent1Page, USER_STATES.AVAILABLE);

      await Promise.all([
        waitForAndAcceptSpecificTask(testManager, 'samples:incoming-task-telephony'),
        waitForAndAcceptSpecificTask(testManager, 'samples:incoming-task-chat'),
        waitForAndAcceptSpecificTask(testManager, 'samples:incoming-task-email'),
      ]);
      await testManager.agent1Page.waitForTimeout(3000);

      for (let i = 0; i < 3; i++) {
        const taskListItem = testManager.agent1Page.getByTestId('task-list').getByRole('listitem').nth(i);

        await taskListItem.waitFor({state: 'visible', timeout: 5000});
        expect(taskListItem).toBeVisible();
        await taskListItem.click();
        const prevtimer = await getCurrentHandleTime(testManager.agent1Page, i);
        await testManager.agent1Page.waitForTimeout(5000);
        const currentTimer = await getCurrentHandleTime(testManager.agent1Page, i);
        expect(currentTimer).toBeGreaterThan(prevtimer);
        expect(Math.abs(currentTimer - prevtimer + 1)).toBeGreaterThanOrEqual(5);
        const inferredType = await getTaskType(testManager);
        try {
          await verifyTaskControls(testManager.agent1Page, inferredType);
        } catch (error) {
          throw new Error(`Call control buttons verification failed: ${error.message}`);
        }

        await waitForConsoleLogs(
          capturedLogs,
          (await taskListItem.getByTestId('task:title').textContent())!,
          labelToMediaType[inferredType]
        );
        capturedLogs.length = 0;
      }
    });

    test.afterAll(async () => {
      await testManager.cleanup();
    });
  });
}
