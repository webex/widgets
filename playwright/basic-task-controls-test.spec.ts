import {test, expect, Page, BrowserContext} from '@playwright/test';
import {enableAllWidgets, enableMultiLogin, initialiseWidgets, loginViaAccessToken} from './Utils/initUtils';
import {stationLogout, telephonyLogin} from './Utils/stationLoginUtils';
import {changeUserState, getCurrentState, verifyCurrentState} from './Utils/userStateUtils';
import {
  createCallTask,
  createChatTask,
  createEmailTask,
  acceptIncomingTask,
  loginExtension,
  endChatTask,
  acceptExtensionCall,
  endCallTask,
} from './Utils/incomingTaskUtils';
import {
  verifyTaskControls,
  holdCallToggle,
  recordCallToggle,
  setupConsoleLogging,
  clearCapturedLogs,
  verifyHoldLogs,
  verifyRecordingLogs,
  verifyEndLogs,
  verifyHoldTimer,
  verifyRemoteAudioTracks,
  verifyHoldMusicElement,
  endTask,
  verifyHoldButtonIcon,
  verifyRecordButtonIcon,
} from './Utils/taskControlUtils';
import {submitWrapup} from './Utils/wrapupUtils';
import {pageSetup} from './Utils/helperUtils';
import {USER_STATES, LOGIN_MODE, TASK_TYPES, WRAPUP_REASONS} from './constants';

// Extract test functions for cleaner syntax
const {describe, beforeAll, afterAll, beforeEach} = test;

let page: Page;
let context: BrowserContext;
let callerPage: Page;
let chatPage: Page;
let context2: BrowserContext;
const maxRetries = 3;

describe('Basic Task Controls Tests', () => {
  beforeEach(() => {
    clearCapturedLogs();
  });

  beforeAll(async ({browser}) => {
    context = await browser.newContext();
    context2 = await browser.newContext();
    page = await context.newPage();
    chatPage = await context.newPage();
    callerPage = await context2.newPage();

    await Promise.all([
      (async () => {
        for (let i = 0; i < maxRetries; i++) {
          try {
            await loginExtension(callerPage, process.env.PW_AGENT2_USERNAME ?? '', process.env.PW_PASSWORD ?? '');
            break;
          } catch (error) {
            if (i == maxRetries - 1) {
              throw new Error(`Failed to login extension after ${maxRetries} attempts: ${error}`);
            }
          }
        }
      })(),
      (async () => {
        await pageSetup(page, LOGIN_MODE.DESKTOP, 'AGENT1');
        setupConsoleLogging(page);
      })(),
    ]);
  });

  afterAll(async () => {
    if ((await getCurrentState(page)) === USER_STATES.ENGAGED) {
      // If still engaged, end the call to clean up
      await endTask(page);
      await page.waitForTimeout(3000);
      await submitWrapup(page, WRAPUP_REASONS.RESOLVED);
      await page.waitForTimeout(2000);
    }
    await stationLogout(page);
    await context.close();
    await context2.close();
  });

  test('Call task - create call and verify all control buttons are visible', async () => {
    // Create call task
    await createCallTask(callerPage);
    await changeUserState(page, USER_STATES.AVAILABLE);

    // Wait for incoming call notification
    const incomingTaskDiv = page.getByTestId('samples:incoming-task-telephony').first();
    await incomingTaskDiv.waitFor({state: 'visible', timeout: 120000});
    await page.waitForTimeout(3000);

    // Accept the incoming call
    await acceptIncomingTask(page, TASK_TYPES.CALL);
    await page.waitForTimeout(5000);

    // Verify agent state changed to engaged
    await verifyCurrentState(page, USER_STATES.ENGAGED);

    // Use utility to check all call control buttons are visible
    try {
      await verifyTaskControls(page, TASK_TYPES.CALL);
    } catch (error) {
      throw new Error(`Call control buttons verification failed: ${error.message}`);
    }
  });

  test('Call task - verify remote audio tracks from caller to browser', async () => {
    // Verify we're still in an engaged call from previous test
    await verifyCurrentState(page, USER_STATES.ENGAGED);

    try {
      // Then verify the audio tracks with the exact structure you provided
      await verifyRemoteAudioTracks(page);
    } catch (error) {
      throw new Error(`Remote audio tracks verification failed: ${error.message}`);
    }
  });

  test('Call task - verify hold and resume functionality with callbacks, timer, and hold music', async () => {
    // Verify we're still in an engaged call from previous test
    await verifyCurrentState(page, USER_STATES.ENGAGED);

    try {
      // Clear logs first to ensure clean state
      clearCapturedLogs();

      // Verify initial hold button icon (should show pause icon when call is active)
      await verifyHoldButtonIcon(page, {expectedIsHeld: false});

      // Put call on hold from agent side
      await holdCallToggle(page);
      await page.waitForTimeout(3000); // Allow time for hold to take effect

      // Verify hold callback logs
      verifyHoldLogs({expectedIsHeld: true});

      // Verify hold button icon changed to play icon (when call is on hold)
      await verifyHoldButtonIcon(page, {expectedIsHeld: true});

      // Verify hold music element is present on the CALLER page (where hold music plays)
      // The hold music plays on the caller's side when agent puts call on hold
      await verifyHoldMusicElement(callerPage);

      // Verify hold timer is visible and functioning
      await verifyHoldTimer(page, {shouldBeVisible: true});

      clearCapturedLogs(); // Clear logs for next verification

      // Resume call from hold
      await holdCallToggle(page);
      await page.waitForTimeout(2000);

      // Verify resume callback logs
      verifyHoldLogs({expectedIsHeld: false});

      // Verify hold button icon changed back to pause icon (when call is active)
      await verifyHoldButtonIcon(page, {expectedIsHeld: false});

      verifyHoldTimer(page, {shouldBeVisible: false});
    } catch (error) {
      throw new Error(
        `Hold/Resume functionality with callbacks, timer, and hold music verification failed: ${error.message}`
      );
    }
  });

  test('Call task - verify recording pause and resume functionality with callbacks', async () => {
    // Verify we're still in an engaged call from previous tests
    await verifyCurrentState(page, USER_STATES.ENGAGED);

    try {
      // Verify initial record button icon (should show pause icon when recording is active)
      await verifyRecordButtonIcon(page, {expectedIsRecording: true});

      // Pause the call recording
      await recordCallToggle(page);
      await page.waitForTimeout(2000);

      // Verify pause recording callback logs
      verifyRecordingLogs({expectedIsRecording: false});

      // Verify record button icon changed to record icon (when recording is paused)
      await verifyRecordButtonIcon(page, {expectedIsRecording: false});

      clearCapturedLogs(); // Clear logs for next verification

      // Resume the call recording
      await recordCallToggle(page);
      await page.waitForTimeout(2000);

      // Verify resume recording callback logs
      verifyRecordingLogs({expectedIsRecording: true});

      // Verify record button icon changed back to pause icon (when recording is active)
      await verifyRecordButtonIcon(page, {expectedIsRecording: true});
    } catch (error) {
      throw new Error(`Recording pause/resume functionality verification failed: ${error.message}`);
    }
  });

  test('Call task - end call and complete wrapup', async () => {
    // Verify we're still in an engaged call from previous tests
    await verifyCurrentState(page, USER_STATES.ENGAGED);

    try {
      // End the call by clicking the end button
      await endTask(page);
      await page.waitForTimeout(3000);

      // Verify onEnd callback logs
      verifyEndLogs();

      // Submit wrapup
      await submitWrapup(page, WRAPUP_REASONS.RESOLVED);
      await page.waitForTimeout(2000);
    } catch (error) {
      throw new Error(`Call task end and wrapup failed: ${error.message}`);
    }
  });

  test('Chat task - verify transfer and end buttons are visible, end chat, and wrap up', async () => {
    // Create chat task
    await createChatTask(chatPage);
    await changeUserState(page, USER_STATES.AVAILABLE);

    // Wait for incoming chat notification
    const incomingTaskDiv = page.getByTestId('samples:incoming-task-chat').first();
    await incomingTaskDiv.waitFor({state: 'visible', timeout: 120000});
    await page.waitForTimeout(3000);

    // Accept the incoming chat
    await acceptIncomingTask(page, TASK_TYPES.CHAT);
    await page.waitForTimeout(5000);

    // Verify agent state changed to engaged
    await verifyCurrentState(page, USER_STATES.ENGAGED);

    try {
      // Use utility to check chat control buttons are visible
      await verifyTaskControls(page, TASK_TYPES.CHAT);

      // End the chat by clicking the end button
      await endTask(page);
      await page.waitForTimeout(3000);

      // Verify onEnd callback logs
      verifyEndLogs();

      // Submit wrapup
      await submitWrapup(page, WRAPUP_REASONS.RESOLVED);
      await page.waitForTimeout(2000);
    } catch (error) {
      throw new Error(`Chat task control test failed: ${error.message}`);
    }
  });

  test('Email task - verify transfer and end buttons are visible, end email, and wrap up', async () => {
    // Create email task
    await createEmailTask();
    await changeUserState(page, USER_STATES.AVAILABLE);

    // Wait for incoming email notification (emails may take longer)
    const incomingTaskDiv = page.getByTestId('samples:incoming-task-email').first();
    await incomingTaskDiv.waitFor({state: 'visible', timeout: 180000}); // 3 minutes for email
    await page.waitForTimeout(3000);

    // Accept the incoming email
    await acceptIncomingTask(page, TASK_TYPES.EMAIL);
    await page.waitForTimeout(5000);

    // Verify agent state changed to engaged
    await verifyCurrentState(page, USER_STATES.ENGAGED);

    try {
      // Use utility to check email control buttons are visible
      await verifyTaskControls(page, TASK_TYPES.EMAIL);

      // End the email by clicking the end button
      await endTask(page);
      await page.waitForTimeout(3000);

      // Verify onEnd callback logs
      verifyEndLogs();

      // Submit wrapup
      await submitWrapup(page, WRAPUP_REASONS.RESOLVED);
      await page.waitForTimeout(2000);
    } catch (error) {
      throw new Error(`Email task control test failed: ${error.message}`);
    }
  });
});

describe('Multi-Login Task Controls Tests', () => {
  let session1Page: Page;
  let session2Page: Page;
  let session1Context: BrowserContext;
  let session2Context: BrowserContext;
  let callerPageMulti: Page;
  let callerContextMulti: BrowserContext;
  let extensionPage: Page;
  let extensionContext: BrowserContext;

  beforeEach(() => {
    clearCapturedLogs();
  });

  beforeAll(async ({browser}) => {
    // Create separate browser contexts for multi-session testing
    session1Context = await browser.newContext();
    session2Context = await browser.newContext();
    callerContextMulti = await browser.newContext();
    extensionContext = await browser.newContext();

    session1Page = await session1Context.newPage();
    session2Page = await session2Context.newPage();
    callerPageMulti = await callerContextMulti.newPage();
    extensionPage = await extensionContext.newPage();

    await Promise.all([
      (async () => {
        for (let i = 0; i < maxRetries; i++) {
          try {
            await loginExtension(callerPageMulti, process.env.PW_AGENT2_USERNAME ?? '', process.env.PW_PASSWORD ?? '');
            break;
          } catch (error) {
            if (i == maxRetries - 1) {
              throw new Error(
                `Failed to login extension for multi-session test after ${maxRetries} attempts: ${error}`
              );
            }
          }
        }
      })(),
      (async () => {
        await pageSetup(session1Page, LOGIN_MODE.EXTENSION, 'AGENT1', extensionPage);
        setupConsoleLogging(session1Page);
      })(),
      (async () => {
        await pageSetup(session2Page, LOGIN_MODE.EXTENSION, 'AGENT1', extensionPage);
        setupConsoleLogging(session2Page);
      })(),
      (async () => {
        for (let i = 0; i < maxRetries; i++) {
          try {
            await loginExtension(extensionPage, process.env.PW_AGENT1_USERNAME ?? '', process.env.PW_PASSWORD ?? '');
            break;
          } catch (error) {
            if (i == maxRetries - 1) {
              throw new Error(`Failed to login extension after ${maxRetries} attempts: ${error}`);
            }
          }
        }
      })(),
    ]);
  });

  afterAll(async () => {
    // If still engaged, end the call to clean up
    if ((await getCurrentState(session1Page)) === USER_STATES.ENGAGED) {
      await endTask(session1Page);
      await session1Page.waitForTimeout(5000);
      await submitWrapup(session1Page, WRAPUP_REASONS.RESOLVED);
      await session1Page.waitForTimeout(2000);
    }
    await Promise.all([stationLogout(session1Page), stationLogout(session2Page)]);
    await session1Context.close();
    await session2Context.close();
    await callerContextMulti.close();
    await extensionContext.close();
  });

  test('Multi-login call controls - verify controls are synchronized', async () => {
    // Set both AGENT1 sessions to available state
    await Promise.all([changeUserState(session1Page, USER_STATES.AVAILABLE)]);
    await session1Page.waitForTimeout(2000);

    // Caller page creates call to extension page
    await createCallTask(callerPageMulti);

    // Wait for incoming call notification on both AGENT1 sessions
    const incomingTaskSession1 = session1Page.getByTestId('samples:incoming-task-telephony').first();
    const incomingTaskSession2 = session2Page.getByTestId('samples:incoming-task-telephony').first();

    await Promise.all([
      incomingTaskSession1.waitFor({state: 'visible', timeout: 40000}),
      incomingTaskSession2.waitFor({state: 'visible', timeout: 40000}),
    ]);

    // Wait for extension caller to be visible and accept the call
    await extensionPage.locator('[data-test="generic-person-item-base"]').waitFor({state: 'visible', timeout: 20000});
    await session1Page.waitForTimeout(3000);
    await acceptExtensionCall(extensionPage);
    await session1Page.waitForTimeout(2000);

    // Verify both AGENT1 sessions show engaged state
    await Promise.all([
      verifyCurrentState(session1Page, USER_STATES.ENGAGED),
      verifyCurrentState(session2Page, USER_STATES.ENGAGED),
    ]);

    try {
      // Verify call control buttons are visible on both AGENT1 sessions
      await Promise.all([
        verifyTaskControls(session1Page, TASK_TYPES.CALL),
        verifyTaskControls(session2Page, TASK_TYPES.CALL),
      ]);

      // Setup console logging for both AGENT1 sessions
      setupConsoleLogging(session1Page);
      setupConsoleLogging(session2Page);

      // Verify initial hold button icons on both sessions (should show pause icon when call is active)
      await Promise.all([
        verifyHoldButtonIcon(session1Page, {expectedIsHeld: false}),
        verifyHoldButtonIcon(session2Page, {expectedIsHeld: false}),
      ]);

      // Put call on hold from session 1 (AGENT1)
      await holdCallToggle(session1Page);
      await session1Page.waitForTimeout(3000);

      // Verify hold button icons changed to play icon on both sessions (when call is on hold)
      await Promise.all([
        verifyHoldButtonIcon(session1Page, {expectedIsHeld: true}),
        verifyHoldButtonIcon(session2Page, {expectedIsHeld: true}),
      ]);

      // Verify hold timer is visible on both AGENT1 sessions
      await Promise.all([
        verifyHoldTimer(session1Page, {shouldBeVisible: true}),
        verifyHoldTimer(session2Page, {shouldBeVisible: true}),
      ]);

      // Resume call from session 2 (AGENT1)
      await holdCallToggle(session2Page);
      await session2Page.waitForTimeout(3000);

      // Verify hold button icons changed back to pause icon on both sessions (when call is active)
      await Promise.all([
        verifyHoldButtonIcon(session1Page, {expectedIsHeld: false}),
        verifyHoldButtonIcon(session2Page, {expectedIsHeld: false}),
      ]);

      // Verify hold timer disappears on both AGENT1 sessions
      await Promise.all([
        verifyHoldTimer(session1Page, {shouldBeVisible: false}),
        verifyHoldTimer(session2Page, {shouldBeVisible: false}),
      ]);

      // Verify initial record button icons on both sessions (should show pause icon when recording is active)
      await Promise.all([
        verifyRecordButtonIcon(session1Page, {expectedIsRecording: true}),
        verifyRecordButtonIcon(session2Page, {expectedIsRecording: true}),
      ]);

      // Pause recording from session 1 (AGENT1)
      await recordCallToggle(session1Page);
      await session1Page.waitForTimeout(2000);

      // Verify record button icons changed to record icon on both sessions (when recording is paused)
      await Promise.all([
        verifyRecordButtonIcon(session1Page, {expectedIsRecording: false}),
        verifyRecordButtonIcon(session2Page, {expectedIsRecording: false}),
      ]);

      // Resume recording from session 2 (AGENT1)
      await recordCallToggle(session2Page);
      await session2Page.waitForTimeout(2000);

      // Verify record button icons changed back to pause icon on both sessions (when recording is active)
      await Promise.all([
        verifyRecordButtonIcon(session1Page, {expectedIsRecording: true}),
        verifyRecordButtonIcon(session2Page, {expectedIsRecording: true}),
      ]);

      // End call from extension page
      await endCallTask(extensionPage);
      await session1Page.waitForTimeout(2000);

      // Submit wrapup from session 1 (AGENT1)
      await submitWrapup(session1Page, WRAPUP_REASONS.RESOLVED);
      await session1Page.waitForTimeout(2000);

      // Verify both AGENT1 sessions return to available state
      await Promise.all([
        verifyCurrentState(session1Page, USER_STATES.AVAILABLE),
        verifyCurrentState(session2Page, USER_STATES.AVAILABLE),
      ]);
    } catch (error) {
      throw new Error(`Multi-session call controls synchronization failed: ${error.message}`);
    }
  });
});
