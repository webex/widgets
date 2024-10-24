import {useStationLogin} from '../../src/station-login/station-login.hooks';

describe('Station login hooks', () => {
  it('returns the correct component name', async () => {
    const result = useStationLogin();
    expect(result.name).toBe('StationLogin');
  });
});
