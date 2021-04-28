class MeetingWidgetPage {
  get destination() { return $('input[placeholder="Widget Destination"]'); }
  get displayWidgetBtn() { return $('button[aria-label="Display Meeting Widget"]'); } // #md-button-3 
  get interstitialMeeting() { return $('.wxc-interstitial-meeting'); }
  get meetingInfo() { return $('.wxc-meeting-info'); }
  get joinMeetingBtn() { return $('button=Join meeting'); }
  get waitingForOthers() { return $('h4=Waiting for others to join...'); }

  get muteAudioBtn() { return $('.meeting-controls-container button[alt=Mute]'); }
  get unmuteAudioBtn() { return $('.meeting-controls-container button[alt=Unmute]'); }

  loadWidget(meetingDestination) {
    this.destination.setValue(meetingDestination);
    this.displayWidgetBtn.click();
    this.interstitialMeeting.waitForDisplayed({timeout: 30000});
  }

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

export default new MeetingWidgetPage();
