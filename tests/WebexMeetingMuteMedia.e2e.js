import {createUser, removeUser, createSdkInstance} from './util';
import SamplesPage from './pages/Samples.page';
import MeetingPage from './pages/MeetingWidget.page';

describe('Mute audio video before joining the meeting', () => {
  let user;
  let room;
  let sdk;
  let accessToken = process.env.WEBEX_ACCESS_TOKEN;
  let meetingDestination = process.env.WEBEX_MEETING_DESTINATION;

  beforeAll(() => {
    try {
      if (!accessToken) {
        user = browser.call(() => createUser());
        accessToken = user.token.access_token;
      }

      if (!meetingDestination) {
        sdk = createSdkInstance(accessToken);
        room = browser.call(() => sdk.rooms.create({title: 'Test Room'}));
        meetingDestination = room.id;
      }
    } catch (error) {
      console.error(error);
      console.error(error.body);
    }

    expect(accessToken).toBeDefined();
    expect(meetingDestination).toBeDefined();

    SamplesPage.open();
    SamplesPage.setAccessToken(accessToken);
    SamplesPage.navigateToMeetingPage();
    MeetingPage.loadWidget(meetingDestination);
  });

  afterAll(() => {
    MeetingPage.unloadWidget();
    if (room) {
      browser.call(() => sdk.rooms.remove(room).catch(console.error));
    }

    if (user) {
      browser.call(() => removeUser(user));
    }
  });

  it('has the correct page title', () => {
    expect(SamplesPage.widgetTitle.getText()).toBe('Webex Meeting Widget');
  });

  it('loads', () => {
    expect(MeetingPage.meetingInfo).toBeDisplayed();
  });

  it('displays the control bar', () => {
    expect(MeetingPage.controlBar).toBeVisible();
  });

  it('mutes audio before joining meeting', () => {
    MeetingPage.muteAudioBtn.click();
    expect(MeetingPage.muteAudioBtn).not.toBeVisible();
    expect(MeetingPage.unmuteAudioBtn).toBeVisible();
  });

  it('mutes video before joining meeting', () => {
    MeetingPage.muteVideoBtn.click();
    expect(MeetingPage.muteVideoBtn).not.toBeVisible();
    expect(MeetingPage.unmuteVideoBtn).toBeVisible();
  });

  it('displays "Waiting for others" after joining meeting', () => {
    expect(MeetingPage.waitingForOthers).not.toExist();
    MeetingPage.joinMeetingBtn.click();
    MeetingPage.waitingForOthers.waitForDisplayed({timeout: 10000});
    expect(MeetingPage.waitingForOthers).toBeVisible();
  });

  it('unmutes audio after joining meeting', () => {
    MeetingPage.unmuteAudioBtn.click();
    MeetingPage.muteAudioBtn.waitForDisplayed({timeout: 10000});
    expect(MeetingPage.unmuteAudioBtn).not.toBeVisible();
    expect(MeetingPage.muteAudioBtn).toBeVisible();
  });

  it('unmutes video after joining meeting', () => {
    MeetingPage.unmuteVideoBtn.click();
    MeetingPage.muteVideoBtn.waitForDisplayed({timeout: 10000});
    expect(MeetingPage.unmuteVideoBtn).not.toBeVisible();
    expect(MeetingPage.muteVideoBtn).toBeVisible();
  });

  it('leaves the meeting', () => {
    MeetingPage.leaveMeetingBtn.click();
    MeetingPage.meetingWidget.waitForDisplayed({timeout: 10000});
    expect(MeetingPage.meetingWidget).toHaveTextContaining('You\'ve successfully left the meeting');
  });

  it('doesn\'t display any control after leaving the meeting', () => {
    expect(MeetingPage.controlBar).not.toBeVisible();
  });
});


