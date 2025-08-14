import React, {useEffect, useRef} from 'react';
import {havePropsChanged, logMetrics} from './metricsLogger';

export default function withMetrics<P extends object>(Component: any, widgetName: string) {
  return React.memo(
    (props: P) => {
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

      // TODO: https://jira-eng-sjc12.cisco.com/jira/browse/CAI-6890 PROPS_UPDATED event

      return <Component {...props} />;
    },
    (prevProps, nextProps) => !havePropsChanged(prevProps, nextProps)
  );
}
