import React, {useEffect, useRef} from 'react';
import {havePropsChanged, logMetrics, logPropsUpdated} from './metricsLogger';

export default function withMetrics<P extends object>(
  Component: any,
  widgetName: string,
  propsToWatch?: string[]
) {
  return React.memo(
    (props: P) => {
      const prevPropsRef = useRef<P | undefined>(undefined);
      const isFirstRenderRef = useRef(true);

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

      // Track props updates for watched props
      // We need to manually track prop changes since useEffect with [props] doesn't work well with object refs
      if (!isFirstRenderRef.current && propsToWatch && propsToWatch.length > 0 && prevPropsRef.current) {
        logPropsUpdated(
          widgetName,
          propsToWatch,
          prevPropsRef.current as Record<string, any>,
          props as Record<string, any>
        );
      }

      // Update refs after render
      useEffect(() => {
        if (isFirstRenderRef.current) {
          isFirstRenderRef.current = false;
        }
        prevPropsRef.current = props;
      });

      return <Component {...props} />;
    },
    (prevProps, nextProps) => !havePropsChanged(prevProps, nextProps)
  );
}
