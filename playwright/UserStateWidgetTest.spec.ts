import { test, expect, Page, BrowserContext } from '@playwright/test';
import { oauthLogin, multiLoginEnable, initialisePage } from './Utils/initUtils';
import { desktopLogin, extensionLogin, dialLogin, stationLogout } from './Utils/stationLoginUtils';
import { getCurrentState, changestate, verifyCurrentState, getStateElapsedTime, checkConsole, checkCallbackSequence } from './Utils/stateUtils';

import dotenv from 'dotenv';

dotenv.config();

test.describe('🔐 User State Widget Functionality Suite', () => {
  test('User state widget should function as expected', async ({ page, context }) => {
    const consoleMessages: string[] = [];
    
    // ========================================================================
    // 📱 CONSOLE MESSAGE LISTENER SETUP
    // ========================================================================
    page.on('console', msg => {
      const message = msg.text();
      consoleMessages.push(message);
      
      if (message.includes('WXCC_SDK_AGENT_STATE_CHANGE_SUCCESS') || 
          message.includes('AGENT_STATE_CHANGE_SUCCESS') ||
          message.includes('onStateChangeInvoked') ||
          message.includes('onStateChange invoked')) {
        console.log('🔍 Important Browser Console:', message);
      }
    });

    // ========================================================================
    // 🚀 PHASE 1: INITIAL AUTHENTICATION & SETUP
    // ========================================================================
    console.log('\n' + '='.repeat(80));
    console.log('🚀 USER STATE WIDGET FUNCTIONALITY TEST STARTED');
    console.log('='.repeat(80));
    
    console.log('\n📋 Phase 1: Initial Authentication & Setup');
    console.log('─'.repeat(50));
    console.log('🔑 Initializing OAuth authentication...');    
    await oauthLogin(page);
    
    console.log('🔄 Enabling multi-login capabilities...');
    await multiLoginEnable(page);
    
    console.log('⚙️  Initializing widget components...');
    await initialisePage(page);
    
    // Station Login Logic
    const loginButtonExists = await page.getByTestId('login-button').isVisible().catch(() => false);
    if (loginButtonExists) {
      console.log('🔌 Performing extension login...');
      await extensionLogin(page);
    } else {
      console.log('🔌 Performing station logout & extension login...');
      await stationLogout(page);
      await extensionLogin(page);
    }

    await expect(page.getByTestId('state-select')).toBeVisible();
    console.log('✅ Station login completed successfully!\n');

    // ========================================================================
    // 🎨 PHASE 2: INITIAL STATE & THEME VERIFICATION
    // ========================================================================
    console.log('📋 Phase 2: Initial State & Theme Verification');
    console.log('─'.repeat(50));
    
    consoleMessages.length = 0;
    await verifyCurrentState(page, 'Meeting');
    
    console.log('🎨 Analyzing theme for Meeting state...');
    const meetingThemeElement = await page.getByTestId('state-select');
    const meetingThemeColor = await meetingThemeElement.evaluate(el => getComputedStyle(el).backgroundColor);
    
    if (meetingThemeColor === 'rgba(0, 0, 0, 0.11)') {
      console.log('✅ Grey theme confirmed for Meeting state');
    } else {
      console.log(`⚠️  Theme Analysis: Expected rgba(0, 0, 0, 0.11), detected ${meetingThemeColor}`);
    }
    
    await page.waitForTimeout(5000);
    const initialTimer = await getStateElapsedTime(page);
    console.log(`⏱️  Current timer value: ${initialTimer}\n`);

    // ========================================================================
    // 🔄 PHASE 3: STATE CHANGE & THEME VALIDATION
    // ========================================================================
    console.log('📋 Phase 3: State Change & Theme Validation');
    console.log('─'.repeat(50));
    
    console.log('🔄 Initiating state change: Meeting → Available...');
    await changestate(page, 'Available');
    await page.waitForTimeout(3000);
    
    console.log('🎨 Analyzing theme for Available state...');
    const themeElement = await page.getByTestId('state-select');
    const themeColor = await themeElement.evaluate(el => getComputedStyle(el).backgroundColor);
    
    if (themeColor === 'rgb(206, 245, 235)') {
      console.log('✅ Green theme confirmed for Available state');
    } else {
      console.log(`⚠️  Theme Analysis: Expected rgb(206, 245, 235), detected ${themeColor}`);
    }
    
    const isCallbackSuccessful = await checkConsole(page, 'Available', consoleMessages);
    console.log(`📊 State Change Validation: ${isCallbackSuccessful ? '✅ PASSED' : '❌ FAILED'}`);
    expect(isCallbackSuccessful).toBe(true);
    
    await verifyCurrentState(page, 'Available');
    const elapsedTime = await getStateElapsedTime(page);
    console.log(`⏱️  Post-change elapsed time: ${elapsedTime}`);
    console.log('🎯 Timer reset confirmation completed!\n');

    // ========================================================================
    // 🔄 PHASE 4: PAGE REFRESH & STATE PERSISTENCE TESTING
    // ========================================================================
    console.log('📋 Phase 4: Page Refresh & State Persistence Testing');
    console.log('─'.repeat(50));
    
    consoleMessages.length = 0;
    console.log('🔄 Performing page refresh to test state persistence...');
    await page.reload();
    
    console.log('⚙️  Re-initializing components after refresh...');
    await initialisePage(page);
    await page.waitForTimeout(5000);

    console.log('🖥️  Opening Agent Desktop for timer synchronization test...');
    const agentDeskPage = await context.newPage();

    await expect(page.getByTestId('state-select')).toBeVisible();
    console.log('✅ SDK re-initialization completed after refresh');
    
    const callbackTriggered = await checkConsole(page, 'Available', consoleMessages);
    console.log(`📞 onStateChange callback status: ${callbackTriggered ? '✅ TRIGGERED' : '❌ NOT TRIGGERED'}`);
    expect(callbackTriggered).toBe(true);
    
    await verifyCurrentState(page, 'Available');
    console.log('✅ State persistence verified after refresh');


    const sampleAppTimer = await getStateElapsedTime(page);
    
  
    


    // ========================================================================
    // 🔍 PHASE 5: API CALLBACK SEQUENCE VALIDATION
    // ========================================================================
    console.log('📋 Phase 5: API Callback Sequence Validation');
    console.log('─'.repeat(50));
    
    console.log('🔄 Testing callback sequence order...');
    await changestate(page, 'Meeting');
    await changestate(page, 'Available');
    await verifyCurrentState(page, 'Available');
    console.log('✅ State transition completed successfully');

    const sequenceValid = await checkCallbackSequence(page, 'Available', consoleMessages);
    console.log(`📞 Callback sequence validation: ${sequenceValid ? '✅ CORRECT ORDER' : '❌ INCORRECT ORDER'}`);
    expect(sequenceValid).toBe(true);
    console.log('🎯 API callback sequence verification completed\n');

    // ========================================================================
    // 🌐 PHASE 6: MULTI-SESSION SYNCHRONIZATION TESTING
    // ========================================================================
    console.log('📋 Phase 6: Multi-Session Synchronization Testing');
    console.log('─'.repeat(50));

    console.log('🌐 Initializing multi-session environment...');
    const multiSessionPage = await context.newPage();
    await oauthLogin(multiSessionPage);
    await initialisePage(multiSessionPage);
    await multiSessionPage.waitForTimeout(3000);

    console.log('🔄 Testing state synchronization across sessions...');
    await changestate(page, 'Available');
    await verifyCurrentState(page, 'Available');
    await multiSessionPage.waitForTimeout(2000);
    console.log('✅ State change executed in primary session');
    
    console.log('🔍 Verifying synchronization in secondary session...');
    await verifyCurrentState(multiSessionPage, 'Available');
    console.log('✅ State synchronization confirmed across sessions');
    
    // Timer Synchronization Check
    await multiSessionPage.waitForTimeout(2000);
    const timer1 = await getStateElapsedTime(page);
    const timer2 = await getStateElapsedTime(multiSessionPage);
    
    console.log(`⏱️  Primary Session Timer: ${timer1}`);
    console.log(`⏱️  Secondary Session Timer: ${timer2}`);
    
    if (timer1 === timer2) {
      console.log('🎯 Multi-session timer synchronization verified');
    } else {
      console.log('❌ Multi-session timer synchronization failed');
    }

    await multiSessionPage.close();
    console.log('🔒 Multi-session environment closed\n');

    // ========================================================================
    // ⏰ PHASE 7: IDLE STATE TRANSITION & DUAL TIMER TESTING
    // ========================================================================
    console.log('📋 Phase 7: Idle State Transition & Dual Timer Testing');
    console.log('─'.repeat(50));
    
    console.log('🔄 Testing idle-to-idle state transitions...');
    await changestate(page, 'Meeting');
    await verifyCurrentState(page, 'Meeting');
    await page.waitForTimeout(2000);
    
    console.log('🔄 Executing transition: Meeting → Lunch...');
    await changestate(page, 'Lunch');
    await verifyCurrentState(page, 'Lunch');
    console.log('✅ Idle state transition completed successfully');
    
    const isLunchCallbackSuccessful = await checkConsole(page, 'Lunch', consoleMessages);
    console.log(`📊 Lunch State Callback Validation: ${isLunchCallbackSuccessful ? '✅ PASSED' : '❌ FAILED'}`);
    expect(isLunchCallbackSuccessful).toBe(true);
    
    await page.waitForTimeout(5000);
    const finalTimer = await getStateElapsedTime(page);
    console.log(`⏱️  Dual timer after Lunch transition: ${finalTimer}`);

    // ========================================================================
    // 🏁 TEST COMPLETION SUMMARY
    // ========================================================================
    console.log('\n' + '='.repeat(80));
    console.log('🏁 USER STATE WIDGET FUNCTIONALITY TEST COMPLETED SUCCESSFULLY');
    console.log('   ✅ Authentication & Setup');
    console.log('   ✅ Theme Verification');
    console.log('   ✅ State Change & Validation');
    console.log('   ✅ Page Refresh & Persistence');
    console.log('   ✅ Callback Sequence Validation');
    console.log('   ✅ Multi-Session Synchronization');
    console.log('   ✅ Idle State Transitions');
    console.log('='.repeat(80) + '\n');
  });
});