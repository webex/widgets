import React, {useEffect, useRef} from 'react';
import {getChangedWatchedProps, havePropsChanged, logMetrics} from './metricsLogger';

export default function withMetrics<P extends object>(
  Component: any,
  widgetName: string,
  propsToWatch: (keyof P & string)[] = []
) {
  return React.memo(
    (props: P) => {
      const prevPropsRef = useRef<P | null>(null);

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
        if (prevPropsRef.current && propsToWatch.length > 0) {
          const changes = getChangedWatchedProps(
            prevPropsRef.current as Record<string, any>,
            props as Record<string, any>,
            propsToWatch
          );
          if (changes) {
            logMetrics({
              widgetName,
              event: 'PROPS_UPDATED',
              props: changes,
              timestamp: Date.now(),
            });
          }
        }
        prevPropsRef.current = props;
      });

      return <Component {...props} />;
    },
    (prevProps, nextProps) => !havePropsChanged(prevProps, nextProps)
  );
}
