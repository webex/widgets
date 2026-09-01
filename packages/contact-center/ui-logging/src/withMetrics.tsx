import React, {useEffect, useRef} from 'react';
import {havePropsChanged, logMetrics} from './metricsLogger';

export default function withMetrics<P extends object>(Component: any, widgetName: string, propsToWatch?: string[]) {
  return React.memo(
    (props: P) => {
      const prevWatchedPropsRef = useRef<Record<string, any> | null>(null);

      useEffect(() => {
        logMetrics({
          widgetName,
          event: 'WIDGET_MOUNTED',
          timestamp: Date.now(),
        });

        return () => {
          logMetrics({
            widgetName,
            event: 'WIDGET_UNMOUNTED',
            timestamp: Date.now(),
          });
        };
      }, []);

      useEffect(() => {
        if (!propsToWatch || propsToWatch.length === 0) return;

        const currentWatchedProps: Record<string, any> = {};
        for (const key of propsToWatch) {
          currentWatchedProps[key] = (props as Record<string, any>)[key];
        }

        if (prevWatchedPropsRef.current !== null && havePropsChanged(prevWatchedPropsRef.current, currentWatchedProps)) {
          logMetrics({
            widgetName,
            event: 'PROPS_UPDATED',
            props: currentWatchedProps,
            timestamp: Date.now(),
          });
        }

        prevWatchedPropsRef.current = currentWatchedProps;
      });

      return <Component {...props} />;
    },
    (prevProps, nextProps) => !havePropsChanged(prevProps, nextProps)
  );
}
