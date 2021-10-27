class MeetingWidgetPage {
  get destination() { return $('input[placeholder="Widget Destination"]'); }
  get displayWidgetBtn() { return $('button[aria-label="Display Meeting Widget"]'); }
  get removeWidgetBtn() { return $('button[aria-label="Remove Meeting Widget"]'); }
  get meetingWidget() { return $('.webex-meeting-widget'); };
  get interstitialMeeting() { return $('.wxc-interstitial-meeting'); }
  get meetingInfo() { return $('.wxc-meeting-info'); }
  get waitingForOthers() { return $('h5=Waiting for others to join...'); }
  get meetingRoster() { return $('.wxc-member-roster'); }
  get meetingSettings() { return $('.wxc-settings'); }
  get controlBar() { return $('.wxc-meeting-control-bar'); }
  get muteAudioBtn() { return this.controlBar.$('span=Mute'); }
  get unmuteAudioBtn() { return this.controlBar.$('span=Unmute'); }
  get muteVideoBtn() { return this.controlBar.$('span=Stop video'); }
  get unmuteVideoBtn() { return this.controlBar.$('span=Start video'); }
  get startShareBtn() {return this.controlBar.$('span=Start sharing'); };
  get stopShareBtn() {return this.controlBar.$('span=Stop sharing'); };
  get showParticipatsBtn() {return this.controlBar.$('span=Show participants'); };
  get hideParticipatsBtn() {return this.controlBar.$('span=Hide participants'); };
  get settingsBtn() {return this.controlBar.$('span=Settings'); };
  get joinMeetingBtn() { return this.controlBar.$('span=Join meeting'); }
  get leaveMeetingBtn() { return this.controlBar.$('.wxc-button--cancel'); }

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
