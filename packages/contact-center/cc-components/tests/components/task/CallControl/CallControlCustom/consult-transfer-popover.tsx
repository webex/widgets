import React from 'react';
import {render, fireEvent, waitFor, act} from '@testing-library/react';
import '@testing-library/jest-dom';
import ConsultTransferPopoverComponent from '../../../../../src/components/task/CallControl/CallControlCustom/consult-transfer-popover';
import {
  AddressBookEntry,
  AISummaryContent,
  ContactServiceQueue,
  EntryPointRecord,
  TaskUIControls,
} from '@webex/cc-store';
import {
  DEFAULT_PAGE_SIZE,
  NO_DATA_AVAILABLE_CONSULT_TRANSFER,
  SEARCH_PLACEHOLDER,
} from '../../../../../src/components/task/constants';
import {AI_SUMMARY_MESSAGES} from '../../../../../src/components/AISummary';

type AvailableDestinations = TaskUIControls['consultTransferDestinations']['consult'];

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

  it('uses capability-filtered voice radios before search and keeps nonvoice pills', async () => {
    const view = render(<ConsultTransferPopoverComponent {...baseProps} isTelephony />);
    const radios = view.getAllByRole('radio');
    expect(radios).toHaveLength(4);
    expect(view.getByRole('radio', {name: 'Agent'})).toBeChecked();
    expect(view.getByRole('radio', {name: 'Dial number'})).toBeInTheDocument();
    expect(view.getByRole('radio', {name: 'Entry point'})).toBeInTheDocument();
    expect(view.container.querySelectorAll('ul.agent-list > li')).toHaveLength(2);
    expect(view.container.querySelector('ul.agent-list > div')).not.toBeInTheDocument();
    expect(view.container.querySelector('.consult-list-container')).toHaveAttribute('tabindex', '0');
    const group = view.getByRole('radiogroup', {name: AI_SUMMARY_MESSAGES.midCall.destinationCategory});
    expect(
      group.compareDocumentPosition(view.getByPlaceholderText(/Search by name/)) & Node.DOCUMENT_POSITION_FOLLOWING
    ).toBeTruthy();
    expect(view.getByRole('textbox', {name: AI_SUMMARY_MESSAGES.midCall.searchDestinations})).toBeInTheDocument();
    expect(view.getByPlaceholderText(AI_SUMMARY_MESSAGES.midCall.searchPlaceholder)).toBeInTheDocument();
    expect(view.queryByTestId('consult-reload-button')).not.toBeInTheDocument();
    expect(view.getByText('1001')).toBeInTheDocument();
    fireEvent.click(view.getByRole('radio', {name: 'Queues'}));
    await waitFor(() => expect(view.getByText('Queue One')).toBeInTheDocument());
    expect(view.getByRole('radio', {name: 'Queues'})).toBeChecked();
    view.rerender(<ConsultTransferPopoverComponent {...baseProps} isTelephony availableDestinations={['agent']} />);
    expect(view.getAllByRole('radio')).toHaveLength(1);
    expect(view.queryByText('Organization')).not.toBeInTheDocument();
    view.rerender(<ConsultTransferPopoverComponent {...baseProps} isTelephony={false} />);
    expect(view.getByRole('radiogroup', {name: AI_SUMMARY_MESSAGES.midCall.destinationCategory})).toBeInTheDocument();
    view.unmount();

    const nonVoice = render(<ConsultTransferPopoverComponent {...baseProps} isTelephony={false} />);
    expect(nonVoice.queryByRole('radiogroup')).not.toBeInTheDocument();
    expect(nonVoice.getByRole('button', {name: 'Agents'})).toBeInTheDocument();
    expect(nonVoice.getByPlaceholderText(SEARCH_PLACEHOLDER)).toBeInTheDocument();
    expect(nonVoice.getByTestId('consult-reload-button')).toBeInTheDocument();
    expect(nonVoice.queryByText('1001')).not.toBeInTheDocument();
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

  it('requests agents from the mounted popover when the Agents category opens empty', async () => {
    const loadBuddyAgents = jest.fn().mockResolvedValue(undefined);

    render(
      <ConsultTransferPopoverComponent {...baseProps} buddyAgents={[]} loadBuddyAgents={loadBuddyAgents} isTelephony />
    );

    await waitFor(() => expect(loadBuddyAgents).toHaveBeenCalledTimes(1));
    expect(loadBuddyAgents).toHaveBeenCalledWith('Consult');
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
    const createSummary = (overrides = {}) => ({
      state: 'content' as const,
      content: {type: 'text' as const, summaryText: 'Customer needs billing support.'},
      contentRevision: 18,
      actionType: 'CONSULT' as const,
      selectedFeedback: 'none' as const,
      onViewed: jest.fn().mockReturnValue(true),
      onEdit: jest.fn(),
      onCopy: jest.fn().mockReturnValue(true),
      onFeedback: jest.fn().mockResolvedValue({outcome: 'confirmed'}),
      ...overrides,
    });

    it('auto-starts the matching mid-call summary request and observes rejection', async () => {
      const requestMidCallSummary = jest.fn().mockRejectedValue(new Error('transport'));

      render(
        <ConsultTransferPopoverComponent
          {...baseProps}
          heading="Transfer"
          action="Transfer"
          isTelephony
          requestMidCallSummary={requestMidCallSummary}
        />
      );

      await waitFor(() => expect(requestMidCallSummary).toHaveBeenCalledWith('TRANSFER'));
      await waitFor(() =>
        expect(loggerMock.warn).toHaveBeenCalledWith('CC-Widgets: CallControl: AI summary request did not complete', {
          module: 'consult-transfer-popover.tsx',
          method: 'requestMidCallSummary',
        })
      );
    });

    it('renders the summary after the destination results without replacing the single search/results tree', async () => {
      const screen = render(
        <ConsultTransferPopoverComponent
          {...baseProps}
          heading="Consult"
          summary={{
            state: 'content',
            content: {type: 'text', summaryText: 'Customer needs billing support.'},
            contentRevision: 11,
            actionType: 'CONSULT',
            selectedFeedback: 'none',
            onViewed: jest.fn().mockReturnValue(true),
            onEdit: jest.fn(),
            onCopy: jest.fn().mockReturnValue(true),
            onFeedback: jest.fn().mockResolvedValue({outcome: 'confirmed'}),
          }}
        />
      );

      expect(screen.getByPlaceholderText(SEARCH_PLACEHOLDER)).toBeInTheDocument();
      expect(screen.container.querySelectorAll('.consult-list-container')).toHaveLength(1);
      expect(screen.container.querySelectorAll('.agent-list')).toHaveLength(1);
      expect(screen.getByTestId('consult-transfer:summary')).toHaveTextContent(AI_SUMMARY_MESSAGES.plainSummary);
      expect(screen.getByDisplayValue('Customer needs billing support.')).toBeInTheDocument();
    });

    it('preserves the open destination tree, query, selected category and focus when the summary arrives and is revoked', async () => {
      const view = render(
        <ConsultTransferPopoverComponent {...baseProps} heading="Consult" isTelephony requestSummaryOnOpen={false} />
      );
      const queueRadio = view.getByRole('radio', {name: 'Queues'});
      fireEvent.click(queueRadio);
      await waitFor(() => expect(view.getByText('Queue One')).toBeInTheDocument());

      const search = view.getByRole('textbox', {
        name: AI_SUMMARY_MESSAGES.midCall.searchDestinations,
      }) as HTMLInputElement;
      fireEvent.change(search, {target: {value: 'qu'}});
      const results = view.container.querySelector('.consult-list-container') as HTMLElement;
      const queueAction = view.getByRole('button', {name: 'Select Queue One'});
      act(() => {
        queueAction.focus();
      });

      expect(queueRadio).toBeChecked();
      expect(search).toHaveValue('qu');
      expect(queueAction).toHaveFocus();

      const summary = createSummary({contentRevision: 41});
      view.rerender(
        <ConsultTransferPopoverComponent
          {...baseProps}
          heading="Consult"
          isTelephony
          requestSummaryOnOpen={false}
          summary={summary}
        />
      );

      expect(view.getByTestId('consult-transfer:summary')).toBeInTheDocument();
      expect(view.getByRole('radio', {name: 'Queues'})).toBe(queueRadio);
      expect(view.getByRole('textbox', {name: AI_SUMMARY_MESSAGES.midCall.searchDestinations})).toBe(search);
      expect(view.container.querySelector('.consult-list-container')).toBe(results);
      expect(view.getByRole('button', {name: 'Select Queue One'})).toBe(queueAction);
      expect(search).toHaveValue('qu');
      expect(queueRadio).toBeChecked();
      expect(queueAction).toHaveFocus();

      view.rerender(
        <ConsultTransferPopoverComponent {...baseProps} heading="Consult" isTelephony requestSummaryOnOpen={false} />
      );

      expect(view.queryByTestId('consult-transfer:summary')).not.toBeInTheDocument();
      expect(view.getByRole('radio', {name: 'Queues'})).toBe(queueRadio);
      expect(view.getByRole('textbox', {name: AI_SUMMARY_MESSAGES.midCall.searchDestinations})).toBe(search);
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
          consultTransferOptions={filterToAgentsAndQueues}
        />
      );
      fireEvent.click(voice.getByRole('radio', {name: 'Queues'}));
      await waitFor(() => expect(voice.getByText('Queue One')).toBeInTheDocument());
      const voiceTitles = renderTitles(voice.container);

      expect(voice.queryByRole('radio', {name: 'Dial number'})).not.toBeInTheDocument();
      expect(voice.queryByRole('radio', {name: 'Entry point'})).not.toBeInTheDocument();
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

    it('records content reveals once per visible revision per popover opening', async () => {
      const onViewed = jest.fn().mockReturnValue(true);
      const summary = createSummary({onViewed});
      const view = render(<ConsultTransferPopoverComponent {...baseProps} heading="Consult" summary={summary} />);

      await waitFor(() => expect(onViewed).toHaveBeenCalledWith(18));
      expect(onViewed).toHaveBeenCalledTimes(1);

      view.rerender(<ConsultTransferPopoverComponent {...baseProps} heading="Consult" summary={{...summary}} />);
      expect(onViewed).toHaveBeenCalledTimes(1);

      view.rerender(
        <ConsultTransferPopoverComponent {...baseProps} heading="Consult" summary={{...summary, contentRevision: 19}} />
      );

      await waitFor(() => expect(onViewed).toHaveBeenCalledTimes(2));
      expect(onViewed).toHaveBeenLastCalledWith(19);

      view.rerender(
        <ConsultTransferPopoverComponent
          {...baseProps}
          heading="Consult"
          summary={{...summary, state: 'generating' as const, contentRevision: 20}}
        />
      );
      expect(onViewed).toHaveBeenCalledTimes(2);

      view.unmount();
      render(<ConsultTransferPopoverComponent {...baseProps} heading="Consult" summary={summary} />);
      await waitFor(() => expect(onViewed).toHaveBeenCalledTimes(3));
    });

    it('does not count an accepted local edit as a view but counts the next generated revision', () => {
      const onViewed = jest.fn().mockReturnValue(true);
      const initial = createSummary({onViewed, content: {type: 'text', summaryText: 'Initial summary'}});
      let publish: React.Dispatch<React.SetStateAction<typeof initial>> = () => undefined;
      const Harness = () => {
        const [summary, setSummary] = React.useState(initial);
        publish = setSummary;
        return (
          <ConsultTransferPopoverComponent
            {...baseProps}
            heading="Consult"
            summary={{
              ...summary,
              onEdit: (field, revision) => {
                setSummary({
                  ...summary,
                  contentRevision: revision + 1,
                  content: {type: 'text', summaryText: field.value},
                });
                return true;
              },
            }}
          />
        );
      };
      const view = render(<Harness />);
      expect(onViewed.mock.calls).toEqual([[18]]);
      fireEvent.change(view.getByRole('textbox', {name: AI_SUMMARY_MESSAGES.plainSummary}), {
        target: {value: 'Local edit'},
      });
      expect(onViewed.mock.calls).toEqual([[18]]);
      act(() =>
        publish({...initial, contentRevision: 20, content: {type: 'text', summaryText: 'New generated summary'}})
      );
      expect(onViewed.mock.calls).toEqual([[18], [20]]);
    });

    it('keeps pending destination and quick actions focusable but inert', async () => {
      const summary = createSummary({requestPending: true});
      const view = render(<ConsultTransferPopoverComponent {...baseProps} heading="Consult" summary={summary} />);
      const firstAgentButton = view.container.querySelector(
        'button[aria-label="Select Agent One"]'
      ) as HTMLButtonElement;

      expect(firstAgentButton).toHaveAttribute('aria-disabled', 'true');
      expect(firstAgentButton).not.toBeDisabled();

      act(() => {
        firstAgentButton.focus();
      });
      fireEvent.click(firstAgentButton);
      expect(firstAgentButton).toHaveFocus();
      expect(mockOnAgentSelect).not.toHaveBeenCalled();

      fireEvent.click(view.getByRole('button', {name: 'Dial Number'}));
      const input = view.getByRole('textbox', {
        name: AI_SUMMARY_MESSAGES.midCall.searchDestinations,
      }) as HTMLInputElement;
      fireEvent.change(input, {target: {value: '1234'}});

      const quickAction = await view.findByTestId('consult-quick-action:consult');
      expect(quickAction).toHaveAttribute('aria-disabled', 'true');
      expect(quickAction).not.toBeDisabled();

      act(() => {
        quickAction.focus();
      });
      fireEvent.click(quickAction);

      expect(quickAction).toHaveFocus();
      expect(baseProps.onDialNumberSelect).not.toHaveBeenCalled();
    });

    it.each([
      ['Consult', 'CONSULT'],
      ['Transfer', 'TRANSFER'],
    ] as const)('shows a first pending %s summary and keeps destination activation inert', (heading, actionType) => {
      const onAgentSelect = jest.fn();
      const summary = createSummary({
        state: 'generating' as const,
        content: {type: 'text' as const, summaryText: ''},
        contentRevision: 0,
        actionType,
        requestPending: true,
        controlsDisabled: true,
      });
      const view = render(
        <ConsultTransferPopoverComponent
          {...baseProps}
          heading={heading}
          action={heading}
          onAgentSelect={onAgentSelect}
          summary={summary}
        />
      );
      const firstAgentButton = view.container.querySelector(
        'button[aria-label="Select Agent One"]'
      ) as HTMLButtonElement;

      expect(view.getByTestId('consult-transfer:summary')).toHaveTextContent(AI_SUMMARY_MESSAGES.generatingTitle);
      expect(firstAgentButton).toHaveAttribute('aria-disabled', 'true');
      expect(firstAgentButton).not.toBeDisabled();

      act(() => {
        firstAgentButton.focus();
      });
      fireEvent.keyDown(firstAgentButton, {key: 'Enter', code: 'Enter'});
      fireEvent.keyUp(firstAgentButton, {key: 'Enter', code: 'Enter'});
      fireEvent.click(firstAgentButton);

      expect(firstAgentButton).toHaveFocus();
      expect(onAgentSelect).not.toHaveBeenCalled();
    });

    it('uses the provisional transfer heading only for transfer preparations', () => {
      const screen = render(
        <ConsultTransferPopoverComponent
          {...baseProps}
          heading="Transfer"
          action="Transfer"
          summary={{
            state: 'unavailable',
            content: {type: 'text', summaryText: ''},
            contentRevision: 0,
            actionType: 'TRANSFER',
            selectedFeedback: 'none',
            onViewed: jest.fn().mockReturnValue(true),
            onEdit: jest.fn(),
            onCopy: jest.fn().mockReturnValue(false),
            onFeedback: jest.fn().mockResolvedValue({outcome: 'blocked'}),
          }}
        />
      );

      expect(screen.getByText(AI_SUMMARY_MESSAGES.midCall.transferHeading)).toBeInTheDocument();
      expect(screen.getByText(AI_SUMMARY_MESSAGES.unavailable)).toBeInTheDocument();
    });

    it('restores focus to the labelled popover root when the summary subtree is removed', async () => {
      const summary = {
        state: 'content' as const,
        content: {type: 'text' as const, summaryText: 'Customer needs billing support.'},
        contentRevision: 12,
        actionType: 'CONSULT' as const,
        selectedFeedback: 'none' as const,
        onViewed: jest.fn().mockReturnValue(true),
        onEdit: jest.fn(),
        onCopy: jest.fn().mockReturnValue(true),
        onFeedback: jest.fn().mockResolvedValue({outcome: 'confirmed'}),
      };
      const view = render(<ConsultTransferPopoverComponent {...baseProps} heading="Consult" summary={summary} />);
      const popover = view.container.querySelector('.agent-popover-content') as HTMLElement;
      const heading = view.container.querySelector('.agent-popover-title') as HTMLElement;

      expect(popover).toHaveAttribute('tabindex', '-1');
      expect(heading.id).toMatch(/^consult-transfer-popover-heading-/);
      expect(popover).toHaveAttribute('aria-labelledby', heading.id);

      const copy = view.getByRole('button', {name: AI_SUMMARY_MESSAGES.copySummary});
      act(() => {
        copy.focus();
      });
      expect(copy).toHaveFocus();

      view.rerender(<ConsultTransferPopoverComponent {...baseProps} heading="Consult" />);

      await waitFor(() => expect(popover).toHaveFocus());
      expect(view.queryByTestId('consult-transfer:summary')).not.toBeInTheDocument();
    });

    it('moves focus to the next summary control on content replacement and the popover root when controls disappear', async () => {
      const firstContent: AISummaryContent = {
        type: 'sections',
        sections: [
          {key: 'initialContactReason', value: 'Summary value', editable: true},
          {key: 'nextSteps', value: 'Follow-up value', editable: true},
        ],
      };
      const followUpOnlyContent: AISummaryContent = {
        type: 'sections',
        sections: [{key: 'nextSteps', value: 'Follow-up value', editable: true}],
      };
      const view = render(
        <ConsultTransferPopoverComponent
          {...baseProps}
          heading="Consult"
          summary={createSummary({content: firstContent, contentRevision: 61})}
        />
      );
      const popover = view.container.querySelector('.agent-popover-content') as HTMLElement;
      const summaryPreview = view.getByRole('button', {
        name: AI_SUMMARY_MESSAGES.editSectionLabel(AI_SUMMARY_MESSAGES.sectionLabels.initialContactReason),
      });
      act(() => {
        summaryPreview.focus();
      });
      expect(summaryPreview).toHaveFocus();

      view.rerender(
        <ConsultTransferPopoverComponent
          {...baseProps}
          heading="Consult"
          summary={createSummary({content: followUpOnlyContent, contentRevision: 62})}
        />
      );

      await waitFor(() =>
        expect(
          view.getByRole('button', {
            name: AI_SUMMARY_MESSAGES.editSectionLabel(AI_SUMMARY_MESSAGES.sectionLabels.nextSteps),
          })
        ).toHaveFocus()
      );

      const copy = view.getByRole('button', {name: AI_SUMMARY_MESSAGES.copySummary});
      act(() => {
        copy.focus();
      });
      expect(copy).toHaveFocus();

      view.rerender(
        <ConsultTransferPopoverComponent
          {...baseProps}
          heading="Consult"
          summary={createSummary({
            state: 'unavailable' as const,
            content: {type: 'text' as const, summaryText: ''},
            contentRevision: 63,
          })}
        />
      );

      await waitFor(() => expect(popover).toHaveFocus());
    });

    it('returns focus to the opening trigger when the latched voice popover is closed', async () => {
      const Harness = () => {
        const openerRef = React.useRef<HTMLButtonElement>(null);
        const [isOpen, setIsOpen] = React.useState(true);

        return (
          <>
            <button type="button" ref={openerRef} onClick={() => setIsOpen(true)}>
              Open Consult
            </button>
            {isOpen && (
              <ConsultTransferPopoverComponent
                {...baseProps}
                heading="Consult"
                isTelephony
                onClose={() => {
                  setIsOpen(false);
                  openerRef.current?.focus();
                }}
              />
            )}
          </>
        );
      };

      const view = render(<Harness />);
      const opener = view.getByRole('button', {name: 'Open Consult'});
      act(() => {
        opener.focus();
      });
      fireEvent.click(view.getByRole('button', {name: 'Close popover'}));

      await waitFor(() => expect(opener).toHaveFocus());
      expect(view.queryByText('Agent One')).not.toBeInTheDocument();
    });

    it('renders the existing-party action variant without destination controls and guards pending confirmation', async () => {
      const onExistingPartyConfirm = jest.fn();
      const requestMidCallSummary = jest.fn().mockResolvedValue({outcome: 'accepted', revision: 18});
      const summary = {
        state: 'content' as const,
        content: {type: 'text' as const, summaryText: 'Customer needs billing support.'},
        contentRevision: 18,
        actionType: 'TRANSFER' as const,
        selectedFeedback: 'none' as const,
        onViewed: jest.fn().mockReturnValue(true),
        onEdit: jest.fn(),
        onCopy: jest.fn().mockReturnValue(true),
        onFeedback: jest.fn().mockResolvedValue({outcome: 'confirmed'}),
      };
      const view = render(
        <ConsultTransferPopoverComponent
          {...baseProps}
          destinationLayout="existing-party-action"
          heading="Transfer Conference"
          action="Transfer"
          availableDestinations={[]}
          summary={summary}
          requestMidCallSummary={requestMidCallSummary}
          existingPartyConfirmLabel="Transfer Conference"
          onExistingPartyConfirm={onExistingPartyConfirm}
        />
      );

      expect(view.queryByRole('radiogroup')).not.toBeInTheDocument();
      expect(
        view.queryByRole('textbox', {name: AI_SUMMARY_MESSAGES.midCall.searchDestinations})
      ).not.toBeInTheDocument();
      expect(view.queryByText(NO_DATA_AVAILABLE_CONSULT_TRANSFER)).not.toBeInTheDocument();
      expect(view.getByTestId('consult-transfer:summary')).toBeInTheDocument();
      await waitFor(() => expect(requestMidCallSummary).toHaveBeenCalledWith('TRANSFER'));

      fireEvent.click(view.getByTestId('consult-transfer:existing-party-confirm'));
      expect(onExistingPartyConfirm).toHaveBeenCalledTimes(1);

      view.rerender(
        <ConsultTransferPopoverComponent
          {...baseProps}
          destinationLayout="existing-party-action"
          heading="Transfer Conference"
          action="Transfer"
          availableDestinations={[]}
          summary={summary}
          requestMidCallSummary={requestMidCallSummary}
          existingPartyConfirmLabel="Transfer Conference"
          onExistingPartyConfirm={onExistingPartyConfirm}
          isActionPending
        />
      );

      const pendingConfirm = view.getByTestId('consult-transfer:existing-party-confirm');
      expect(pendingConfirm).toHaveAttribute('aria-disabled', 'true');
      fireEvent.click(pendingConfirm);
      expect(onExistingPartyConfirm).toHaveBeenCalledTimes(1);

      view.rerender(
        <ConsultTransferPopoverComponent
          {...baseProps}
          destinationLayout="existing-party-action"
          heading="Transfer Conference"
          action="Transfer"
          availableDestinations={[]}
          summary={{...summary, requestPending: true}}
          requestMidCallSummary={requestMidCallSummary}
          existingPartyConfirmLabel="Transfer Conference"
          onExistingPartyConfirm={onExistingPartyConfirm}
        />
      );

      const requestPendingConfirm = view.getByTestId('consult-transfer:existing-party-confirm');
      expect(requestPendingConfirm).toHaveAttribute('aria-disabled', 'true');
      expect(requestPendingConfirm).not.toBeDisabled();

      act(() => {
        requestPendingConfirm.focus();
      });
      fireEvent.click(requestPendingConfirm);

      expect(requestPendingConfirm).toHaveFocus();
      expect(onExistingPartyConfirm).toHaveBeenCalledTimes(1);
    });
  });
});
