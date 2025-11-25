import {
  extractTaskListItemData,
  isTaskSelectable,
  isCurrentTaskSelected,
  isTaskListEmpty,
  getTasksArray,
  createTaskSelectHandler,
} from '../../../../src/components/task/TaskList/task-list.utils';
import {MEDIA_CHANNEL, TaskListItemData} from '../../../../src/components/task/task.types';
import {mockTask} from '@webex/test-fixtures';

// Mock the store with a mockable isIncomingTask function
jest.mock('@webex/cc-store', () => ({
  isIncomingTask: jest.fn(() => false),
  cc: {},
  deviceType: 'BROWSER',
  logger: {
    debug: jest.fn(),
    error: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
  },
}));

// Import the mocked functions
import {isIncomingTask} from '@webex/cc-store';

describe('task-list.utils', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('extractTaskListItemData', () => {
    describe('Active tasks', () => {
      it('should extract correct data for active telephony task', () => {
        const originalState = mockTask.data.interaction.state;
        const originalCallAssociatedDetails = mockTask.data.interaction.callAssociatedDetails;
        const originalWrapUpRequired = mockTask.data.wrapUpRequired;
        const originalMediaType = mockTask.data.interaction.mediaType;

        mockTask.data.interaction.state = 'active';
        mockTask.data.interaction.callAssociatedDetails = {
          ani: '1234567890',
          customerName: 'John Doe',
          virtualTeamName: 'Support Team',
          ronaTimeout: '45',
        };
        mockTask.data.wrapUpRequired = false;
        mockTask.data.interaction.mediaType = MEDIA_CHANNEL.TELEPHONY;

        const result = extractTaskListItemData(mockTask, true, mockTask.data.agentId);

        expect(result.ani).toBe('1234567890');
        expect(result.customerName).toBe('John Doe');
        expect(result.virtualTeamName).toBe('Support Team');
        expect(result.ronaTimeout).toBeNull(); // Active tasks don't show RONA timeout
        expect(result.taskState).toBe('active');
        expect(result.isIncomingTask).toBe(false);
        expect(result.mediaType).toBe(MEDIA_CHANNEL.TELEPHONY);
        expect(result.isTelephony).toBe(true);
        expect(result.isSocial).toBe(false);
        expect(result.acceptText).toBeUndefined();
        expect(result.declineText).toBeUndefined();
        expect(result.title).toBe('1234567890'); // ANI for telephony
        expect(result.disableAccept).toBe(false);
        expect(result.displayState).toBe('active');

        // Restore original values
        mockTask.data.interaction.state = originalState;
        mockTask.data.interaction.callAssociatedDetails = originalCallAssociatedDetails;
        mockTask.data.wrapUpRequired = originalWrapUpRequired;
        mockTask.data.interaction.mediaType = originalMediaType;
      });

      it('should extract correct data for active social media task', () => {
        const originalState = mockTask.data.interaction.state;
        const originalCallAssociatedDetails = mockTask.data.interaction.callAssociatedDetails;
        const originalWrapUpRequired = mockTask.data.wrapUpRequired;
        const originalMediaType = mockTask.data.interaction.mediaType;
        const originalMediaChannel = mockTask.data.interaction.mediaChannel;

        mockTask.data.interaction.state = 'connected';
        mockTask.data.interaction.callAssociatedDetails = {
          ani: '1234567890',
          customerName: 'Alice Johnson',
          virtualTeamName: 'Social Team',
        };
        mockTask.data.wrapUpRequired = false;
        mockTask.data.interaction.mediaType = MEDIA_CHANNEL.SOCIAL;
        mockTask.data.interaction.mediaChannel = 'facebook';

        const result = extractTaskListItemData(mockTask, true, mockTask.data.agentId);

        expect(result.title).toBe('Alice Johnson'); // Customer name for social
        expect(result.isSocial).toBe(true);
        expect(result.isTelephony).toBe(false);
        expect(result.displayState).toBe('connected');
        expect(result.isIncomingTask).toBe(false);
        expect(result.ronaTimeout).toBeNull();

        // Restore original values
        mockTask.data.interaction.state = originalState;
        mockTask.data.interaction.callAssociatedDetails = originalCallAssociatedDetails;
        mockTask.data.wrapUpRequired = originalWrapUpRequired;
        mockTask.data.interaction.mediaType = originalMediaType;
        mockTask.data.interaction.mediaChannel = originalMediaChannel;
      });
    });

    describe('Incoming tasks', () => {
      it('should extract correct data for incoming telephony task on browser', () => {
        // Mock isIncomingTask to return true for this test
        (isIncomingTask as jest.Mock).mockReturnValueOnce(true);

        const originalState = mockTask.data.interaction.state;
        const originalCallAssociatedDetails = mockTask.data.interaction.callAssociatedDetails;
        const originalWrapUpRequired = mockTask.data.wrapUpRequired;
        const originalMediaType = mockTask.data.interaction.mediaType;

        mockTask.data.interaction.state = 'new';
        mockTask.data.interaction.callAssociatedDetails = {
          ani: '9876543210',
          customerName: 'Jane Smith',
          virtualTeamName: 'Sales Team',
          ronaTimeout: '60',
        };
        mockTask.data.wrapUpRequired = false;
        mockTask.data.interaction.mediaType = MEDIA_CHANNEL.TELEPHONY;

        const result = extractTaskListItemData(mockTask, true, mockTask.data.agentId);

        expect(result.ani).toBe('9876543210');
        expect(result.ronaTimeout).toBe(60); // Shows RONA timeout for incoming tasks
        expect(result.taskState).toBe('new');
        expect(result.isIncomingTask).toBe(true);
        expect(result.acceptText).toBe('Accept');
        expect(result.declineText).toBe('Decline');
        expect(result.disableAccept).toBe(false);
        expect(result.displayState).toBe(''); // Empty for incoming tasks

        // Restore original values
        mockTask.data.interaction.state = originalState;
        mockTask.data.interaction.callAssociatedDetails = originalCallAssociatedDetails;
        mockTask.data.wrapUpRequired = originalWrapUpRequired;
        mockTask.data.interaction.mediaType = originalMediaType;
      });

      it('should extract correct data for incoming telephony task on browser if wrapUpRequired', () => {
        const originalState = mockTask.data.interaction.state;
        const originalCallAssociatedDetails = mockTask.data.interaction.callAssociatedDetails;
        const originalWrapUpRequired = mockTask.data.wrapUpRequired;
        const originalMediaType = mockTask.data.interaction.mediaType;

        mockTask.data.interaction.state = 'new';
        mockTask.data.interaction.callAssociatedDetails = {
          ani: '9876543210',
          customerName: 'Jane Smith',
          virtualTeamName: 'Sales Team',
          ronaTimeout: '60',
        };
        mockTask.data.wrapUpRequired = true;
        mockTask.data.interaction.mediaType = MEDIA_CHANNEL.TELEPHONY;

        const result = extractTaskListItemData(mockTask, true, mockTask.data.agentId);

        expect(result.ani).toBe('9876543210');
        expect(result.ronaTimeout).toBeNull(); // Active tasks don't show RONA timeout
        expect(result.taskState).toBe('new');
        expect(result.isIncomingTask).toBe(false);
        expect(result.acceptText).toBeUndefined();
        expect(result.declineText).toBeUndefined();
        expect(result.disableAccept).toBe(false);
        expect(result.displayState).toBe('new');

        // Restore original values
        mockTask.data.interaction.state = originalState;
        mockTask.data.interaction.callAssociatedDetails = originalCallAssociatedDetails;
        mockTask.data.wrapUpRequired = originalWrapUpRequired;
        mockTask.data.interaction.mediaType = originalMediaType;
      });

      it('should extract correct data for incoming telephony task on non-browser', () => {
        // Mock isIncomingTask to return true for this test
        (isIncomingTask as jest.Mock).mockReturnValueOnce(true);

        const originalState = mockTask.data.interaction.state;
        const originalCallAssociatedDetails = mockTask.data.interaction.callAssociatedDetails;
        const originalWrapUpRequired = mockTask.data.wrapUpRequired;
        const originalMediaType = mockTask.data.interaction.mediaType;

        mockTask.data.interaction.state = 'new';
        mockTask.data.interaction.callAssociatedDetails = {
          ani: '5555555555',
          customerName: 'Mobile User',
          virtualTeamName: 'Mobile Support',
        };
        mockTask.data.wrapUpRequired = false;
        mockTask.data.interaction.mediaType = MEDIA_CHANNEL.TELEPHONY;

        const result = extractTaskListItemData(mockTask, false, mockTask.data.agentId);

        expect(result.acceptText).toBe('Ringing...');
        expect(result.declineText).toBeUndefined();
        expect(result.disableAccept).toBe(true);
        expect(result.isIncomingTask).toBe(true);

        // Restore original values
        mockTask.data.interaction.state = originalState;
        mockTask.data.interaction.callAssociatedDetails = originalCallAssociatedDetails;
        mockTask.data.wrapUpRequired = originalWrapUpRequired;
        mockTask.data.interaction.mediaType = originalMediaType;
      });

      it('should extract correct data for incoming social media task', () => {
        // Mock isIncomingTask to return true for this test
        (isIncomingTask as jest.Mock).mockReturnValueOnce(true);

        const originalState = mockTask.data.interaction.state;
        const originalCallAssociatedDetails = mockTask.data.interaction.callAssociatedDetails;
        const originalWrapUpRequired = mockTask.data.wrapUpRequired;
        const originalMediaType = mockTask.data.interaction.mediaType;

        mockTask.data.interaction.state = 'new';
        mockTask.data.interaction.callAssociatedDetails = {
          ani: '1234567890',
          customerName: 'Social Customer',
          virtualTeamName: 'Social Team',
        };
        mockTask.data.wrapUpRequired = false;
        mockTask.data.interaction.mediaType = MEDIA_CHANNEL.SOCIAL;

        const result = extractTaskListItemData(mockTask, true, mockTask.data.agentId);

        expect(result.acceptText).toBe('Accept');
        expect(result.declineText).toBeUndefined(); // No decline for social
        expect(result.isSocial).toBe(true);
        expect(result.title).toBe('Social Customer');

        // Restore original values
        mockTask.data.interaction.state = originalState;
        mockTask.data.interaction.callAssociatedDetails = originalCallAssociatedDetails;
        mockTask.data.wrapUpRequired = originalWrapUpRequired;
        mockTask.data.interaction.mediaType = originalMediaType;
      });
    });
  });

  describe('isTaskSelectable', () => {
    it('should return false for the same task', () => {
      const taskData = {isIncomingTask: false} as TaskListItemData;
      const result = isTaskSelectable(mockTask, mockTask, taskData);
      expect(result).toBe(false);
    });

    it('should return true for different non-incoming task', () => {
      const differentTask = {
        ...mockTask,
        data: {
          ...mockTask.data,
          interactionId: 'different-task-456',
        },
      };

      const currentTask = {
        ...mockTask,
        data: {
          ...mockTask.data,
          interactionId: 'current-task-123',
        },
      };

      const taskData = {isIncomingTask: false} as TaskListItemData;
      const result = isTaskSelectable(differentTask, currentTask, taskData);
      expect(result).toBe(true);
    });

    it('should return false for incoming task without wrap up', () => {
      const incomingTask = {
        ...mockTask,
        data: {
          ...mockTask.data,
          interactionId: 'incoming-task-789',
          wrapUpRequired: false,
        },
      };

      const currentTask = {
        ...mockTask,
        data: {
          ...mockTask.data,
          interactionId: 'current-task-123',
        },
      };

      const taskData = {isIncomingTask: true} as TaskListItemData;
      const result = isTaskSelectable(incomingTask, currentTask, taskData);
      expect(result).toBe(false);
    });

    it('should return true when no current task is selected', () => {
      const task = {
        ...mockTask,
        data: {
          ...mockTask.data,
          interactionId: 'some-task-456',
        },
      };

      const taskData = {isIncomingTask: false} as TaskListItemData;
      const result = isTaskSelectable(task, null, taskData);
      expect(result).toBe(true);
    });
  });

  describe('isCurrentTaskSelected', () => {
    it('should return true when task is currently selected', () => {
      const task = {
        ...mockTask,
        data: {
          ...mockTask.data,
          interactionId: 'test-123',
        },
      };

      const currentTask = {
        ...mockTask,
        data: {
          ...mockTask.data,
          interactionId: 'test-123',
        },
      };

      const result = isCurrentTaskSelected(task, currentTask);
      expect(result).toBe(true);
    });

    it('should return false when different task is selected', () => {
      const task = {
        ...mockTask,
        data: {
          ...mockTask.data,
          interactionId: 'test-123',
        },
      };

      const currentTask = {
        ...mockTask,
        data: {
          ...mockTask.data,
          interactionId: 'different-456',
        },
      };

      const result = isCurrentTaskSelected(task, currentTask);
      expect(result).toBe(false);
    });

    it('should return false when no task is selected', () => {
      const task = {
        ...mockTask,
        data: {
          ...mockTask.data,
          interactionId: 'test-123',
        },
      };

      const result = isCurrentTaskSelected(task, null);
      expect(result).toBe(false);
    });
  });

  describe('isTaskListEmpty', () => {
    it('should return true for null, undefined, or empty object task list', () => {
      expect(isTaskListEmpty(null)).toBe(true);
      expect(isTaskListEmpty(undefined)).toBe(true);
      expect(isTaskListEmpty({})).toBe(true);
    });

    it('should return false for task list with tasks', () => {
      const task1 = {
        ...mockTask,
        data: {
          ...mockTask.data,
          interactionId: 'task-1',
        },
      };

      const taskList = {
        'task-1': task1,
      };
      expect(isTaskListEmpty(taskList)).toBe(false);
    });
  });

  describe('getTasksArray', () => {
    it('should convert task list object to array', () => {
      const task1 = {
        ...mockTask,
        data: {
          ...mockTask.data,
          interactionId: 'task-1',
        },
      };

      const taskList = {
        'task-1': task1,
      };

      const result = getTasksArray(taskList);
      expect(result).toHaveLength(1);
      expect(result).toContain(task1);
    });

    it('should return empty array for null, undefined, or empty object task list', () => {
      expect(getTasksArray({})).toEqual([]);
      expect(getTasksArray(null)).toEqual([]);
      expect(getTasksArray(undefined)).toEqual([]);
    });
  });

  describe('createTaskSelectHandler', () => {
    const mockOnTaskSelect = jest.fn();

    beforeEach(() => {
      jest.clearAllMocks();
    });

    it('should call onTaskSelect for selectable task', () => {
      const task = {
        ...mockTask,
        data: {
          ...mockTask.data,
          interactionId: 'task-1',
          interaction: {
            ...mockTask.data.interaction,
            state: 'active',
          },
        },
      };

      const currentTask = {
        ...mockTask,
        data: {
          ...mockTask.data,
          interactionId: 'task-2',
        },
      };

      const handler = createTaskSelectHandler(task, currentTask, mockOnTaskSelect, mockTask.agentId);
      handler();

      expect(mockOnTaskSelect).toHaveBeenCalledWith(task);
    });

    it('should not call onTaskSelect for non-selectable task', () => {
      // Mock isIncomingTask to return true so this task is non-selectable
      (isIncomingTask as jest.Mock).mockReturnValueOnce(true);

      const task = {
        ...mockTask,
        data: {
          ...mockTask.data,
          interactionId: 'task-1',
          interaction: {
            ...mockTask.data.interaction,
            state: 'new',
          },
          wrapUpRequired: false,
        },
      };

      const currentTask = {
        ...mockTask,
        data: {
          ...mockTask.data,
          interactionId: 'task-2',
        },
      };

      const handler = createTaskSelectHandler(task, currentTask, mockOnTaskSelect, mockTask.agentId);
      handler();

      expect(mockOnTaskSelect).not.toHaveBeenCalled();
    });
  });
});
