import React from 'react';
import {render, fireEvent, waitFor, act} from '@testing-library/react';
import '@testing-library/jest-dom';
import ConsultTransferPopoverComponent from '../../../../../src/components/task/CallControl/CallControlCustom/consult-transfer-popover';
import {ContactServiceQueue, EntryPointRecord, AddressBookEntry} from '@webex/cc-store';
import {DEFAULT_PAGE_SIZE} from '../../../../../src/components/task/constants';

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
        state: 'Available',
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
    allowConsultToQueue: true,
    loadingBuddyAgents: false,
    logger: loggerMock,
  };

  beforeEach(() => {
    jest.clearAllMocks();
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

  it('hides queue tab when allowConsultToQueue is false', async () => {
    const propsWithoutQueue = {
      ...baseProps,
      allowConsultToQueue: false,
    };

    const screen = await render(<ConsultTransferPopoverComponent {...propsWithoutQueue} />);
    const maybeQueuesButton = screen.queryByRole('button', {name: 'Queues'}) as HTMLButtonElement | null;
    expect(maybeQueuesButton).toBeNull();
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

      const input = screen.getByPlaceholderText('Search...') as HTMLInputElement;

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
      const input = screen.getByPlaceholderText('Search...') as HTMLInputElement;
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
      const input = screen.getByPlaceholderText('Search...') as HTMLInputElement;
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
});
