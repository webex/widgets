import {createTestUser, removeTestUser} from '@webex/test-users';
import * as dotenv from 'dotenv';
dotenv.config();

class MeetingPage {
  constructor() {
    this.user = null;
  }

  setUser(user) {
    this.user = user;
  }
  // eslint-disable-next-line
  get accessToken() { return $('#token'); }
  // eslint-disable-next-line
  get destination() { return $('#destination'); }
  // eslint-disable-next-line
  get saveTokenBtn() { return $('#md-button-1'); }
  // eslint-disable-next-line
  get displayWidgetBtn() { return $('#md-button-3'); }

  // eslint-disable-next-line
  get waitingForOthers() { return $('h4=Waiting for others to join...'); }
  // eslint-disable-next-line
  get interstitialMeeting() { return $('.wxc-interstitial-meeting'); }

  open() {
    browser.url(process.env.WEBEX_TEST_PAGE_URL);
  }

  loadWidget() {
    this.open();
    this.accessToken.setValue(process.env.WEBEX_ACCESS_TOKEN);
    this.saveTokenBtn.click();
    this.destination.setValue(process.env.WEBEX_MEETING_DESTINATION);
    this.displayWidgetBtn.click();

    this.waitForInterstitialScreen();
  }

  createUser() {
    const payload = {
      clientId: process.env.WEBEX_CLIENT_ID,
      clientSecret: process.env.WEBEX_CLIENT_SECRET,
      idbrokerUrl: process.env.IDBROKER_BASE_URL,
      cigServiceUrl: process.env.WEBEX_TEST_USERS_CI_GATEWAY_SERVICE_URL,
    };

    return createTestUser(payload)
      .then((user) => {
        this.setUser(user);
      })
      .catch((e) => {
        console.log('Error creating test user', e);
        throw e;
      });
  }

  removeUser() {
    return removeTestUser(this.user);
  }

  // Wait until interstitial meeting will appear
  waitForInterstitialScreen() {
    browser.waitUntil(() => this.interstitialMeeting, {
      timeout: 10000,
      timeoutMsg: 'Interstitial screen did not show up after 10 seconds',
    });
  }

  waitForWaitingForOthersScreen() {
    browser.waitUntil(() => this.waitingForOthers, {
      timeout: 10000,
      timeoutMsg: '"Waiting for others" screen did not show up after 10 seconds',
    });
  }
}

export default new MeetingPage();
