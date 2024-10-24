import {useUSEmergencyNumber} from '../../src/us-emergency-number/us-emergency-number.hooks';

describe('Station login hooks', () => {
  it('returns the correct component name', async () => {
    const result = useUSEmergencyNumber();
    expect(result.name).toBe('USEmergencyNumber');
  });
});
