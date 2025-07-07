import React, {useEffect, useRef} from 'react';
import {havePropsChanged, logMetrics} from './metricsLogger';

export default function withMetrics<P extends object>(Component: any, widgetName: string) {
  return React.memo(
    (props: P) => {
      const previousProps = useRef<P>();

      // Handle mount and unmount events
      useEffect(() => {
        logMetrics({
          widgetName,
          event: 'WIDGET_INITIALIZED',
          props,
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

      // Handle prop updates
      useEffect(() => {
        if (previousProps.current && havePropsChanged(previousProps.current, props)) {
          logMetrics({
            widgetName,
            event: 'WIDGET_PROP_UPDATED',
            props,
            timestamp: Date.now(),
          });
        }
        previousProps.current = props;
      });

      return <Component {...props} />;
    },
    (prevProps, nextProps) => {
      const hasChanged = havePropsChanged(prevProps, nextProps);
      return !hasChanged;
    }
  );
}
