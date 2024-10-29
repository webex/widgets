class MeetingWidgetPage {
  get destination() { return $('input[placeholder="Widget Destination"]'); }
  get displayWidgetBtn() { return $('button[aria-label="Display Meeting Widget"]'); }
  get removeWidgetBtn() { return $('button[aria-label="Remove Meeting Widget"]'); }
  get meetingWidget() { return $('.webex-meeting-widget'); };
  get interstitialMeeting() { return $('.wxc-interstitial-meeting'); }
  get meetingInfo() { return $('.wxc-meeting-info'); }
  get waitingForOthers() { return $('h5=Waiting for others to join...'); }
  get controlBar() { return $('.wxc-meeting-control-bar'); }
  get controls() { return $('.wxc-meeting-control-bar__controls:not(.wxc-meeting-control-bar__control-refs)')}
  get muteAudioBtn() { return this.controls.$('span=Mute'); }
  get unmuteAudioBtn() { return this.controls.$('span=Unmute'); }
  get muteVideoBtn() { return this.controls.$('span=Stop video'); }
  get unmuteVideoBtn() { return this.controls.$('span=Start video'); }
  get joinMeetingBtn() { return this.controls.$('span=Join meeting'); }
  get leaveMeetingBtn() { return this.controls.$('.wxc-button--cancel'); }

  loadWidget() {
    this.displayWidgetBtn.click();
    this.interstitialMeeting.waitForDisplayed({timeout: 30000});
  }

  unloadWidget() {
    this.removeWidgetBtn.click();
    this.meetingWidget.waitForExist({reverse: true, timeout: 3000});
  }
}

export default new MeetingWidgetPage();
