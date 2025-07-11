import React, {createContext, useContext, useEffect, useState} from 'react';
import {MetricEvent, WidgetMetrics, addMetricsListener, getMetrics, getSessionSummary} from './metricsLogger';

interface MetricsContextType {
  metrics: Map<string, WidgetMetrics>;
  sessionSummary: ReturnType<typeof getSessionSummary>;
  refreshMetrics: () => void;
}

const MetricsContext = createContext<MetricsContextType | undefined>(undefined);

export const useMetrics = () => {
  const context = useContext(MetricsContext);
  if (!context) {
    throw new Error('useMetrics must be used within a MetricsProvider');
  }
  return context;
};

export const MetricsProvider: React.FC<{children: React.ReactNode}> = ({children}) => {
  const [metrics, setMetrics] = useState<Map<string, WidgetMetrics>>(new Map());
  const [sessionSummary, setSessionSummary] = useState(getSessionSummary());

  const refreshMetrics = React.useCallback(() => {
    setMetrics(getMetrics());
    setSessionSummary(getSessionSummary());
  }, []);

  useEffect(() => {
    // Listen for metric events and update state
    const unsubscribe = addMetricsListener(() => {
      setMetrics(getMetrics());
      setSessionSummary(getSessionSummary());
    });

    // Initial load
    setMetrics(getMetrics());
    setSessionSummary(getSessionSummary());

    return unsubscribe;
  }, []);

  return (
    <MetricsContext.Provider value={{metrics, sessionSummary, refreshMetrics}}>{children}</MetricsContext.Provider>
  );
};
