import fs from 'fs';
import path from 'path';
import {compileString} from 'sass';
import React from 'react';
import {act, fireEvent, render, screen, waitFor} from '@testing-library/react';
import '@testing-library/jest-dom';
import WrapUpSummary from '../../../../../src/components/task/CallControl/CallControlCustom/wrap-up-summary';
import {WrapUpSummaryView} from '../../../../../src/components/task/task.types';
import {AI_ASSISTANT_SUMMARY_MESSAGES as AI_SUMMARY_MESSAGES} from '../../../../../src/components/AIAssistant/AISummary';
import {CLEAR_SEARCH, WRAP_UP_INTERACTION} from '../../../../../src/components/task/constants';

const reasons = [
  {id: 'aux-1', name: 'Resolved'},
  {id: 'aux-2', name: 'Follow up needed'},
  {id: 'aux-3', name: 'Billing question'},
];

const COMPLETE_WRAP_UP_LABEL = 'Complete Wrap-Up';
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
  requestPending: false,
  onEdit: jest.fn().mockReturnValue(true),
  onCopy: jest.fn().mockReturnValue(true),
  onFeedback: jest.fn().mockReturnValue(true),
  onRetry: jest.fn().mockResolvedValue(undefined),
  ...overrides,
});

const pressFocusedReasonKey = (key: string) => {
  const activeElement = document.activeElement;
  if (!(activeElement instanceof HTMLElement)) {
    throw new Error('Expected a focused reason radio');
  }
  fireEvent.keyDown(activeElement, {key});
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

  it('renders named reason search and radio group with the stable complete action', async () => {
    render(
      <WrapUpSummary reasons={reasons} summary={createSummary()} onReasonChange={jest.fn()} onComplete={jest.fn()} />
    );

    expect(screen.getByText(WRAP_UP_INTERACTION)).toBeInTheDocument();
    fireEvent.click(
      await screen.findByRole('button', {
        name: AI_SUMMARY_MESSAGES.editSectionLabel(AI_SUMMARY_MESSAGES.sectionLabels.initialContactReason),
      })
    );
    expect(
      screen.getByRole('textbox', {name: AI_SUMMARY_MESSAGES.sectionLabels.initialContactReason})
    ).not.toBeDisabled();
    expect(screen.getByRole('textbox', {name: AI_SUMMARY_MESSAGES.postCall.reasonSearchLabel})).toHaveAttribute(
      'placeholder',
      AI_SUMMARY_MESSAGES.postCall.searchPlaceholder
    );
    expect(screen.getByRole('radiogroup', {name: REASON_GROUP_NAME})).toBeInTheDocument();
    expect(AI_SUMMARY_MESSAGES.postCall.completeAction).toBe(COMPLETE_WRAP_UP_LABEL);
    const complete = await screen.findByRole('button', {name: COMPLETE_WRAP_UP_LABEL});
    expect(complete).toBeDisabled();
    expect(complete).toHaveTextContent(COMPLETE_WRAP_UP_LABEL);
    expect(complete).toHaveAttribute('title', COMPLETE_WRAP_UP_LABEL);
    expect(screen.getByText(AI_SUMMARY_MESSAGES.sectionLabels.resolution)).toBeInTheDocument();
    expect(screen.getByText('Issue resolved')).toBeInTheDocument();
  });

  it('renders zero-match copy as ordinary visible text without live semantics', () => {
    render(<WrapUpSummary reasons={reasons} onReasonChange={jest.fn()} onComplete={jest.fn()} />);

    fireEvent.change(screen.getByRole('textbox', {name: AI_SUMMARY_MESSAGES.postCall.reasonSearchLabel}), {
      target: {value: 'not a reason'},
    });

    const empty = screen.getByText(AI_SUMMARY_MESSAGES.postCall.noReasonMatches);
    expect(empty).toBeInTheDocument();
    expect(empty).not.toHaveAttribute('role', 'status');
    expect(empty).not.toHaveAttribute('aria-live');
  });

  it('uses the shared clear-search label and clears the reason filter', () => {
    render(<WrapUpSummary reasons={reasons} onReasonChange={jest.fn()} onComplete={jest.fn()} />);
    const search = screen.getByRole('textbox', {name: AI_SUMMARY_MESSAGES.postCall.reasonSearchLabel});
    fireEvent.change(search, {target: {value: 'Billing'}});
    expect(screen.queryByRole('radio', {name: 'Resolved'})).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', {name: CLEAR_SEARCH}));
    expect(search).toHaveValue('');
    expect(screen.getByRole('radio', {name: 'Resolved'})).toBeInTheDocument();
  });

  it('reports each reason the agent moves to with the arrow keys', () => {
    const onReasonChange = jest.fn();
    render(<WrapUpSummary reasons={reasons} onReasonChange={onReasonChange} onComplete={jest.fn()} />);

    const firstReason = screen.getByRole('radio', {name: 'Resolved'});
    act(() => {
      firstReason.focus();
    });
    expect(firstReason).toHaveFocus();

    pressFocusedReasonKey('ArrowDown');
    expect(screen.getByRole('radio', {name: 'Follow up needed'})).toHaveFocus();
    pressFocusedReasonKey('ArrowDown');
    expect(screen.getByRole('radio', {name: 'Billing question'})).toHaveFocus();
    pressFocusedReasonKey('ArrowUp');
    expect(screen.getByRole('radio', {name: 'Follow up needed'})).toHaveFocus();

    expect(onReasonChange).toHaveBeenCalledTimes(3);
    expect(onReasonChange).toHaveBeenLastCalledWith({id: 'aux-2', name: 'Follow up needed'});
  });

  it('should let the agent select a reason while the summary is still generating', () => {
    const onReasonChange = jest.fn();
    const {rerender} = render(
      <WrapUpSummary
        reasons={reasons}
        summary={createSummary({state: 'generating', requestPending: true})}
        onReasonChange={onReasonChange}
        onComplete={jest.fn()}
      />
    );

    const reasonGroup = screen.getByRole('radiogroup', {name: REASON_GROUP_NAME});
    expect(reasonGroup.parentElement).not.toHaveAttribute('aria-disabled');

    fireEvent.click(screen.getByRole('radio', {name: 'Follow up needed'}));
    expect(onReasonChange).toHaveBeenCalledWith({id: 'aux-2', name: 'Follow up needed'});

    rerender(
      <WrapUpSummary
        reasons={reasons}
        summary={createSummary({state: 'generating', requestPending: true})}
        selectedReasonId="aux-2"
        onReasonChange={onReasonChange}
        onComplete={jest.fn()}
      />
    );
    expect(screen.getByRole('radio', {name: 'Follow up needed'})).toBeChecked();
  });

  it('should not hold back Complete Wrap-Up while the summary is generating', async () => {
    const onComplete = jest.fn();
    render(
      <WrapUpSummary
        reasons={reasons}
        summary={createSummary({state: 'generating', requestPending: true})}
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
      requestPending: true,
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

  it('projects the pending feedback description from the shared summary component', () => {
    render(
      <WrapUpSummary
        reasons={reasons}
        summary={createSummary({selectedFeedback: 'thumbs_up'})}
        onReasonChange={jest.fn()}
        onComplete={jest.fn()}
      />
    );

    expect(screen.getByText(AI_SUMMARY_MESSAGES.feedback.pendingSubmission)).toBeInTheDocument();
  });

  it('should keep the reasons and summary read-only while wrap-up completion is in progress', async () => {
    const onComplete = jest.fn();
    const renderPanel = (completionPending: boolean) => (
      <WrapUpSummary
        reasons={reasons}
        summary={createSummary()}
        selectedReasonId="aux-1"
        completionPending={completionPending}
        onReasonChange={jest.fn()}
        onComplete={onComplete}
      />
    );
    const {rerender} = render(renderPanel(false));
    const editInitialReason = await screen.findByRole('button', {
      name: AI_SUMMARY_MESSAGES.editSectionLabel(AI_SUMMARY_MESSAGES.sectionLabels.initialContactReason),
    });
    expect(editInitialReason).not.toBeDisabled();

    rerender(renderPanel(true));

    await waitFor(() => expect(editInitialReason).toBeDisabled());
    expect(screen.getByRole('button', {name: AI_SUMMARY_MESSAGES.like})).toBeDisabled();
    const complete = await screen.findByRole('button', {name: COMPLETE_WRAP_UP_LABEL});
    expect(complete).toBeDisabled();
    fireEvent.click(complete);
    expect(onComplete).not.toHaveBeenCalled();
    expect(screen.getByRole('radiogroup', {name: REASON_GROUP_NAME}).parentElement).toHaveAttribute(
      'aria-disabled',
      'true'
    );

    rerender(renderPanel(false));
    await waitFor(() => expect(editInitialReason).not.toBeDisabled());
  });

  it('restores focus to the wrap-up panel when the summary subtree is removed', async () => {
    const {rerender} = render(
      <WrapUpSummary reasons={reasons} summary={createSummary()} onReasonChange={jest.fn()} onComplete={jest.fn()} />
    );

    const copy = await screen.findByRole('button', {name: AI_SUMMARY_MESSAGES.copySummary});
    act(() => {
      copy.focus();
    });
    expect(copy).toHaveFocus();

    rerender(<WrapUpSummary reasons={reasons} onReasonChange={jest.fn()} onComplete={jest.fn()} />);

    await waitFor(() => expect(screen.getByTestId('wrap-up-summary')).toHaveFocus());
    expect(screen.queryByTestId('wrap-up-summary:body')).not.toBeInTheDocument();
  });

  it('does not recover summary focus after focus has moved to another control', async () => {
    const renderPanel = (showSummary: boolean) => (
      <>
        <WrapUpSummary
          reasons={reasons}
          summary={showSummary ? createSummary() : undefined}
          onReasonChange={jest.fn()}
          onComplete={jest.fn()}
        />
        {showSummary ? <button type="button">Outside control</button> : null}
      </>
    );
    const {rerender} = render(renderPanel(true));
    const copy = await screen.findByRole('button', {name: AI_SUMMARY_MESSAGES.copySummary});
    act(() => copy.focus());
    act(() => screen.getByRole('button', {name: 'Outside control'}).focus());

    rerender(renderPanel(false));

    expect(screen.getByTestId('wrap-up-summary')).not.toHaveFocus();
  });

  it('bounds reason and summary scrolling while keeping panel chrome outside the scroll regions', async () => {
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

      expect(panelStyle.blockSize).toBe('80vh');
      expect(panelStyle.maxBlockSize).toBe('80vh');
      expect(panelStyle.overflow).toBe('visible');
      expect(scrollOwners).toEqual([
        panel.querySelector('.wrap-up-summary__reason-group'),
        screen.getByTestId('ai-summary:content'),
      ]);
      expect(await screen.findByRole('button', {name: COMPLETE_WRAP_UP_LABEL})).toBeInTheDocument();
    } finally {
      removeStyles();
    }
  });
});
