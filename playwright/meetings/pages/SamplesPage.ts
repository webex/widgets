import {Page, Locator, expect} from '@playwright/test';

export class SamplesPage {
  readonly page: Page;
  readonly accessToken: Locator;
  readonly saveTokenBtn: Locator;
  readonly widgetTitle: Locator;
  readonly sidebarNav: Locator;
  readonly meetingNavItem: Locator;
  readonly meetingDestInput: Locator;

  constructor(page: Page) {
    this.page = page;
    this.accessToken = page.locator('input[placeholder="Access Token"]');
    this.saveTokenBtn = page.locator('button[aria-label="Save Token"]');
    this.widgetTitle = page.getByRole('heading', {name: 'Webex Meetings Widget', exact: true});
    this.sidebarNav = page.locator('.md-sidebar-nav');
    this.meetingNavItem = this.sidebarNav.locator('[data-md-keyboard-key="webex-meeting-widget"]');
    this.meetingDestInput = page.getByRole('textbox', {name: 'Widget Destination (email,'});
  }

  async open(): Promise<void> {
    await this.page.goto(process.env.WEBEX_TEST_PAGE_URL, {timeout: 60000});
  }

  async setAccessToken(accessToken: string): Promise<void> {
    await this.accessToken.fill(accessToken);
    await this.saveTokenBtn.click();
  }
}
