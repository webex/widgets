class SamplesPage {
  get accessToken() { return $('input[placeholder="Access Token"]'); }
  get saveTokenBtn() { return $('button[aria-label="Save Token"]'); } // #md-button-1
  get widgetTitle() { return $('.content > section:nth-child(2) > h3'); }
  get sidebarNav() { return $('.md-sidebar-nav'); }
  get meetingNavItem() { return this.sidebarNav.$('[data-md-keyboard-key="webex-meeting-widget"]'); }

  open() {
    browser.url(process.env.WEBEX_TEST_PAGE_URL);

    // override the local media api so that permission prompts don't show up
    browser.execute('navigator.mediaDevices.getUserMedia = () => Promise.resolve(new MediaStream());');
  }

  setAccessToken(accessToken) {
    this.accessToken.setValue(accessToken);
    this.saveTokenBtn.click();
  }

  navigateToMeetingPage() {
    this.meetingNavItem.click();
    this.widgetTitle.waitUntil(() => this.widgetTitle.getText() === 'Webex Meeting Widget');
  }
}

export default new SamplesPage();
