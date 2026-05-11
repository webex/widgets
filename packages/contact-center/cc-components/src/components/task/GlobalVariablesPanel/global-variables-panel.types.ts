import {CADVariable} from '../task.types';

/**
 * Properties for the GlobalVariablesPanel component.
 */
export interface GlobalVariablesPanelProps {
  /**
   * List of agent-viewable global variables to display.
   */
  variables: CADVariable[];

  /**
   * Optional CSS class name for additional styling.
   */
  className?: string;

  /**
   * Layout mode for the variables grid.
   * - `single-column`: one variable per row (used in the inline card)
   * - `two-column`: two variables per row (used in the popover)
   * @default 'single-column'
   */
  layout?: 'single-column' | 'two-column';

  /**
   * CSS background value for the panel container.
   * @default 'var(--mds-color-theme-background-glass-normal)'
   */
  panelBackground?: string;
}
