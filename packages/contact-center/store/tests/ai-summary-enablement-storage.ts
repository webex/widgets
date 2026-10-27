import {
  clearAISummaryEnablement,
  readAISummaryEnablement,
  writeAISummaryEnablement,
} from '../src/ai-summary-enablement-storage';

describe('AI summary enablement storage', () => {
  const sessionKey = 'organization-agent-session';
  const enabled = {interactionId: 'interaction-1', midCallEnabled: true, postCallEnabled: false};

  beforeEach(() => sessionStorage.clear());
  afterEach(() => jest.restoreAllMocks());

  it('retains explicit booleans without summary content and clears only the completed interaction', () => {
    writeAISummaryEnablement(sessionKey, {...enabled, summaryText: 'Do not persist summary content'});
    writeAISummaryEnablement(sessionKey, {...enabled, interactionId: 'interaction-2'});
    expect(readAISummaryEnablement(sessionKey, enabled.interactionId)).toEqual(enabled);
    expect(sessionStorage.getItem(sessionStorage.key(0))).not.toContain('summaryText');

    clearAISummaryEnablement(sessionKey, enabled.interactionId);
    expect(readAISummaryEnablement(sessionKey, enabled.interactionId)).toBeUndefined();
    expect(readAISummaryEnablement(sessionKey, 'interaction-2')).toEqual({...enabled, interactionId: 'interaction-2'});
    clearAISummaryEnablement(sessionKey);
    expect(readAISummaryEnablement(sessionKey, 'interaction-2')).toBeUndefined();
  });

  it('ignores malformed or invalid stored values', () => {
    const key = `cc-widget-ai-summary-enablement:${sessionKey}`;
    for (const value of [
      'not json',
      'null',
      '[]',
      '{"interaction-1":{"midCallEnabled":"true","postCallEnabled":false}}',
    ]) {
      sessionStorage.setItem(key, value);
      expect(readAISummaryEnablement(sessionKey, enabled.interactionId)).toBeUndefined();
    }
  });

  it('does nothing without an authenticated session or interaction', () => {
    writeAISummaryEnablement(undefined, enabled);
    writeAISummaryEnablement(sessionKey, {...enabled, interactionId: ''});
    clearAISummaryEnablement(undefined);
    expect(readAISummaryEnablement(undefined, enabled.interactionId)).toBeUndefined();
    expect(readAISummaryEnablement(sessionKey, '')).toBeUndefined();
    expect(sessionStorage.length).toBe(0);
  });

  it('keeps storage read, quota and deletion failures non-fatal', () => {
    jest.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new Error('blocked');
    });
    jest.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('quota');
    });
    jest.spyOn(Storage.prototype, 'removeItem').mockImplementation(() => {
      throw new Error('blocked');
    });
    expect(readAISummaryEnablement(sessionKey, enabled.interactionId)).toBeUndefined();
    expect(() => writeAISummaryEnablement(sessionKey, enabled)).not.toThrow();
    expect(() => clearAISummaryEnablement(sessionKey)).not.toThrow();
    expect(() => clearAISummaryEnablement(sessionKey, enabled.interactionId)).not.toThrow();
  });

  it('keeps denied access to the sessionStorage property non-fatal', () => {
    jest.spyOn(window, 'sessionStorage', 'get').mockImplementation(() => {
      throw new DOMException('Storage access denied', 'SecurityError');
    });

    expect(readAISummaryEnablement(sessionKey, enabled.interactionId)).toBeUndefined();
    expect(() => writeAISummaryEnablement(sessionKey, enabled)).not.toThrow();
    expect(() => clearAISummaryEnablement(sessionKey)).not.toThrow();
    expect(() => clearAISummaryEnablement(sessionKey, enabled.interactionId)).not.toThrow();
  });
});
