import {Page, Locator} from '@playwright/test';

export class MeetingWidgetPage {
  readonly page: Page;
  readonly destination: Locator;
  readonly displayWidgetBtn: Locator;
  readonly removeWidgetBtn: Locator;
  readonly meetingWidget: Locator;
  readonly interstitialMeeting: Locator;
  readonly meetingInfo: Locator;
  readonly waitingForOthers: Locator;
  readonly controlBar: Locator;
  readonly controls: Locator;
  readonly muteAudioBtn: Locator;
  readonly unmuteAudioBtn: Locator;
  readonly muteVideoBtn: Locator;
  readonly unmuteVideoBtn: Locator;
  readonly joinMeetingBtn: Locator;
  readonly leaveMeetingBtn: Locator;

  constructor(page: Page) {
    this.page = page;
    this.destination = page.locator('input[placeholder="Widget Destination"]');
    this.displayWidgetBtn = page.locator('button[aria-label="Display Meeting Widget"]');
    this.removeWidgetBtn = page.locator('button[aria-label="Remove Meeting Widget"]');
    this.meetingWidget = page.locator('.webex-meeting-widget-demo');
    this.interstitialMeeting = page.locator('.wxc-interstitial-meeting');
    this.meetingInfo = page.locator('.wxc-meeting-info');
    this.waitingForOthers = page.getByRole('heading', {name: 'Waiting for others to join...'});
    this.controlBar = page.locator('.wxc-meeting-control-bar');
    this.controls = page.locator('.wxc-meeting-control-bar__controls:not(.wxc-meeting-control-bar__control-refs)');
    this.muteAudioBtn = this.controls.getByRole('button', {name: 'Mute', exact: true});
    this.unmuteAudioBtn = this.controls.getByRole('button', {name: 'Unmute'});
    this.muteVideoBtn = this.controls.getByRole('button', {name: 'Stop video'});
    this.unmuteVideoBtn = this.controls.getByRole('button', {name: 'Start video'});
    this.joinMeetingBtn = this.controls.getByRole('button', {name: /^(Muted, video off|Unmuted, video on)$/});
    this.leaveMeetingBtn = this.controls.getByRole('button').filter({hasText: /^$/});
  }

  async loadWidget(): Promise<void> {
    await this.displayWidgetBtn.click();
    await this.interstitialMeeting.waitFor({state: 'visible', timeout: 90000});
  }

  async unloadWidget(): Promise<void> {
    await this.removeWidgetBtn.click();
    await this.meetingWidget.waitFor({state: 'detached', timeout: 3000});
  }
}
