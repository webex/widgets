import {expect, Page, BrowserContext, Browser} from '@playwright/test';
import {enableAllWidgets, enableMultiLogin, initialiseWidgets, loginViaAccessToken} from './Utils/initUtils';
import {stationLogout, telephonyLogin} from './Utils/stationLoginUtils';
import {loginExtension} from './Utils/incomingTaskUtils';
import {setupConsoleLogging} from './Utils/taskControlUtils';
import {setupAdvancedConsoleLogging} from './Utils/advancedTaskControlUtils';
import {pageSetup} from './Utils/helperUtils';
import {LOGIN_MODE} from './constants';

// Configuration interfaces for setup options
interface SetupConfig {
  // Core requirements
  needsAgent1?: boolean;
  needsAgent2?: boolean;
  needsCaller?: boolean;
  needsExtension?: boolean;
  needsChat?: boolean;
  needsMultiSession?: boolean;

  // Login modes
  agent1LoginMode?: 'Desktop' | 'Extension';

  // Console logging
  enableConsoleLogging?: boolean;
  enableAdvancedLogging?: boolean;
}

// 🏗️ Simple Test Context Manager
export class TestManager {
  // Main widget page (Agent 1 login)
  public agent1Page!: Page;
  public agent1Context!: BrowserContext;

  // Multi-session page (Agent 1 second session)
  public multiSessionAgent1Page: Page;
  public multiSessionContext: BrowserContext;

  // Agent 2 main widget page (Agent 2 login)
  public agent2Page: Page;
  public agent2Context: BrowserContext;

  // Caller extension page (Agent 2 for making calls)
  public callerPage: Page;
  public callerExtensionContext: BrowserContext;

  // Extension page (Agent 1 extension login)
  public agent1ExtensionPage: Page;
  public extensionContext: BrowserContext;

  // Chat page
  public chatPage: Page;
  public chatContext: BrowserContext;

  public consoleMessages: string[] = [];
  public maxRetries = 3;
  public projectName: string;
  constructor(projectName: string) {
    this.projectName = projectName;
    console.log(`[${new Date().toISOString()}] 🏗️ TestManager initialized for project: ${projectName}`);
  }

  // 🎯 Universal Setup Method - Handles all test scenarios (Parallelized)
  async setup(browser: Browser, config: SetupConfig = {}) {
    // Default configuration
    const defaults: SetupConfig = {
      needsAgent1: true,
      needsAgent2: false,
      needsCaller: false,
      needsExtension: false,
      needsChat: false,
      needsMultiSession: false,
      agent1LoginMode: 'Desktop',
      enableConsoleLogging: true,
      enableAdvancedLogging: false,
    };

    const finalConfig = {...defaults, ...config};

    // 🚀 Step 1: Create all required browser contexts in parallel
    const contextPromises: Promise<any>[] = [];

    if (finalConfig.needsAgent1) {
      contextPromises.push(
        browser.newContext().then(async (context) => {
          this.agent1Context = context;
          this.agent1Page = await this.agent1Context.newPage();
          this.consoleMessages = [];
          this.agent1Page.on('console', (msg) => this.consoleMessages.push(msg.text()));
        })
      );
    }

    if (finalConfig.needsAgent2) {
      contextPromises.push(
        browser.newContext().then(async (context) => {
          this.agent2Context = context;
          this.agent2Page = await this.agent2Context.newPage();
          if (finalConfig.enableConsoleLogging) {
            this.agent2Page.on('console', (msg) => this.consoleMessages.push(msg.text()));
          }
        })
      );
    }

    if (finalConfig.needsCaller) {
      contextPromises.push(
        browser.newContext().then(async (context) => {
          this.callerExtensionContext = context;
          this.callerPage = await this.callerExtensionContext.newPage();
        })
      );
    }

    if (finalConfig.needsExtension) {
      contextPromises.push(
        browser.newContext().then(async (context) => {
          this.extensionContext = context;
          this.agent1ExtensionPage = await this.extensionContext.newPage();
        })
      );
    }

    if (finalConfig.needsChat) {
      contextPromises.push(
        browser.newContext().then(async (context) => {
          this.chatContext = context;
          this.chatPage = await this.chatContext.newPage();
        })
      );
    }

    if (finalConfig.needsMultiSession) {
      contextPromises.push(
        browser.newContext().then(async (context) => {
          this.multiSessionContext = context;
          this.multiSessionAgent1Page = await this.multiSessionContext.newPage();
        })
      );
    }

    // Wait for all contexts to be created
    await Promise.all(contextPromises);

    // 🚀 Step 2: Setup login and widgets in parallel for independent pages
    const setupPromises: Promise<any>[] = [];

    // Agent1 setup
    if (finalConfig.needsAgent1) {
      setupPromises.push(
        (async () => {
          if (finalConfig.agent1LoginMode === 'Desktop') {
            await pageSetup(this.agent1Page, 'Desktop', process.env[`${this.projectName}_AGENT1_ACCESS_TOKEN`] ?? '');
          } else if (finalConfig.agent1LoginMode === 'Extension' && this.agent1ExtensionPage) {
            // Parallelize pageSetup and extension login
            const [,] = await Promise.all([
              pageSetup(
                this.agent1Page,
                LOGIN_MODE.EXTENSION,
                process.env[`${this.projectName}_AGENT1_ACCESS_TOKEN`] ?? '',
                this.agent1ExtensionPage,
                process.env[`${this.projectName}_AGENT1_EXTENSION_NUMBER`] ?? ''
              ),
              // Extension login in parallel
              (async () => {
                for (let i = 0; i < this.maxRetries; i++) {
                  try {
                    await loginExtension(
                      this.agent1ExtensionPage,
                      process.env[`${this.projectName}_AGENT1_USERNAME`] ?? '',
                      process.env.PW_PASSWORD ?? ''
                    );
                    break;
                  } catch (error) {
                    if (i === this.maxRetries - 1) {
                      throw new Error(`Failed to login agent1 extension after ${this.maxRetries} attempts: ${error}`);
                    }
                  }
                }
              })(),
            ]);
          }
        })()
      );
    }

    // Agent2 setup - Parallelize internal operations
    if (finalConfig.needsAgent2) {
      setupPromises.push(
        (async () => {
          await pageSetup(
            this.agent2Page,
            LOGIN_MODE.DESKTOP,
            process.env[`${this.projectName}_AGENT2_ACCESS_TOKEN`] ?? ''
          );
        })()
      );
    }

    // Caller extension setup
    if (finalConfig.needsCaller && this.callerPage) {
      setupPromises.push(
        (async () => {
          const callerUsername = process.env[`${this.projectName}_AGENT2_USERNAME`] ?? '';
          for (let i = 0; i < this.maxRetries; i++) {
            try {
              await loginExtension(this.callerPage!, callerUsername, process.env.PW_PASSWORD ?? '');
              break;
            } catch (error) {
              if (i === this.maxRetries - 1) {
                throw new Error(`Failed to login caller extension after ${this.maxRetries} attempts: ${error}`);
              }
              console.warn(`Caller extension login attempt ${i + 1} failed, retrying...`);
            }
          }
        })()
      );
    }

    // Multi-session setup - Remove dependency wait, make it truly parallel
    if (finalConfig.needsMultiSession && this.multiSessionAgent1Page) {
      setupPromises.push(
        (async () => {
          if (finalConfig.agent1LoginMode === 'Extension') {
            // Don't wait for agent1ExtensionPage, it should be ready from context creation
            await pageSetup(
              this.multiSessionAgent1Page!,
              LOGIN_MODE.EXTENSION,
              process.env[`${this.projectName}_AGENT1_ACCESS_TOKEN`] ?? '',
              this.agent1ExtensionPage,
              process.env[`${this.projectName}_AGENT1_EXTENSION_NUMBER`] ?? ''
            );
          }
        })()
      );
    }

    // Wait for all setup operations to complete
    await Promise.all(setupPromises);

    // 🚀 Step 3: Setup console logging (can be done in parallel too)
    const loggingPromises: Promise<any>[] = [];

    if (finalConfig.enableConsoleLogging && finalConfig.needsAgent1) {
      loggingPromises.push(Promise.resolve(setupConsoleLogging(this.agent1Page)));
    }

    if (finalConfig.enableAdvancedLogging && finalConfig.needsAgent1) {
      loggingPromises.push(Promise.resolve(setupAdvancedConsoleLogging(this.agent1Page)));
    }

    if (finalConfig.enableConsoleLogging && finalConfig.needsAgent2) {
      loggingPromises.push(Promise.resolve(setupConsoleLogging(this.agent2Page)));
    }

    if (finalConfig.enableAdvancedLogging && finalConfig.needsAgent2) {
      loggingPromises.push(Promise.resolve(setupAdvancedConsoleLogging(this.agent2Page)));
    }

    await Promise.all(loggingPromises);
  }

  async basicSetup(browser: Browser) {
    await this.setup(browser, {
      needsAgent1: true,
      needsAgent2: false,
      agent1LoginMode: 'Desktop',
      enableConsoleLogging: true,
      enableAdvancedLogging: false,
    });
  }

  async setupForAdvancedTaskControls(browser: Browser) {
    await this.setup(browser, {
      needsAgent1: true,
      needsAgent2: true,
      needsCaller: true,
      agent1LoginMode: 'Desktop',
      enableConsoleLogging: true,
      enableAdvancedLogging: true,
    });
  }

  async setupForAdvancedCombinations(browser: Browser) {
    await this.setup(browser, {
      needsAgent1: true,
      needsAgent2: true,
      needsCaller: true,
      agent1LoginMode: 'Desktop',
      enableConsoleLogging: true,
      enableAdvancedLogging: true,
    });
  }

  async setupForStationLogin(browser: Browser) {
    // Create browser context and page
    this.agent1Context = await browser.newContext();
    this.agent1Page = await this.agent1Context.newPage();
    this.consoleMessages = [];
    this.agent1Page.on('console', (msg) => this.consoleMessages.push(msg.text()));

    // Create multi-session context and page for multi-login tests
    this.multiSessionContext = await browser.newContext();
    this.multiSessionAgent1Page = await this.multiSessionContext.newPage();

    // Login and initialize widgets without station login for both pages in parallel
    await Promise.all([
      // Main page setup
      (async () => {
        await loginViaAccessToken(this.agent1Page, process.env[`${this.projectName}_AGENT1_ACCESS_TOKEN`] ?? '');
        await enableMultiLogin(this.agent1Page);
        await enableAllWidgets(this.agent1Page);
        await initialiseWidgets(this.agent1Page);
      })(),
      // Multi-session page setup
      (async () => {
        await loginViaAccessToken(
          this.multiSessionAgent1Page,
          process.env[`${this.projectName}_AGENT1_ACCESS_TOKEN`] ?? ''
        );
        await enableMultiLogin(this.multiSessionAgent1Page);
        await enableAllWidgets(this.multiSessionAgent1Page);
        await initialiseWidgets(this.multiSessionAgent1Page);
      })(),
    ]);

    // Logout from station if already logged in on main page
    const isLogoutButtonVisible = await this.agent1Page
      .getByTestId('samples:station-logout-button')
      .isVisible()
      .catch(() => false);
    if (isLogoutButtonVisible) {
      await stationLogout(this.agent1Page);
    }

    // Logout from station if already logged in on multi-session page
    const isMultiSessionLogoutButtonVisible = await this.multiSessionAgent1Page
      .getByTestId('samples:station-logout-button')
      .isVisible()
      .catch(() => false);
    if (isMultiSessionLogoutButtonVisible) {
      await stationLogout(this.multiSessionAgent1Page);
    }

    // Ensure station login widget is visible on both pages
    await expect(this.agent1Page.getByTestId('station-login-widget')).toBeVisible({timeout: 2000});
    await expect(this.multiSessionAgent1Page.getByTestId('station-login-widget')).toBeVisible({timeout: 2000});
  }

  async setupMultiSessionPage() {
    // Setup multi-session page with widgets - only called when needed for multi-session tests
    if (this.multiSessionAgent1Page) {
      await loginViaAccessToken(
        this.multiSessionAgent1Page,
        process.env[`${this.projectName}_AGENT1_ACCESS_TOKEN`] ?? ''
      );
      await Promise.all([enableMultiLogin(this.multiSessionAgent1Page), enableAllWidgets(this.multiSessionAgent1Page)]);
      await initialiseWidgets(this.multiSessionAgent1Page);
    }
  }

  // Specific setup methods that use the universal setup
  async setupForIncomingTaskDesktop(browser: Browser) {
    await this.setup(browser, {
      needsAgent1: true,
      needsCaller: true,
      agent1LoginMode: 'Desktop',
      needsChat: true,
      enableConsoleLogging: true,
    });
  }

  async setupForIncomingTaskExtension(browser: Browser) {
    await this.setup(browser, {
      needsAgent1: true,
      needsCaller: true,
      needsExtension: true,
      needsChat: true,
      agent1LoginMode: 'Extension',
      enableConsoleLogging: true,
    });
  }

  async setupForIncomingTaskMultiSession(browser: Browser) {
    await this.setup(browser, {
      needsAgent1: true,
      needsCaller: true,
      needsExtension: true,
      needsChat: true,
      needsMultiSession: true,
      agent1LoginMode: 'Extension',
      enableConsoleLogging: true,
    });
  }

  async setupForUserState(browser: Browser) {
    await this.setupForStationLogin(browser);

    // Login with extension mode and verify state widget is visible
    const loginButtonExists = await this.agent1Page
      .getByTestId('login-button')
      .isVisible()
      .catch(() => false);

    if (loginButtonExists) {
      await telephonyLogin(
        this.agent1Page,
        LOGIN_MODE.EXTENSION,
        process.env[`${this.projectName}_AGENT1_EXTENSION_NUMBER`]
      );
    } else {
      // Check if already logged in to station, if so logout first
      const logoutButtonExists = await this.agent1Page
        .getByTestId('samples:station-logout-button')
        .isVisible()
        .catch(() => false);

      if (logoutButtonExists) {
        await stationLogout(this.agent1Page);
      }
      await telephonyLogin(
        this.agent1Page,
        LOGIN_MODE.EXTENSION,
        process.env[`${this.projectName}_AGENT1_EXTENSION_NUMBER`]
      );
    }

    await expect(this.agent1Page.getByTestId('state-select')).toBeVisible();
  }

  async setupAllPages(browser: Browser) {
    // Use universal setup for comprehensive all-pages setup
    await this.setup(browser, {
      needsAgent1: true,
      needsAgent2: true,
      needsCaller: true,
      needsExtension: true,
      needsChat: true,
      needsMultiSession: true,
      agent1LoginMode: 'Desktop', // Default for basic task controls
      enableConsoleLogging: true,
      enableAdvancedLogging: true,
    });
  }

  async setupForTaskControlsMultiLogin(browser: Browser) {
    // Use universal setup for comprehensive all-pages setup
    await this.setup(browser, {
      needsAgent1: true,
      needsAgent2: true,
      needsCaller: true,
      needsExtension: true,
      needsChat: false,
      needsMultiSession: true,
      agent1LoginMode: 'Extension',
      enableConsoleLogging: true,
      enableAdvancedLogging: true,
    });
  }

  async setupForBasicTaskControlsDesktop(browser: Browser) {
    await this.setup(browser, {
      needsAgent1: true,
      needsCaller: true,
      needsChat: true,
      agent1LoginMode: 'Desktop',
      enableConsoleLogging: true,
    });
  }

  async cleanup() {
    const isLogoutVisible = await this.agent1Page
      ?.getByTestId('samples:station-logout-button')
      .isVisible()
      .catch(() => false);
    if (isLogoutVisible) await stationLogout(this.agent1Page);
    const isLogout2Visible = await this.agent2Page
      ?.getByTestId('samples:station-logout-button')
      .isVisible()
      .catch(() => false);
    if (isLogout2Visible) await stationLogout(this.agent2Page);

    // Close all pages and contexts
    if (this.agent1Page) await this.agent1Page.close();
    if (this.multiSessionAgent1Page) await this.multiSessionAgent1Page.close();
    if (this.agent2Page) await this.agent2Page.close();
    if (this.callerPage) await this.callerPage.close();
    if (this.agent1ExtensionPage) await this.agent1ExtensionPage.close();
    if (this.chatPage) await this.chatPage.close();

    await this.agent1Context?.close();
    await this.multiSessionContext?.close();
    await this.agent2Context?.close();
    await this.callerExtensionContext?.close();
    await this.extensionContext?.close();
    await this.chatContext?.close();
  }

  async reset() {
    this.consoleMessages.length = 0;
  }
}
