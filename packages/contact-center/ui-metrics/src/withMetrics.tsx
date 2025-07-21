import React, {useEffect, useRef} from 'react';
import {havePropsChanged, logMetrics} from './metricsLogger';

export default function withMetrics<P extends object>(Component: any, widgetName: string) {
  return React.memo(
    (props: P) => {
      const previousProps = useRef<P>();

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

      return <Component {...props} />;
    },
    (prevProps, nextProps) => !havePropsChanged(prevProps, nextProps)
  );
}
