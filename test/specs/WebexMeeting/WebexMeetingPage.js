import {createTestUser, removeTestUser, loginTestUser} from '@webex/test-users';
import * as dotenv from 'dotenv';
import {request} from '@webex/http-core';
import _ from 'lodash';
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
    browser.url('https://localhost:9000/');
  }

  initUser() {
    const payload = {
      code: '123',
      displayName: 'Test User',
      clientId: process.env.WEBEX_CLIENT_ID,
      clientSecret: process.env.WEBEX_CLIENT_SECRET,
      idbrokerUrl: process.env.IDBROKER_BASE_URL,
      cigServiceUrl: process.env.WEBEX_TEST_USERS_CI_GATEWAY_SERVICE_URL,
      scopes: process.env.WEBEX_SCOPE,
    };
    console.log(payload);
    return createTestUser(payload)
      .then((data) => {
        console.log(data);
        // this.setUser(data);
        // console.log(data);
      })
      .catch((e) => console.log('Error API', e));
  }

  init() {
    // MzNiM2VkMTAtZGE4My00YjY3LThhMjktNGFlMmI0ZDEwNGM0MGNjNTA0MGMtOTU5_PF84_1eb65fdf-9643-417f-9974-ad72cae0e10f
    // N2Y4NWUyZmItYTlhZC00YjMxLWE4NGQtZDc5MWE4Zjc4ODVkMmY3ZjlhZTYtYjBm_A52D_584cf4cd-eea7-4c8c-83ee-67d88fc6eab5
    // console.log(this.user);
    // console.log(this.user?.token?.access_token);
    this.open();
    this.accessTokenInput.setValue(this.user?.token?.access_token);
    this.saveTokenBtn.click();
    this.destinationInput.setValue(this.user.email);
    this.displayWidgetBtn.click();

    this.waitLoadingMeeting();
    // browser.waitUntil(() => {}, {timeout: 30000});
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
