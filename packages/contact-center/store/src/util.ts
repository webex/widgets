import {AI_FEATURE_SUGGESTED_RESPONSES_KEY} from './constants';
import {Profile} from './store.types';

const getValueAtPath = (obj: unknown, path: string): unknown => {
  return path.split('.').reduce<unknown>((acc, segment) => {
    if (acc && typeof acc === 'object' && segment in (acc as Record<string, unknown>)) {
      return (acc as Record<string, unknown>)[segment];
    }
    return undefined;
  }, obj);
};

export function getFeatureFlags(agentProfile: Profile) {
  const featureFlagkeys = [
    'isOutboundEnabledForTenant',
    'isOutboundEnabledForAgent',
    'isAdhocDialingEnabled',
    'isCampaignManagementEnabled',
    'isEndTaskEnabled',
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

  // SDK surfaces this flag at one of several paths; project the first match onto a flat key.
  const aiSuggestedResponsesPaths = [
    'aiFeature.suggestedResponses.enable',
    'agentConfig.aiFeature.suggestedResponses.enable',
    'isSuggestedResponsesEnabled',
  ];
  for (const path of aiSuggestedResponsesPaths) {
    const value = getValueAtPath(agentProfile, path);
    if (typeof value === 'boolean') {
      keyValuePairs[AI_FEATURE_SUGGESTED_RESPONSES_KEY] = value;
      break;
    }
  }

  return keyValuePairs;
}
