import {useStationLogin} from '../../src/helper';

describe('Station login hooks', () => {
  it('returns the correct component name', () => {
    const result = useStationLogin();
    expect(result.name).toBe('StationLogin');
  });
});
