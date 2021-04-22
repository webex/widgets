import MeetingPage from './MeetingPage';

describe('Meeting Widget', () => {
  beforeAll(() => {
    return MeetingPage.createUser();
  });

  afterAll(() => {
    return MeetingPage.removeUser();
  });

  it('opens meeting test page', () => {
    MeetingPage.open();

    // should contain two sections
    expect($$('.content > section').length).toBe(2);
    // should match first section text
    expect($('.content > section > h3')).toHaveTextContaining('Webex Widgets Access Token');
  });

  it('loads meeting widget', () => {
    MeetingPage.loadWidget();
  });
});
