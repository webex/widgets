import store from '@webex/cc-store';

export type WidgetMetrics = {
  widgetName: string;
  event: 'WIDGET_MOUNTED' | 'ERROR' | 'WIDGET_UNMOUNTED' | 'PROPS_UPDATED';
  props?: Record<string, any>;
  timestamp: number;
  additionalContext?: Record<string, any>;
};

/**
 * Logs UI metrics for contact center widgets.
 *
 * This function logs widget lifecycle events and errors to help monitor
 * widget performance and user interactions. If no logger is available,
 * it will emit a warning and skip logging.
 *
 * @param metric - The metrics data to be logged
 * @param metric.widgetName - Name of the widget generating the metric
 * @param metric.event - Type of event being logged
 * @param metric.props - Optional properties associated with the widget
 * @param metric.timestamp - Unix timestamp when the event occurred
 * @param metric.additionalContext - Optional additional context data
 *
 * @example
 * ```typescript
 * logMetrics({
 *   widgetName: 'CallControl',
 *   event: 'WIDGET_MOUNTED',
 *   props: { callId: '123' },
 *   timestamp: Date.now(),
 *   additionalContext: { userId: 'user123' }
 * });
 * ```
 */
export const logMetrics = (metric: WidgetMetrics) => {
  if (!store.logger) {
    console.warn('CC-Widgets: UI Metrics: No logger found');
    return;
  }
  store.logger.log(`CC-Widgets: UI Metrics: ${JSON.stringify(metric, null, 2)}`, {
    module: 'metricsLogger.tsx',
    method: 'logMetrics',
  });
};

/**
 * Logs a PROPS_UPDATED event when specific props have changed.
 *
 * This function checks if any of the specified props have changed between
 * the previous and next props objects. It performs a shallow comparison
 * for each watched prop and only logs if at least one has changed.
 *
 * @param widgetName - Name of the widget generating the metric
 * @param propsToWatch - Array of prop names to monitor for changes
 * @param prevProps - The previous props object
 * @param nextProps - The next props object to compare against
 *
 * @example
 * ```typescript
 * // Only log when 'status' or 'taskId' props change
 * logPropsUpdated('CallControl', ['status', 'taskId'], oldProps, newProps);
 * ```
 */
export const logPropsUpdated = (
  widgetName: string,
  propsToWatch: string[],
  prevProps: Record<string, any>,
  nextProps: Record<string, any>
): void => {
  if (!propsToWatch || propsToWatch.length === 0) {
    return;
  }

  // Check if any watched props have changed
  const changedProps: Record<string, {prev: any; next: any}> = {};
  let hasChanges = false;

  for (const propName of propsToWatch) {
    const prevVal = prevProps[propName];
    const nextVal = nextProps[propName];

    // Shallow comparison for watched prop
    if (prevVal !== nextVal) {
      hasChanges = true;
      changedProps[propName] = {
        prev: prevVal,
        next: nextVal,
      };
    }
  }

  // Only log if at least one watched prop changed
  if (hasChanges) {
    logMetrics({
      widgetName,
      event: 'PROPS_UPDATED',
      timestamp: Date.now(),
      additionalContext: {
        changedProps,
      },
    });
  }
};

/**
 * Determines if props have changed between two objects using shallow comparison.
 *
 * This function performs a shallow comparison between two objects to detect changes.
 * It compares object keys and primitive values, but does not recursively compare
 * nested objects. This is useful for determining when to log metrics based on prop changes.
 *
 * @param prev - The previous props object
 * @param next - The next props object to compare against
 * @returns `true` if the props have changed, `false` otherwise
 *
 * @example
 * ```typescript
 * const oldProps = { name: 'John', age: 30 };
 * const newProps = { name: 'John', age: 31 };
 *
 * if (havePropsChanged(oldProps, newProps)) {
 *   // Props have changed, log metrics
 *   logMetrics({
 *     widgetName: 'UserProfile',
 *     event: 'WIDGET_MOUNTED',
 *     props: newProps,
 *     timestamp: Date.now()
 *   });
 * } * ```
 *
 * @remarks
 * The function is important as we dont sanitize our props right now.
 * Once we start sanitizing we can do a deep comparison. This is used to only re-render
 * the HOC if the props have changed.
 */
export function havePropsChanged(prev: any, next: any): boolean {
  if (prev === next) return false;

  // Do shallow comparison
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

  // All shallow comparisons passed, consider props unchanged
  return false;
}
