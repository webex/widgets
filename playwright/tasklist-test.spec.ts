import { test, Page, expect, BrowserContext } from '@playwright/test';
import { changeUserState, getCurrentState } from './Utils/userStateUtils';
import { createCallTask, createChatTask, loginExtension, acceptExtensionCall, createEmailTask, endExtensionCall, submitRonaPopup, acceptIncomingTask } from './Utils/incomingTaskUtils';
import { TASK_TYPES, USER_STATES, LOGIN_MODE, THEME_COLORS, WRAPUP_REASONS, RONA_OPTIONS } from './constants';
import { verifyTaskControls } from './Utils/taskControlUtils';
import { submitWrapup } from './Utils/wrapupUtils';
import { pageSetup, handleStrayTasks, waitForState } from './Utils/helperUtils';


let page: Page | null = null;
let context: BrowserContext | null = null;
let callerpage: Page | null = null;
let context2: BrowserContext | null = null;
let chatPage: Page | null = null;
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
    const full = await page.getByTestId('task:handle-time').nth(index).textContent();

    // 2. Pull out the MM:SS via regex
    const match = full?.match(/(\d{2}:\d{2})/);
    const timer = match ? match[1] : null;

    // 3. (Optional) convert to total seconds
    const [m, s] = timer!.split(':').map(Number);
    const totalSeconds = m * 60 + s;
    return totalSeconds;
}

/**
 * wait for and accept a specific task in the task list.
 * @param page : Playwright Page object
 * @param testId : testId of the task to accept
 * @param extensionMode : extension mode flag
 * @param extensionPage : extension page if in extension mode
 */

async function waitForAndAcceptSpecificTask(page: Page, testId: string): Promise<void> {
    const timeoutMs = 60000, pollInterval = 2000
    const start = Date.now();
    const type = testId.split('-').pop();
    while (Date.now() - start < timeoutMs) {
        const taskDiv = page.getByTestId(testId).first();
        const isVisible = await taskDiv.isVisible().catch(() => false);
        if (isVisible) {
            const acceptButton = taskDiv.getByTestId('task:accept-button').first();
            await expect(acceptButton).toBeVisible({ timeout: 5000 });
            await acceptButton.click({ timeout: 3000 });

            return;
        }
        await page.waitForTimeout(pollInterval);
    }
    throw new Error(`No incoming task found for ${testId} after ${timeoutMs / 1000} seconds`);
}


async function getTaskType(): Promise<string> {
    const callTimer = page.getByTestId('cc-cad:call-timer').first();
    const fullText = await callTimer.textContent();
    const mediaLabel = fullText!.split(' - ')[0].trim();
    return mediaLabel;
}


function setupConsoleLogging(page: Page): () => void {
    capturedLogs.length = 0;

    const consoleHandler = (msg) => {
        const logText = msg.text();
        if (
            logText.startsWith('onTaskSelected invoked for task with title :') &&
            logText.includes(', and mediaType :')
        ) {
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
        '^onTaskSelected invoked for task with title : ' +
        escTitle +
        ', and mediaType : ' +
        escMedia +
        '$'
    );

    const start = Date.now();
    while (Date.now() - start < timeoutMs) {
        if (logs.some(log => pattern.test(log))) return;
        await new Promise(r => setTimeout(r, intervalMs));
    }

    throw new Error(
        `Timed out waiting for console log matching "${pattern.source}"`
    );
}



test.describe('Task List Tests for different types of Task', () => {
    test.beforeEach(() => {
        capturedLogs.length = 0;
    })

    test.beforeAll(async ({ browser }) => {
        context = await browser.newContext();
        context2 = await browser.newContext();
        page = await context.newPage();
        callerpage = await context2.newPage();
        chatPage = await context.newPage();
        setupConsoleLogging(page);

        await Promise.all([
            (async () => {
                await loginExtension(callerpage, process.env.PW_AGENT2_USERNAME, process.env.PW_PASSWORD);
            })(),
            (async () => {
                await pageSetup(page, LOGIN_MODE.DESKTOP, 'AGENT1');
            })(),
        ])
    })


    test('Verify Task List for incoming Call', async () => {
        await createCallTask(callerpage);
        await changeUserState(page, USER_STATES.AVAILABLE);
        let incomingTaskDiv = page.getByTestId('samples:incoming-task-telephony').first();
        await incomingTaskDiv.waitFor({ state: 'visible', timeout: 40000 });
        await page.waitForTimeout(1000);
        const taskListItem = page.getByTestId('task-list').getByRole('listitem').first();
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
        await page.waitForTimeout(1000);
        await expect(taskListAcceptButton).not.toBeVisible();
        await expect(taskListDeclineButton).not.toBeVisible();
        await page.waitForTimeout(5000);
        try {
            await verifyTaskControls(page, TASK_TYPES.CALL);
        } catch (error) {
            throw new Error(`Call control buttons verification failed: ${error.message}`);
        }
        await waitForState(page, USER_STATES.ENGAGED);
        await taskListItem.click();
        await waitForConsoleLogs(capturedLogs, title, 'telephony');
        expect(await taskListItem.getByTestId('task:title').textContent()).toBe(title);
        await expect(taskListItem.locator('[icon-name="handset-filled"]')).toBeVisible();
        await expect(taskListItem.getByTestId('task:item-state')).toHaveText('Connected');
        await expect(taskListItem.getByTestId('task:handle-time')).toBeVisible();
        await page.getByTestId('call-control:end-call').first().waitFor({ state: 'visible', timeout: 5000 });
        await page.getByTestId('call-control:end-call').first().click();
        await page.waitForTimeout(500);
        await submitWrapup(page, WRAPUP_REASONS.SALE);
        await waitForState(page, USER_STATES.AVAILABLE);
    })

    test('Verify Task List for incoming Chat Task', async () => {
        await createChatTask(chatPage);
        await changeUserState(page, USER_STATES.AVAILABLE);
        const incomingTaskDiv = page.getByTestId('samples:incoming-task-chat').first();
        await incomingTaskDiv.waitFor({ state: 'visible', timeout: 60000 });
        await page.waitForTimeout(1000);
        const taskListItem = page.getByTestId('task-list').getByRole('listitem').first();
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
        await page.waitForTimeout(1000);
        await waitForState(page, USER_STATES.ENGAGED);
        const prevtimer = await getCurrentHandleTime(page);
        await page.waitForTimeout(5000);
        const currentTimer = await getCurrentHandleTime(page);
        expect(currentTimer).toBeGreaterThan(prevtimer);
        expect(Math.abs(currentTimer - prevtimer + 1)).toBeGreaterThanOrEqual(5);
        try {
            await verifyTaskControls(page, TASK_TYPES.CHAT);
        } catch (error) {
            throw new Error(`Call control buttons verification failed: ${error.message}`);
        }
        await waitForConsoleLogs(capturedLogs, title, 'chat');
        await expect(taskListAcceptButton).not.toBeVisible();
        await expect(taskListDeclineButton).not.toBeVisible();
        expect(await taskListItem.getByTestId('task:title').textContent()).toBe(title);
        await expect(taskListItem.locator('[icon-name="chat-filled"]')).toBeVisible();
        await expect(taskListItem.getByTestId('task:item-state')).toHaveText('Connected');
        await expect(taskListItem.getByTestId('task:handle-time')).toBeVisible();
        await page.getByTestId('call-control:end-call').first().waitFor({ state: 'visible', timeout: 5000 });
        await page.getByTestId('call-control:end-call').first().click();
        await page.waitForTimeout(2000);
        await submitWrapup(page, WRAPUP_REASONS.SALE);
        await waitForState(page, USER_STATES.AVAILABLE);
    })

    test('Verify Task List for incoming Email Task', async () => {
        await createEmailTask();
        await changeUserState(page, USER_STATES.AVAILABLE);
        const incomingTaskDiv = page.getByTestId('samples:incoming-task-email').first();
        await incomingTaskDiv.waitFor({ state: 'visible', timeout: 60000 });
        await page.waitForTimeout(1000);
        const taskListItem = page.getByTestId('task-list').getByRole('listitem').first();
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
        await page.waitForTimeout(1000);
        const prevtimer = await getCurrentHandleTime(page);
        await page.waitForTimeout(5000);

        const currentTimer = await getCurrentHandleTime(page);
        expect(currentTimer).toBeGreaterThan(prevtimer);
        expect(Math.abs(currentTimer - prevtimer + 1)).toBeGreaterThanOrEqual(5);

        try {
            await verifyTaskControls(page, TASK_TYPES.EMAIL);
        } catch (error) {
            throw new Error(`Call control buttons verification failed: ${error.message}`);
        }

        await expect(taskListAcceptButton).not.toBeVisible();
        await expect(taskListDeclineButton).not.toBeVisible();
        await waitForState(page, USER_STATES.ENGAGED);
        await waitForConsoleLogs(capturedLogs, title, 'email');
        expect(await taskListItem.getByTestId('task:title').textContent()).toBe(title);
        await expect(taskListItem.locator('[icon-name="email-filled"]')).toBeVisible();
        await expect(taskListItem.getByTestId('task:item-state')).toHaveText('Connected');
        await expect(taskListItem.getByTestId('task:handle-time')).toBeVisible();
        await page.getByTestId('call-control:end-call').first().waitFor({ state: 'visible', timeout: 5000 });
        await page.getByTestId('call-control:end-call').first().click();
        await page.waitForTimeout(2000);
        await submitWrapup(page, WRAPUP_REASONS.SALE);
        await waitForState(page, USER_STATES.AVAILABLE);
    });

    test('Task List Test with Multiple Taks', async () => {
        await changeUserState(page, USER_STATES.MEETING);
        await waitForState(page, USER_STATES.MEETING);
        await Promise.all([
            createCallTask(callerpage),
            createChatTask(chatPage),
            createEmailTask()
        ])

        await changeUserState(page, USER_STATES.AVAILABLE);

        await Promise.all([
            waitForAndAcceptSpecificTask(page, 'samples:incoming-task-telephony'),
            waitForAndAcceptSpecificTask(page, 'samples:incoming-task-chat'),
            waitForAndAcceptSpecificTask(page, 'samples:incoming-task-email'),
        ]);
        await page.waitForTimeout(3000);

        for (let i = 0; i < 3; i++) {
            const taskListItem = page
                .getByTestId('task-list')
                .getByRole('listitem')
                .nth(i);

            await taskListItem.waitFor({ state: 'visible', timeout: 5000 });
            expect(taskListItem).toBeVisible();
            await taskListItem.click();
            const prevtimer = await getCurrentHandleTime(page, i);
            await page.waitForTimeout(5000);
            const currentTimer = await getCurrentHandleTime(page, i);
            expect(currentTimer).toBeGreaterThan(prevtimer);
            expect(Math.abs(currentTimer - prevtimer + 1)).toBeGreaterThanOrEqual(5);
            const inferredType = await getTaskType();
            try {
                await verifyTaskControls(page, inferredType);
            } catch (error) {
                throw new Error(`Call control buttons verification failed: ${error.message}`);
            }

            await waitForConsoleLogs(capturedLogs, await taskListItem.getByTestId('task:title').textContent()!, labelToMediaType[inferredType]);
            capturedLogs.length = 0;
        }

        await handleStrayTasks(page);
    })

    test.afterAll(async () => {
        if (context) {
            await context.close();
            context = null;
        }
        if (context2) {
            await context2.close();
            context2 = null;
        }
        if (page) {
            await page.close();
            page = null;
        }
        if (callerpage) {
            await callerpage.close();
            callerpage = null;
        }
        if (chatPage) {
            await chatPage.close();
            chatPage = null;
        }

    })
})
