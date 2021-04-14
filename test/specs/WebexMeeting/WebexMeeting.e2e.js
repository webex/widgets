describe('my widget', () => {
  it('should find sections and match text', () => {
    browser.url('https://webex.github.io/widgets/');

    // should contain two sections
    expect($$('.content > section').length).toBe(2);
    // should match first section text
    expect($('.content > section > h3')).toHaveTextContaining('Webex Widgets Access Token');
  });
});
