import store from '@webex/cc-store';

export type WidgetMetrics = {
  widgetName: string;
  event: 'WIDGET_MOUNTED' | 'ERROR' | 'WIDGET_UNMOUNTED';
  props?: Record<string, any>;
  timestamp: number;
  additionalContext?: Record<string, any>;
};

export const logMetrics = (metric: WidgetMetrics) => {
  if (!store.logger) {
    console.log('CC-Widgets: UI Metrics: No logger found');
    return;
  }
  store.logger.log(`CC-Widgets: UI Metrics: ${JSON.stringify(metric, null, 2)}`, {
    module: 'metricsLogger.tsx',
    method: 'logMetrics',
  });
};

export function havePropsChanged(prev: any, next: any): boolean {
  if (prev === next) return false;

  // Do shallow comparison first
  if (typeof prev !== typeof next) return true;
  if (!prev || !next) return prev !== next;

  const prevKeys = Object.keys(prev);
  const nextKeys = Object.keys(next);

  if (prevKeys.length !== nextKeys.length) return true;

  // Check if any primitive values changed
  for (const key of prevKeys) {
    const prevVal = prev[key];
    const nextVal = next[key];

    if (prevVal === nextVal) continue;
    if (typeof prevVal !== 'object' || prevVal === null) return true;
    if (typeof nextVal !== 'object' || nextVal === null) return true;
  }

  // Fall back to deep comparison only for objects that passed shallow check
  try {
    return JSON.stringify(prev) !== JSON.stringify(next);
  } catch {
    return true; // fallback to log if circular structure
  }
}
