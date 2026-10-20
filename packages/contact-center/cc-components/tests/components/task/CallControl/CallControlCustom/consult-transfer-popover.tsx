import React from 'react';
import {render, fireEvent, waitFor, act} from '@testing-library/react';
import '@testing-library/jest-dom';
import ConsultTransferPopoverComponent from '../../../../../src/components/task/CallControl/CallControlCustom/consult-transfer-popover';
import {AddressBookEntry, AISummaryEntry, ContactServiceQueue, EntryPointRecord, TaskUIControls} from '@webex/cc-store';
import {DEFAULT_PAGE_SIZE, SEARCH_PLACEHOLDER} from '../../../../../src/components/task/constants';
import {AI_ASSISTANT_SUMMARY_MESSAGES as AI_SUMMARY_MESSAGES} from '../../../../../src/components/AIAssistant/AISummary';

type AvailableDestinations = TaskUIControls['consultTransferDestinations']['consult'];

const getVoiceSearchInput = (container: HTMLElement) =>
  waitFor(() => {
    const input = container.querySelector('mdc-searchfield')?.shadowRoot?.querySelector('input');
    expect(input).toBeInstanceOf(HTMLInputElement);
    return input as HTMLInputElement;
  });

const loggerMock = {
  log: jest.fn(),
  info: jest.fn(),
  warn: jest.fn(),
  trace: jest.fn(),
  error: jest.fn(),
};

let consoleErrorSpy: jest.SpyInstance;

beforeAll(() => {
  consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
});

afterAll(() => {
  consoleErrorSpy.mockRestore();
});

// This test suite was previously skipped but is now enabled for 100% coverage
describe('ConsultTransferPopoverComponent', () => {
  const createSummary = (overrides = {}) => ({
    state: 'content' as const,
    content: {conversationId: 'interaction-main-1', summaryText: 'Customer needs billing support.'},
    selectedFeedback: 'none' as const,
    onEdit: jest.fn().mockReturnValue(true),
    onCopy: jest.fn().mockReturnValue(true),
    onFeedback: jest.fn(),
    ...overrides,
  });

  const mockOnAgentSelect = jest.fn();
  const mockOnQueueSelect = jest.fn();
  const baseProps = {
    heading: 'Select an Agent',
    buttonIcon: 'agent-icon',
    buddyAgents: [
      {
        agentId: 'agent1',
        agentName: 'Agent One',
        dn: '1001',
        state: 'Available',
        teamId: 'team1',
        siteId: 'site1',
      },
      {
        agentId: 'agent2',
        agentName: 'Agent Two',
        dn: '1002',
        state: 'Idle',
        teamId: 'team1',
        siteId: 'site1',
      },
    ],
    getQueues: async () => ({
      data: [
        {id: 'queue1', name: 'Queue One'} as ContactServiceQueue,
        {id: 'queue2', name: 'Queue Two'} as ContactServiceQueue,
      ],
      meta: {page: 0, totalPages: 1},
    }),
    onAgentSelect: mockOnAgentSelect,
    onQueueSelect: mockOnQueueSelect,
    onDialNumberSelect: jest.fn(),
    onEntryPointSelect: jest.fn(),
    action: 'Consult' as const,
    availableDestinations: ['agent', 'queue', 'dialNumber', 'entryPoint'] as AvailableDestinations,
    loadingBuddyAgents: false,
    logger: loggerMock,
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('keeps Exclude summary controlled and disables only summary controls while allowing the call action', async () => {
    const onExcludeChange = jest.fn().mockReturnValue(true);
    const summary = createSummary({excluded: false, onExcludeChange});
    const view = render(<ConsultTransferPopoverComponent {...baseProps} isTelephony summary={summary} />);
    const exclude = view.container.querySelector('.consult-transfer-actions__exclude') as HTMLElement & {
      checked: boolean;
    };
    expect(exclude).toBeInTheDocument();
    expect(exclude.checked).toBe(false);
    fireEvent.change(exclude);
    expect(onExcludeChange).toHaveBeenCalledWith(true);
    expect(mockOnAgentSelect).not.toHaveBeenCalled();
    view.rerender(
      <ConsultTransferPopoverComponent {...baseProps} isTelephony summary={{...summary, excluded: true}} />
    );
    expect(exclude.checked).toBe(true);
    expect(view.getByTestId('consult-transfer:summary')).toHaveClass('consult-transfer-summary--excluded');
    expect(view.getByTestId('consult-transfer:summary')).toHaveAttribute('aria-disabled', 'true');
    const edit = await view.findByRole('button', {name: AI_SUMMARY_MESSAGES.editSummary});
    await waitFor(() => expect(edit).toBeDisabled());
    fireEvent.click(view.getByRole('button', {name: 'Select Agent One'}));
    const submit = view.getByRole('button', {name: 'Consult'});
    await waitFor(() => expect(submit).not.toBeDisabled());
    fireEvent.click(submit);
    expect(mockOnAgentSelect).toHaveBeenCalledWith('agent1', 'Agent One', false);
  });

  it('separates cancellation from the successful action close', async () => {
    const onCancel = jest.fn();
    const onClose = jest.fn();
    const view = render(
      <ConsultTransferPopoverComponent
        {...baseProps}
        isTelephony
        summary={createSummary()}
        onCancel={onCancel}
        onClose={onClose}
      />
    );
    fireEvent.click(await view.findByRole('button', {name: 'Cancel'}));
    expect(onCancel).toHaveBeenCalledTimes(1);
    expect(onClose).not.toHaveBeenCalled();
    fireEvent.click(view.getByRole('button', {name: 'Close popover'}));
    expect(onCancel).toHaveBeenCalledTimes(1);
    expect(onClose).toHaveBeenCalledTimes(1);
    fireEvent.click(view.getByRole('button', {name: 'Select Agent One'}));
    const submit = view.getByRole('button', {name: 'Consult'});
    await waitFor(() => expect(submit).not.toBeDisabled());
    fireEvent.click(submit);
    expect(onClose).toHaveBeenCalledTimes(2);
    expect(onCancel).toHaveBeenCalledTimes(1);
  });

  it('uses capability-filtered voice radios before search and keeps nonvoice pills', async () => {
    const view = render(
      <ConsultTransferPopoverComponent {...baseProps} isTelephony summary={createSummary({state: 'omitted'})} />
    );
    const radios = view.getAllByRole('radio');
    expect(radios).toHaveLength(4);
    expect(view.getByRole('radio', {name: 'Agent'})).toBeChecked();
    expect(view.getByRole('radio', {name: 'Dial Number'})).toBeInTheDocument();
    expect(view.getByRole('radio', {name: 'Entry Point'})).toBeInTheDocument();
    expect(view.container.querySelectorAll('ul.agent-list > li')).toHaveLength(2);
    expect(view.container.querySelector('ul.agent-list > div')).not.toBeInTheDocument();
    expect(view.container.querySelector('.consult-list-container')).not.toHaveAttribute('tabindex');
    const group = view.getByRole('radiogroup', {name: AI_SUMMARY_MESSAGES.midCall.destinationCategory});
    const search = await getVoiceSearchInput(view.container);
    expect(
      group.compareDocumentPosition(view.container.querySelector('mdc-searchfield')!) & Node.DOCUMENT_POSITION_FOLLOWING
    ).toBeTruthy();
    expect(search).toHaveAttribute('aria-label', AI_SUMMARY_MESSAGES.midCall.searchDestinations);
    expect(search).toHaveAttribute('placeholder', 'Search agents');
    expect(view.container.querySelector('.consult-search-icon')).not.toBeInTheDocument();
    expect(view.getByTestId('consult-reload-button')).toBeInTheDocument();
    expect(view.queryByText('1001')).not.toBeInTheDocument();
    fireEvent.click(view.getByRole('radio', {name: 'Queue'}));
    await waitFor(() => expect(view.getByText('Queue One')).toBeInTheDocument());
    expect(view.getByRole('radio', {name: 'Queue'})).toBeChecked();
    view.rerender(
      <ConsultTransferPopoverComponent
        {...baseProps}
        isTelephony
        summary={createSummary({state: 'omitted'})}
        availableDestinations={['agent']}
      />
    );
    expect(view.getAllByRole('radio')).toHaveLength(1);
    expect(view.queryByText('Organization')).not.toBeInTheDocument();
    view.unmount();

    const nonVoice = render(<ConsultTransferPopoverComponent {...baseProps} isTelephony={false} />);
    expect(nonVoice.queryByRole('radiogroup')).not.toBeInTheDocument();
    expect(nonVoice.getByRole('button', {name: 'Agents'})).toBeInTheDocument();
    expect(nonVoice.getByPlaceholderText(SEARCH_PLACEHOLDER)).toBeInTheDocument();
    expect(nonVoice.getByTestId('consult-reload-button')).toBeInTheDocument();
    expect(nonVoice.queryByText('1001')).not.toBeInTheDocument();
  });

  it('uses native Momentum row navigation and Enter to stage a voice destination', async () => {
    const view = render(<ConsultTransferPopoverComponent {...baseProps} isTelephony summary={createSummary()} />);
    const firstAgent = view.getByRole('listitem', {name: 'Agent One'});
    const secondAgent = view.getByRole('listitem', {name: 'Agent Two'});
    expect(firstAgent).toHaveAttribute('tabindex', '0');
    expect(secondAgent).toHaveAttribute('tabindex', '-1');
    act(() => firstAgent.focus());
    fireEvent.keyDown(firstAgent, {key: 'ArrowDown'});
    await waitFor(() => expect(secondAgent).toHaveFocus());
    fireEvent.keyDown(secondAgent, {key: 'Enter'});
    fireEvent.keyUp(secondAgent, {key: 'Enter'});
    expect(secondAgent).toHaveClass('active');
    expect(mockOnAgentSelect).not.toHaveBeenCalled();
    fireEvent.click(view.getByRole('button', {name: 'Consult'}));
    expect(mockOnAgentSelect).toHaveBeenCalledWith('agent2', 'Agent Two', false);
  });

  it('stages a voice destination until Consult is pressed and keeps refresh and Cancel available', async () => {
    const loadBuddyAgents = jest.fn().mockResolvedValue(undefined);
    const onClose = jest.fn();
    const view = render(
      <ConsultTransferPopoverComponent
        {...baseProps}
        heading="Consult"
        isTelephony
        summary={createSummary()}
        loadBuddyAgents={loadBuddyAgents}
        onClose={onClose}
      />
    );
    const submit = await view.findByRole('button', {name: 'Consult'});
    const agent = view.getByRole('button', {name: 'Select Agent One'});
    await waitFor(() => expect(submit).toBeDisabled());
    fireEvent.click(agent);
    expect(agent).toHaveAttribute('aria-pressed', 'true');
    expect(mockOnAgentSelect).not.toHaveBeenCalled();
    await waitFor(() => expect(submit).not.toBeDisabled());
    expect(view.getByRole('button', {name: 'Cancel'})).toBeInTheDocument();
    fireEvent.click(view.getByTestId('consult-reload-button'));
    expect(loadBuddyAgents).toHaveBeenCalledWith('Consult');
    await waitFor(() => expect(submit).toBeDisabled());
    fireEvent.click(agent);
    await waitFor(() => expect(submit).not.toBeDisabled());
    fireEvent.click(submit);
    expect(mockOnAgentSelect).toHaveBeenCalledWith('agent1', 'Agent One', false);
    expect(onClose).toHaveBeenCalledTimes(1);
    expect(mockOnAgentSelect).toHaveBeenCalledTimes(1);
  });

  it('disables a dispatched voice action until the picker closes', async () => {
    const onClose = jest.fn();
    const view = render(
      <ConsultTransferPopoverComponent {...baseProps} isTelephony summary={createSummary()} onClose={onClose} />
    );
    fireEvent.click(view.getByRole('button', {name: 'Select Agent One'}));
    const submit = await view.findByRole('button', {name: 'Consult'});
    await waitFor(() => expect(submit).not.toBeDisabled());
    fireEvent.click(submit);
    await waitFor(() => expect(submit).toBeDisabled());
    fireEvent.click(submit);
    expect(mockOnAgentSelect).toHaveBeenCalledTimes(1);
    expect(onClose).toHaveBeenCalledTimes(1);
    await waitFor(() => expect(submit).toBeDisabled());
    fireEvent.click(view.getByRole('button', {name: 'Select Agent Two'}));
    fireEvent.click(submit);
    expect(mockOnAgentSelect).toHaveBeenCalledTimes(1);
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('keeps the picker retryable when destination dispatch throws synchronously', async () => {
    const onClose = jest.fn();
    const onAgentSelect = jest.fn().mockImplementationOnce(() => {
      throw new Error('Dispatch failed');
    });
    const view = render(
      <ConsultTransferPopoverComponent
        {...baseProps}
        isTelephony
        summary={createSummary()}
        onAgentSelect={onAgentSelect}
        onClose={onClose}
      />
    );
    fireEvent.click(view.getByRole('button', {name: 'Select Agent One'}));
    const submit = await view.findByRole('button', {name: 'Consult'});
    await waitFor(() => expect(submit).not.toBeDisabled());
    fireEvent.click(submit);
    expect(onClose).not.toHaveBeenCalled();
    expect(loggerMock.error).toHaveBeenCalledWith(
      'CC-Components: Failed to submit consult/transfer destination',
      expect.objectContaining({method: 'submitVoiceDestination'})
    );
    await waitFor(() => expect(submit).not.toBeDisabled());
    fireEvent.click(submit);
    expect(onAgentSelect).toHaveBeenCalledTimes(2);
    expect(onClose).toHaveBeenCalledTimes(1);
    await waitFor(() => expect(submit).toBeDisabled());
  });

  it('retains each voice category selection and submits only the active Transfer destination', async () => {
    const view = render(
      <ConsultTransferPopoverComponent
        {...baseProps}
        heading="Transfer"
        action="Transfer"
        isTelephony
        summary={createSummary()}
      />
    );
    fireEvent.click(view.getByRole('button', {name: 'Select Agent One'}));
    fireEvent.click(view.getByRole('radio', {name: 'Queue'}));
    fireEvent.click(await view.findByRole('button', {name: 'Select Queue Two'}));
    expect(mockOnAgentSelect).not.toHaveBeenCalled();
    expect(mockOnQueueSelect).not.toHaveBeenCalled();
    fireEvent.click(view.getByRole('radio', {name: 'Agent'}));
    expect(view.getByRole('button', {name: 'Select Agent One'})).toHaveAttribute('aria-pressed', 'true');
    fireEvent.click(view.getByRole('radio', {name: 'Queue'}));
    const selectedQueue = await view.findByRole('button', {name: 'Select Queue Two'});
    expect(selectedQueue).toHaveAttribute('aria-pressed', 'true');
    fireEvent.click(view.getByRole('button', {name: 'Transfer'}));
    expect(mockOnQueueSelect).toHaveBeenCalledWith('queue2', 'Queue Two', false);
    expect(mockOnAgentSelect).not.toHaveBeenCalled();
  });

  it('submits typed dial numbers through the voice footer and clears stale selection when searching', async () => {
    const view = render(
      <ConsultTransferPopoverComponent {...baseProps} heading="Consult" isTelephony summary={createSummary()} />
    );
    const submit = await view.findByRole('button', {name: 'Consult'});
    fireEvent.click(view.getByRole('button', {name: 'Select Agent One'}));
    const search = await getVoiceSearchInput(view.container);
    fireEvent.input(search, {target: {value: 'Other'}, composed: true});
    await waitFor(() => expect(submit).toBeDisabled());
    fireEvent.click(view.getByRole('radio', {name: 'Dial Number'}));
    fireEvent.input(search, {target: {value: '1234'}, composed: true});
    expect(view.queryByTestId('consult-quick-action:consult')).not.toBeInTheDocument();
    expect(baseProps.onDialNumberSelect).not.toHaveBeenCalled();
    await waitFor(() => expect(submit).not.toBeDisabled());
    fireEvent.input(search, {target: {value: 'invalid'}, composed: true});
    await waitFor(() => expect(submit).toBeDisabled());
    fireEvent.input(search, {target: {value: '1234'}, composed: true});
    await waitFor(() => expect(submit).not.toBeDisabled());
    fireEvent.click(submit);
    expect(baseProps.onDialNumberSelect).toHaveBeenCalledWith('1234', false);
  });

  it('uses the native search clear action to reset the query and invalidate the staged destination', async () => {
    const view = render(
      <ConsultTransferPopoverComponent {...baseProps} heading="Consult" isTelephony summary={createSummary()} />
    );
    const search = await getVoiceSearchInput(view.container);
    fireEvent.input(search, {target: {value: 'Agent'}, composed: true});
    const agent = view.getByRole('button', {name: 'Select Agent One'});
    fireEvent.click(agent);
    const submit = await view.findByRole('button', {name: 'Consult'});
    await waitFor(() => expect(submit).not.toBeDisabled());
    const searchfield = view.container.querySelector('mdc-searchfield')!;
    const clear = await waitFor(() => {
      const button = searchfield.shadowRoot?.querySelector('mdc-button[part="trailing-button"]');
      expect(button).toBeInTheDocument();
      return button!;
    });
    fireEvent.click(clear);
    await waitFor(() => expect(search).toHaveValue(''));
    expect(searchfield.shadowRoot?.activeElement).toBe(search);
    expect(agent).toHaveAttribute('aria-pressed', 'false');
    expect(submit).toBeDisabled();
    expect(mockOnAgentSelect).not.toHaveBeenCalled();
  });

  it('disables the voice action when a selected destination disappears or its category is revoked', async () => {
    const view = render(<ConsultTransferPopoverComponent {...baseProps} isTelephony summary={createSummary()} />);
    fireEvent.click(view.getByRole('button', {name: 'Select Agent One'}));
    const submit = await view.findByRole('button', {name: 'Consult'});
    await waitFor(() => expect(submit).not.toBeDisabled());
    view.rerender(
      <ConsultTransferPopoverComponent {...baseProps} isTelephony summary={createSummary()} buddyAgents={[]} />
    );
    await waitFor(() => expect(submit).toBeDisabled());
    fireEvent.click(submit);
    expect(mockOnAgentSelect).not.toHaveBeenCalled();
    view.rerender(
      <ConsultTransferPopoverComponent
        {...baseProps}
        isTelephony
        summary={createSummary()}
        availableDestinations={[]}
      />
    );
    await waitFor(() => expect(submit).toBeDisabled());
    fireEvent.click(submit);
    expect(mockOnAgentSelect).not.toHaveBeenCalled();
  });

  it('retains the staged voice layout when eligibility is revoked before summary content arrives', async () => {
    const view = render(
      <ConsultTransferPopoverComponent {...baseProps} isTelephony summary={createSummary({state: 'omitted'})} />
    );
    const selectedAgent = view.getByRole('button', {name: 'Select Agent One'});
    fireEvent.click(selectedAgent);
    const submit = await view.findByRole('button', {name: 'Consult'});
    await waitFor(() => expect(submit).not.toBeDisabled());
    view.rerender(<ConsultTransferPopoverComponent {...baseProps} isTelephony />);
    expect(view.getByRole('radio', {name: 'Agent'})).toBeInTheDocument();
    expect(view.getByRole('button', {name: 'Select Agent One'})).toBe(selectedAgent);
    expect(submit).toBeInTheDocument();
    fireEvent.click(submit);
    expect(mockOnAgentSelect).toHaveBeenCalledWith('agent1', 'Agent One', false);
  });

  it.each(['Dial Number', 'Entry Point'])('stages %s selection until the voice footer action', async (category) => {
    const view = render(
      <ConsultTransferPopoverComponent
        {...baseProps}
        isTelephony
        summary={createSummary()}
        getAddressBookEntries={async () => ({
          data: [{id: 'dn1', name: 'Dial destination', number: '12345'} as AddressBookEntry],
          meta: {page: 0, totalPages: 1},
        })}
        getEntryPoints={async () => ({
          data: [{id: 'ep1', name: 'Entry destination', number: '67890'} as EntryPointRecord],
          meta: {page: 0, totalPages: 1},
        })}
      />
    );
    fireEvent.click(view.getByRole('radio', {name: category}));
    const destination = category === 'Dial Number' ? 'Dial destination' : 'Entry destination';
    fireEvent.click(await view.findByRole('button', {name: `Select ${destination}`}));
    expect(baseProps.onDialNumberSelect).not.toHaveBeenCalled();
    expect(baseProps.onEntryPointSelect).not.toHaveBeenCalled();
    const submit = await view.findByRole('button', {name: 'Consult'});
    await waitFor(() => expect(submit).not.toBeDisabled());
    fireEvent.click(submit);
    if (category === 'Dial Number') {
      expect(baseProps.onDialNumberSelect).toHaveBeenCalledWith('12345', false);
    } else {
      expect(baseProps.onEntryPointSelect).toHaveBeenCalledWith('ep1', 'Entry destination', false);
    }
  });

  it.each([
    ['Consult' as const, 'CONSULT'],
    ['Transfer' as const, 'TRANSFER'],
  ])('retries a failed %s summary with the currently open action', async (action, summaryAction) => {
    const onSummaryRequest = jest.fn().mockResolvedValue(undefined);
    const view = render(
      <ConsultTransferPopoverComponent
        {...baseProps}
        action={action}
        isTelephony
        summary={createSummary({state: 'generic-error'})}
        onSummaryRequest={onSummaryRequest}
      />
    );
    fireEvent.click(await view.findByRole('button', {name: AI_SUMMARY_MESSAGES.retry}));
    expect(onSummaryRequest).toHaveBeenCalledWith(summaryAction);
    expect(mockOnAgentSelect).not.toHaveBeenCalled();
    expect(mockOnQueueSelect).not.toHaveBeenCalled();
  });

  it('renders heading and tabs when showTabs is true', async () => {
    const screen = await render(<ConsultTransferPopoverComponent {...baseProps} heading="Consult" />);

    // Verify main container
    expect(screen.container.querySelector('.agent-popover-content')).toBeInTheDocument();

    // Verify heading - it's wrapped in mdc-text component
    const heading = screen.container.querySelector('.agent-popover-title');
    expect(heading).toBeInTheDocument();
    expect(heading).toHaveTextContent('Consult');
    expect(heading?.tagName.toLowerCase()).toBe('mdc-text');
    expect(heading).toHaveAttribute('tagname', 'h3');
    expect(heading).toHaveAttribute('type', 'body-large-bold');

    // Verify tabs container
    const buttons = Array.from(screen.container.querySelectorAll('button')).map(
      (b) => (b as HTMLButtonElement).textContent
    );
    expect(buttons).toEqual(expect.arrayContaining(['Agents', 'Queues', 'Dial Number', 'Entry Point']));

    // Verify Agents tab (active by default)
    const agentsButton = screen.getByRole('button', {name: 'Agents'});
    expect(agentsButton).toBeInTheDocument();
    expect(agentsButton).toHaveTextContent('Agents');

    // Verify Queues tab (inactive by default)
    const queuesButton = screen.getByRole('button', {name: 'Queues'});
    expect(queuesButton).toBeInTheDocument();
    expect(queuesButton).toHaveTextContent('Queues');

    // Verify agent list
    const agentList = screen.container.querySelector('.agent-list');
    expect(agentList).toBeInTheDocument();

    // Verify agent list items
    const listItems = screen.container.querySelectorAll('.call-control-list-item');
    expect(listItems).toHaveLength(2);
    expect(listItems[0]).toHaveTextContent('Agent One');
    expect(listItems[1]).toHaveTextContent('Agent Two');

    const availableAvatar = listItems[0].querySelector('mdc-avatar') as HTMLElement & {presence?: string};
    const awayAvatar = listItems[1].querySelector('mdc-avatar') as HTMLElement & {presence?: string};
    expect(availableAvatar.presence).toBe('active');
    expect(awayAvatar.presence).toBe('away');

    // Verify list item wrappers render
    const listItemContainers = screen.container.querySelectorAll('.consult-list-item-wrapper');
    expect(listItemContainers).toHaveLength(2);
  });

  it('handles interactions and tab switching correctly', async () => {
    const screen = await render(<ConsultTransferPopoverComponent {...baseProps} />);

    // Test agent selection - click on the button inside the first agent item
    const firstAgentButton = screen.container.querySelectorAll('.call-control-list-item button')[0];
    fireEvent.click(firstAgentButton);
    expect(mockOnAgentSelect).toHaveBeenCalledWith('agent1', 'Agent One', false);

    // Test onMouseDown event handler (covers line 39) - just trigger the event
    const listItemContainer = screen.container.querySelector('.consult-list-item-wrapper');
    fireEvent.mouseDown(listItemContainer!);

    // Test tab switching
    fireEvent.click(screen.getByText('Queues'));

    // Test queue selection after switching tabs - click on the button inside the first queue item
    await waitFor(() =>
      expect(screen.container.querySelectorAll('.call-control-list-item button').length).toBeGreaterThan(0)
    );
    const firstQueueButton = screen.container.querySelectorAll('.call-control-list-item button')[0];
    fireEvent.click(firstQueueButton);
    expect(mockOnQueueSelect).toHaveBeenCalledWith('queue1', 'Queue One', false);
  });

  it('shows the number below dial-number and entry-point names', async () => {
    const screen = render(
      <ConsultTransferPopoverComponent
        {...baseProps}
        heading="Consult"
        getAddressBookEntries={async () => ({
          data: [
            {
              id: 'dn1',
              name: 'Dial Number One',
              number: '12345',
            } as AddressBookEntry,
          ],
          meta: {page: 0, totalPages: 1},
        })}
        getEntryPoints={async () => ({
          data: [
            {
              id: 'ep1',
              name: 'Entry Point One',
              number: '67890',
            } as EntryPointRecord,
          ],
          meta: {page: 0, totalPages: 1},
        })}
      />
    );

    fireEvent.click(screen.getByRole('button', {name: 'Dial Number'}));
    await waitFor(() => expect(screen.getByText('12345')).toBeInTheDocument());

    fireEvent.click(screen.getByRole('button', {name: 'Entry Point'}));
    await waitFor(() => expect(screen.getByText('67890')).toBeInTheDocument());
  });

  it('hides Dial Number tab when consultTransferOptions.showDialNumberTab is false', async () => {
    const screen = await render(
      <ConsultTransferPopoverComponent {...baseProps} consultTransferOptions={{showDialNumberTab: false}} />
    );

    const buttons = Array.from(screen.container.querySelectorAll('button')).map(
      (b) => (b as HTMLButtonElement).textContent
    );

    expect(buttons).toEqual(expect.arrayContaining(['Agents', 'Queues']));
    expect(buttons).not.toEqual(expect.arrayContaining(['Dial Number']));
  });

  it('hides Entry Point tab when consultTransferOptions.showEntryPointTab is false', async () => {
    const screen = await render(
      <ConsultTransferPopoverComponent {...baseProps} consultTransferOptions={{showEntryPointTab: false}} />
    );

    const buttons = Array.from(screen.container.querySelectorAll('button')).map(
      (b) => (b as HTMLButtonElement).textContent
    );

    expect(buttons).toEqual(expect.arrayContaining(['Agents', 'Queues', 'Dial Number']));
    expect(buttons).not.toEqual(expect.arrayContaining(['Entry Point']));
  });

  it('hides both tabs when both flags are false and shows empty state if no other data', async () => {
    const screen = await render(
      <ConsultTransferPopoverComponent
        {...baseProps}
        buddyAgents={[]}
        getQueues={async () => ({data: [], meta: {page: 0, totalPages: 0}})}
        consultTransferOptions={{showDialNumberTab: false, showEntryPointTab: false}}
      />
    );

    const buttons = Array.from(screen.container.querySelectorAll('button')).map(
      (b) => (b as HTMLButtonElement).textContent
    );

    expect(buttons).toEqual(expect.arrayContaining(['Agents', 'Queues']));
    expect(buttons).not.toEqual(expect.arrayContaining(['Dial Number']));
    expect(buttons).not.toEqual(expect.arrayContaining(['Entry Point']));

    // With no agents/queues and both tabs hidden, should show the empty state
    expect(screen.getByText('No data available for consult transfer.')).toBeInTheDocument();
  });

  it('shows empty state when both lists are completely empty', async () => {
    const emptyProps = {
      ...baseProps,
      buddyAgents: [],
      getQueues: async () => ({data: [], meta: {page: 0, totalPages: 0}}),
    };

    const screen = await render(<ConsultTransferPopoverComponent {...emptyProps} />);
    expect(screen.getByText('No data available for consult transfer.')).toBeInTheDocument();
  });

  it('shows tabs and empty agents message when no agents are available', async () => {
    const emptyAgentsProps = {
      ...baseProps,
      buddyAgents: [],
    };

    const screen = await render(<ConsultTransferPopoverComponent {...emptyAgentsProps} heading="Consult" />);
    const buttons = Array.from(screen.container.querySelectorAll('button')).map(
      (b) => (b as HTMLButtonElement).textContent
    );
    expect(buttons).toEqual(expect.arrayContaining(['Agents', 'Queues', 'Dial Number', 'Entry Point']));
    expect(screen.container.querySelector('.consult-empty-state')).toBeInTheDocument();
    expect(screen.getByText('No data available for consult transfer.')).toBeInTheDocument();
  });

  it('shows no items when queues are empty after switching to queues', async () => {
    const emptyQueuesProps = {
      ...baseProps,
      getQueues: async () => ({data: [], meta: {page: 0, totalPages: 0}}),
    };

    const screen = await render(<ConsultTransferPopoverComponent {...emptyQueuesProps} />);
    fireEvent.click(screen.getByRole('button', {name: 'Queues'}));
    expect(screen.container.querySelector('.agent-list')).toBeNull();
    expect(screen.container.querySelectorAll('.call-control-list-item').length).toBe(0);
  });

  it('hides a category omitted by the SDK controls', async () => {
    const propsWithoutQueue = {
      ...baseProps,
      availableDestinations: ['agent', 'dialNumber', 'entryPoint'] as AvailableDestinations,
    };

    const screen = await render(<ConsultTransferPopoverComponent {...propsWithoutQueue} />);
    const maybeQueuesButton = screen.queryByRole('button', {name: 'Queues'}) as HTMLButtonElement | null;
    expect(maybeQueuesButton).toBeNull();
  });

  it('renders category tabs in the order supplied by the SDK controls', async () => {
    const orderedProps = {
      ...baseProps,
      action: 'Transfer' as const,
      availableDestinations: ['queue', 'agent', 'entryPoint', 'dialNumber'] as AvailableDestinations,
    };

    const screen = await render(<ConsultTransferPopoverComponent {...orderedProps} />);
    const categoryLabels = Array.from(screen.container.querySelectorAll('.consult-category-buttons button')).map(
      (button) => button.textContent
    );

    expect(categoryLabels).toEqual(['Queues', 'Agents', 'Entry Point', 'Dial Number']);
    expect(screen.getByRole('button', {name: 'Queues'})).toHaveClass('consult-category-button-active');
  });

  it('renders an empty state without looping when the SDK exposes no destinations', async () => {
    const screen = await render(<ConsultTransferPopoverComponent {...baseProps} availableDestinations={[]} />);

    expect(screen.container.querySelectorAll('.consult-category-buttons button')).toHaveLength(0);
    expect(screen.getByText('No data available for consult transfer.')).toBeInTheDocument();
  });

  it('shows entry point when it is included in the SDK controls', async () => {
    const transferProps = {
      ...baseProps,
      action: 'Transfer' as const,
      consultTransferOptions: {showEntryPointTab: true},
    };

    const screen = await render(<ConsultTransferPopoverComponent {...transferProps} />);
    expect(screen.getByRole('button', {name: 'Entry Point'})).toBeInTheDocument();
  });

  it('covers edge case for empty items in renderList (line 50)', async () => {
    const propsWithEmptyAgents = {
      ...baseProps,
      buddyAgents: [],
    };

    const screen = await render(<ConsultTransferPopoverComponent {...propsWithEmptyAgents} />);

    // With zero agents, the per-tab empty state should render
    expect(screen.getByText('No data available for consult transfer.')).toBeInTheDocument();
  });

  describe('Search behavior', () => {
    beforeEach(() => {
      jest.useFakeTimers();
    });

    afterEach(() => {
      jest.useRealTimers();
    });

    it('debounces and triggers queue search on 2+ chars and on clear', async () => {
      const getQueuesMock = jest.fn().mockResolvedValue({
        data: [
          {id: 'queue1', name: 'Queue One'} as ContactServiceQueue,
          {id: 'queue2', name: 'Queue Two'} as ContactServiceQueue,
        ],
        meta: {page: 0, totalPages: 1},
      });

      const screen = await render(<ConsultTransferPopoverComponent {...baseProps} getQueues={getQueuesMock} />);

      // Switch to Queues category
      fireEvent.click(screen.getByText('Queues'));

      const input = screen.getByPlaceholderText(SEARCH_PLACEHOLDER) as HTMLInputElement;

      fireEvent.change(input, {target: {value: 'q'}});
      await act(async () => {
        jest.advanceTimersByTime(500);
      });
      expect(getQueuesMock).toHaveBeenCalledTimes(1);

      fireEvent.change(input, {target: {value: 'qu'}});
      await act(async () => {
        jest.advanceTimersByTime(500);
      });
      const afterTwoChars = getQueuesMock.mock.calls.length;
      expect(getQueuesMock).toHaveBeenLastCalledWith(
        expect.objectContaining({page: 0, pageSize: DEFAULT_PAGE_SIZE, search: 'qu'})
      );
      expect(afterTwoChars).toBe(2);

      fireEvent.change(input, {target: {value: ''}});
      await act(async () => {
        jest.advanceTimersByTime(500);
      });
      expect(getQueuesMock).toHaveBeenLastCalledWith(expect.objectContaining({page: 0, pageSize: DEFAULT_PAGE_SIZE}));
      expect(getQueuesMock.mock.calls.length).toBe(afterTwoChars + 1);
    });

    it('does not trigger search when category is Agents', async () => {
      const getQueuesMock = jest.fn().mockResolvedValue({data: [], meta: {page: 0, totalPages: 0}});
      const screen = await render(<ConsultTransferPopoverComponent {...baseProps} getQueues={getQueuesMock} />);

      // Default category is Agents
      const input = screen.getByPlaceholderText(SEARCH_PLACEHOLDER) as HTMLInputElement;
      fireEvent.change(input, {target: {value: 'ab'}});
      await act(async () => {
        jest.advanceTimersByTime(500);
      });
      expect(getQueuesMock).not.toHaveBeenCalled();
    });
  });

  describe('Reload button functionality', () => {
    it('renders reload button with correct attributes', async () => {
      const screen = await render(<ConsultTransferPopoverComponent {...baseProps} />);

      const reloadButton = screen.getByTestId('consult-reload-button');
      expect(reloadButton).toBeInTheDocument();
      expect(reloadButton).toHaveAttribute('aria-label', 'Reload Agents');

      // Check icon is present
      const icon = reloadButton.querySelector('mdc-icon[name="refresh-bold"]');
      expect(icon).toBeInTheDocument();
    });

    it('calls loadBuddyAgents when reload button clicked on Agents tab', async () => {
      const mockLoadBuddyAgents = jest.fn().mockResolvedValue(undefined);
      const screen = await render(
        <ConsultTransferPopoverComponent {...baseProps} loadBuddyAgents={mockLoadBuddyAgents} />
      );

      // Default tab is Agents
      const reloadButton = screen.getByTestId('consult-reload-button');
      fireEvent.click(reloadButton);

      expect(mockLoadBuddyAgents).toHaveBeenCalledTimes(1);
      expect(mockLoadBuddyAgents).toHaveBeenCalledWith('Consult');
    });

    it('reloads queues when reload button clicked on Queues tab', async () => {
      const getQueuesMock = jest.fn().mockResolvedValue({
        data: [
          {id: 'queue1', name: 'Queue One'} as ContactServiceQueue,
          {id: 'queue2', name: 'Queue Two'} as ContactServiceQueue,
        ],
        meta: {page: 0, totalPages: 1},
      });

      const screen = await render(<ConsultTransferPopoverComponent {...baseProps} getQueues={getQueuesMock} />);

      // Switch to Queues tab
      fireEvent.click(screen.getByText('Queues'));

      await waitFor(() => {
        expect(getQueuesMock).toHaveBeenCalledTimes(1);
      });

      // Click reload button
      const reloadButton = screen.getByTestId('consult-reload-button');
      fireEvent.click(reloadButton);

      await waitFor(() => {
        expect(getQueuesMock).toHaveBeenCalledTimes(2);
        expect(loggerMock.info).toHaveBeenCalledWith('CC-Components: Reloading Queues data', {
          module: 'cc-components#consult-transfer-popover-hooks.ts',
          method: 'useConsultTransferPopover#handleReload',
        });
      });
    });

    it('disables reload button when loadingBuddyAgents is true', async () => {
      const screen = await render(<ConsultTransferPopoverComponent {...baseProps} loadingBuddyAgents={true} />);

      const reloadButton = screen.getByTestId('consult-reload-button');
      expect(reloadButton).toBeDisabled();
    });

    it('updates aria-label when switching tabs', async () => {
      // Add getEntryPoints and getAddressBookEntries to enable all tabs
      // Note: Entry Point tab only shows when heading is 'Consult'
      const propsWithAllTabs = {
        ...baseProps,
        heading: 'Consult', // Required for Entry Point tab to be visible
        getAddressBookEntries: async () => ({
          data: [
            {
              id: 'dn1',
              name: 'Dial Number One',
              number: '12345',
              type: 'DN',
            } as AddressBookEntry,
          ],
          meta: {page: 0, totalPages: 1},
        }),
        getEntryPoints: async () => ({
          data: [
            {
              id: 'ep1',
              name: 'Entry Point One',
              type: 'EP',
              isActive: true,
              orgId: 'org1',
            } as EntryPointRecord,
          ],
          meta: {page: 0, totalPages: 1},
        }),
      };

      const screen = await render(<ConsultTransferPopoverComponent {...propsWithAllTabs} />);

      // Default is Agents
      let reloadButton = screen.getByTestId('consult-reload-button');
      expect(reloadButton).toHaveAttribute('aria-label', 'Reload Agents');

      // Switch to Queues
      fireEvent.click(screen.getByText('Queues'));
      reloadButton = screen.getByTestId('consult-reload-button');
      expect(reloadButton).toHaveAttribute('aria-label', 'Reload Queues');

      // Switch to Dial Number
      fireEvent.click(screen.getByText('Dial Number'));
      reloadButton = screen.getByTestId('consult-reload-button');
      expect(reloadButton).toHaveAttribute('aria-label', 'Reload Dial Number');

      // Switch to Entry Point
      fireEvent.click(screen.getByText('Entry Point'));
      reloadButton = screen.getByTestId('consult-reload-button');
      expect(reloadButton).toHaveAttribute('aria-label', 'Reload Entry Point');
    });
  });

  describe('Loading states', () => {
    it('shows spinner when loadingBuddyAgents is true and no agents', async () => {
      const screen = await render(
        <ConsultTransferPopoverComponent {...baseProps} buddyAgents={[]} loadingBuddyAgents={true} />
      );

      const spinner = screen.container.querySelector('.consult-loading-spinner mdc-spinner');
      expect(spinner).toBeInTheDocument();
    });

    it('shows agents list when loadingBuddyAgents is false', async () => {
      const screen = await render(<ConsultTransferPopoverComponent {...baseProps} loadingBuddyAgents={false} />);

      const agentList = screen.container.querySelector('.agent-list');
      expect(agentList).toBeInTheDocument();

      const listItems = screen.container.querySelectorAll('.call-control-list-item');
      expect(listItems).toHaveLength(2);
    });

    it('shows spinner for queues when loading and no data', async () => {
      const getQueuesMock = jest.fn().mockImplementation(
        () =>
          new Promise((resolve) => {
            setTimeout(() => resolve({data: [], meta: {page: 0, totalPages: 0}}), 100);
          })
      );

      const screen = await render(<ConsultTransferPopoverComponent {...baseProps} getQueues={getQueuesMock} />);

      // Switch to Queues tab
      fireEvent.click(screen.getByText('Queues'));

      // Should show spinner while loading
      await waitFor(() => {
        const spinner = screen.container.querySelector('.consult-loading-spinner mdc-spinner');
        expect(spinner).toBeInTheDocument();
      });
    });

    it('shows spinner in load more area when loading more queues', async () => {
      const getQueuesMock = jest.fn().mockResolvedValue({
        data: [
          {id: 'queue1', name: 'Queue One'} as ContactServiceQueue,
          {id: 'queue2', name: 'Queue Two'} as ContactServiceQueue,
        ],
        meta: {page: 0, totalPages: 2},
      });

      const screen = await render(<ConsultTransferPopoverComponent {...baseProps} getQueues={getQueuesMock} />);

      // Switch to Queues tab
      fireEvent.click(screen.getByText('Queues'));

      await waitFor(() => {
        const listItems = screen.container.querySelectorAll('.call-control-list-item');
        expect(listItems.length).toBeGreaterThan(0);
      });

      // Should have a load more area
      const loadMoreArea = screen.container.querySelector('.consult-load-more');
      expect(loadMoreArea).toBeInTheDocument();
    });

    it('shows empty state instead of spinner when not loading', async () => {
      const screen = await render(
        <ConsultTransferPopoverComponent {...baseProps} buddyAgents={[]} loadingBuddyAgents={false} />
      );

      const spinner = screen.container.querySelector('.consult-loading-spinner mdc-spinner');
      expect(spinner).not.toBeInTheDocument();

      const emptyState = screen.container.querySelector('.consult-empty-state');
      expect(emptyState).toBeInTheDocument();
    });
  });

  describe('Reload with search query', () => {
    beforeEach(() => {
      jest.useFakeTimers();
    });

    afterEach(() => {
      jest.useRealTimers();
    });

    it('reloads with current search query on Queues tab', async () => {
      const getQueuesMock = jest.fn().mockResolvedValue({
        data: [{id: 'queue1', name: 'Queue One'} as ContactServiceQueue],
        meta: {page: 0, totalPages: 1},
      });

      const screen = await render(<ConsultTransferPopoverComponent {...baseProps} getQueues={getQueuesMock} />);

      // Switch to Queues tab
      fireEvent.click(screen.getByText('Queues'));

      await waitFor(() => {
        expect(getQueuesMock).toHaveBeenCalledTimes(1);
      });

      // Enter search query
      const input = screen.getByPlaceholderText(SEARCH_PLACEHOLDER) as HTMLInputElement;
      fireEvent.change(input, {target: {value: 'test query'}});

      await act(async () => {
        jest.advanceTimersByTime(500);
      });

      // Should have called with search query
      expect(getQueuesMock).toHaveBeenCalledWith(
        expect.objectContaining({
          page: 0,
          pageSize: DEFAULT_PAGE_SIZE,
          search: 'test query',
        })
      );

      // Click reload - should reload with the same search query
      const reloadButton = screen.getByTestId('consult-reload-button');
      fireEvent.click(reloadButton);

      await waitFor(() => {
        expect(getQueuesMock).toHaveBeenCalledWith(
          expect.objectContaining({
            page: 0,
            pageSize: DEFAULT_PAGE_SIZE,
            search: 'test query',
          })
        );
      });
    });
  });

  describe('AI summary subtree', () => {
    it('renders the summary after the destination results without replacing the single search/results tree', async () => {
      const screen = render(
        <ConsultTransferPopoverComponent
          {...baseProps}
          heading="Consult"
          summary={{
            state: 'content',
            content: {conversationId: 'interaction-main-1', summaryText: 'Customer needs billing support.'},
            selectedFeedback: 'none',
            onEdit: jest.fn().mockReturnValue(true),
            onCopy: jest.fn().mockReturnValue(true),
            onFeedback: jest.fn(),
          }}
        />
      );

      expect(screen.getByPlaceholderText(SEARCH_PLACEHOLDER)).toBeInTheDocument();
      expect(screen.container.querySelectorAll('.consult-list-container')).toHaveLength(1);
      expect(screen.container.querySelectorAll('.agent-list')).toHaveLength(1);
      expect(screen.getByTestId('consult-transfer:summary')).toHaveTextContent('Customer needs billing support.');
      expect(screen.queryByDisplayValue('Customer needs billing support.')).not.toBeInTheDocument();
    });

    it('preserves the open destination tree, query, selected category and focus when the summary arrives and is revoked', async () => {
      const view = render(
        <ConsultTransferPopoverComponent
          {...baseProps}
          heading="Consult"
          isTelephony
          summary={createSummary({state: 'omitted'})}
        />
      );
      const queueRadio = view.getByRole('radio', {name: 'Queue'});
      fireEvent.click(queueRadio);
      await waitFor(() => expect(view.getByText('Queue One')).toBeInTheDocument());

      const search = await getVoiceSearchInput(view.container);
      fireEvent.input(search, {target: {value: 'qu'}, composed: true});
      const results = view.container.querySelector('.consult-list-container') as HTMLElement;
      const queueAction = view.getByRole('button', {name: 'Select Queue One'});
      act(() => {
        queueAction.focus();
      });

      expect(queueRadio).toBeChecked();
      expect(search).toHaveValue('qu');
      expect(queueAction).toHaveFocus();

      const summary = createSummary();
      view.rerender(<ConsultTransferPopoverComponent {...baseProps} heading="Consult" isTelephony summary={summary} />);

      expect(view.getByTestId('consult-transfer:summary')).toBeInTheDocument();
      expect(view.getByRole('radio', {name: 'Queue'})).toBe(queueRadio);
      expect(await getVoiceSearchInput(view.container)).toBe(search);
      expect(view.container.querySelector('.consult-list-container')).toBe(results);
      expect(view.getByRole('button', {name: 'Select Queue One'})).toBe(queueAction);
      expect(search).toHaveValue('qu');
      expect(queueRadio).toBeChecked();
      expect(queueAction).toHaveFocus();

      view.rerender(<ConsultTransferPopoverComponent {...baseProps} heading="Consult" isTelephony />);

      expect(view.queryByTestId('consult-transfer:summary')).not.toBeInTheDocument();
      expect(view.getByRole('radio', {name: 'Queue'})).toBe(queueRadio);
      expect(await getVoiceSearchInput(view.container)).toBe(search);
      expect(view.container.querySelector('.consult-list-container')).toBe(results);
      expect(view.getByRole('button', {name: 'Select Queue One'})).toBe(queueAction);
      expect(search).toHaveValue('qu');
      expect(queueRadio).toBeChecked();
      expect(queueAction).toHaveFocus();
    });

    it('renders filtered voice-radio and non-voice-pill destinations with the same selected results', async () => {
      const filterToAgentsAndQueues = {showDialNumberTab: false, showEntryPointTab: false};
      const renderTitles = (container: HTMLElement) =>
        Array.from(container.querySelectorAll('.call-control-list-item-title')).map((node) => node.textContent);

      const voice = render(
        <ConsultTransferPopoverComponent
          {...baseProps}
          heading="Consult"
          isTelephony
          summary={createSummary({state: 'omitted'})}
          consultTransferOptions={filterToAgentsAndQueues}
        />
      );
      fireEvent.click(voice.getByRole('radio', {name: 'Queue'}));
      await waitFor(() => expect(voice.getByText('Queue One')).toBeInTheDocument());
      const voiceTitles = renderTitles(voice.container);

      expect(voice.queryByRole('radio', {name: 'Dial Number'})).not.toBeInTheDocument();
      expect(voice.queryByRole('radio', {name: 'Entry Point'})).not.toBeInTheDocument();
      expect(voiceTitles).toEqual(['Queue One', 'Queue Two']);
      voice.unmount();

      const nonVoice = render(
        <ConsultTransferPopoverComponent
          {...baseProps}
          heading="Consult"
          isTelephony={false}
          consultTransferOptions={filterToAgentsAndQueues}
        />
      );
      fireEvent.click(nonVoice.getByRole('button', {name: 'Queues'}));
      await waitFor(() => expect(nonVoice.getByText('Queue One')).toBeInTheDocument());

      expect(nonVoice.queryByRole('button', {name: 'Dial Number'})).not.toBeInTheDocument();
      expect(nonVoice.queryByRole('button', {name: 'Entry Point'})).not.toBeInTheDocument();
      expect(renderTitles(nonVoice.container)).toEqual(voiceTitles);
    });

    it('should let the agent select and submit destinations while a refreshed summary is generating', async () => {
      const summary = createSummary({controlsDisabled: true});
      const view = render(
        <ConsultTransferPopoverComponent {...baseProps} heading="Consult" isTelephony summary={summary} />
      );
      const firstAgentButton = view.container.querySelector(
        'button[aria-label="Select Agent One"]'
      ) as HTMLButtonElement;

      expect(firstAgentButton).not.toHaveAttribute('aria-disabled', 'true');
      fireEvent.click(firstAgentButton);
      const submit = await view.findByRole('button', {name: 'Consult'});
      await waitFor(() => expect(submit).not.toBeDisabled());
      fireEvent.click(submit);
      expect(mockOnAgentSelect).toHaveBeenCalledWith('agent1', 'Agent One', false);
      view.unmount();
      const reopened = render(
        <ConsultTransferPopoverComponent {...baseProps} heading="Consult" isTelephony summary={summary} />
      );
      fireEvent.click(reopened.getByRole('radio', {name: 'Dial Number'}));
      const input = await getVoiceSearchInput(reopened.container);
      fireEvent.input(input, {target: {value: '1234'}, composed: true});

      expect(reopened.queryByTestId('consult-quick-action:consult')).not.toBeInTheDocument();
      const reopenedSubmit = await reopened.findByRole('button', {name: 'Consult'});
      await waitFor(() => expect(reopenedSubmit).not.toBeDisabled());
      fireEvent.click(reopenedSubmit);

      expect(baseProps.onDialNumberSelect).toHaveBeenCalled();
    });

    it('uses the provisional transfer heading only for transfer preparations', () => {
      const screen = render(
        <ConsultTransferPopoverComponent
          {...baseProps}
          heading="Transfer"
          action="Transfer"
          summary={{
            state: 'unavailable',
            content: {conversationId: 'interaction-main-1', summaryText: ''},
            selectedFeedback: 'none',
            onEdit: jest.fn().mockReturnValue(true),
            onCopy: jest.fn().mockReturnValue(false),
            onFeedback: jest.fn(),
          }}
        />
      );

      expect(screen.getByText(AI_SUMMARY_MESSAGES.midCall.transferHeading)).toBeInTheDocument();
      expect(screen.getByText(AI_SUMMARY_MESSAGES.unavailable)).toBeInTheDocument();
    });

    it('keeps the destination panel labelled when the summary subtree is removed', () => {
      const summary = {
        state: 'content' as const,
        content: {conversationId: 'interaction-main-1', summaryText: 'Customer needs billing support.'},
        selectedFeedback: 'none' as const,
        onEdit: jest.fn().mockReturnValue(true),
        onCopy: jest.fn().mockReturnValue(true),
        onFeedback: jest.fn(),
      };
      const view = render(<ConsultTransferPopoverComponent {...baseProps} heading="Consult" summary={summary} />);
      const popover = view.container.querySelector('.agent-popover-content') as HTMLElement;

      expect(view.getByText('Consult')).toBeInTheDocument();
      expect(popover).toHaveAttribute('aria-label', 'Consult');
      expect(popover).not.toHaveAttribute('tabindex');

      view.rerender(<ConsultTransferPopoverComponent {...baseProps} heading="Consult" />);

      expect(view.container.querySelector('.agent-popover-content')).toBe(popover);
      expect(popover).toHaveAttribute('aria-label', 'Consult');
      expect(view.queryByTestId('consult-transfer:summary')).not.toBeInTheDocument();
    });

    it('retains the Edit control and its focus when summary content is replaced', async () => {
      const firstContent: NonNullable<AISummaryEntry['content']> = {
        conversationId: 'interaction-main-1',
        sections: {
          initialContactReason: 'Summary value',
          nextSteps: 'Follow-up value',
        },
      };
      const followUpOnlyContent: NonNullable<AISummaryEntry['content']> = {
        conversationId: 'interaction-main-1',
        sections: {nextSteps: 'Follow-up value'},
      };
      const view = render(
        <ConsultTransferPopoverComponent
          {...baseProps}
          heading="Consult"
          summary={createSummary({content: firstContent})}
        />
      );
      const summaryPreview = await view.findByRole('button', {
        name: AI_SUMMARY_MESSAGES.editSummary,
      });
      act(() => {
        summaryPreview.focus();
      });
      expect(summaryPreview).toHaveFocus();

      view.rerender(
        <ConsultTransferPopoverComponent
          {...baseProps}
          heading="Consult"
          summary={createSummary({content: followUpOnlyContent})}
        />
      );

      await waitFor(() =>
        expect(
          view.getByRole('button', {
            name: AI_SUMMARY_MESSAGES.editSummary,
          })
        ).toHaveFocus()
      );

      expect(view.getByRole('button', {name: AI_SUMMARY_MESSAGES.editSummary})).toBe(summaryPreview);
    });

    it('preserves focus on a retained destination control when the summary is removed', async () => {
      const view = render(
        <ConsultTransferPopoverComponent {...baseProps} heading="Consult" isTelephony summary={createSummary()} />
      );
      const copy = await view.findByRole('button', {name: AI_SUMMARY_MESSAGES.copySummary});
      const destination = view.getByRole('button', {name: 'Select Agent One'});
      act(() => {
        copy.focus();
      });
      expect(copy).toHaveFocus();
      act(() => {
        destination.focus();
      });
      expect(destination).toHaveFocus();

      view.rerender(<ConsultTransferPopoverComponent {...baseProps} heading="Consult" isTelephony />);

      expect(view.getByRole('button', {name: 'Select Agent One'})).toBe(destination);
      expect(destination).toHaveFocus();
      expect(view.queryByTestId('consult-transfer:summary')).not.toBeInTheDocument();
    });
  });
});
