import {getFeatureFlags} from '../src/util';
import {mockProfile} from '@webex/test-fixtures';
import type {Profile} from '../src/store.types';

describe('getFeatureFlags', () => {
  it('should return an object with feature flags from agent profile with corresponding values', () => {
    const featureFlags = {
      isAdhocDialingEnabled: true,
      isCampaignManagementEnabled: true,
      agentPersonalStatsEnabled: true,
      webRtcEnabled: true,
      allowConsultToQueue: true,
      isEndTaskEnabled: true,
      isEndConsultEnabled: true,
      isOutboundEnabledForAgent: false,
      isOutboundEnabledForTenant: false,
      isTimeoutDesktopInactivityEnabled: false,
      isWellnessBreakEnabled: false,
    };

    const result = getFeatureFlags(mockProfile);

    expect(result).toEqual(featureFlags);
  });

  it.each([
    [true, true],
    [false, false],
    [true, false],
    [false, true],
  ])(
    'projects summary configuration independently: consult/transfer %s, wrap-up %s',
    (consultTransferSummariesEnabled, wrapUpSummariesEnabled) => {
      const result = getFeatureFlags({
        ...mockProfile,
        aiFeature: {generatedSummaries: {consultTransferSummariesEnabled, wrapUpSummariesEnabled}},
      });

      expect(result).toMatchObject({consultTransferSummariesEnabled, wrapUpSummariesEnabled});
    }
  );

  it.each<Profile['aiFeature']>([undefined, {}, {generatedSummaries: {}}])(
    'omits absent summary configuration: %p',
    (aiFeature) => {
      const result = getFeatureFlags({...mockProfile, aiFeature});

      expect(result).not.toHaveProperty('consultTransferSummariesEnabled');
      expect(result).not.toHaveProperty('wrapUpSummariesEnabled');
    }
  );

  it('omits nonboolean summary configuration without coercion', () => {
    const result = getFeatureFlags({
      ...mockProfile,
      aiFeature: {
        generatedSummaries: {
          consultTransferSummariesEnabled: 'true',
          wrapUpSummariesEnabled: 1,
        },
      },
    } as unknown as Profile);

    expect(result).not.toHaveProperty('consultTransferSummariesEnabled');
    expect(result).not.toHaveProperty('wrapUpSummariesEnabled');
  });
});
