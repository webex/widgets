import fs from 'fs';
import path from 'path';
import {compileString} from 'sass';
import React from 'react';
import {act, fireEvent, render, screen, waitFor} from '@testing-library/react';
import '@testing-library/jest-dom';
import WrapUpSummary from '../../../../../src/components/task/CallControl/CallControlCustom/wrap-up-summary';
import {WrapUpSummaryView} from '../../../../../src/components/task/task.types';
import {AI_ASSISTANT_SUMMARY_MESSAGES as AI_SUMMARY_MESSAGES} from '../../../../../src/components/AIAssistant/AISummary';

const reasons = [
  {id: 'aux-1', name: 'Resolved'},
  {id: 'aux-2', name: 'Follow up needed'},
  {id: 'aux-3', name: 'Billing question'},
];

const COMPLETE_WRAP_UP_LABEL = 'Submit Wrap Up';
const REASON_GROUP_NAME = AI_SUMMARY_MESSAGES.postCall.chooseReason;

const createSummary = (overrides: Partial<WrapUpSummaryView> = {}): WrapUpSummaryView => ({
  state: 'content',
  content: {
    conversationId: 'interaction-main-1',
    sections: {
      initialContactReason: 'Customer asked about billing.',
      keyActionsTaken: 'Send invoice.',
    },
    resolution: 'Issue resolved',
  },
  selectedFeedback: 'none',
  controlsDisabled: false,
  onEdit: jest.fn().mockReturnValue(true),
  onCopy: jest.fn().mockReturnValue(true),
  onFeedback: jest.fn().mockReturnValue(true),
  onRetry: jest.fn().mockResolvedValue(undefined),
  ...overrides,
});

const changeReason = (value: string, label?: string) => {
  const picker = screen.getByTestId('wrap-up-summary:reason-picker');
  fireEvent(picker, new CustomEvent('change', {detail: {value, label}, bubbles: true, composed: true}));
};

const installWrapUpSummaryStyles = (): (() => void) => {
  const style = document.createElement('style');
  const source = fs
    .readFileSync(
      path.resolve(
        __dirname,
        '../../../../../src/components/task/CallControl/CallControlCustom/wrap-up-summary.styles.scss'
      ),
      'utf8'
    )
    .replace(/^\s*\/\/.*$/gm, '');
  style.textContent = compileString(source).css;
  document.head.appendChild(style);
  return () => style.remove();
};

describe('WrapUpSummary', () => {
  beforeEach(() => {
    Object.defineProperty(navigator, 'clipboard', {
      configurable: true,
      value: {writeText: jest.fn().mockResolvedValue(undefined)},
    });
  });

  it('uses the native searchable picker with compact wrap-up copy and no radio list', async () => {
    render(
      <WrapUpSummary reasons={reasons} summary={createSummary()} onReasonChange={jest.fn()} onComplete={jest.fn()} />
    );
    expect(screen.getByText('Wrap Up Reasons')).toBeInTheDocument();
    const picker = screen.getByTestId('wrap-up-summary:reason-picker');
    expect(picker.tagName.toLowerCase()).toBe('mdc-combobox');
    expect((picker as HTMLElement & {placeholder: string}).placeholder).toBe('Search topic');
    expect(picker).toHaveAttribute('data-aria-label', REASON_GROUP_NAME);
    await waitFor(() => {
      const label = picker.shadowRoot?.querySelector('label');
      const input = picker.shadowRoot?.querySelector('input[role="combobox"]');
      expect(label).toHaveTextContent(REASON_GROUP_NAME);
      expect(input).toHaveAttribute('aria-labelledby', label?.id);
      expect(picker.shadowRoot?.getElementById(label?.htmlFor ?? '')).toBeInstanceOf(HTMLInputElement);
    });
    expect(picker.querySelectorAll('mdc-selectlistbox > mdc-option')).toHaveLength(3);
    expect(screen.queryByRole('radiogroup')).not.toBeInTheDocument();
    expect(await screen.findByRole('button', {name: COMPLETE_WRAP_UP_LABEL})).toBeDisabled();
    expect(screen.getByText('Choose a code, and click the summary to edit it if needed.')).toBeInTheDocument();
    expect(screen.queryByTestId('wrap-up-summary:suggestions')).not.toBeInTheDocument();
  });

  it('clears selection when typing and accepts only configured IDs from picker events', async () => {
    const onComplete = jest.fn();
    const onReasonChange = jest.fn();
    const Harness = () => {
      const [selectedReasonId, setSelectedReasonId] = React.useState('aux-1');
      return (
        <WrapUpSummary
          reasons={reasons}
          selectedReasonId={selectedReasonId}
          onReasonChange={(reason) => {
            onReasonChange(reason);
            setSelectedReasonId(reason.id);
          }}
          onComplete={onComplete}
        />
      );
    };
    render(<Harness />);
    const complete = await screen.findByRole('button', {name: COMPLETE_WRAP_UP_LABEL});
    await waitFor(() => expect(complete).not.toBeDisabled());
    fireEvent(
      screen.getByTestId('wrap-up-summary:reason-picker'),
      new CustomEvent('input', {detail: {value: 'Billing'}, bubbles: true, composed: true})
    );
    expect(onReasonChange).toHaveBeenLastCalledWith({id: '', name: ''});
    await waitFor(() => expect(complete).toBeDisabled());
    changeReason('not-configured', 'Resolved');
    expect(complete).toBeDisabled();
    changeReason('aux-3', 'Untrusted event label');
    expect(onReasonChange).toHaveBeenLastCalledWith(reasons[2]);
    await waitFor(() => expect(complete).not.toBeDisabled());
    fireEvent.click(complete);
    expect(onComplete).toHaveBeenCalledWith(reasons[2]);
  });

  it('selects SDK suggested chips by known code, hides them after selection, and does not submit immediately', async () => {
    const onComplete = jest.fn();
    const onReasonChange = jest.fn();
    const suggestionSummary = createSummary({
      content: {
        ...createSummary().content,
        suggestedWrapUpCodes: [{name: 'Billing question'}, {name: 'Unknown reason'}, {name: 'Billing question'}],
        suggestedWrapUpCodesMessage: 'No suitable suggestion is available.',
      },
    });
    const Harness = () => {
      const [selectedReasonId, setSelectedReasonId] = React.useState<string>();
      return (
        <WrapUpSummary
          reasons={reasons}
          summary={suggestionSummary}
          selectedReasonId={selectedReasonId}
          onReasonChange={(reason) => {
            onReasonChange(reason);
            setSelectedReasonId(reason.id);
          }}
          onComplete={onComplete}
        />
      );
    };
    render(<Harness />);
    const chips = await screen.findByTestId('wrap-up-summary:suggestions');
    expect(chips.querySelectorAll('mdc-chip')).toHaveLength(1);
    expect(chips.querySelector('mdc-filterchip, mdc-staticchip')).toBeNull();
    expect(screen.queryByText('No suitable suggestion is available.')).not.toBeInTheDocument();
    const chip = chips.querySelector('mdc-chip') as HTMLElement;
    await waitFor(() => expect(chip).toHaveAttribute('icon-name', 'plus-bold'));
    expect(chip).toHaveAttribute('role', 'button');
    fireEvent.click(chip);
    expect(onReasonChange).toHaveBeenCalledWith(reasons[2]);
    expect(onComplete).not.toHaveBeenCalled();
    expect(screen.queryByTestId('wrap-up-summary:suggestions')).not.toBeInTheDocument();
    const complete = await screen.findByRole('button', {name: COMPLETE_WRAP_UP_LABEL});
    await waitFor(() => expect(complete).not.toBeDisabled());
    fireEvent.click(complete);
    expect(onComplete).toHaveBeenCalledWith(reasons[2]);
  });

  it('shows the backend no-suggestion message as a noninteractive chip for unknown IDs or ambiguous names', async () => {
    const onReasonChange = jest.fn();
    const onComplete = jest.fn();
    render(
      <WrapUpSummary
        reasons={[...reasons, {id: 'aux-4', name: 'Resolved'}]}
        summary={createSummary({
          content: {
            ...createSummary().content,
            suggestedWrapUpCodes: [{name: 'Resolved'}, {id: 'unknown', name: 'Billing question'}],
            suggestedWrapUpCodesMessage: 'No suitable suggestion is available.',
          },
        })}
        onReasonChange={onReasonChange}
        onComplete={onComplete}
      />
    );
    const row = screen.getByTestId('wrap-up-summary:suggestions');
    expect(row.querySelector('mdc-chip, mdc-filterchip')).toBeNull();
    const infoChip = row.querySelector('mdc-staticchip') as HTMLElement;
    expect(infoChip).not.toBeNull();
    expect(infoChip).toHaveAttribute('icon-name', 'dnd-presence-filled');
    expect(infoChip).not.toHaveAttribute('role', 'button');
    expect(infoChip).not.toHaveAttribute('tabindex', '0');
    await waitFor(() =>
      expect(infoChip.shadowRoot?.querySelector('[part="label"]')).toHaveTextContent(
        'No suitable suggestion is available.'
      )
    );

    fireEvent.click(infoChip);
    fireEvent.keyDown(infoChip, {key: 'Enter', code: 'Enter'});
    fireEvent.keyDown(infoChip, {key: ' ', code: 'Space'});
    expect(onReasonChange).not.toHaveBeenCalled();
    expect(onComplete).not.toHaveBeenCalled();
    expect(await screen.findByRole('button', {name: COMPLETE_WRAP_UP_LABEL})).toBeDisabled();
  });

  it('does not clear a picker selection when Momentum emits its preceding input event', () => {
    const onReasonChange = jest.fn();
    render(<WrapUpSummary reasons={reasons} onReasonChange={onReasonChange} onComplete={jest.fn()} />);
    fireEvent(
      screen.getByTestId('wrap-up-summary:reason-picker'),
      new CustomEvent('input', {detail: {value: 'aux-2', label: 'Follow up needed'}, bubbles: true, composed: true})
    );
    expect(onReasonChange).not.toHaveBeenCalled();
    changeReason('aux-2', 'Follow up needed');
    expect(onReasonChange).toHaveBeenCalledWith(reasons[1]);
  });

  it('retains the first typed search character after a selected reason and blocks stale submission', async () => {
    const onComplete = jest.fn();
    const Harness = () => {
      const [selectedReasonId, setSelectedReasonId] = React.useState('aux-1');
      return (
        <WrapUpSummary
          reasons={reasons}
          selectedReasonId={selectedReasonId}
          onReasonChange={(reason) => setSelectedReasonId(reason.id)}
          onComplete={onComplete}
        />
      );
    };
    render(<Harness />);
    const picker = screen.getByTestId('wrap-up-summary:reason-picker');
    const input = await waitFor(() => {
      const nativeInput = picker.shadowRoot?.querySelector<HTMLInputElement>('input[role="combobox"]');
      expect(nativeInput).toHaveValue('Resolved');
      return nativeInput as HTMLInputElement;
    });
    fireEvent.input(input, {target: {value: 'B'}, composed: true});
    await waitFor(() => expect(input).toHaveValue('B'));
    await act(async () => {
      await Promise.resolve();
    });
    expect(input).toHaveValue('B');
    const complete = await screen.findByRole('button', {name: COMPLETE_WRAP_UP_LABEL});
    expect(complete).toBeDisabled();
    fireEvent.click(complete);
    expect(onComplete).not.toHaveBeenCalled();
  });

  it('projects controlled reason changes into the native picker outside a search', async () => {
    const renderPanel = (selectedReasonId?: string) => (
      <WrapUpSummary
        reasons={reasons}
        selectedReasonId={selectedReasonId}
        onReasonChange={jest.fn()}
        onComplete={jest.fn()}
      />
    );
    const {rerender} = render(renderPanel('aux-1'));
    const picker = screen.getByTestId('wrap-up-summary:reason-picker');
    const input = await waitFor(() => {
      const nativeInput = picker.shadowRoot?.querySelector<HTMLInputElement>('input[role="combobox"]');
      expect(nativeInput).toHaveValue('Resolved');
      return nativeInput as HTMLInputElement;
    });

    rerender(renderPanel('aux-2'));
    await waitFor(() => expect(input).toHaveValue('Follow up needed'));

    rerender(renderPanel());
    await waitFor(() => expect(input).toHaveValue(''));
    expect(await screen.findByRole('button', {name: COMPLETE_WRAP_UP_LABEL})).toBeDisabled();
  });

  it('lets Momentum handle keyboard reason selection using the configured option ID', async () => {
    const onReasonChange = jest.fn();
    render(<WrapUpSummary reasons={reasons} onReasonChange={onReasonChange} onComplete={jest.fn()} />);
    const picker = screen.getByTestId('wrap-up-summary:reason-picker');
    const input = await waitFor(() => {
      const nativeInput = picker.shadowRoot?.querySelector<HTMLInputElement>('input[role="combobox"]');
      expect(nativeInput).toBeInstanceOf(HTMLInputElement);
      expect(picker.querySelector('mdc-option')).toHaveAttribute('aria-selected', 'false');
      return nativeInput as HTMLInputElement;
    });
    fireEvent.keyDown(input, {key: 'ArrowDown', code: 'ArrowDown'});
    fireEvent.keyDown(input, {key: 'Enter', code: 'Enter'});
    await waitFor(() => expect(onReasonChange).toHaveBeenCalledWith(reasons[0]));
  });

  it('should not hold back Complete Wrap-Up while the summary is generating', async () => {
    const onComplete = jest.fn();
    render(
      <WrapUpSummary
        reasons={reasons}
        summary={createSummary({state: 'generating', controlsDisabled: true})}
        selectedReasonId="aux-1"
        onReasonChange={jest.fn()}
        onComplete={onComplete}
      />
    );

    fireEvent.click(await screen.findByRole('button', {name: COMPLETE_WRAP_UP_LABEL}));
    expect(onComplete).toHaveBeenCalledWith({id: 'aux-1', name: 'Resolved'});
  });

  it('keeps a retained draft completable during regeneration without rendering an absent Outcome', async () => {
    const onComplete = jest.fn();
    const retainedDraft = createSummary({
      controlsDisabled: true,
      content: {
        conversationId: 'interaction-main-1',
        sections: {
          initialContactReason: 'Edited summary survives.',
          nextSteps: 'Call back tomorrow.',
        },
        resolution: undefined,
      },
    });
    render(
      <WrapUpSummary
        reasons={reasons}
        summary={retainedDraft}
        selectedReasonId="aux-1"
        onReasonChange={jest.fn()}
        onComplete={onComplete}
      />
    );

    expect(screen.queryByText(AI_SUMMARY_MESSAGES.sectionLabels.resolution)).not.toBeInTheDocument();
    expect(screen.getByText('Edited summary survives.')).toBeInTheDocument();
    const complete = await screen.findByRole('button', {name: COMPLETE_WRAP_UP_LABEL});
    expect(complete).not.toBeDisabled();

    fireEvent.click(complete);
    expect(onComplete).toHaveBeenCalledWith({id: 'aux-1', name: 'Resolved'});
  });

  it('projects the selected native feedback control from the shared summary component', async () => {
    render(
      <WrapUpSummary
        reasons={reasons}
        summary={createSummary({selectedFeedback: 'thumbs_up'})}
        onReasonChange={jest.fn()}
        onComplete={jest.fn()}
      />
    );

    expect(await screen.findByRole('button', {name: AI_SUMMARY_MESSAGES.like})).toHaveAttribute('aria-pressed', 'true');
  });

  it('keeps reason selection and wrap-up available when summary controls are disabled', async () => {
    const onReasonChange = jest.fn();
    const onComplete = jest.fn();
    render(
      <WrapUpSummary
        reasons={reasons}
        summary={createSummary({controlsDisabled: true})}
        selectedReasonId="aux-1"
        onReasonChange={onReasonChange}
        onComplete={onComplete}
      />
    );

    expect(await screen.findByRole('button', {name: AI_SUMMARY_MESSAGES.editSummary})).toBeDisabled();
    expect(screen.getByTestId('wrap-up-summary:reason-picker')).not.toHaveAttribute('disabled');
    const complete = await screen.findByRole('button', {name: COMPLETE_WRAP_UP_LABEL});
    expect(complete).not.toBeDisabled();
    fireEvent.click(complete);
    expect(onComplete).toHaveBeenCalledWith(reasons[0]);
    changeReason('aux-2');
    expect(onReasonChange).toHaveBeenCalledWith(reasons[1]);
  });

  it('preserves the native reason picker and selected reason when the summary is removed', async () => {
    const renderPanel = (showSummary: boolean) => (
      <WrapUpSummary
        reasons={reasons}
        summary={showSummary ? createSummary() : undefined}
        selectedReasonId="aux-1"
        onReasonChange={jest.fn()}
        onComplete={jest.fn()}
      />
    );
    const {rerender} = render(renderPanel(true));
    const picker = screen.getByTestId('wrap-up-summary:reason-picker');
    const input = await waitFor(() => {
      const nativeInput = picker.shadowRoot?.querySelector<HTMLInputElement>('input[role="combobox"]');
      expect(nativeInput).toHaveValue('Resolved');
      return nativeInput as HTMLInputElement;
    });

    rerender(renderPanel(false));

    expect(screen.getByTestId('wrap-up-summary:reason-picker')).toBe(picker);
    expect(input).toHaveValue('Resolved');
    expect(await screen.findByRole('button', {name: COMPLETE_WRAP_UP_LABEL})).not.toBeDisabled();
    expect(screen.queryByTestId('wrap-up-summary:body')).not.toBeInTheDocument();
  });

  it('bounds panel and summary scrolling while keeping Submit Wrap Up outside both scroll regions', async () => {
    const removeStyles = installWrapUpSummaryStyles();
    try {
      const manyReasons = Array.from({length: 12}, (_, index) => ({
        id: `aux-${index + 1}`,
        name: `Detailed wrap-up reason ${index + 1}`,
      }));
      render(
        <div style={{width: '320px'}}>
          <WrapUpSummary
            reasons={manyReasons}
            summary={createSummary({
              content: {
                conversationId: 'interaction-main-1',
                sections: {
                  initialContactReason:
                    'A long retained summary paragraph that wraps inside the bounded content scroll region.',
                  keyActionsTaken: 'Send corrected invoice, document the call, and schedule a follow-up.',
                },
                resolution: 'Resolved with billing adjustment.',
              },
            })}
            onReasonChange={jest.fn()}
            onComplete={jest.fn()}
          />
        </div>
      );

      const panel = screen.getByTestId('wrap-up-summary');
      const panelStyle = getComputedStyle(panel);
      const scrollOwners = [panel, ...Array.from(panel.querySelectorAll<HTMLElement>('*'))].filter((element) => {
        const overflowY = getComputedStyle(element).overflowY;
        return overflowY === 'auto' || overflowY === 'scroll';
      });

      expect(panelStyle.maxBlockSize).toBe('80vh');
      expect(scrollOwners).toEqual([
        screen.getByTestId('wrap-up-summary:scroll-content'),
        screen.getByTestId('ai-summary:content'),
      ]);
      const submit = await screen.findByRole('button', {name: COMPLETE_WRAP_UP_LABEL});
      expect(panel).toContainElement(submit);
      expect(getComputedStyle(submit).alignSelf).toBe('flex-end');
      expect(getComputedStyle(submit).flexShrink).toBe('0');
      scrollOwners.forEach((scrollOwner) => expect(scrollOwner).not.toContainElement(submit));
    } finally {
      removeStyles();
    }
  });
});
