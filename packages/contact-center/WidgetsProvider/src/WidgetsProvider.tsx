import React, {ReactNode, useEffect} from 'react';
import {ThemeProvider, IconProvider} from '@momentum-design/components/dist/react';
import {MetricsProvider, useMetrics} from './MetricsContext';
import {sendWidgetEvent} from './metricsLogger';

export interface WidgetsProviderProps {
  children: ReactNode;
  themeclass?: string;
  iconSet?: string;
  enableMetrics?: boolean;
}

// Create a wrapper component that has access to the metrics context
const WidgetDetector: React.FC<{enableMetrics: boolean}> = ({enableMetrics}) => {
  const {refreshMetrics} = useMetrics();

  useEffect(() => {
    if (enableMetrics) {
      const detectedWidgets = new Set<HTMLElement>();

      const detectWidgets = () => {
        console.log('[WidgetsProvider] Detecting widgets...');
        const widgets = document.querySelectorAll('[data-widget-id]');
        widgets.forEach((widget) => {
          if (!detectedWidgets.has(widget as HTMLElement)) {
            detectedWidgets.add(widget as HTMLElement);
            const widgetId = (widget as HTMLElement).getAttribute('data-widget-id');
            if (widgetId) {
              sendWidgetEvent(widgetId, 'WIDGET_DETECTED');
            }
          } else {
            const widgetId = (widget as HTMLElement).getAttribute('data-widget-id');
            if (widgetId) {
              const props = Array.from(widget.attributes).reduce((acc, attr) => {
                acc[attr.name] = attr.value;
                return acc;
              }, {});
              sendWidgetEvent(widgetId, 'WIDGET_PROP_UPDATED', props);
            }
          }
        });
      };

      const observer = new MutationObserver((mutations) => {
        console.log('[WidgetsProvider] Mutation detected, checking for widgets...', mutations);
        mutations.forEach((mutation) => {
          mutation.removedNodes.forEach((node) => {
            if (node instanceof HTMLElement) {
              const traverseAndRemoveWidgets = (element: HTMLElement) => {
                const widgetId = element.getAttribute('data-widget-id');
                if (widgetId && detectedWidgets.has(element)) {
                  console.log('[WidgetsProvider] Widget removed:', element);
                  detectedWidgets.delete(element);
                  sendWidgetEvent(widgetId, 'WIDGET_UNMOUNTED');
                }
                element.querySelectorAll('[data-widget-id]').forEach((child) => {
                  traverseAndRemoveWidgets(child as HTMLElement);
                });
              };
              traverseAndRemoveWidgets(node);
            }
          });
        });
        detectWidgets();
      });

      observer.observe(document.body, {childList: true, subtree: true});
      refreshMetrics();
    }
  }, [enableMetrics]);

  return null; // This component doesn't render anything
};

const WidgetsProvider: React.FC<WidgetsProviderProps> = ({
  children,
  themeclass = 'mds-theme-stable-lightWebex',
  iconSet = 'momentum-icons',
  enableMetrics = true,
}) => {
  const content = (
    <ThemeProvider themeclass={themeclass}>
      <IconProvider iconSet={iconSet as any}>{children}</IconProvider>
    </ThemeProvider>
  );

  if (enableMetrics) {
    return (
      <MetricsProvider>
        <WidgetDetector enableMetrics={enableMetrics} />
        {content}
      </MetricsProvider>
    );
  }

  return content;
};

export default WidgetsProvider;
