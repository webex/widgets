import {getFeatureFlags} from '../src/util';

describe('getFeatureFlags', () => {
  it('should return an object with feature flags from agent profile with corresponding values', () => {
    const featureFlags = {
      isOutboundEnabledForTenant: true,
      isOutboundEnabledForAgent: true,
      isAdhocDialingEnabled: true,
      isCampaignManagementEnabled: true,
      isEndCallEnabled: true,
      isEndConsultEnabled: false,
      agentPersonalStatsEnabled: true,
      isCallMonitoringEnabled: true,
      isMidCallMonitoringEnabled: false,
      isBargeInEnabled: true,
      isManagedTeamsEnabled: true,
      isManagedQueuesEnabled: false,
      isSendMessageEnabled: true,
      isAgentStateChangeEnabled: true,
      isSignOutAgentsEnabled: true,
      isTimeoutDesktopInactivityEnabled: true,
      isAnalyzerEnabled: false,
      webRtcEnabled: true,
      isRecordingManagementEnabled: true,
      allowConsultToQueue: true,
    };

    const agentProfile = {
      randomKey1: 'randomValue1',
      randomKey2: 'randomValue2',
      ...featureFlags,
    };

    const result = getFeatureFlags(agentProfile);

    expect(result).toEqual(featureFlags);
  });
});
