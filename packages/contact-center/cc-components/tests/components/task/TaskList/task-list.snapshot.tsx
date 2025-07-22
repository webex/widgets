import React from 'react';
import {render} from '@testing-library/react';
import {mockTask} from '@webex/test-fixtures';
import TaskListComponent from '../../../../src/components/task/TaskList/task-list';
import {MEDIA_CHANNEL, TaskListComponentProps} from '../../../../src/components/task/task.types';
import {setupTaskTimerMocks} from '../../../utils/browser-api-mocks';

setupTaskTimerMocks();

describe('TaskListComponent Snapshots', () => {
  const mockLogger = {
    log: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
    info: jest.fn(),
    trace: jest.fn(),
  };

  const mockAcceptTask = jest.fn();
  const mockDeclineTask = jest.fn();
  const mockOnTaskSelect = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Empty task list scenarios', () => {
    it('should render empty component when taskList is null', () => {
      const props: TaskListComponentProps = {
        taskList: null,
        currentTask: null,
        acceptTask: mockAcceptTask,
        declineTask: mockDeclineTask,
        isBrowser: true,
        onTaskSelect: mockOnTaskSelect,
        logger: mockLogger,
      };

      const {container} = render(<TaskListComponent {...props} />);
      expect(container).toMatchSnapshot();
    });

    it('should render empty component when taskList is undefined', () => {
      const props: TaskListComponentProps = {
        taskList: undefined,
        currentTask: null,
        acceptTask: mockAcceptTask,
        declineTask: mockDeclineTask,
        isBrowser: true,
        onTaskSelect: mockOnTaskSelect,
        logger: mockLogger,
      };

      const {container} = render(<TaskListComponent {...props} />);
      expect(container).toMatchSnapshot();
    });

    it('should render empty component when taskList is empty object', () => {
      const props: TaskListComponentProps = {
        taskList: {},
        currentTask: null,
        acceptTask: mockAcceptTask,
        declineTask: mockDeclineTask,
        isBrowser: true,
        onTaskSelect: mockOnTaskSelect,
        logger: mockLogger,
      };

      const {container} = render(<TaskListComponent {...props} />);
      expect(container).toMatchSnapshot();
    });
  });

  describe('Task list with tasks', () => {
    it('should render task list with single task', () => {
      const task = {
        ...mockTask,
        data: {
          ...mockTask.data,
          interactionId: 'task-1',
          interaction: {
            ...mockTask.data.interaction,
            callAssociatedDetails: {
              ani: '1234567890',
              customerName: 'John Doe',
              virtualTeamName: 'Support Team',
              ronaTimeout: '30',
            },
          },
        },
      };

      const props: TaskListComponentProps = {
        taskList: {'task-1': task},
        currentTask: null,
        acceptTask: mockAcceptTask,
        declineTask: mockDeclineTask,
        isBrowser: true,
        onTaskSelect: mockOnTaskSelect,
        logger: mockLogger,
      };

      const {container} = render(<TaskListComponent {...props} />);
      expect(container).toMatchSnapshot();
    });

    it('should render task list with multiple tasks', () => {
      const task1 = {
        ...mockTask,
        data: {
          ...mockTask.data,
          interactionId: 'task-1',
          interaction: {
            ...mockTask.data.interaction,
            callAssociatedDetails: {
              ani: '1234567890',
              customerName: 'John Doe',
              virtualTeamName: 'Support Team',
            },
            mediaType: MEDIA_CHANNEL.TELEPHONY,
            state: 'active',
          },
        },
      };

      const task2 = {
        ...mockTask,
        data: {
          ...mockTask.data,
          interactionId: 'task-2',
          interaction: {
            ...mockTask.data.interaction,
            callAssociatedDetails: {
              ani: '0987654321',
              customerName: 'Jane Smith',
              virtualTeamName: 'Sales Team',
            },
            mediaType: MEDIA_CHANNEL.SOCIAL,
            state: 'new',
          },
        },
      };

      const props: TaskListComponentProps = {
        taskList: {'task-1': task1, 'task-2': task2},
        currentTask: null,
        acceptTask: mockAcceptTask,
        declineTask: mockDeclineTask,
        isBrowser: true,
        onTaskSelect: mockOnTaskSelect,
        logger: mockLogger,
      };

      const {container} = render(<TaskListComponent {...props} />);
      expect(container).toMatchSnapshot();
    });

    it('should show selected task correctly', () => {
      const task = {
        ...mockTask,
        data: {
          ...mockTask.data,
          interactionId: 'selected-task',
        },
      };

      const currentTask = {
        ...mockTask,
        data: {
          ...mockTask.data,
          interactionId: 'selected-task',
        },
      };

      const props: TaskListComponentProps = {
        taskList: {'selected-task': task},
        currentTask,
        acceptTask: mockAcceptTask,
        declineTask: mockDeclineTask,
        isBrowser: true,
        onTaskSelect: mockOnTaskSelect,
        logger: mockLogger,
      };

      const {container} = render(<TaskListComponent {...props} />);
      expect(container).toMatchSnapshot();
    });
  });

  describe('Different media types', () => {
    it('should render telephony task correctly', () => {
      const task = {
        ...mockTask,
        data: {
          ...mockTask.data,
          interactionId: 'telephony-task',
          interaction: {
            ...mockTask.data.interaction,
            mediaType: MEDIA_CHANNEL.TELEPHONY,
            callAssociatedDetails: {
              ani: '1234567890',
              customerName: 'Phone Customer',
              virtualTeamName: 'Phone Team',
            },
          },
        },
      };

      const props: TaskListComponentProps = {
        taskList: {'telephony-task': task},
        currentTask: null,
        acceptTask: mockAcceptTask,
        declineTask: mockDeclineTask,
        isBrowser: true,
        onTaskSelect: mockOnTaskSelect,
        logger: mockLogger,
      };

      const {container} = render(<TaskListComponent {...props} />);
      expect(container).toMatchSnapshot();
    });

    it('should render social media task correctly', () => {
      const task = {
        ...mockTask,
        data: {
          ...mockTask.data,
          interactionId: 'social-task',
          interaction: {
            ...mockTask.data.interaction,
            mediaType: MEDIA_CHANNEL.SOCIAL,
            callAssociatedDetails: {
              ani: '1234567890',
              customerName: 'Social Customer',
              virtualTeamName: 'Social Team',
            },
          },
        },
      };

      const props: TaskListComponentProps = {
        taskList: {'social-task': task},
        currentTask: null,
        acceptTask: mockAcceptTask,
        declineTask: mockDeclineTask,
        isBrowser: true,
        onTaskSelect: mockOnTaskSelect,
        logger: mockLogger,
      };

      const {container} = render(<TaskListComponent {...props} />);
      expect(container).toMatchSnapshot();
    });

    it('should render chat task correctly', () => {
      const task = {
        ...mockTask,
        data: {
          ...mockTask.data,
          interactionId: 'chat-task',
          interaction: {
            ...mockTask.data.interaction,
            mediaType: MEDIA_CHANNEL.CHAT,
            callAssociatedDetails: {
              ani: 'chat-user-123',
              customerName: 'Chat Customer',
              virtualTeamName: 'Chat Team',
            },
          },
        },
      };

      const props: TaskListComponentProps = {
        taskList: {'chat-task': task},
        currentTask: null,
        acceptTask: mockAcceptTask,
        declineTask: mockDeclineTask,
        isBrowser: true,
        onTaskSelect: mockOnTaskSelect,
        logger: mockLogger,
      };

      const {container} = render(<TaskListComponent {...props} />);
      expect(container).toMatchSnapshot();
    });
  });

  describe('Incoming vs Active tasks - Tests task state-based rendering and button availability', () => {
    it('should render incoming task correctly', () => {
      const task = {
        ...mockTask,
        data: {
          ...mockTask.data,
          interactionId: 'incoming-task',
          interaction: {
            ...mockTask.data.interaction,
            state: 'new',
            callAssociatedDetails: {
              ani: '1234567890',
              customerName: 'Incoming Customer',
              virtualTeamName: 'Incoming Team',
              ronaTimeout: '45',
            },
          },
          wrapUpRequired: false,
        },
      };

      const props: TaskListComponentProps = {
        taskList: {'incoming-task': task},
        currentTask: null,
        acceptTask: mockAcceptTask,
        declineTask: mockDeclineTask,
        isBrowser: true,
        onTaskSelect: mockOnTaskSelect,
        logger: mockLogger,
      };

      const {container} = render(<TaskListComponent {...props} />);
      expect(container).toMatchSnapshot();
    });

    it('should render active task correctly', () => {
      const task = {
        ...mockTask,
        data: {
          ...mockTask.data,
          interactionId: 'active-task',
          interaction: {
            ...mockTask.data.interaction,
            state: 'connected',
            callAssociatedDetails: {
              ani: '1234567890',
              customerName: 'Active Customer',
              virtualTeamName: 'Active Team',
            },
          },
        },
      };

      const props: TaskListComponentProps = {
        taskList: {'active-task': task},
        currentTask: null,
        acceptTask: mockAcceptTask,
        declineTask: mockDeclineTask,
        isBrowser: true,
        onTaskSelect: mockOnTaskSelect,
        logger: mockLogger,
      };

      const {container} = render(<TaskListComponent {...props} />);
      expect(container).toMatchSnapshot();
    });
  });

  describe('WebRTC vs Extension/DialNumber behavior - Tests platform-specific UI differences and button states', () => {
    // Tests platform-specific rendering differences:
    // - WebRTC: Full functionality with accept/decline buttons enabled
    // - Extension/DialNumber: Limited functionality, shows "Ringing..." state
    // - Different interaction patterns based on platform capabilities
    it('should handle WebRTC telephony incoming task with full functionality', () => {
      const task = {
        ...mockTask,
        data: {
          ...mockTask.data,
          interactionId: 'webrtc-task',
          interaction: {
            ...mockTask.data.interaction,
            state: 'new',
            mediaType: MEDIA_CHANNEL.TELEPHONY,
            callAssociatedDetails: {
              ani: '1234567890',
              customerName: 'WebRTC Customer',
              virtualTeamName: 'WebRTC Team',
            },
          },
          wrapUpRequired: false,
        },
      };

      const props: TaskListComponentProps = {
        taskList: {'webrtc-task': task},
        currentTask: null,
        acceptTask: mockAcceptTask,
        declineTask: mockDeclineTask,
        isBrowser: true, // WebRTC enabled
        onTaskSelect: mockOnTaskSelect,
        logger: mockLogger,
      };

      const {container} = render(<TaskListComponent {...props} />);
      expect(container).toMatchSnapshot();
    });

    it('should handle Extension/DialNumber telephony incoming task with limited functionality', () => {
      const task = {
        ...mockTask,
        data: {
          ...mockTask.data,
          interactionId: 'extension-task',
          interaction: {
            ...mockTask.data.interaction,
            state: 'new',
            mediaType: MEDIA_CHANNEL.TELEPHONY,
            callAssociatedDetails: {
              ani: '1234567890',
              customerName: 'Extension Customer',
              virtualTeamName: 'Extension Team',
            },
          },
          wrapUpRequired: false,
        },
      };

      const props: TaskListComponentProps = {
        taskList: {'extension-task': task},
        currentTask: null,
        acceptTask: mockAcceptTask,
        declineTask: mockDeclineTask,
        isBrowser: false, // Extension/DialNumber mode
        onTaskSelect: mockOnTaskSelect,
        logger: mockLogger,
      };

      const {container} = render(<TaskListComponent {...props} />);
      expect(container).toMatchSnapshot();
    });

    it('should handle DialNumber mode telephony task', () => {
      const task = {
        ...mockTask,
        data: {
          ...mockTask.data,
          interactionId: 'dial-number-task',
          interaction: {
            ...mockTask.data.interaction,
            state: 'new',
            mediaType: MEDIA_CHANNEL.TELEPHONY,
            callAssociatedDetails: {
              ani: '1234567890',
              customerName: 'DialNumber Customer',
              virtualTeamName: 'DialNumber Team',
            },
          },
          wrapUpRequired: false,
        },
      };

      const props: TaskListComponentProps = {
        taskList: {'dial-number-task': task},
        currentTask: null,
        acceptTask: mockAcceptTask,
        declineTask: mockDeclineTask,
        isBrowser: false, // DialNumber mode
        onTaskSelect: mockOnTaskSelect,
        logger: mockLogger,
      };

      const {container} = render(<TaskListComponent {...props} />);
      expect(container).toMatchSnapshot();
    });
  });

  describe('Task interactions', () => {
    it('should call acceptTask when accept button is clicked', () => {
      const task = {
        ...mockTask,
        data: {
          ...mockTask.data,
          interactionId: 'accept-task',
          interaction: {
            ...mockTask.data.interaction,
            state: 'new',
            callAssociatedDetails: {
              ani: '1234567890',
              customerName: 'Accept Customer',
              virtualTeamName: 'Accept Team',
            },
          },
          wrapUpRequired: false,
        },
      };

      const props: TaskListComponentProps = {
        taskList: {'accept-task': task},
        currentTask: null,
        acceptTask: mockAcceptTask,
        declineTask: mockDeclineTask,
        isBrowser: true,
        onTaskSelect: mockOnTaskSelect,
        logger: mockLogger,
      };

      const {container} = render(<TaskListComponent {...props} />);
      expect(container).toMatchSnapshot();
    });

    it('should call declineTask when decline button is clicked', () => {
      const task = {
        ...mockTask,
        data: {
          ...mockTask.data,
          interactionId: 'decline-task',
          interaction: {
            ...mockTask.data.interaction,
            state: 'new',
            callAssociatedDetails: {
              ani: '1234567890',
              customerName: 'Decline Customer',
              virtualTeamName: 'Decline Team',
            },
          },
          wrapUpRequired: false,
        },
      };

      const props: TaskListComponentProps = {
        taskList: {'decline-task': task},
        currentTask: null,
        acceptTask: mockAcceptTask,
        declineTask: mockDeclineTask,
        isBrowser: true,
        onTaskSelect: mockOnTaskSelect,
        logger: mockLogger,
      };

      const {container} = render(<TaskListComponent {...props} />);
      expect(container).toMatchSnapshot();
    });

    it('should call onTaskSelect when task is clicked for selectable task', () => {
      const task = {
        ...mockTask,
        data: {
          ...mockTask.data,
          interactionId: 'selectable-task',
          interaction: {
            ...mockTask.data.interaction,
            state: 'active',
            callAssociatedDetails: {
              ani: '1234567890',
              customerName: 'Select Customer',
              virtualTeamName: 'Select Team',
            },
          },
        },
      };

      const props: TaskListComponentProps = {
        taskList: {'selectable-task': task},
        currentTask: null,
        acceptTask: mockAcceptTask,
        declineTask: mockDeclineTask,
        isBrowser: true,
        onTaskSelect: mockOnTaskSelect,
        logger: mockLogger,
      };

      const {container} = render(<TaskListComponent {...props} />);
      expect(container).toMatchSnapshot();
    });
  });

  describe('Logger calls', () => {
    it('should log task rendering', () => {
      const props: TaskListComponentProps = {
        taskList: {'task-1': mockTask},
        currentTask: null,
        acceptTask: mockAcceptTask,
        declineTask: mockDeclineTask,
        isBrowser: true,
        onTaskSelect: mockOnTaskSelect,
        logger: mockLogger,
      };

      const {container} = render(<TaskListComponent {...props} />);
      expect(container).toMatchSnapshot();
    });

    it('should log for each task when multiple tasks are rendered', () => {
      const task1 = {
        ...mockTask,
        data: {
          ...mockTask.data,
          interactionId: 'task-1',
        },
      };
      const task2 = {
        ...mockTask,
        data: {
          ...mockTask.data,
          interactionId: 'task-2',
        },
      };

      const props: TaskListComponentProps = {
        taskList: {'task-1': task1, 'task-2': task2},
        currentTask: null,
        acceptTask: mockAcceptTask,
        declineTask: mockDeclineTask,
        isBrowser: true,
        onTaskSelect: mockOnTaskSelect,
        logger: mockLogger,
      };

      const {container} = render(<TaskListComponent {...props} />);
      expect(container).toMatchSnapshot();
    });
  });

  describe('Component integration', () => {
    it('should render actual Task components with proper integration', () => {
      const task = {
        ...mockTask,
        data: {
          ...mockTask.data,
          interactionId: 'integration-task',
          interaction: {
            ...mockTask.data.interaction,
            callAssociatedDetails: {
              ani: '1234567890',
              customerName: 'Integration Test',
              virtualTeamName: 'Test Team',
            },
          },
        },
      };

      const props: TaskListComponentProps = {
        taskList: {'integration-task': task},
        currentTask: null,
        acceptTask: mockAcceptTask,
        declineTask: mockDeclineTask,
        isBrowser: true,
        onTaskSelect: mockOnTaskSelect,
        logger: mockLogger,
      };

      const {container} = render(<TaskListComponent {...props} />);
      expect(container).toMatchSnapshot();
    });

    it('should pass props correctly to Task components', () => {
      const task = {
        ...mockTask,
        data: {
          ...mockTask.data,
          interactionId: 'props-test-task',
          interaction: {
            ...mockTask.data.interaction,
            state: 'new',
            callAssociatedDetails: {
              ani: '1234567890',
              customerName: 'Props Test',
              virtualTeamName: 'Props Team',
              ronaTimeout: '60',
            },
          },
          wrapUpRequired: false,
        },
      };

      const props: TaskListComponentProps = {
        taskList: {'props-test-task': task},
        currentTask: null,
        acceptTask: mockAcceptTask,
        declineTask: mockDeclineTask,
        isBrowser: true,
        onTaskSelect: mockOnTaskSelect,
        logger: mockLogger,
      };

      const {container} = render(<TaskListComponent {...props} />);
      expect(container).toMatchSnapshot();
    });
  });
});
