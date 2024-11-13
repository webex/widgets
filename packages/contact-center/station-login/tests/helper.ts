import {useStationLogin} from '../src/helper';

describe('Station login helpers', () => {
  it('returns the correct component name', () => {
    const result = useStationLogin();
    expect(result.name).toBe('StationLogin');
  });
});
