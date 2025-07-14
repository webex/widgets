import { Page, expect } from '@playwright/test';
import { TASK_TYPES } from '../constants';

/**
 * Utility functions for task controls testing.
 * Verifies visibility of task control buttons for different task types.
 *
 * @packageDocumentation
 */

/**
 * Verifies that all call task control buttons are visible and accessible.
 * Checks for hold, recording, transfer, consult, and end buttons.
 * @param page - The agent's main page
 * @returns Promise<void>
 */
export async function callTaskControlCheck(page: Page): Promise<void> {
  // Verify call control container is visible
  await expect(page.getByTestId('call-control-container').nth(0)).toBeVisible({ timeout: 30000 });
  
  // Verify hold/resume toggle button is visible
  await expect(page.getByTestId('call-control:hold-toggle').nth(0)).toBeVisible();
  
  // Verify recording toggle button is visible
  await expect(page.getByTestId('call-control:recording-toggle').nth(0)).toBeVisible();
  
  // Verify transfer button is visible
  await expect(page.getByTestId('call-control:transfer').nth(0)).toBeVisible();
  
  // Verify consult button is visible
  await expect(page.getByTestId('call-control:consult').nth(0)).toBeVisible();
  
  // Verify end call button is visible
  await expect(page.getByTestId('call-control:end-call').nth(0)).toBeVisible();
}

/**
 * Verifies that chat task control buttons are visible and accessible.
 * Checks for transfer and end buttons only.
 * @param page - The agent's main page
 * @returns Promise<void>
 */
export async function chatTaskControlCheck(page: Page): Promise<void> {
  // Verify chat control container or equivalent is visible
  await expect(page.getByTestId('call-control-container').nth(0)).toBeVisible({ timeout: 30000 });
  
  // Verify transfer button is visible
  await expect(page.getByTestId('call-control:transfer').nth(0)).toBeVisible();
  
  // Verify end button is visible (for chat tasks)
  await expect(page.getByTestId('call-control:end-call').nth(0)).toBeVisible();
}

/**
 * Verifies that email task control buttons are visible and accessible.
 * Checks for transfer and end buttons only.
 * @param page - The agent's main page
 * @returns Promise<void>
 */
export async function emailTaskControlCheck(page: Page): Promise<void> {
  // Verify email control container or equivalent is visible
  await expect(page.getByTestId('call-control-container').nth(0)).toBeVisible({ timeout: 30000 });
  
  // Verify transfer button is visible
  await expect(page.getByTestId('call-control:transfer').nth(0)).toBeVisible();
  
  // Verify end button is visible (for email tasks)
  await expect(page.getByTestId('call-control:end-call').nth(0)).toBeVisible();
}

/**
 * Verifies task control buttons based on the task type.
 * @param page - The agent's main page
 * @param taskType - The type of the task (e.g., TASK_TYPES.CALL, TASK_TYPES.CHAT)
 * @returns Promise<void>
 */
export async function verifyTaskControls(page: Page, taskType: string): Promise<void> {
  switch (taskType) {
    case TASK_TYPES.CALL:
      await callTaskControlCheck(page);
      break;
    case TASK_TYPES.CHAT:
      await chatTaskControlCheck(page);
      break;
    case TASK_TYPES.EMAIL:
      await emailTaskControlCheck(page);
      break;
    default:
      throw new Error(`Task control check not implemented for task type: ${taskType}`);
  }
}

/**
 * Toggles the hold state of a call by clicking the hold/resume button.
 * This function will put the call on hold if it's currently active, or resume it if it's on hold.
 * @param page - The agent's main page
 * @returns Promise<void>
 */
export async function holdCallToggle(page: Page): Promise<void> {
  // Wait for hold toggle button to be visible and clickable
  const holdButton = page.getByTestId('call-control:hold-toggle').nth(0);
  await expect(holdButton).toBeVisible({ timeout: 10000 });
  
  // Click the hold toggle button
  await holdButton.click();
}

/**
 * Toggles the recording state of a call by clicking the recording pause/resume button.
 * This function will pause recording if it's currently active, or resume it if it's paused.
 * @param page - The agent's main page
 * @returns Promise<void>
 */
export async function recordCallToggle(page: Page): Promise<void> {
  // Wait for recording toggle button to be visible and clickable
  const recordButton = page.getByTestId('call-control:recording-toggle').nth(0);
  await expect(recordButton).toBeVisible({ timeout: 10000 });
  
  // Click the recording toggle button
  await recordButton.click();
}

/**
 * Verifies the hold timer visibility and content based on expected state.
 * @param page - The agent's main page
 * @param shouldBeVisible - Whether the timer should be visible (true) or hidden (false)
 * @param verifyContent - Whether to verify timer content (default: true when visible)
 * @returns Promise<void>
 */
export async function verifyHoldTimer(page: Page, shouldBeVisible: boolean, verifyContent: boolean = shouldBeVisible): Promise<void> {
  const holdTimerContainer = page.locator('.on-hold-chip-text');
  
  if (shouldBeVisible) {
    await expect(holdTimerContainer).toBeVisible({ timeout: 10000 });
    
    if (verifyContent) {
      // Verify "On hold" text is present
      await expect(holdTimerContainer).toContainText('On hold');
      
      // Verify timer format (should contain time like 00:XX)
      await expect(holdTimerContainer).toContainText(/\d{2}:\d{2}/);
    }
  } else {
    await expect(holdTimerContainer).toBeHidden({ timeout: 10000 });
  }
}

// Global variable to store captured logs
let capturedLogs: string[] = [];

/**
 * Sets up console logging to capture callback logs for task controls.
 * Captures onHoldResume, onRecordingToggle, onEnd callbacks and SDK success messages.
 * @param page - The agent's main page
 * @returns Function to remove the console handler
 */
export function setupConsoleLogging(page: Page): () => void {
  capturedLogs.length = 0;

  const consoleHandler = (msg) => {
    const logText = msg.text();
    if (logText.includes('onHoldResume invoked') ||
        logText.includes('onRecordingToggle invoked') ||
        logText.includes('onEnd invoked') ||
        logText.includes('WXCC_SDK_TASK_HOLD_SUCCESS') ||
        logText.includes('WXCC_SDK_TASK_RESUME_SUCCESS') ||
        logText.includes('WXCC_SDK_TASK_PAUSE_RECORDING_SUCCESS') ||
        logText.includes('WXCC_SDK_TASK_RESUME_RECORDING_SUCCESS')) {
      capturedLogs.push(logText);
    }
  };

  page.on('console', consoleHandler);
  return () => page.off('console', consoleHandler);
}

/**
 * Clears the captured logs array.
 * Should be called before each test or verification to ensure clean state.
 */
export function clearCapturedLogs(): void {
  capturedLogs.length = 0;
}

/**
 * Verifies that hold/resume callback logs are present and contain expected values.
 * @param expectedIsHeld - Expected hold state (true for hold, false for resume)
 * @throws Error if verification fails with detailed error message
 */
export function verifyHoldLogs(expectedIsHeld: boolean): void {
  const holdResumeLogs = capturedLogs.filter(log => log.includes('onHoldResume invoked'));
  const statusLogs = capturedLogs.filter(log => 
    log.includes(expectedIsHeld ? 'WXCC_SDK_TASK_HOLD_SUCCESS' : 'WXCC_SDK_TASK_RESUME_SUCCESS')
  );
  
  if (holdResumeLogs.length === 0) {
    throw new Error(`No 'onHoldResume invoked' logs found. Expected logs for isHeld: ${expectedIsHeld}. Captured logs: ${JSON.stringify(capturedLogs)}`);
  }
  
  if (statusLogs.length === 0) {
    const expectedStatus = expectedIsHeld ? 'WXCC_SDK_TASK_HOLD_SUCCESS' : 'WXCC_SDK_TASK_RESUME_SUCCESS';
    throw new Error(`No '${expectedStatus}' logs found. Captured logs: ${JSON.stringify(capturedLogs)}`);
  }
  
  const lastHoldLog = holdResumeLogs[holdResumeLogs.length - 1];
  if (!lastHoldLog.includes(`isHeld: ${expectedIsHeld}`)) {
    throw new Error(`Expected 'isHeld: ${expectedIsHeld}' in log but found: ${lastHoldLog}`);
  }
}

/**
 * Verifies that recording pause/resume callback logs are present and contain expected values.
 * @param expectedIsRecording - Expected recording state (true for recording, false for paused)
 * @throws Error if verification fails with detailed error message
 */
export function verifyRecordingLogs(expectedIsRecording: boolean): void {
  const recordingLogs = capturedLogs.filter(log => log.includes('onRecordingToggle invoked'));
  const statusLogs = capturedLogs.filter(log => 
    log.includes(expectedIsRecording ? 'WXCC_SDK_TASK_RESUME_RECORDING_SUCCESS' : 'WXCC_SDK_TASK_PAUSE_RECORDING_SUCCESS')
  );
  
  if (recordingLogs.length === 0) {
    throw new Error(`No 'onRecordingToggle invoked' logs found. Expected logs for isRecording: ${expectedIsRecording}. Captured logs: ${JSON.stringify(capturedLogs)}`);
  }
  
  if (statusLogs.length === 0) {
    const expectedStatus = expectedIsRecording ? 'WXCC_SDK_TASK_RESUME_RECORDING_SUCCESS' : 'WXCC_SDK_TASK_PAUSE_RECORDING_SUCCESS';
    throw new Error(`No '${expectedStatus}' logs found. Captured logs: ${JSON.stringify(capturedLogs)}`);
  }
  
  const lastRecordingLog = recordingLogs[recordingLogs.length - 1];
  if (!lastRecordingLog.includes(`isRecording: ${expectedIsRecording}`)) {
    throw new Error(`Expected 'isRecording: ${expectedIsRecording}' in log but found: ${lastRecordingLog}`);
  }
}

/**
 * Verifies that onEnd callback logs are present when tasks are ended.
 * @throws Error if verification fails with detailed error message
 */
export function verifyEndLogs(): void {
  const endLogs = capturedLogs.filter(log => log.includes('onEnd invoked'));
  
  if (endLogs.length === 0) {
    throw new Error(`No 'onEnd invoked' logs found. Captured logs: ${JSON.stringify(capturedLogs)}`);
  }
}

/**
 * Verifies that remote audio from another tab/participant is properly configured and ready to play.
 * This function checks for the presence of the remote audio element, its properties, and MediaStream connection.
 * @param page - The agent's main page
 * @returns Promise<void>
 * @throws Error if remote audio verification fails
 */
export async function verifyRemoteAudio(page: Page): Promise<void> {
  try {
    // Verify audio element properties using JavaScript evaluation
    // Handle multiple audio elements with same ID by checking all of them
    const audioProperties = await page.evaluate(() => {
      const audioElements = document.querySelectorAll('#remote-audio') as NodeListOf<HTMLAudioElement>;
      
      if (audioElements.length === 0) {
        throw new Error('No remote audio elements found');
      }
      
      const results: any[] = [];
      let hasActiveStream = false;
      
      audioElements.forEach((audio, index) => {
        const hasSourceObj = audio.srcObject !== null;
        
        let mediaStreamActive = false;
        let tracksCount = 0;
        let audioTracksCount = 0;
        
        if (hasSourceObj) {
          const mediaStream = audio.srcObject as MediaStream;
          mediaStreamActive = mediaStream.active;
          tracksCount = mediaStream.getTracks().length;
          audioTracksCount = mediaStream.getAudioTracks().length;
        }
        
        const properties = {
          elementIndex: index,
          autoplay: audio.autoplay,
          hasSourceObject: hasSourceObj,
          readyState: audio.readyState,
          paused: audio.paused,
          muted: audio.muted,
          volume: audio.volume,
          mediaStreamActive: mediaStreamActive,
          mediaStreamTracks: tracksCount,
          audioTrackCount: audioTracksCount
        };
        
        results.push(properties);
        
        // Check if this element has an active stream
        if (properties.hasSourceObject && properties.mediaStreamActive && properties.audioTrackCount > 0) {
          hasActiveStream = true;
        }
      });
      
      return {
        totalElements: audioElements.length,
        elements: results,
        hasActiveAudioStream: hasActiveStream
      };
    });
    
    // Verify at least one audio element exists
    expect(audioProperties.totalElements).toBeGreaterThan(0);
    
    // Verify at least one audio element has an active MediaStream with audio tracks
    expect(audioProperties.hasActiveAudioStream).toBe(true);
    
    // Verify properties of elements that have audio streams
    const activeElements = audioProperties.elements.filter(el => 
      el.hasSourceObject && el.mediaStreamActive && el.audioTrackCount > 0
    );
    
    expect(activeElements.length).toBeGreaterThan(0);
    
    // For each active audio element, verify it's properly configured
    activeElements.forEach((element, index) => {
      // Verify autoplay is enabled for remote audio
      expect(element.autoplay).toBe(true);
      
      // Verify audio is not muted (should be able to hear remote audio)
      expect(element.muted).toBe(false);
      
      // Verify volume is at audible level
      expect(element.volume).toBeGreaterThan(0);
    });
    
  } catch (error) {
    throw new Error(`Remote audio verification failed: ${error.message}`);
  }
}

/**
 * Verifies the #remote-audio element exists in the DOM.
 * Executes: document.querySelector("#remote-audio")
 * @param page - The agent's main page (browser receiving audio)
 * @returns Promise<void>
 * @throws Error if remote audio element verification fails
 */
export async function verifyRemoteAudioElement(page: Page): Promise<void> {
  try {
    // Execute the console command to check for remote audio element
    const elementResult = await page.evaluate(() => {
      const audioElem = document.querySelector("#remote-audio") as HTMLAudioElement;
      
      if (!audioElem) {
        return null;
      }
      
      return {
        tagName: audioElem.tagName,
        id: audioElem.id,
        autoplay: audioElem.autoplay,
        muted: audioElem.muted,
        volume: audioElem.volume,
        readyState: audioElem.readyState,
        paused: audioElem.paused,
        hasSourceObject: audioElem.srcObject !== null,
        outerHTML: audioElem.outerHTML.substring(0, 200) // First 200 chars for debugging
      };
    });
    
    if (!elementResult) {
      throw new Error('❌ #remote-audio element not found in DOM');
    }
    
    // Verify the element properties
    expect(elementResult.tagName).toBe('AUDIO');
    expect(elementResult.id).toBe('remote-audio');
    expect(elementResult.hasSourceObject).toBe(true);
    
  } catch (error) {
    throw new Error(`❌ Remote audio element verification failed: ${error.message}`);
  }
}

/**
 * Verifies audio transfer from caller to browser by executing the exact console command.
 * Executes: document.querySelector("#remote-audio").srcObject.getAudioTracks()
 * Verifies the result contains MediaStreamTrack with GUID label and proper properties
 * @param page - The agent's main page (browser receiving audio)
 * @returns Promise<void>
 * @throws Error if remote audio tracks verification fails
 */
export async function verifyRemoteAudioTracks(page: Page): Promise<void> {
  try {
    // First verify the element exists
    await verifyRemoteAudioElement(page);
    
    // Execute the exact console command for audio tracks
    const consoleResult = await page.evaluate(() => {
      // This is the exact command from your console
      const audioElem = document.querySelector("#remote-audio") as HTMLAudioElement;
      
      if (!audioElem) {
        return [];
      }
      
      if (!audioElem.srcObject) {
        return [];
      }
      
      const mediaStream = audioElem.srcObject as MediaStream;
      const audioTracks = mediaStream.getAudioTracks();
      
      // Convert MediaStreamTrack objects to serializable format (like console shows)
      const result = audioTracks.map((track, index) => {
        return {
          index,
          kind: track.kind,
          id: track.id,
          label: track.label,
          enabled: track.enabled,
          muted: track.muted,
          readyState: track.readyState,
          onended: track.onended,
          onmute: track.onmute,
          onunmute: track.onunmute
        };
      });
      
      return result;
    });
    
    // Verify we got an array with at least one MediaStreamTrack
    expect(consoleResult.length).toBeGreaterThanOrEqual(1);
    
    // Find the first audio track (should match the structure you provided)
    const audioTrack = consoleResult.find(track => track.kind === 'audio');
    
    if (!audioTrack) {
      const availableTracks = consoleResult.map(t => `{ kind: "${t.kind}", label: "${t.label}", id: "${t.id}" }`).join(', ');
      throw new Error(`❌ No audio MediaStreamTrack found. Available tracks: [${availableTracks}]`);
    }
    
    // Verify the track properties match the exact structure you provided
    expect(audioTrack.kind).toBe('audio');
    expect(audioTrack.enabled).toBe(true);
    expect(audioTrack.muted).toBe(false);
    expect(audioTrack.readyState).toBe('live');
    expect(audioTrack.onended).toBeNull();
    expect(audioTrack.onmute).toBeNull();
    expect(audioTrack.onunmute).toBeNull();
    
    // Verify both id and label are GUID format and match each other
    const guidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    
    expect(guidPattern.test(audioTrack.id)).toBe(true);
    expect(guidPattern.test(audioTrack.label)).toBe(true);
    expect(audioTrack.id).toBe(audioTrack.label); // id should match label exactly
    
    // Verify index is 0 (first track)
    expect(audioTrack.index).toBe(0);
    
  } catch (error) {
    throw new Error(`❌ Audio transfer verification failed: ${error.message}`);
  }
}

/**
 * Verifies the presence of hold music audio element with autoplay and loop attributes.
 * Looks for: <audio autoplay="" loop=""></audio>
 * This is checked on the caller page when call is put on hold
 * @param page - The caller's page (where hold music should be playing)
 * @returns Promise<void>
 * @throws Error if hold music element verification fails
 */
export async function verifyHoldMusicElement(page: Page): Promise<void> {
  try {
    const holdMusicInfo = await page.evaluate(() => {
      // Look for audio elements with both autoplay and loop attributes
      const audioElements = document.querySelectorAll('audio[autoplay][loop]');
      
      if (audioElements.length === 0) {
        // Debug: Show all audio elements if none found with autoplay and loop
        const allAudioElements = document.querySelectorAll('audio');
        
        const allSources = Array.from(allAudioElements).map((audio, index) => {
          const a = audio as HTMLAudioElement;
          
          return {
            src: a.src,
            autoplay: a.autoplay,
            loop: a.loop,
            hasAutoplayAttr: a.hasAttribute('autoplay'),
            hasLoopAttr: a.hasAttribute('loop'),
            outerHTML: a.outerHTML.substring(0, 200) // Show first 200 chars
          };
        });
        
        return {
          holdMusicFound: false,
          allAudioElements: allSources,
          totalAudioElements: allAudioElements.length
        };
      }
      
      // Map the audio elements with autoplay and loop attributes
      const holdMusicElements = Array.from(audioElements).map((audio, index) => {
        const a = audio as HTMLAudioElement;
        
        return {
          index,
          src: a.src,
          autoplay: a.autoplay,
          loop: a.loop,
          hasAutoplayAttr: a.hasAttribute('autoplay'),
          hasLoopAttr: a.hasAttribute('loop'),
          paused: a.paused,
          volume: a.volume,
          muted: a.muted,
          readyState: a.readyState,
          outerHTML: a.outerHTML // Full element structure
        };
      });
      
      return {
        holdMusicFound: true,
        holdMusicElements,
        totalHoldMusicElements: holdMusicElements.length
      };
    });
    
    if (!holdMusicInfo.holdMusicFound) {
      throw new Error(`❌ No hold music audio elements found with autoplay and loop attributes. Total audio elements: ${holdMusicInfo.totalAudioElements}. All audio sources: ${JSON.stringify(holdMusicInfo.allAudioElements, null, 2)}`);
    }
    
    // Verify at least one hold music element exists
    expect(holdMusicInfo.totalHoldMusicElements).toBeGreaterThan(0);
    
    // Find the element that matches the pattern: <audio autoplay="" loop=""></audio>
    const targetElement = holdMusicInfo.holdMusicElements &&
      holdMusicInfo.holdMusicElements.find(audio => 
        audio.hasAutoplayAttr && 
        audio.hasLoopAttr &&
        audio.autoplay === true &&
        audio.loop === true
      );
    
    if (!targetElement) {
      throw new Error(`❌ Hold music element with correct autoplay and loop attributes not found. Available elements: ${JSON.stringify(holdMusicInfo.holdMusicElements, null, 2)}`);
    }
    
    // Verify the element matches the expected pattern: <audio autoplay="" loop=""></audio>
    expect(targetElement.autoplay).toBe(true);
    expect(targetElement.loop).toBe(true);
    expect(targetElement.hasAutoplayAttr).toBe(true);
    expect(targetElement.hasLoopAttr).toBe(true);
    
  } catch (error) {
    throw new Error(`❌ Hold music element verification failed: ${error.message}`);
  }
}

/**
 * Executes the exact console command: document.querySelector("#remote-audio")
 * This verifies that the remote audio element exists in the DOM
 * @param page - The agent's main page (browser receiving audio)
 * @returns Promise<void>
 * @throws Error if remote audio element is not found
 */
export async function executeRemoteAudioQuery(page: Page): Promise<void> {
  try {
    // Execute the exact console command
    const elementExists = await page.evaluate(() => {
      const element = document.querySelector("#remote-audio");
      
      if (!element) {
        return null;
      }
      
      // Return basic element info to verify it exists
      return {
        tagName: element.tagName,
        id: element.id,
        className: element.className,
        nodeType: element.nodeType,
        exists: true
      };
    });
    
    if (!elementExists) {
      throw new Error('❌ document.querySelector("#remote-audio") returned null - element not found in DOM');
    }
    
    // Verify basic properties
    expect(elementExists.exists).toBe(true);
    expect(elementExists.tagName).toBe('AUDIO');
    expect(elementExists.id).toBe('remote-audio');
    expect(elementExists.nodeType).toBe(1); // ELEMENT_NODE
    
  } catch (error) {
    throw new Error(`❌ Remote audio element query failed: ${error.message}`);
  }
}

/**
 * Ends a task by clicking the end call button and waiting for it to be visible.
 * This function can be used for any task type (call, chat, email) as they all use the same end button.
 * @param page - The agent's main page
 * @returns Promise<void>
 */
export async function endTask(page: Page): Promise<void> {
  const endButton = page.getByTestId('call-control:end-call').nth(0);
  await endButton.waitFor({ state: 'visible', timeout: 30000 });
  await endButton.click();
}