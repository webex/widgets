export type WidgetMetrics = {
  widgetName: string;
  event:
    | 'WIDGET_LOADED'
    | 'PROP_RECEIVED'
    | 'INTERACTION'
    | 'ERROR'
    | 'WIDGET_INITIALIZED'
    | 'WIDGET_PROPS_RECEIVED'
    | 'WIDGET_RENDER_START'
    | 'WIDGET_RENDER_COMPLETE'
    | 'WIDGET_UNMOUNTED'
    | 'WIDGET_PROP_UPDATED';
  props?: Record<string, any>;
  timestamp: number;
  additionalContext?: Record<string, any>;
};

export const logMetrics = (metric: WidgetMetrics) => {
  console.log('[WIDGET_METRICS]', metric, null, 2);
  // Optional: send to Amplitude or a log endpoint
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

export function sanitizePropsForLogging(obj: Record<string, any>, depth = 0): Record<string, any> {
  if (depth > 2) return {}; // prevent deep nesting issues

  const result: Record<string, any> = {};

  for (const key in obj) {
    const value = obj[key];

    if (typeof value === 'function') {
      result[key] = '[Function]';
    } else if (value && typeof value === 'object') {
      result[key] = sanitizePropsForLogging(value, depth + 1);
    } else {
      result[key] = value;
    }
  }

  return result;
}
