import fs from 'fs';
import path from 'path';
import {compileString} from 'sass';
import React from 'react';
import {act, fireEvent, render, screen, waitFor} from '@testing-library/react';
import '@testing-library/jest-dom';
import WrapUpSummary from '../../../../../src/components/task/CallControl/CallControlCustom/wrap-up-summary';
import {WrapUpSummaryView} from '../../../../../src/components/task/CallControl/CallControlCustom/wrap-up-summary.types';
import {AI_SUMMARY_MESSAGES} from '../../../../../src/components/AISummary';
import {CLEAR_SEARCH} from '../../../../../src/components/task/constants';

const reasons = [
  {id: 'aux-1', name: 'Resolved'},
  {id: 'aux-2', name: 'Follow up needed'},
  {id: 'aux-3', name: 'Billing question'},
];

const COMPLETE_WRAP_UP_LABEL = 'Complete Wrap-Up';
const REASON_GROUP_NAME = AI_SUMMARY_MESSAGES.postCall.chooseReason;

const deferred = <T,>() => {
  let resolve!: (value: T) => void;
  let reject!: (reason?: unknown) => void;
  const promise = new Promise<T>((promiseResolve, promiseReject) => {
    resolve = promiseResolve;
    reject = promiseReject;
  });
  return {promise, resolve, reject};
};

const createSummary = (overrides: Partial<WrapUpSummaryView> = {}): WrapUpSummaryView => ({
  state: 'content',
  content: {
    type: 'sections',
    sections: [
      {key: 'initialContactReason', value: 'Customer asked about billing.', editable: true},
      {key: 'keyActionsTaken', value: 'Send invoice.', editable: true},
    ],
    resolution: 'Issue resolved',
  },
  contentRevision: 6,
  selectedFeedback: 'none',
  feedbackStatus: undefined,
  requestPending: false,
  onEdit: jest.fn().mockReturnValue(true),
  onCopy: jest.fn().mockReturnValue(true),
  onFeedback: jest.fn().mockReturnValue(true),
  onRetry: jest.fn().mockResolvedValue({outcome: 'blocked'}),
  onCopyVisualStateChange: jest.fn(),
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

  it('renders named reason search and radio group with the stable complete action', () => {
    const onReasonCommit = jest.fn();
    const onComplete = jest.fn();
    render(
      <WrapUpSummary
        reasons={reasons}
        summary={createSummary()}
        onReasonCommit={onReasonCommit}
        onComplete={onComplete}
      />
    );

    // A generated structured summary is still editable when the reasons collapse.
    expect(screen.getByText(AI_SUMMARY_MESSAGES.postCall.eyebrow)).toBeInTheDocument();
    fireEvent.click(
      screen.getByRole('button', {
        name: AI_SUMMARY_MESSAGES.editSectionLabel(AI_SUMMARY_MESSAGES.sectionLabels.initialContactReason),
      })
    );
    expect(
      screen.getByRole('textbox', {name: AI_SUMMARY_MESSAGES.sectionLabels.initialContactReason})
    ).not.toBeDisabled();
    fireEvent.click(screen.getByRole('button', {name: AI_SUMMARY_MESSAGES.postCall.reasonSearchLabel}));
    expect(screen.getByRole('textbox', {name: AI_SUMMARY_MESSAGES.postCall.reasonSearchLabel})).toHaveAttribute(
      'placeholder',
      AI_SUMMARY_MESSAGES.postCall.searchPlaceholder
    );
    expect(screen.getByRole('radiogroup', {name: REASON_GROUP_NAME})).toBeInTheDocument();
    expect(AI_SUMMARY_MESSAGES.postCall.completeAction).toBe(COMPLETE_WRAP_UP_LABEL);
    const complete = screen.getByRole('button', {name: COMPLETE_WRAP_UP_LABEL});
    expect(complete).toBeDisabled();
    expect(complete).toHaveTextContent(COMPLETE_WRAP_UP_LABEL);
    expect(complete).toHaveAttribute('title', COMPLETE_WRAP_UP_LABEL);
    expect(screen.getByText(AI_SUMMARY_MESSAGES.sectionLabels.resolution)).toBeInTheDocument();
    expect(screen.getByText('Issue resolved')).toBeInTheDocument();
  });

  it('renders zero-match copy as ordinary visible text without live semantics', () => {
    render(<WrapUpSummary reasons={reasons} onReasonCommit={jest.fn()} onComplete={jest.fn()} />);

    fireEvent.change(screen.getByRole('textbox', {name: AI_SUMMARY_MESSAGES.postCall.reasonSearchLabel}), {
      target: {value: 'not a reason'},
    });

    const empty = screen.getByText(AI_SUMMARY_MESSAGES.postCall.noReasonMatches);
    expect(empty).toBeInTheDocument();
    expect(empty).not.toHaveAttribute('role', 'status');
    expect(empty).not.toHaveAttribute('aria-live');
  });

  it('uses the shared clear-search label and clears the reason filter', () => {
    render(<WrapUpSummary reasons={reasons} onReasonCommit={jest.fn()} onComplete={jest.fn()} />);
    const search = screen.getByRole('textbox', {name: AI_SUMMARY_MESSAGES.postCall.reasonSearchLabel});
    fireEvent.change(search, {target: {value: 'Billing'}});
    expect(screen.queryByRole('radio', {name: 'Resolved'})).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', {name: CLEAR_SEARCH}));
    expect(search).toHaveValue('');
    expect(screen.getByRole('radio', {name: 'Resolved'})).toBeInTheDocument();
  });

  it('records post-call reveals but does not count accepted local edits as additional views', () => {
    const onViewed = jest.fn().mockReturnValue(true);
    const initial = createSummary({content: {type: 'text', summaryText: 'Initial summary'}});
    let publish: React.Dispatch<React.SetStateAction<typeof initial>> = () => undefined;
    const Harness = () => {
      const [summary, setSummary] = React.useState(initial);
      publish = setSummary;
      const summaryWithTracking = {
        ...summary,
        onViewed,
        onEdit: (field: Parameters<WrapUpSummaryView['onEdit']>[0], revision: number) => {
          setSummary({...summary, contentRevision: revision + 1, content: {type: 'text', summaryText: field.value}});
          return true;
        },
      };
      return (
        <WrapUpSummary
          reasons={reasons}
          summary={summaryWithTracking}
          onReasonCommit={jest.fn()}
          onComplete={jest.fn()}
        />
      );
    };
    const view = render(<Harness />);
    expect(onViewed.mock.calls).toEqual([[6]]);
    fireEvent.change(screen.getByRole('textbox', {name: AI_SUMMARY_MESSAGES.plainSummary}), {
      target: {value: 'Local edit'},
    });
    expect(onViewed.mock.calls).toEqual([[6]]);
    act(() => publish({...initial, contentRevision: 8, state: 'generating'}));
    expect(onViewed.mock.calls).toEqual([[6]]);
    act(() => publish({...initial, contentRevision: 9, content: {type: 'text', summaryText: 'New generated summary'}}));
    expect(onViewed.mock.calls).toEqual([[6], [9]]);
    view.unmount();
    render(<Harness />);
    expect(onViewed.mock.calls).toEqual([[6], [9], [6]]);
  });

  it('does not suppress a generated revision after a rejected edit', () => {
    const onViewed = jest.fn().mockReturnValue(true);
    const summary = {
      ...createSummary({content: {type: 'text', summaryText: 'Initial'}}),
      onViewed,
      onEdit: jest.fn().mockReturnValue(false),
    };
    const props = {reasons, onReasonCommit: jest.fn(), onComplete: jest.fn()};
    const {rerender} = render(<WrapUpSummary {...props} summary={summary} />);
    fireEvent.change(screen.getByRole('textbox', {name: AI_SUMMARY_MESSAGES.plainSummary}), {
      target: {value: 'Rejected'},
    });
    expect(summary.onEdit).toHaveBeenCalledWith({key: 'summaryText', value: 'Rejected'}, 6);
    rerender(
      <WrapUpSummary
        {...props}
        summary={{...summary, contentRevision: 7, content: {type: 'text', summaryText: 'Generated'}}}
      />
    );
    expect(onViewed.mock.calls).toEqual([[6], [7]]);
  });

  it('commits only the final selected reason after roving-focus arrow traversal and blur', () => {
    const onReasonChange = jest.fn();
    const onReasonCommit = jest.fn();
    render(
      <WrapUpSummary
        reasons={reasons}
        onReasonChange={onReasonChange}
        onReasonCommit={onReasonCommit}
        onComplete={jest.fn()}
      />
    );

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
    fireEvent.blur(screen.getByRole('radiogroup', {name: REASON_GROUP_NAME}), {
      relatedTarget: null,
    });

    expect(onReasonChange).toHaveBeenCalledTimes(3);
    expect(onReasonCommit).toHaveBeenCalledTimes(1);
    expect(onReasonCommit).toHaveBeenLastCalledWith({id: 'aux-2', name: 'Follow up needed'}, 3);
  });

  it('commits pointer and activation-key selections once', () => {
    const onReasonCommit = jest.fn();
    render(<WrapUpSummary reasons={reasons} onReasonCommit={onReasonCommit} onComplete={jest.fn()} />);

    fireEvent.click(screen.getByRole('radio', {name: 'Follow up needed'}));
    fireEvent.blur(screen.getByRole('radiogroup', {name: REASON_GROUP_NAME}), {
      relatedTarget: null,
    });
    expect(onReasonCommit).toHaveBeenCalledTimes(1);
    expect(onReasonCommit).toHaveBeenLastCalledWith({id: 'aux-2', name: 'Follow up needed'}, 1);

    const billing = screen.getByRole('radio', {name: 'Billing question'});
    act(() => {
      billing.focus();
    });
    pressFocusedReasonKey('Enter');
    fireEvent.blur(screen.getByRole('radiogroup', {name: REASON_GROUP_NAME}), {
      relatedTarget: null,
    });
    expect(onReasonCommit).toHaveBeenCalledTimes(2);
    expect(onReasonCommit).toHaveBeenLastCalledWith({id: 'aux-3', name: 'Billing question'}, 2);

    const resolved = screen.getByRole('radio', {name: 'Resolved'});
    act(() => {
      resolved.focus();
    });
    pressFocusedReasonKey(' ');
    fireEvent.blur(screen.getByRole('radiogroup', {name: REASON_GROUP_NAME}), {
      relatedTarget: null,
    });
    expect(onReasonCommit).toHaveBeenCalledTimes(3);
    expect(onReasonCommit).toHaveBeenLastCalledWith({id: 'aux-1', name: 'Resolved'}, 3);
  });

  it('blocks reason selection and commits while a summary request is pending without dropping focus', () => {
    const onReasonChange = jest.fn();
    const onReasonCommit = jest.fn();
    render(
      <WrapUpSummary
        reasons={reasons}
        summary={createSummary({state: 'generating', requestPending: true})}
        onReasonChange={onReasonChange}
        onReasonCommit={onReasonCommit}
        onComplete={jest.fn()}
      />
    );

    const firstReason = screen.getByRole('radio', {name: 'Resolved'});
    const secondReason = screen.getByRole('radio', {name: 'Follow up needed'});
    act(() => {
      firstReason.focus();
    });

    expect(screen.getByRole('radiogroup', {name: REASON_GROUP_NAME}).parentElement).toHaveAttribute(
      'aria-disabled',
      'true'
    );
    expect(fireEvent.pointerDown(secondReason)).toBe(false);
    expect(firstReason).toHaveFocus();
    fireEvent.click(secondReason);
    act(() => {
      firstReason.focus();
    });
    pressFocusedReasonKey(' ');
    pressFocusedReasonKey('ArrowDown');
    fireEvent.blur(screen.getByRole('radiogroup', {name: REASON_GROUP_NAME}), {
      relatedTarget: null,
    });

    expect(firstReason).toHaveFocus();
    expect(secondReason).not.toBeChecked();
    expect(onReasonChange).not.toHaveBeenCalled();
    expect(onReasonCommit).not.toHaveBeenCalled();
  });

  it('keeps Complete Wrap-Up enabled after a terminal summary error during retry when completion escape is set', () => {
    const onComplete = jest.fn();
    render(
      <WrapUpSummary
        reasons={reasons}
        summary={createSummary({state: 'generating', requestPending: true, completionEscape: true})}
        initialReasonId="aux-1"
        onReasonCommit={jest.fn()}
        onComplete={onComplete}
      />
    );

    fireEvent.click(screen.getByRole('button', {name: COMPLETE_WRAP_UP_LABEL}));
    expect(onComplete).toHaveBeenCalledWith({id: 'aux-1', name: 'Resolved'});
  });

  it('defers completion only for pending initial generation without retained content', () => {
    const onComplete = jest.fn();
    const {rerender} = render(
      <WrapUpSummary
        reasons={reasons}
        summary={createSummary({state: 'generating', requestPending: true, completionEscape: false})}
        initialReasonId="aux-1"
        onReasonCommit={jest.fn()}
        onComplete={onComplete}
      />
    );

    const complete = screen.getByRole('button', {name: COMPLETE_WRAP_UP_LABEL});
    expect(complete).toBeDisabled();

    rerender(
      <WrapUpSummary
        reasons={reasons}
        summary={createSummary({state: 'content', requestPending: true, completionEscape: false})}
        initialReasonId="aux-1"
        onReasonCommit={jest.fn()}
        onComplete={onComplete}
      />
    );

    fireEvent.click(screen.getByRole('button', {name: COMPLETE_WRAP_UP_LABEL}));
    expect(onComplete).toHaveBeenCalledWith({id: 'aux-1', name: 'Resolved'});
  });

  it('keeps a retained draft completable during regeneration without rendering an absent Outcome', () => {
    const onComplete = jest.fn();
    const retainedDraft = createSummary({
      requestPending: true,
      content: {
        type: 'sections',
        sections: [
          {key: 'initialContactReason', value: 'Edited summary survives.', editable: true},
          {key: 'nextSteps', value: 'Call back tomorrow.', editable: true},
        ],
        resolution: undefined,
      },
    });
    render(
      <WrapUpSummary
        reasons={reasons}
        summary={retainedDraft}
        initialReasonId="aux-1"
        onReasonCommit={jest.fn()}
        onComplete={onComplete}
      />
    );

    expect(screen.queryByText(AI_SUMMARY_MESSAGES.sectionLabels.resolution)).not.toBeInTheDocument();
    expect(screen.getByText('Edited summary survives.')).toBeInTheDocument();
    const complete = screen.getByRole('button', {name: COMPLETE_WRAP_UP_LABEL});
    expect(complete).not.toBeDisabled();

    fireEvent.click(complete);
    expect(onComplete).toHaveBeenCalledWith({id: 'aux-1', name: 'Resolved'});
  });

  it('projects pending and not-confirmed feedback descriptions from the shared summary component', () => {
    const {rerender} = render(
      <WrapUpSummary
        reasons={reasons}
        summary={createSummary({feedbackStatus: 'pending', selectedFeedback: 'like'})}
        onReasonCommit={jest.fn()}
        onComplete={jest.fn()}
      />
    );

    expect(screen.getByText(AI_SUMMARY_MESSAGES.feedback.pendingSubmission)).toBeInTheDocument();

    rerender(
      <WrapUpSummary
        reasons={reasons}
        summary={createSummary({feedbackStatus: 'not-confirmed', selectedFeedback: 'dislike'})}
        onReasonCommit={jest.fn()}
        onComplete={jest.fn()}
      />
    );

    expect(screen.getByText(AI_SUMMARY_MESSAGES.feedback.submissionNotConfirmed)).toBeInTheDocument();
  });

  it('blocks local completion re-entry until a rejected completion settles', async () => {
    const completion = deferred<void>();
    const secondCompletion = deferred<void>();
    const onComplete = jest.fn().mockReturnValueOnce(completion.promise).mockReturnValueOnce(secondCompletion.promise);
    render(
      <WrapUpSummary
        reasons={reasons}
        summary={createSummary()}
        initialReasonId="aux-1"
        onReasonCommit={jest.fn()}
        onComplete={onComplete}
      />
    );

    const complete = screen.getByRole('button', {name: COMPLETE_WRAP_UP_LABEL});
    fireEvent.click(complete);
    fireEvent.click(complete);

    expect(onComplete).toHaveBeenCalledTimes(1);
    await waitFor(() => expect(complete).toBeDisabled());

    await act(async () => {
      completion.reject(new Error('wrapup rejected'));
      await completion.promise.catch(() => undefined);
    });

    await waitFor(() => expect(complete).not.toBeDisabled());
    fireEvent.click(complete);
    expect(onComplete).toHaveBeenCalledTimes(2);
    await waitFor(() => expect(complete).toBeDisabled());
    await act(async () => {
      secondCompletion.resolve(undefined);
      await secondCompletion.promise;
    });
    await waitFor(() => expect(complete).not.toBeDisabled());
  });

  it('makes the frozen not-confirmed selection read-only', () => {
    render(
      <WrapUpSummary
        reasons={reasons}
        summary={createSummary({controlsDisabled: true, feedbackStatus: 'not-confirmed', selectedFeedback: 'like'})}
        onReasonCommit={jest.fn()}
        onComplete={jest.fn()}
      />
    );

    expect(screen.getByRole('button', {name: COMPLETE_WRAP_UP_LABEL})).toBeDisabled();
    expect(screen.getByRole('button', {name: AI_SUMMARY_MESSAGES.postCall.reasonSearchLabel})).toBeDisabled();
    expect(
      screen.getByRole('button', {
        name: AI_SUMMARY_MESSAGES.editSectionLabel(AI_SUMMARY_MESSAGES.sectionLabels.initialContactReason),
      })
    ).toBeDisabled();
    expect(screen.getByRole('button', {name: AI_SUMMARY_MESSAGES.copySummary})).toBeDisabled();
    expect(screen.getByRole('button', {name: AI_SUMMARY_MESSAGES.like})).toBeDisabled();
  });

  it('moves focus between the collapsed reason trigger and expanded search controls', async () => {
    const onReasonCommit = jest.fn();
    render(
      <WrapUpSummary
        reasons={reasons}
        summary={createSummary()}
        onReasonCommit={onReasonCommit}
        onComplete={jest.fn()}
      />
    );

    const reasonTrigger = screen.getByRole('button', {name: AI_SUMMARY_MESSAGES.postCall.reasonSearchLabel});
    act(() => {
      reasonTrigger.focus();
    });
    fireEvent.click(reasonTrigger);

    await waitFor(() =>
      expect(screen.getByRole('textbox', {name: AI_SUMMARY_MESSAGES.postCall.reasonSearchLabel})).toHaveFocus()
    );

    fireEvent.click(screen.getByRole('radio', {name: 'Follow up needed'}));

    const restoredTrigger = await screen.findByRole('button', {
      name: AI_SUMMARY_MESSAGES.postCall.reasonSearchLabel,
    });
    await waitFor(() => expect(restoredTrigger).toHaveFocus());
    expect(onReasonCommit).toHaveBeenCalledWith({id: 'aux-2', name: 'Follow up needed'}, 1);
  });

  it('restores focus to the wrap-up panel when the summary subtree is removed', async () => {
    const {rerender} = render(
      <WrapUpSummary reasons={reasons} summary={createSummary()} onReasonCommit={jest.fn()} onComplete={jest.fn()} />
    );

    const copy = screen.getByRole('button', {name: AI_SUMMARY_MESSAGES.copySummary});
    act(() => {
      copy.focus();
    });
    expect(copy).toHaveFocus();

    rerender(<WrapUpSummary reasons={reasons} onReasonCommit={jest.fn()} onComplete={jest.fn()} />);

    await waitFor(() => expect(screen.getByTestId('wrap-up-summary')).toHaveFocus());
    expect(screen.queryByTestId('wrap-up-summary:body')).not.toBeInTheDocument();
  });

  it('bounds reason and summary scrolling while keeping panel chrome outside the scroll regions', () => {
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
                type: 'sections',
                sections: [
                  {
                    key: 'initialContactReason',
                    value: 'A long retained summary paragraph that wraps inside the bounded content scroll region.',
                    editable: true,
                  },
                  {
                    key: 'keyActionsTaken',
                    value: 'Send corrected invoice, document the call, and schedule a follow-up.',
                    editable: true,
                  },
                ],
                resolution: 'Resolved with billing adjustment.',
              },
            })}
            onReasonCommit={jest.fn()}
            onComplete={jest.fn()}
          />
        </div>
      );

      fireEvent.click(screen.getByRole('button', {name: AI_SUMMARY_MESSAGES.postCall.reasonSearchLabel}));

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
      expect(screen.getByRole('button', {name: COMPLETE_WRAP_UP_LABEL})).toBeInTheDocument();
    } finally {
      removeStyles();
    }
  });
});
