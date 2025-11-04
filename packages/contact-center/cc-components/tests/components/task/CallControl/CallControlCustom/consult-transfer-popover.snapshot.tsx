import React from 'react';
import '@testing-library/jest-dom';
import {render, fireEvent, act, waitFor} from '@testing-library/react';
import ConsultTransferPopoverComponent from '../../../../../src/components/task/CallControl/CallControlCustom/consult-transfer-popover';
import {ContactServiceQueue} from '@webex/cc-store';

const mockUIDProps = (container) => {
  container
    .querySelectorAll('[id^="mdc-input"]')
    .forEach((el: HTMLBaseElement) => el.setAttribute('id', 'mock-input-id'));
  container
    .querySelectorAll('[id^="mdc-tooltip"]')
    .forEach((el: HTMLBaseElement) => el.setAttribute('id', 'mock-tooltip-id'));
  container
    .querySelectorAll('[aria-describedby^="mdc-tooltip"]')
    .forEach((el: HTMLBaseElement) => el.setAttribute('aria-describedby', 'mock-aria-describedby'));
};

describe('ConsultTransferPopoverComponent Snapshots', () => {
  const mockLogger = {
    log: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    debug: jest.fn(),
    trace: jest.fn(),
  };

  const mockOnAgentSelect = jest.fn();
  const mockOnQueueSelect = jest.fn();

  const buildQueue = (id: string, name: string, description: string = 'Queue'): ContactServiceQueue => ({
    organizationId: 'org-test',
    id,
    version: 1,
    name,
    description,
    queueType: 'INBOUND',
    checkAgentAvailability: true,
    channelType: 'TELEPHONY',
    serviceLevelThreshold: 20,
    maxActiveContacts: 25,
    maxTimeInQueue: 600,
    defaultMusicInQueueMediaFileId: 'media-1',
    active: true,
    monitoringPermitted: true,
    parkingPermitted: true,
    recordingPermitted: true,
    recordingAllCallsPermitted: true,
    pauseRecordingPermitted: true,
    controlFlowScriptUrl: 'https://example.com/flow',
    ivrRequeueUrl: 'https://example.com/requeue',
    routingType: 'LONGEST_AVAILABLE_AGENT',
    queueRoutingType: 'TEAM_BASED',
    callDistributionGroups: [],
  });

  const defaultProps = {
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
    getQueues: async () => ({data: [buildQueue('queue1', 'Queue One')], meta: {page: 0, totalPages: 1}}),
    onAgentSelect: mockOnAgentSelect,
    onQueueSelect: mockOnQueueSelect,
    allowConsultToQueue: true,
    logger: mockLogger,
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Rendering - Tests for UI elements and visual states of ConsultTransferPopoverComponent component', () => {
    it('should render the component with heading and category buttons', async () => {
      let screen;
      await act(async () => {
        screen = render(<ConsultTransferPopoverComponent {...defaultProps} heading="Consult" />);
      });
      expect(screen.getByText('Consult')).toBeInTheDocument();
      const btns = Array.from(screen.container.querySelectorAll('button')).map(
        (b) => (b as HTMLButtonElement).textContent
      );
      expect(btns).toEqual(expect.arrayContaining(['Agents', 'Queues', 'Dial Number', 'Entry Point']));
      const container = screen.container.querySelector('.agent-popover-content');
      mockUIDProps(container);
      expect(container).toMatchSnapshot();
    });

    it('should render without errors when rendered with minimal props', async () => {
      let screen;
      await act(async () => {
        screen = render(<ConsultTransferPopoverComponent {...defaultProps} />);
      });
      const container = screen.container.querySelector('.agent-popover-content');
      mockUIDProps(container);
      expect(container).toBeInTheDocument();
      expect(container).toMatchSnapshot();
    });

    it('should render with different heading', async () => {
      const customHeadingProps = {...defaultProps, heading: 'Choose Transfer Target'};
      let screen;
      await act(async () => {
        screen = render(<ConsultTransferPopoverComponent {...customHeadingProps} />);
      });
      expect(screen.getByText('Choose Transfer Target')).toBeInTheDocument();
      const container = screen.container.querySelector('.agent-popover-content');
      mockUIDProps(container);
      expect(container).toMatchSnapshot();
    });

    it('should render with empty agents list', async () => {
      const emptyAgentsProps = {...defaultProps, buddyAgents: []};
      let screen;
      await act(async () => {
        screen = render(<ConsultTransferPopoverComponent {...emptyAgentsProps} />);
      });
      const emptyState = screen.container.querySelector('.consult-empty-message');
      expect(emptyState?.textContent).toBe('No data available for consult transfer.');
      const container = screen.container.querySelector('.agent-popover-content');
      mockUIDProps(container);
      expect(container).toMatchSnapshot();
    });

    it('should render with empty queues list', async () => {
      const emptyQueuesProps = {
        ...defaultProps,
        getQueues: async () => ({data: [], meta: {page: 0, totalPages: 0}}),
      };
      let screen;
      await act(async () => {
        screen = render(<ConsultTransferPopoverComponent {...emptyQueuesProps} />);
      });

      const queuesButton = Array.from(screen.container.querySelectorAll('button')).find(
        (btn) => (btn as HTMLButtonElement).textContent === 'Queues'
      ) as HTMLButtonElement | undefined;
      if (queuesButton) fireEvent.click(queuesButton);
      const list = screen.container.querySelector('.agent-list');
      expect(list).toBeNull();
      expect(screen.container.querySelectorAll('.call-control-list-item').length).toBe(0);
      const container = screen.container.querySelector('.agent-popover-content');
      mockUIDProps(container);
      expect(container).toMatchSnapshot();
    });

    it('should render with allowConsultToQueue false', async () => {
      const noQueueConsultProps = {...defaultProps, allowConsultToQueue: false};
      let screen;
      await act(async () => {
        screen = render(<ConsultTransferPopoverComponent {...noQueueConsultProps} />);
      });

      const queuesButton = Array.from(screen.container.querySelectorAll('button')).find((btn) => {
        const el = btn as HTMLButtonElement;
        return el && el.textContent === 'Queues';
      }) as HTMLButtonElement | undefined;
      expect(queuesButton).toBeUndefined();
      const container = screen.container.querySelector('.agent-popover-content');
      mockUIDProps(container);
      expect(container).toMatchSnapshot();
    });

    it('should render with custom empty message', async () => {
      const customEmptyProps = {
        ...defaultProps,
        buddyAgents: [],
        getQueues: async () => ({data: [], meta: {page: 0, totalPages: 0}}),
      };
      let screen;
      await act(async () => {
        screen = render(<ConsultTransferPopoverComponent {...customEmptyProps} />);
      });

      const emptyState = screen.container.querySelector('.consult-empty-state');
      expect(emptyState).toBeInTheDocument();
      expect(screen.getByText('No data available for consult transfer.')).toBeInTheDocument();
      const container = screen.container.querySelector('.agent-popover-content');
      mockUIDProps(container);
      expect(container).toMatchSnapshot();
    });

    it('should render with single agent', async () => {
      const singleAgentProps = {
        ...defaultProps,
        buddyAgents: [
          {
            agentId: 'agent1',
            agentName: 'Single Agent',
            dn: '1001',
            state: 'Available',
            teamId: 'team1',
            siteId: 'site1',
          },
        ],
      };
      let screen;
      await act(async () => {
        screen = render(<ConsultTransferPopoverComponent {...singleAgentProps} />);
      });

      const singleAgentItem = screen.container.querySelector('[aria-label="Single Agent"]');
      expect(singleAgentItem).toBeInTheDocument();
      const container = screen.container.querySelector('.agent-popover-content');
      mockUIDProps(container);
      expect(container).toMatchSnapshot();
    });

    it('should render with single queue', async () => {
      const singleQueueProps = {
        ...defaultProps,
        getQueues: async () => ({
          data: [buildQueue('queue1', 'Single Queue')],
          meta: {page: 0, totalPages: 1},
        }),
      };
      let screen;
      await act(async () => {
        screen = render(<ConsultTransferPopoverComponent {...singleQueueProps} />);
      });

      const queuesButton = Array.from(screen.container.querySelectorAll('button')).find((btn) => {
        const el = btn as HTMLButtonElement;
        return el && el.textContent === 'Queues';
      }) as HTMLButtonElement | undefined;
      if (queuesButton) fireEvent.click(queuesButton);
      await waitFor(() => expect(screen.container.querySelector('[aria-label="Single Queue"]')).toBeInTheDocument());
      const container = screen.container.querySelector('.agent-popover-content');
      mockUIDProps(container);
      expect(container).toMatchSnapshot();
    });

    it('should render with agents having different states', async () => {
      const mixedStateAgentsProps = {
        ...defaultProps,
        buddyAgents: [
          {
            agentId: 'agent1',
            agentName: 'Available Agent',
            dn: '1001',
            state: 'Available',
            teamId: 'team1',
            siteId: 'site1',
          },
          {
            agentId: 'agent2',
            agentName: 'Busy Agent',
            dn: '1002',
            state: 'Busy',
            teamId: 'team1',
            siteId: 'site1',
          },
          {
            agentId: 'agent3',
            agentName: 'Idle Agent',
            dn: '1003',
            state: 'Idle',
            teamId: 'team1',
            siteId: 'site1',
          },
        ],
      };
      let screen;
      await act(async () => {
        screen = render(<ConsultTransferPopoverComponent {...mixedStateAgentsProps} />);
      });

      const container = screen.container.querySelector('.agent-popover-content');
      mockUIDProps(container);
      expect(container).toMatchSnapshot();
    });
  });

  describe('Interactions', () => {
    it('should render component after switching to queues tab', async () => {
      let renderResult;
      await act(async () => {
        renderResult = render(<ConsultTransferPopoverComponent {...defaultProps} />);
      });

      const queuesButton1 = Array.from(renderResult.container.querySelectorAll('button')).find((btn) => {
        const el = btn as HTMLButtonElement;
        return el && el.textContent === 'Queues';
      }) as HTMLButtonElement | undefined;
      if (queuesButton1) {
        fireEvent.click(queuesButton1);
      }

      await waitFor(() => expect(renderResult.container.querySelector('[aria-label="Queue One"]')).toBeInTheDocument());
      const container = renderResult.container.querySelector('.agent-popover-content');
      mockUIDProps(container);
      expect(container).toMatchSnapshot();
    });

    it('should render component after agent selection', async () => {
      let renderResult;
      await act(async () => {
        renderResult = render(<ConsultTransferPopoverComponent {...defaultProps} />);
      });

      const firstAgentButton = renderResult.container.querySelectorAll('.call-control-list-item button')[0];
      if (firstAgentButton) fireEvent.click(firstAgentButton);
      expect(mockOnAgentSelect).toHaveBeenCalled();
      const container = renderResult.container.querySelector('.agent-popover-content');
      mockUIDProps(container);
      expect(container).toMatchSnapshot();
    });

    it('should render component after queue selection', async () => {
      let renderResult;
      await act(async () => {
        renderResult = render(<ConsultTransferPopoverComponent {...defaultProps} />);
      });

      // Switch to queues tab first
      const queuesButton2 = Array.from(renderResult.container.querySelectorAll('button')).find((btn) => {
        const el = btn as HTMLButtonElement;
        return el && el.textContent === 'Queues';
      }) as HTMLButtonElement | undefined;
      if (queuesButton2) {
        fireEvent.click(queuesButton2);
      }

      // Then click on a queue's action button
      await waitFor(() =>
        expect(renderResult.container.querySelectorAll('.call-control-list-item button').length).toBeGreaterThan(0)
      );
      const firstQueueButton = renderResult.container.querySelectorAll('.call-control-list-item button')[0];
      if (firstQueueButton) fireEvent.click(firstQueueButton);
      expect(mockOnQueueSelect).toHaveBeenCalled();
      const container = renderResult.container.querySelector('.agent-popover-content');
      mockUIDProps(container);
      expect(container).toMatchSnapshot();
    });
  });

  describe('State Management', () => {
    it('should update when heading changes', async () => {
      let renderResult;
      await act(async () => {
        renderResult = render(<ConsultTransferPopoverComponent {...defaultProps} />);
      });

      renderResult.rerender(<ConsultTransferPopoverComponent {...defaultProps} heading="New Heading" />);
      expect(renderResult.getByText('New Heading')).toBeInTheDocument();
      const container = renderResult.container.querySelector('.agent-popover-content');
      mockUIDProps(container);
      expect(container).toMatchSnapshot();
    });

    it('should update when agents list changes', async () => {
      let renderResult;
      await act(async () => {
        renderResult = render(<ConsultTransferPopoverComponent {...defaultProps} />);
      });

      const newAgents = [
        {
          agentId: 'newAgent1',
          agentName: 'New Agent One',
          dn: '2001',
          state: 'Available',
          teamId: 'team2',
          siteId: 'site2',
        },
      ];
      renderResult.rerender(<ConsultTransferPopoverComponent {...defaultProps} buddyAgents={newAgents} />);
      const updated = renderResult.container.querySelector('[aria-label="New Agent One"]');
      expect(updated).toBeInTheDocument();
      const container = renderResult.container.querySelector('.agent-popover-content');
      mockUIDProps(container);
      expect(container).toMatchSnapshot();
    });

    it('should update when queues list changes', async () => {
      let renderResult;
      await act(async () => {
        renderResult = render(<ConsultTransferPopoverComponent {...defaultProps} />);
      });

      const newQueues = [buildQueue('newQueue1', 'New Queue One')];
      renderResult.rerender(
        <ConsultTransferPopoverComponent
          {...defaultProps}
          getQueues={async () => ({data: newQueues, meta: {page: 0, totalPages: 1}})}
        />
      );
      const queuesButton = Array.from(renderResult.container.querySelectorAll('button')).find((btn) => {
        const el = btn as HTMLButtonElement;
        return el && el.textContent === 'Queues';
      }) as HTMLButtonElement | undefined;
      if (queuesButton) fireEvent.click(queuesButton);
      await waitFor(() =>
        expect(renderResult.container.querySelector('[aria-label="New Queue One"]').textContent).toBeDefined()
      );
      const newQueue = renderResult.container.querySelector('[aria-label="New Queue One"]');
      expect(newQueue).toBeInTheDocument();
      const container = renderResult.container.querySelector('.agent-popover-content');
      mockUIDProps(container);
      expect(container).toMatchSnapshot();
    });
  });
});
