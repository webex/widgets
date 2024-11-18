import {useStationLogin} from '../src/helper';

describe('Station login helpers', () => {
  it('returns the correct component name', () => {
    const mockTeams = [{ id: '1', name: 'Team 1' }];
    const mockLoginOptions = ['EXTENSION', 'AGENT_DN', 'BROWSER'];
    const props = {mockTeams, mockLoginOptions}
    const result = useStationLogin(...props);
    expect(result.name).toBe('StationLogin');
  });
});
