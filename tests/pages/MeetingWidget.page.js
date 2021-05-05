class MeetingWidgetPage {
  get destination() { return $('input[placeholder="Widget Destination"]'); }
  get displayWidgetBtn() { return $('button[aria-label="Display Meeting Widget"]'); } // #md-button-3
  get removeWidgetBtn() { return $('button[aria-label="Remove Meeting Widget"]'); } // #md-button-4
  get meetingWidget() { return $('.meeting-widget'); };
  get interstitialMeeting() { return $('.wxc-interstitial-meeting'); }
  get meetingInfo() { return $('.wxc-meeting-info'); }
  get muteAudioBtn() { return $('.meeting-controls-container button[alt=Mute]'); }
  get unmuteAudioBtn() { return $('.meeting-controls-container button[alt=Unmute]'); }
  get muteVideoBtn() { return $('.meeting-controls-container button[alt="Stop video"]'); }
  get unmuteVideoBtn() { return $('.meeting-controls-container button[alt="Start video"]'); }
  get joinMeetingBtn() { return $('.meeting-controls-container button[alt="Join meeting"]'); }
  get waitingForOthers() { return $('h4=Waiting for others to join...'); }
  get leaveMeetingBtn() { return $('.meeting-controls-container button[alt=Leave]'); }

  loadWidget(meetingDestination) {
    this.destination.setValue(meetingDestination);
    this.displayWidgetBtn.click();
    this.interstitialMeeting.waitForDisplayed({timeout: 30000});
  }
  
  unloadWidget() {
    this.removeWidgetBtn.click();
    this.meetingWidget.waitForExist({reverse: true, timeout: 3000});
  }
}

export default new MeetingWidgetPage();
