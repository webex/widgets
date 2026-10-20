import store, {WidgetsBehavioralMetricAgent, WidgetsBehavioralMetricVerb} from '@webex/cc-store';

export const WELLNESS_METRIC = {
  BREAK_STARTED: 'Wellness Break Started',
  BREAK_ENDED: 'Wellness Break Ended',
  CARD_BREAK_ACCEPTED: 'Wellness Break Card Accepted',
  CARD_BREAK_REJECTED: 'Wellness Break Card Rejected',
  CTA_APPROVED: 'Wellness Break CTA Approved',
  CTA_REJECTED: 'Wellness Break CTA Rejected',
  CTA_USER_REQUEST: 'Wellness Break CTA User Request',
  DISPLAY_CTA: 'Wellness Break Display CTA',
  ERROR_CHANGE_STATE: 'Wellness Break Change State Error',
  GENERIC_ERROR: 'Wellness Break Generic Error',
  NO_RESPONSE: 'Wellness Break No Response',
  NOTIFICATION_FIRED: 'Wellness Break Notification Fired',
  NOTIFICATION_ACCEPTED: 'Wellness Break Notification Accepted',
  NOTIFICATION_DISMISSED: 'Wellness Break Notification Dismissed',
  NOTIFICATION_REJECTED: 'Wellness Break Notification Rejected',
  NOTIFICATION_TIMEOUT: 'Wellness Break Notification Timeout',
  PROVIDE_BREAK_EVENT_RECEIVED: 'Wellness Break Provide Break Event Received',
  RESTORE_STATE_RETRY_ATTEMPT: 'Wellness Break Restore State Retry Attempt',
  RESTORE_STATE_RECONNECT_ATTEMPT: 'Wellness Break Restore State Reconnect Attempt',
} as const;

export type WellnessMetricName = (typeof WELLNESS_METRIC)[keyof typeof WELLNESS_METRIC];

const WELLNESS_METRIC_TAXONOMY: Record<
  WellnessMetricName,
  {agent: WidgetsBehavioralMetricAgent; target: string; verb: WidgetsBehavioralMetricVerb}
> = {
  [WELLNESS_METRIC.BREAK_STARTED]: {agent: 'service', target: 'wellness_break', verb: 'start'},
  [WELLNESS_METRIC.BREAK_ENDED]: {agent: 'service', target: 'wellness_break', verb: 'end'},
  [WELLNESS_METRIC.CARD_BREAK_ACCEPTED]: {agent: 'user', target: 'wellness_break_card', verb: 'accept'},
  [WELLNESS_METRIC.CARD_BREAK_REJECTED]: {agent: 'user', target: 'wellness_break_card', verb: 'reject'},
  [WELLNESS_METRIC.CTA_APPROVED]: {agent: 'service', target: 'wellness_break_cta', verb: 'accept'},
  [WELLNESS_METRIC.CTA_REJECTED]: {agent: 'service', target: 'wellness_break_cta', verb: 'reject'},
  [WELLNESS_METRIC.CTA_USER_REQUEST]: {agent: 'user', target: 'wellness_break_cta', verb: 'request'},
  [WELLNESS_METRIC.DISPLAY_CTA]: {agent: 'user', target: 'wellness_break_cta', verb: 'display'},
  [WELLNESS_METRIC.ERROR_CHANGE_STATE]: {
    agent: 'service',
    target: 'wellness_break_change_state',
    verb: 'fail',
  },
  [WELLNESS_METRIC.GENERIC_ERROR]: {agent: 'service', target: 'wellness_break', verb: 'fail'},
  [WELLNESS_METRIC.NO_RESPONSE]: {agent: 'user', target: 'wellness_break', verb: 'ignore'},
  [WELLNESS_METRIC.NOTIFICATION_FIRED]: {
    agent: 'service',
    target: 'wellness_break_notification',
    verb: 'fire',
  },
  [WELLNESS_METRIC.NOTIFICATION_ACCEPTED]: {
    agent: 'user',
    target: 'wellness_break_notification',
    verb: 'accept',
  },
  [WELLNESS_METRIC.NOTIFICATION_DISMISSED]: {
    agent: 'user',
    target: 'wellness_break_notification',
    verb: 'dismiss',
  },
  [WELLNESS_METRIC.NOTIFICATION_REJECTED]: {
    agent: 'user',
    target: 'wellness_break_notification',
    verb: 'reject',
  },
  [WELLNESS_METRIC.NOTIFICATION_TIMEOUT]: {
    agent: 'service',
    target: 'wellness_break_notification',
    verb: 'expire',
  },
  [WELLNESS_METRIC.PROVIDE_BREAK_EVENT_RECEIVED]: {agent: 'service', target: 'wellness_break', verb: 'load'},
  [WELLNESS_METRIC.RESTORE_STATE_RETRY_ATTEMPT]: {
    agent: 'service',
    target: 'wellness_break_restore_state_retry',
    verb: 'retry',
  },
  [WELLNESS_METRIC.RESTORE_STATE_RECONNECT_ATTEMPT]: {
    agent: 'service',
    target: 'wellness_break_restore_state_reconnect',
    verb: 'retry',
  },
};

/** Emits only behavior categories and bounded numeric/boolean properties; never session or event data. */
export const logWellnessMetric = (
  name: WellnessMetricName,
  properties: Record<string, string | number | boolean> = {}
): void => {
  store.logger?.log('CC-Widgets: Agent Wellness Break behavioral metric', {
    module: 'wellness/wellness.metrics.ts',
    method: 'logWellnessMetric',
    data: {name, ...properties},
  });
  const taxonomy = WELLNESS_METRIC_TAXONOMY[name];
  store.submitBehavioralMetric({
    name,
    ...taxonomy,
    ...(Object.keys(properties).length > 0 ? {properties} : {}),
  });
};
