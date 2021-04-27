class MeetingWidgetPage {
  get destination() { return $('input[placeholder="Widget Destination"]'); }
  get displayWidgetBtn() { return $('button[aria-label="Display Meeting Widget"]'); } // #md-button-3
  get interstitialMeeting() { return $('.wxc-interstitial-meeting'); }
  get meetingInfo() { return $('.wxc-meeting-info'); }

  get muteAudioBtn() { return $('.meeting-controls-container button[alt=Mute]'); }
  get unmuteAudioBtn() { return $('.meeting-controls-container button[alt=Unmute]'); }

  loadWidget(meetingDestination) {
    this.destination.setValue(meetingDestination);
    this.displayWidgetBtn.click();
    this.interstitialMeeting.waitForDisplayed({timeout: 30000});
  }
}

export default new MeetingWidgetPage();
