import WebexMeetingPage from './WebexMeetingPage';

// browser.waitUntil(() => {}, {timeout: 20000});
describe('my widget', () => {
  it('should find sections and match text', () => {
    browser.url('https://webex.github.io/widgets/');

    // should contain two sections
    expect($$('.content > section').length).toBe(2);
    // should match first section text
    expect($('.content > section > h3')).toHaveTextContaining('Webex Widgets Access Token');
  });

  it('should mute audio before joining meeting', () => {
    WebexMeetingPage.init();

    expect(WebexMeetingPage.microphoneIcon).not.toHaveElementClass('md-button--red');
    WebexMeetingPage.microphoneIcon.click();
    expect(WebexMeetingPage.microphoneIcon).toHaveElementClass('md-button--red');
  });

  it('should mute video before joining meeting', () => {
    WebexMeetingPage.init();

    expect(WebexMeetingPage.videoIcon).not.toHaveElementClass('md-button--red');
    expect(WebexMeetingPage.videoRef).toExist();
    WebexMeetingPage.videoIcon.click();
    expect(WebexMeetingPage.videoIcon).toHaveElementClass('md-button--red');
    expect(WebexMeetingPage.videoRef).not.toExist();
  });

  it('should mute audio after joining meeting', () => {
    WebexMeetingPage.init();
    expect(WebexMeetingPage.microphoneIcon).not.toHaveElementClass('md-button--red');

    WebexMeetingPage.joinMeetingBtn.click();
    WebexMeetingPage.waitJoiningMeeting();

    WebexMeetingPage.microphoneIcon.click();
    expect(WebexMeetingPage.microphoneIcon).toHaveElementClass('md-button--red');
  });

  it('should mute video after joining meeting', () => {
    WebexMeetingPage.init();
    expect(WebexMeetingPage.videoIcon).not.toHaveElementClass('md-button--red');
    expect(WebexMeetingPage.videoRef).toExist();

    WebexMeetingPage.joinMeetingBtn.click();
    WebexMeetingPage.waitJoiningMeeting();

    WebexMeetingPage.videoIcon.click();
    expect(WebexMeetingPage.videoIcon).toHaveElementClass('md-button--red');
    expect(WebexMeetingPage.videoRef).not.toExist();
  });

  it('should join meeting and waiting for others', () => {
    WebexMeetingPage.init();
    expect(WebexMeetingPage.waitingForOthers).not.toExist();
    WebexMeetingPage.joinMeetingBtn.click();
    expect(WebexMeetingPage.waitingForOthers).toExist();
  });
});
