import React from 'react';
import '@testing-library/jest-dom';
import {render, fireEvent, act} from '@testing-library/react';
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
    queues: [
      {id: 'queue1', name: 'Queue One'} as ContactServiceQueue,
      {id: 'queue2', name: 'Queue Two'} as ContactServiceQueue,
    ],
    onAgentSelect: mockOnAgentSelect,
    onQueueSelect: mockOnQueueSelect,
    allowConsultToQueue: true,
    logger: mockLogger,
    showTabs: true,
    emptyMessage: 'No agents or queues available',
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Rendering - Tests for UI elements and visual states of ConsultTransferPopoverComponent component', () => {
    it('should render the component with tabs and agents', async () => {
      let screen;
      await act(async () => {
        screen = render(<ConsultTransferPopoverComponent {...defaultProps} />);
      });

      const container = screen.container.querySelector('.agent-popover-content');
      mockUIDProps(container);
      expect(container).toMatchSnapshot();
    });

    it('should render without tabs when showTabs is false', async () => {
      const noTabsProps = {...defaultProps, showTabs: false};
      let screen;
      await act(async () => {
        screen = render(<ConsultTransferPopoverComponent {...noTabsProps} />);
      });

      const container = screen.container.querySelector('.agent-popover-content');
      mockUIDProps(container);
      expect(container).toMatchSnapshot();
    });

    it('should render with different heading', async () => {
      const customHeadingProps = {...defaultProps, heading: 'Choose Transfer Target'};
      let screen;
      await act(async () => {
        screen = render(<ConsultTransferPopoverComponent {...customHeadingProps} />);
      });

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

      const container = screen.container.querySelector('.agent-popover-content');
      mockUIDProps(container);
      expect(container).toMatchSnapshot();
    });

    it('should render with empty queues list', async () => {
      const emptyQueuesProps = {...defaultProps, queues: []};
      let screen;
      await act(async () => {
        screen = render(<ConsultTransferPopoverComponent {...emptyQueuesProps} />);
      });

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

      const container = screen.container.querySelector('.agent-popover-content');
      mockUIDProps(container);
      expect(container).toMatchSnapshot();
    });

    it('should render with custom empty message', async () => {
      const customEmptyProps = {
        ...defaultProps,
        buddyAgents: [],
        queues: [],
        emptyMessage: 'Custom empty state message',
      };
      let screen;
      await act(async () => {
        screen = render(<ConsultTransferPopoverComponent {...customEmptyProps} />);
      });

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

      const container = screen.container.querySelector('.agent-popover-content');
      mockUIDProps(container);
      expect(container).toMatchSnapshot();
    });

    it('should render with single queue', async () => {
      const singleQueueProps = {
        ...defaultProps,
        queues: [{id: 'queue1', name: 'Single Queue'} as ContactServiceQueue],
      };
      let screen;
      await act(async () => {
        screen = render(<ConsultTransferPopoverComponent {...singleQueueProps} />);
      });

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
      let screen;
      await act(async () => {
        screen = render(<ConsultTransferPopoverComponent {...defaultProps} />);
      });

      const queueTab = screen.container.querySelector('.queue-tab');
      fireEvent.click(queueTab);

      const container = screen.container.querySelector('.agent-popover-content');
      mockUIDProps(container);
      expect(container).toMatchSnapshot();
    });

    it('should render component after agent selection', async () => {
      let screen;
      await act(async () => {
        screen = render(<ConsultTransferPopoverComponent {...defaultProps} />);
      });

      const agentItems = screen.container.querySelectorAll('.call-control-list-item');
      if (agentItems.length > 0) {
        fireEvent.click(agentItems[0]);
      }

      const container = screen.container.querySelector('.agent-popover-content');
      mockUIDProps(container);
      expect(container).toMatchSnapshot();
    });

    it('should render component after queue selection', async () => {
      let screen;
      await act(async () => {
        screen = render(<ConsultTransferPopoverComponent {...defaultProps} />);
      });

      // Switch to queues tab first
      const queueTab = screen.container.querySelector('.queue-tab');
      fireEvent.click(queueTab);

      // Then click on a queue
      const queueItems = screen.container.querySelectorAll('.call-control-list-item');
      if (queueItems.length > 0) {
        fireEvent.click(queueItems[0]);
      }

      const container = screen.container.querySelector('.agent-popover-content');
      mockUIDProps(container);
      expect(container).toMatchSnapshot();
    });
  });

  describe('State Management', () => {
    it('should update when heading changes', async () => {
      let screen;
      await act(async () => {
        screen = render(<ConsultTransferPopoverComponent {...defaultProps} />);
      });

      screen.rerender(<ConsultTransferPopoverComponent {...defaultProps} heading="New Heading" />);
      const container = screen.container.querySelector('.agent-popover-content');
      mockUIDProps(container);
      expect(container).toMatchSnapshot();
    });

    it('should update when agents list changes', async () => {
      let screen;
      await act(async () => {
        screen = render(<ConsultTransferPopoverComponent {...defaultProps} />);
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
      screen.rerender(<ConsultTransferPopoverComponent {...defaultProps} buddyAgents={newAgents} />);
      const container = screen.container.querySelector('.agent-popover-content');
      mockUIDProps(container);
      expect(container).toMatchSnapshot();
    });

    it('should update when queues list changes', async () => {
      let screen;
      await act(async () => {
        screen = render(<ConsultTransferPopoverComponent {...defaultProps} />);
      });

      const newQueues = [{id: 'newQueue1', name: 'New Queue One'} as ContactServiceQueue];
      screen.rerender(<ConsultTransferPopoverComponent {...defaultProps} queues={newQueues} />);
      const container = screen.container.querySelector('.agent-popover-content');
      mockUIDProps(container);
      expect(container).toMatchSnapshot();
    });
  });
});
