import {Profile} from './store.types';

export function getFeatureFlags(agentProfile: Profile) {
  const featureFlagkeys = [
    'isOutboundEnabledForTenant',
    'isOutboundEnabledForAgent',
    'isAdhocDialingEnabled',
    'isCampaignManagementEnabled',
    'isEndCallEnabled',
    'isEndConsultEnabled',
    'agentPersonalStatsEnabled',
    'isCallMonitoringEnabled',
    'isMidCallMonitoringEnabled',
    'isBargeInEnabled',
    'isManagedTeamsEnabled',
    'isManagedQueuesEnabled',
    'isSendMessageEnabled',
    'isAgentStateChangeEnabled',
    'isSignOutAgentsEnabled',
    'isTimeoutDesktopInactivityEnabled',
    'isAnalyzerEnabled',
    'webRtcEnabled',
    'isRecordingManagementEnabled',
    'allowConsultToQueue',
  ];

  const keyValuePairs = featureFlagkeys.reduce((acc, key) => {
    const value = agentProfile[key];
    if (value !== undefined) {
      acc[key] = value;
    }
    return acc;
  }, {});

  return keyValuePairs;
}
