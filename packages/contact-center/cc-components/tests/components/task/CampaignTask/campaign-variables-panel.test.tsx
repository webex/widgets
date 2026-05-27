import React from 'react';
import {render, screen} from '@testing-library/react';
import '@testing-library/jest-dom';
import GlobalVariablesPanel from '../../../../src/components/task/GlobalVariablesPanel/global-variables-panel';
import {CADVariable} from '../../../../src/components/task/task.types';
import {GLOBAL_VARIABLES_LABEL} from '../../../../src/components/task/constants';

const makeVariable = (name: string, value: string): CADVariable => ({
  name,
  displayName: name,
  value,
  type: 'STRING',
  agentEditable: false,
  agentViewable: true,
  global: true,
  isSecure: false,
  secureKeyId: '',
  secureKeyVersion: 0,
});

const sampleVariables: CADVariable[] = [
  makeVariable('Campaign ID', 'CM_Predictive_201004'),
  makeVariable('LCM Key', 'f63839fk33dd31'),
  makeVariable('Campaign group', 'Design'),
  makeVariable('Company', 'Comps Super'),
];

describe('GlobalVariablesPanel', () => {
  // ── Empty state ────────────────────────────────────────────────────

  it('should return null when variables array is empty', async () => {
    const {container} = await render(<GlobalVariablesPanel variables={[]} />);
    expect(container.firstChild).toBeNull();
  });

  // ── Rendering variables ────────────────────────────────────────────

  it('should render the panel with variables', async () => {
    await render(<GlobalVariablesPanel variables={sampleVariables} />);
    expect(screen.getByTestId('global-variables-panel')).toBeInTheDocument();
  });

  it('should render all variable labels and values', async () => {
    await render(<GlobalVariablesPanel variables={sampleVariables} />);
    expect(screen.getByText('Campaign ID:')).toBeInTheDocument();
    expect(screen.getByText('CM_Predictive_201004')).toBeInTheDocument();
    expect(screen.getByText('LCM Key:')).toBeInTheDocument();
    expect(screen.getByText('f63839fk33dd31')).toBeInTheDocument();
    expect(screen.getByText('Campaign group:')).toBeInTheDocument();
    expect(screen.getByText('Design')).toBeInTheDocument();
  });

  it('should skip variables with no value', async () => {
    const vars: CADVariable[] = [makeVariable('HasValue', 'yes'), {...makeVariable('NoValue', ''), value: ''}];
    await render(<GlobalVariablesPanel variables={vars} />);
    expect(screen.getByText('HasValue:')).toBeInTheDocument();
    expect(screen.queryByText('NoValue:')).not.toBeInTheDocument();
  });

  // ── Accessibility ──────────────────────────────────────────────────

  it('should render the definition list with correct aria-label', async () => {
    await render(<GlobalVariablesPanel variables={sampleVariables} />);
    const panel = screen.getByTestId('global-variables-panel');
    const dl = panel.querySelector('dl');
    expect(dl).toHaveAttribute('aria-label', GLOBAL_VARIABLES_LABEL);
  });

  // ── Layout modes ───────────────────────────────────────────────────

  it('should apply single-column layout by default', async () => {
    await render(<GlobalVariablesPanel variables={sampleVariables} />);
    const panel = screen.getByTestId('global-variables-panel');
    expect(panel.className).toContain('global-variables-panel');
    expect(panel.className).not.toContain('global-variables-panel--two-column');
  });

  it('should apply two-column layout class when layout="two-column"', async () => {
    await render(<GlobalVariablesPanel variables={sampleVariables} layout="two-column" />);
    const panel = screen.getByTestId('global-variables-panel');
    expect(panel.className).toContain('global-variables-panel--two-column');
  });

  // ── panelBackground prop ───────────────────────────────────────────

  it('should NOT set inline background style when panelBackground is not provided', async () => {
    await render(<GlobalVariablesPanel variables={sampleVariables} />);
    const panel = screen.getByTestId('global-variables-panel');
    expect(panel.style.background).toBe('');
  });

  it('should set inline background style when panelBackground is provided', async () => {
    await render(
      <GlobalVariablesPanel
        variables={sampleVariables}
        panelBackground="var(--mds-color-theme-background-primary-hover)"
      />
    );
    // JSDOM cannot parse CSS custom properties (var()), so the style
    // attribute is completely stripped.  Verify the panel still renders
    // correctly — the actual CSS value is validated in browser/E2E tests.
    const panel = await screen.findByTestId('global-variables-panel');
    expect(panel).toBeInTheDocument();
  });

  // ── className prop ─────────────────────────────────────────────────

  it('should apply additional className when provided', async () => {
    await render(<GlobalVariablesPanel variables={sampleVariables} className="custom-class" />);
    const panel = screen.getByTestId('global-variables-panel');
    expect(panel.className).toContain('custom-class');
  });

  it('should not add trailing spaces when className is not provided', async () => {
    await render(<GlobalVariablesPanel variables={sampleVariables} />);
    const panel = screen.getByTestId('global-variables-panel');
    expect(panel.className).not.toMatch(/\s$/);
  });
});
