import React from 'react';
import {Text} from '@momentum-design/components/dist/react';
import {GlobalVariablesPanelProps} from '../task.types';
import {GLOBAL_VARIABLES_LABEL} from '../constants';
import './global-variables-panel.style.scss';

/**
 * GlobalVariablesPanel renders agent-viewable global variables in a scrollable
 * glass overlay panel.  Used by CampaignTask (inline card),
 * CampaignTaskPopover (hover popover), and CallControlCAD.
 *
 * Supports two layout modes:
 *  - `single-column` (default) — one variable per row
 *  - `two-column` — two variables per row (matching the Figma popover design)
 */
const GlobalVariablesPanel: React.FC<GlobalVariablesPanelProps> = ({
  variables,
  className,
  layout = 'single-column',
  panelBackground,
}) => {
  if (variables.length === 0) {
    return null;
  }

  const layoutClass = layout === 'two-column' ? 'global-variables-panel--two-column' : '';
  const panelStyle = panelBackground ? {background: panelBackground} : undefined;

  return (
    <div
      className={`global-variables-panel ${layoutClass} ${className ?? ''}`.trim()}
      style={panelStyle}
      data-testid="global-variables-panel"
    >
      <dl className="global-variables-panel__list" aria-label={GLOBAL_VARIABLES_LABEL}>
        {variables.map((variable) =>
          variable.value ? (
            <div key={variable.name} className="global-variables-panel__row">
              <dt>
                <Text type="body-midsize-bold" className="global-variables-panel__label">
                  {variable.displayName || variable.name}:
                </Text>
              </dt>
              <dd>
                <Text type="body-midsize-regular" className="global-variables-panel__value">
                  {variable.value}
                </Text>
              </dd>
            </div>
          ) : null
        )}
      </dl>
    </div>
  );
};

export default GlobalVariablesPanel;
