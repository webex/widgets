import {createUser, removeUser} from './util';
import SamplesPage from './pages/Samples.page';
import MeetingPage from './pages/MeetingWidget.page';

describe('Meeting Widget', () => {
  let user;
  let room;
  let accessToken;
  let meetingDestination;

  beforeAll(() => {
    try {
      user = browser.call(() => createUser());
      room = browser.call(() => user.sdk.rooms.create({title: 'Test Room'}));
    } catch (error) {
      console.error(error);
      console.error(error.body);
    }

    accessToken = process.env.WEBEX_ACCESS_TOKEN || (user && user.token.access_token);
    meetingDestination = process.env.WEBEX_MEETING_DESTINATION || (room && room.id);

    expect(accessToken).toBeDefined();
    expect(meetingDestination).toBeDefined();

    SamplesPage.open();
    SamplesPage.setAccessToken(accessToken);
    SamplesPage.navigateToMeetingPage();
    MeetingPage.loadWidget(meetingDestination);
  });

  afterAll(() => {
    MeetingPage.unloadWidget();
    if (user) {
      if (room) {
        browser.call(() => user.sdk.rooms.remove(room).catch(console.error));
      }
      browser.call(() => removeUser(user));
    }
  });

  it('has the correct page title', () => {
    expect(SamplesPage.widgetTitle.getText()).toBe('Webex Meeting Widget');
  });

  it('loads', () => {
    expect(MeetingPage.meetingInfo).toBeDisplayed();
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
});
