import {createTestUser, removeTestUser} from '@webex/test-users';
import * as dotenv from 'dotenv';
dotenv.config();

class WebexMeetingPage {
  constructor() {
    this.user = null;
  }

  setUser(user) {
    this.user = user;
  }

  get accessTokenInput() {
    return $('#token');
  }
  get destinationInput() {
    return $('#destination');
  }
  get saveTokenBtn() {
    return $('#md-button-1');
  }
  get displayWidgetBtn() {
    return $('#md-button-3');
  }
  get microphoneIcon() {
    return $('.meeting-controls-container').$$('button')[0];
  }
  get videoIcon() {
    return $('.meeting-controls-container').$$('button')[1];
  }
  get videoRef() {
    return $('video');
  }
  get joinMeetingBtn() {
    return $('button=Join meeting');
  }
  get waitingForOthers() {
    return $('h4=Waiting for others to join...');
  }
  get meetingContainer() {
    return $('#wxc-interstitial-meeting');
  }

  open() {
    browser.url('https://webex.github.io/widgets/');
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
      .catch((e) => console.log('Error API', e));
  }

  removeUser() {
    return removeTestUser(this.user);
  }

  init() {
    this.open();
    this.accessTokenInput.setValue(process.env.WEBEX_ACCESS_TOKEN);
    this.saveTokenBtn.click();
    this.destinationInput.setValue(process.env.WEBEX_MEETING_DESTINATION);
    this.displayWidgetBtn.click();

    this.waitLoadingMeeting();
  }

  // Wait until interstitial meeting will appear
  waitLoadingMeeting() {
    browser.waitUntil(() => this.meetingContainer, {
      timeout: 10000,
      timeoutMsg: 'expected meeting to be different after 10s',
    });
  }

  // Wait until meeting will appear
  waitJoiningMeeting() {
    browser.waitUntil(() => this.waitingForOthers, {
      timeout: 10000,
      timeoutMsg: 'expected after joining meeting screen to be different after 10s',
    });
  }
}

export default new WebexMeetingPage();
