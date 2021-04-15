class WebexMeetingPage {
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

  init() {
    this.open();
    this.accessTokenInput.setValue('<INSERT ACCESS TOKEN>');
    this.saveTokenBtn.click();
    this.destinationInput.setValue('<INSERT email, person ID, room ID, SIP>');
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
