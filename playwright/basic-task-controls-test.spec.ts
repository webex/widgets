import {test} from '@playwright/test';
import {changeUserState, getCurrentState, verifyCurrentState} from './Utils/userStateUtils';
import {
  createCallTask,
  createChatTask,
  createEmailTask,
  acceptIncomingTask,
  acceptExtensionCall,
  endCallTask,
} from './Utils/incomingTaskUtils';
import {
  verifyTaskControls,
  holdCallToggle,
  recordCallToggle,
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
import {USER_STATES, TASK_TYPES, WRAPUP_REASONS} from './constants';
import {TestManager} from './test-manager';

// Extract test functions for cleaner syntax
const {describe, beforeAll, afterAll, beforeEach} = test;

export default function createBasicTaskControlsTests() {
  let testManager: TestManager;

  describe('Basic Task Controls Tests', () => {
    beforeEach(() => {
      clearCapturedLogs();
    });

    beforeAll(async ({browser}, testInfo) => {
      const projectName = testInfo.project.name;
      testManager = new TestManager(projectName);
      await testManager.setupForIncomingTaskDesktop(browser);
    });

    afterAll(async () => {
      if ((await getCurrentState(testManager.agent1Page)) === USER_STATES.ENGAGED) {
        // If still engaged, end the call to clean up
        await endTask(testManager.agent1Page);
        await testManager.agent1Page.waitForTimeout(3000);
        await submitWrapup(testManager.agent1Page, WRAPUP_REASONS.RESOLVED);
        await testManager.agent1Page.waitForTimeout(2000);
      }
      if (testManager) {
        await testManager.cleanup();
      }
    });

    test('Call task - create call and verify all control buttons are visible', async () => {
      // Create call task
      await createCallTask(testManager.callerPage!, process.env[`${testManager.projectName}_DIAL_NUMBER`]!);
      await changeUserState(testManager.agent1Page, USER_STATES.AVAILABLE);

      // Wait for incoming call notification
      const incomingTaskDiv = testManager.agent1Page.getByTestId('samples:incoming-task-telephony').first();
      await incomingTaskDiv.waitFor({state: 'visible', timeout: 80000});
      await testManager.agent1Page.waitForTimeout(3000);

      // Accept the incoming call
      await acceptIncomingTask(testManager.agent1Page, TASK_TYPES.CALL);
      await testManager.agent1Page.waitForTimeout(5000);

      // Verify agent state changed to engaged
      await verifyCurrentState(testManager.agent1Page, USER_STATES.ENGAGED);

      // Use utility to check all call control buttons are visible
      try {
        await verifyTaskControls(testManager.agent1Page, TASK_TYPES.CALL);
      } catch (error) {
        throw new Error(`Call control buttons verification failed: ${error.message}`);
      }
    });

    test('Call task - verify remote audio tracks from caller to browser', async () => {
      // Verify we're still in an engaged call from previous test
      await verifyCurrentState(testManager.agent1Page, USER_STATES.ENGAGED);

      try {
        // Then verify the audio tracks with the exact structure you provided
        await verifyRemoteAudioTracks(testManager.agent1Page);
      } catch (error) {
        throw new Error(`Remote audio tracks verification failed: ${error.message}`);
      }
    });

    test('Call task - verify hold and resume functionality with callbacks, timer, and hold music', async () => {
      // Verify we're still in an engaged call from previous test
      await verifyCurrentState(testManager.agent1Page, USER_STATES.ENGAGED);

      try {
        // Clear logs first to ensure clean state
        clearCapturedLogs();

        // Verify initial hold button icon (should show pause icon when call is active)
        await verifyHoldButtonIcon(testManager.agent1Page, {expectedIsHeld: false});

        // Put call on hold from agent side
        await holdCallToggle(testManager.agent1Page);
        await testManager.agent1Page.waitForTimeout(3000); // Allow time for hold to take effect

        // Verify hold callback logs
        verifyHoldLogs({expectedIsHeld: true});

        // Verify hold button icon changed to play icon (when call is on hold)
        await verifyHoldButtonIcon(testManager.agent1Page, {expectedIsHeld: true});

        // Verify hold music element is present on the CALLER page (where hold music plays)
        // The hold music plays on the caller's side when agent puts call on hold
        await verifyHoldMusicElement(testManager.callerPage!);

        // Verify hold timer is visible and functioning
        await verifyHoldTimer(testManager.agent1Page, {shouldBeVisible: true});

        clearCapturedLogs(); // Clear logs for next verification

        // Resume call from hold
        await holdCallToggle(testManager.agent1Page);
        await testManager.agent1Page.waitForTimeout(2000);

        // Verify resume callback logs
        verifyHoldLogs({expectedIsHeld: false});

        // Verify hold button icon changed back to pause icon (when call is active)
        await verifyHoldButtonIcon(testManager.agent1Page, {expectedIsHeld: false});

        verifyHoldTimer(testManager.agent1Page, {shouldBeVisible: false});
      } catch (error) {
        throw new Error(
          `Hold/Resume functionality with callbacks, timer, and hold music verification failed: ${error.message}`
        );
      }
    });

    test('Call task - verify recording pause and resume functionality with callbacks', async () => {
      // Verify we're still in an engaged call from previous tests
      await verifyCurrentState(testManager.agent1Page, USER_STATES.ENGAGED);

      try {
        // Verify initial record button icon (should show pause icon when recording is active)
        await verifyRecordButtonIcon(testManager.agent1Page, {expectedIsRecording: true});

        // Pause the call recording
        await recordCallToggle(testManager.agent1Page);
        await testManager.agent1Page.waitForTimeout(2000);

        // Verify pause recording callback logs
        verifyRecordingLogs({expectedIsRecording: false});

        // Verify record button icon changed to record icon (when recording is paused)
        await verifyRecordButtonIcon(testManager.agent1Page, {expectedIsRecording: false});

        clearCapturedLogs(); // Clear logs for next verification

        // Resume the call recording
        await recordCallToggle(testManager.agent1Page);
        await testManager.agent1Page.waitForTimeout(2000);

        // Verify resume recording callback logs
        verifyRecordingLogs({expectedIsRecording: true});

        // Verify record button icon changed back to pause icon (when recording is active)
        await verifyRecordButtonIcon(testManager.agent1Page, {expectedIsRecording: true});
      } catch (error) {
        throw new Error(`Recording pause/resume functionality verification failed: ${error.message}`);
      }
    });

    test('Call task - end call and complete wrapup', async () => {
      // Verify we're still in an engaged call from previous tests
      await verifyCurrentState(testManager.agent1Page, USER_STATES.ENGAGED);

      try {
        // End the call by clicking the end button
        await endTask(testManager.agent1Page);
        await testManager.agent1Page.waitForTimeout(3000);

        // Verify onEnd callback logs
        verifyEndLogs();

        // Submit wrapup
        await submitWrapup(testManager.agent1Page, WRAPUP_REASONS.RESOLVED);
        await testManager.agent1Page.waitForTimeout(2000);
      } catch (error) {
        throw new Error(`Call task end and wrapup failed: ${error.message}`);
      }
    });

    test('Chat task - verify transfer and end buttons are visible, end chat, and wrap up', async () => {
      // Create chat task
      await createChatTask(testManager.chatPage, process.env[`${testManager.projectName}_CHAT_URL`]!);
      await changeUserState(testManager.agent1Page, USER_STATES.AVAILABLE);

      // Wait for incoming chat notification
      const incomingTaskDiv = testManager.agent1Page.getByTestId('samples:incoming-task-chat').first();
      await incomingTaskDiv.waitFor({state: 'visible', timeout: 80000});
      await testManager.agent1Page.waitForTimeout(3000);

      // Accept the incoming chat
      await acceptIncomingTask(testManager.agent1Page, TASK_TYPES.CHAT);
      await testManager.agent1Page.waitForTimeout(5000);

      // Verify agent state changed to engaged
      await verifyCurrentState(testManager.agent1Page, USER_STATES.ENGAGED);

      try {
        // Use utility to check chat control buttons are visible
        await verifyTaskControls(testManager.agent1Page, TASK_TYPES.CHAT);

        // End the chat by clicking the end button
        await endTask(testManager.agent1Page);
        await testManager.agent1Page.waitForTimeout(3000);

        // Verify onEnd callback logs
        verifyEndLogs();

        // Submit wrapup
        await submitWrapup(testManager.agent1Page, WRAPUP_REASONS.RESOLVED);
        await testManager.agent1Page.waitForTimeout(2000);
      } catch (error) {
        throw new Error(`Chat task control test failed: ${error.message}`);
      }
    });

    test('Email task - verify transfer and end buttons are visible, end email, and wrap up', async () => {
      // Create email task
      await createEmailTask(process.env[`${testManager.projectName}_EMAIL_ENTRY_POINT`]!);
      await changeUserState(testManager.agent1Page, USER_STATES.AVAILABLE);

      // Wait for incoming email notification (emails may take longer)
      const incomingTaskDiv = testManager.agent1Page.getByTestId('samples:incoming-task-email').first();
      await incomingTaskDiv.waitFor({state: 'visible', timeout: 180000}); // 3 minutes for email
      await testManager.agent1Page.waitForTimeout(3000);

      // Accept the incoming email
      await acceptIncomingTask(testManager.agent1Page, TASK_TYPES.EMAIL);
      await testManager.agent1Page.waitForTimeout(5000);

      // Verify agent state changed to engaged
      await verifyCurrentState(testManager.agent1Page, USER_STATES.ENGAGED);

      try {
        // Use utility to check email control buttons are visible
        await verifyTaskControls(testManager.agent1Page, TASK_TYPES.EMAIL);

        // End the email by clicking the end button
        await endTask(testManager.agent1Page);
        await testManager.agent1Page.waitForTimeout(3000);

        // Verify onEnd callback logs
        verifyEndLogs();

        // Submit wrapup
        await submitWrapup(testManager.agent1Page, WRAPUP_REASONS.RESOLVED);
        await testManager.agent1Page.waitForTimeout(2000);
      } catch (error) {
        throw new Error(`Email task control test failed: ${error.message}`);
      }
    });
  });

  describe('Multi-Login Task Controls Tests', () => {
    let testManagerMulti: TestManager;

    beforeEach(() => {
      clearCapturedLogs();
    });

    beforeAll(async ({browser}, testInfo) => {
      const projectName = testInfo.project.name;
      testManagerMulti = new TestManager(projectName);
      await testManagerMulti.setupForTaskControlsMultiLogin(browser);
    });

    afterAll(async () => {
      if (testManagerMulti) {
        await testManagerMulti.cleanup();
      }
    });

    test('Multi-login call controls - verify controls are synchronized', async () => {
      // Set both AGENT1 sessions to available state
      await Promise.all([changeUserState(testManagerMulti.agent1Page, USER_STATES.AVAILABLE)]);
      await testManagerMulti.agent1Page.waitForTimeout(2000);

      // Caller page creates call to extension page
      await createCallTask(testManagerMulti.callerPage!, process.env[`${testManagerMulti.projectName}_DIAL_NUMBER`]!);

      // Wait for incoming call notification on both AGENT1 sessions
      const incomingTaskSession1 = testManagerMulti.agent1Page.getByTestId('samples:incoming-task-telephony').first();
      const incomingTaskSession2 = testManagerMulti
        .multiSessionAgent1Page!.getByTestId('samples:incoming-task-telephony')
        .first();

      await Promise.all([
        incomingTaskSession1.waitFor({state: 'visible', timeout: 40000}),
        incomingTaskSession2.waitFor({state: 'visible', timeout: 40000}),
      ]);

      // Wait for extension caller to be visible and accept the call
      await testManagerMulti.agent1ExtensionPage.waitForTimeout(2000);
      await testManagerMulti.agent1ExtensionPage
        .locator('[data-test="generic-person-item-base"]')
        .waitFor({state: 'visible', timeout: 20000});
      await acceptExtensionCall(testManagerMulti.agent1ExtensionPage);
      await testManagerMulti.agent1Page.waitForTimeout(2000);
      await testManagerMulti.multiSessionAgent1Page!.waitForTimeout(2000);
      // Verify both AGENT1 sessions show engaged state
      await Promise.all([
        verifyCurrentState(testManagerMulti.agent1Page, USER_STATES.ENGAGED),
        verifyCurrentState(testManagerMulti.multiSessionAgent1Page!, USER_STATES.ENGAGED),
      ]);

      try {
        // Verify call control buttons are visible on both AGENT1 sessions
        await Promise.all([
          verifyTaskControls(testManagerMulti.agent1Page, TASK_TYPES.CALL),
          verifyTaskControls(testManagerMulti.multiSessionAgent1Page!, TASK_TYPES.CALL),
        ]);

        // Verify initial hold button icons on both sessions (should show pause icon when call is active)
        await Promise.all([
          verifyHoldButtonIcon(testManagerMulti.agent1Page, {expectedIsHeld: false}),
          verifyHoldButtonIcon(testManagerMulti.multiSessionAgent1Page!, {expectedIsHeld: false}),
        ]);

        // Put call on hold from session 1 (AGENT1)
        await holdCallToggle(testManagerMulti.agent1Page);
        await testManagerMulti.agent1Page.waitForTimeout(3000);

        // Verify hold button icons changed to play icon on both sessions (when call is on hold)
        await Promise.all([
          verifyHoldButtonIcon(testManagerMulti.agent1Page, {expectedIsHeld: true}),
          verifyHoldButtonIcon(testManagerMulti.multiSessionAgent1Page!, {expectedIsHeld: true}),
        ]);

        // Verify hold timer is visible on both AGENT1 sessions
        await Promise.all([
          verifyHoldTimer(testManagerMulti.agent1Page, {shouldBeVisible: true}),
          verifyHoldTimer(testManagerMulti.multiSessionAgent1Page!, {shouldBeVisible: true}),
        ]);

        // Resume call from session 2 (AGENT1)
        await holdCallToggle(testManagerMulti.multiSessionAgent1Page!);
        await testManagerMulti.multiSessionAgent1Page!.waitForTimeout(3000);

        // Verify hold button icons changed back to pause icon on both sessions (when call is active)
        await Promise.all([
          verifyHoldButtonIcon(testManagerMulti.agent1Page, {expectedIsHeld: false}),
          verifyHoldButtonIcon(testManagerMulti.multiSessionAgent1Page!, {expectedIsHeld: false}),
        ]);

        // Verify hold timer disappears on both AGENT1 sessions
        await Promise.all([
          verifyHoldTimer(testManagerMulti.agent1Page, {shouldBeVisible: false}),
          verifyHoldTimer(testManagerMulti.multiSessionAgent1Page!, {shouldBeVisible: false}),
        ]);

        // Verify initial record button icons on both sessions (should show pause icon when recording is active)
        await Promise.all([
          verifyRecordButtonIcon(testManagerMulti.agent1Page, {expectedIsRecording: true}),
          verifyRecordButtonIcon(testManagerMulti.multiSessionAgent1Page!, {expectedIsRecording: true}),
        ]);

        // Pause recording from session 1 (AGENT1)
        await recordCallToggle(testManagerMulti.agent1Page);
        await testManagerMulti.agent1Page.waitForTimeout(2000);

        // Verify record button icons changed to record icon on both sessions (when recording is paused)
        await Promise.all([
          verifyRecordButtonIcon(testManagerMulti.agent1Page, {expectedIsRecording: false}),
          verifyRecordButtonIcon(testManagerMulti.multiSessionAgent1Page!, {expectedIsRecording: false}),
        ]);

        // Resume recording from session 2 (AGENT1)
        await recordCallToggle(testManagerMulti.multiSessionAgent1Page!);
        await testManagerMulti.multiSessionAgent1Page!.waitForTimeout(2000);

        // Verify record button icons changed back to pause icon on both sessions (when recording is active)
        await Promise.all([
          verifyRecordButtonIcon(testManagerMulti.agent1Page, {expectedIsRecording: true}),
          verifyRecordButtonIcon(testManagerMulti.multiSessionAgent1Page!, {expectedIsRecording: true}),
        ]);

        // End call from extension page
        await endCallTask(testManagerMulti.agent1ExtensionPage!);
        await testManagerMulti.agent1Page.waitForTimeout(2000);

        // Submit wrapup from session 1 (AGENT1)
        await submitWrapup(testManagerMulti.agent1Page, WRAPUP_REASONS.RESOLVED);
        await testManagerMulti.agent1Page.waitForTimeout(2000);

        // Verify both AGENT1 sessions return to available state
        await Promise.all([
          verifyCurrentState(testManagerMulti.agent1Page, USER_STATES.AVAILABLE),
          verifyCurrentState(testManagerMulti.multiSessionAgent1Page!, USER_STATES.AVAILABLE),
        ]);
      } catch (error) {
        throw new Error(`Multi-session call controls synchronization failed: ${error.message}`);
      }
    });
  });
}
