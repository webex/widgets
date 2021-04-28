class MeetingWidgetPage {
  get destination() { return $('input[placeholder="Widget Destination"]'); }
  get displayWidgetBtn() { return $('button[aria-label="Display Meeting Widget"]'); } // #md-button-3
  get interstitialMeeting() { return $('.wxc-interstitial-meeting'); }
  get meetingInfo() { return $('.wxc-meeting-info'); }
  get joinMeetingBtn() { return $('button=Join meeting'); }
  get waitingForOthers() { return $('h4=Waiting for others to join...'); }

  get muteVideoBtn() { return $('.meeting-controls-container button[alt="Stop video"]'); }
  get unmuteVideoBtn() { return $('.meeting-controls-container button[alt="Start video"]'); }  

  loadWidget(meetingDestination) {
    this.destination.setValue(meetingDestination);
    this.displayWidgetBtn.click();
    this.interstitialMeeting.waitForDisplayed({timeout: 30000});
  }
}

export default new MeetingWidgetPage();
