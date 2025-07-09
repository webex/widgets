export interface MetricEvent {
  widgetName: string;
  event: 'WIDGET_INITIALIZED' | 'WIDGET_UNMOUNTED' | 'WIDGET_PROP_UPDATED' | 'WIDGET_DETECTED';
  props?: any;
  timestamp: number;
  sessionId?: string;
}

export interface WidgetMetrics {
  widgetName: string;
  initializationTime: number;
  lastPropUpdate?: number;
  unmountTime?: number;
  propUpdateCount: number;
  currentProps?: any;
}

class MetricsCollector {
  private metrics: Map<string, WidgetMetrics> = new Map();
  private sessionId: string;
  private listeners: ((event: MetricEvent) => void)[] = [];

  constructor() {
    this.sessionId = this.generateSessionId();
  }

  private generateSessionId(): string {
    return `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  public logMetrics(event: MetricEvent): void {
    console.log('[WidgetsProvider Metrics] Logging event:', event);
    const eventWithSession = {...event, sessionId: this.sessionId};

    // Update internal metrics tracking
    this.updateMetrics(eventWithSession);

    // Notify all listeners
    this.listeners.forEach((listener) => listener(eventWithSession));

    // Log to console in development
  }

  private updateMetrics(event: MetricEvent): void {
    const {widgetName, event: eventType, props, timestamp} = event;

    let widgetMetric = this.metrics.get(widgetName);

    switch (eventType) {
      case 'WIDGET_INITIALIZED':
        if (!widgetMetric) {
          widgetMetric = {
            widgetName,
            initializationTime: timestamp,
            propUpdateCount: 0,
            currentProps: props,
          };
          this.metrics.set(widgetName, widgetMetric);
        }
        break;

      case 'WIDGET_PROP_UPDATED':
        if (widgetMetric) {
          widgetMetric.lastPropUpdate = timestamp;
          widgetMetric.propUpdateCount += 1;
          widgetMetric.currentProps = props;
        }
        break;

      case 'WIDGET_UNMOUNTED':
        if (widgetMetric) {
          widgetMetric.unmountTime = timestamp;
        }
        break;

      case 'WIDGET_DETECTED':
        if (!widgetMetric) {
          widgetMetric = {
            widgetName,
            initializationTime: timestamp,
            propUpdateCount: 0,
          };
          this.metrics.set(widgetName, widgetMetric);
        }
        break;
    }
  }

  public getMetrics(): Map<string, WidgetMetrics> {
    return new Map(this.metrics);
  }

  public getWidgetMetrics(widgetName: string): WidgetMetrics | undefined {
    return this.metrics.get(widgetName);
  }

  public getAllLoadedWidgets(): string[] {
    return Array.from(this.metrics.keys());
  }

  public addListener(listener: (event: MetricEvent) => void): () => void {
    this.listeners.push(listener);
    return () => {
      const index = this.listeners.indexOf(listener);
      if (index > -1) {
        this.listeners.splice(index, 1);
      }
    };
  }

  public clearMetrics(): void {
    this.metrics.clear();
  }

  public getSessionSummary() {
    const loadedWidgets = this.getAllLoadedWidgets();
    const totalWidgets = loadedWidgets.length;
    const activeWidgets = Array.from(this.metrics.values()).filter((metric) => !metric.unmountTime).length;

    return {
      sessionId: this.sessionId,
      totalWidgetsLoaded: totalWidgets,
      activeWidgets,
      loadedWidgets,
      sessionStartTime: Math.min(...Array.from(this.metrics.values()).map((m) => m.initializationTime)),
    };
  }
}

// Global metrics collector instance
const metricsCollector = new MetricsCollector();

export const logMetrics = (event: MetricEvent): void => {
  metricsCollector.logMetrics(event);
};

export const getMetrics = (): Map<string, WidgetMetrics> => {
  return metricsCollector.getMetrics();
};

export const getWidgetMetrics = (widgetName: string): WidgetMetrics | undefined => {
  return metricsCollector.getWidgetMetrics(widgetName);
};

export const getAllLoadedWidgets = (): string[] => {
  return metricsCollector.getAllLoadedWidgets();
};

export const addMetricsListener = (listener: (event: MetricEvent) => void): (() => void) => {
  return metricsCollector.addListener(listener);
};

export const clearMetrics = (): void => {
  metricsCollector.clearMetrics();
};

export const getSessionSummary = () => {
  return metricsCollector.getSessionSummary();
};

export const havePropsChanged = <T extends object>(prevProps: T, nextProps: T): boolean => {
  const prevKeys = Object.keys(prevProps);
  const nextKeys = Object.keys(nextProps);

  if (prevKeys.length !== nextKeys.length) {
    return true;
  }

  for (const key of prevKeys) {
    if (prevProps[key as keyof T] !== nextProps[key as keyof T]) {
      return true;
    }
  }

  return false;
};

export const sendWidgetEvent = (
  widgetName: string,
  event: 'WIDGET_INITIALIZED' | 'WIDGET_UNMOUNTED' | 'WIDGET_PROP_UPDATED' | 'WIDGET_DETECTED',
  props?: any
): void => {
  const timestamp = Date.now();
  const metricEvent: MetricEvent = {
    widgetName,
    event,
    props,
    timestamp,
  };
  metricsCollector.logMetrics(metricEvent);
};
