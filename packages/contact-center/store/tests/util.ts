import {getFeatureFlags} from '../src/util';
import {mockProfile} from '@webex/test-fixtures';

describe('getFeatureFlags', () => {
  it('should return an object with feature flags from agent profile with corresponding values', () => {
    const featureFlags = {
      isAdhocDialingEnabled: true,
      isCampaignManagementEnabled: true,
      isEndCallEnabled: true,
      agentPersonalStatsEnabled: true,
      webRtcEnabled: true,
      allowConsultToQueue: true,
      isEndConsultEnabled: true,
      isOutboundEnabledForAgent: false,
      isOutboundEnabledForTenant: false,
      isTimeoutDesktopInactivityEnabled: false,
    };

    const result = getFeatureFlags(mockProfile);

    expect(result).toEqual(featureFlags);
  });
});
