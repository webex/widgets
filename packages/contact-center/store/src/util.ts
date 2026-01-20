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

/**
 * Extracts the normalized region from an RTMS domain URL.
 *
 * @param domain - The RTMS domain URL from webex.internal.services.get('wcc-calling-rtms-domain')
 *                 Expected format: 'sip://rtw.<env-region>.rtmsprod.net'
 *                 Examples:
 *                   - 'sip://rtw.prod-us1.rtmsprod.net' -> 'produs1'
 *                   - 'sip://rtw.intg-us1.rtmsprod.net' -> 'intgus1'
 *                   - 'sip://rtw.prod-eu.rtmsprod.net' -> 'prodeu'
 *
 * @returns The normalized region string (e.g., 'produs1', 'intgus1') or undefined if parsing fails
 */
export function extractRegionFromRtmsDomain(domain: string): string | undefined {
  try {
    let hostname: string;
    try {
      const url = new URL(domain);
      hostname = url.hostname;
    } catch {
      // If URL parsing fails, try manual extraction
      const withoutProtocol = domain.replace(/^[a-z]+:\/\//i, '');
      hostname = withoutProtocol.split(/[/:]/)[0];
    }

    if (!hostname) return undefined;

    // Split hostname into labels: rtw.prod-us1.rtmsprod.net -> ['rtw', 'prod-us1', 'rtmsprod', 'net']
    const labels = hostname.split('.');
    if (labels.length < 3) return undefined;

    // The region is typically the second label (index 1)
    const regionLabel = labels[1];
    if (!regionLabel) return undefined;

    // Remove dashes to normalize: 'prod-us1' -> 'produs1'
    const normalizedRegion = regionLabel.replace(/-/g, '');
    return normalizedRegion === '' ? undefined : normalizedRegion;
  } catch {
    return undefined;
  }
}
