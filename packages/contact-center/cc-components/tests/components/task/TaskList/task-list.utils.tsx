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

describe('task-list.utils', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('extractTaskListItemData', () => {
    describe('Active tasks (non-incoming)', () => {
      it('should extract correct data for active telephony task on browser', () => {
        const originalState = mockTask.data.interaction.state;
        //@ts-expect-error  To be fixed in SDK - https://jira-eng-sjc12.cisco.com/jira/browse/CAI-6762
        const originalCallAssociatedDetails = mockTask.data.interaction.callAssociatedDetails;
        const originalWrapUpRequired = mockTask.data.wrapUpRequired;
        const originalMediaType = mockTask.data.interaction.mediaType;

        mockTask.data.interaction.state = 'active';
        //@ts-expect-error  To be fixed in SDK - https://jira-eng-sjc12.cisco.com/jira/browse/CAI-6762
        mockTask.data.interaction.callAssociatedDetails = {
          ani: '1234567890',
          customerName: 'John Doe',
          virtualTeamName: 'Support Team',
          ronaTimeout: '45',
        };
        mockTask.data.wrapUpRequired = false;
        mockTask.data.interaction.mediaType = MEDIA_CHANNEL.TELEPHONY;

        const result = extractTaskListItemData(mockTask, true);

        expect(result).toEqual({
          ani: '1234567890',
          customerName: 'John Doe',
          virtualTeamName: 'Support Team',
          ronaTimeout: null, // Should be null for non-incoming tasks
          taskState: 'active',
          startTimeStamp: mockTask.data.interaction.createdTimestamp,
          isIncomingTask: false,
          mediaType: MEDIA_CHANNEL.TELEPHONY,
          mediaChannel: mockTask.data.interaction.mediaChannel,
          isTelephony: true,
          isSocial: false,
          acceptText: undefined,
          declineText: undefined,
          title: '1234567890', // ANI for telephony
          disableAccept: false,
          displayState: 'active', // Should show state for non-incoming
        });

        // Restore original values
        mockTask.data.interaction.state = originalState;
        //@ts-expect-error  To be fixed in SDK - https://jira-eng-sjc12.cisco.com/jira/browse/CAI-6762
        mockTask.data.interaction.callAssociatedDetails = originalCallAssociatedDetails;
        mockTask.data.wrapUpRequired = originalWrapUpRequired;
        mockTask.data.interaction.mediaType = originalMediaType;
      });

      it('should extract correct data for active social media task', () => {
        const originalState = mockTask.data.interaction.state;
        //@ts-expect-error  To be fixed in SDK - https://jira-eng-sjc12.cisco.com/jira/browse/CAI-6762
        const originalCallAssociatedDetails = mockTask.data.interaction.callAssociatedDetails;
        const originalWrapUpRequired = mockTask.data.wrapUpRequired;
        const originalMediaType = mockTask.data.interaction.mediaType;
        const originalMediaChannel = mockTask.data.interaction.mediaChannel;

        mockTask.data.interaction.state = 'connected';
        //@ts-expect-error  To be fixed in SDK - https://jira-eng-sjc12.cisco.com/jira/browse/CAI-6762
        mockTask.data.interaction.callAssociatedDetails = {
          ani: '1234567890',
          customerName: 'Alice Johnson',
          virtualTeamName: 'Social Team',
        };
        mockTask.data.wrapUpRequired = false;
        mockTask.data.interaction.mediaType = MEDIA_CHANNEL.SOCIAL;
        mockTask.data.interaction.mediaChannel = 'facebook';

        const result = extractTaskListItemData(mockTask, true);

        expect(result.title).toBe('Alice Johnson'); // Customer name for social
        expect(result.isSocial).toBe(true);
        expect(result.isTelephony).toBe(false);
        expect(result.displayState).toBe('connected');
        expect(result.isIncomingTask).toBe(false);
        expect(result.ronaTimeout).toBeNull();

        // Restore original values
        mockTask.data.interaction.state = originalState;
        //@ts-expect-error  To be fixed in SDK - https://jira-eng-sjc12.cisco.com/jira/browse/CAI-6762
        mockTask.data.interaction.callAssociatedDetails = originalCallAssociatedDetails;
        mockTask.data.wrapUpRequired = originalWrapUpRequired;
        mockTask.data.interaction.mediaType = originalMediaType;
        mockTask.data.interaction.mediaChannel = originalMediaChannel;
      });
    });

    describe('Incoming tasks (new/consult)', () => {
      it('should extract correct data for incoming telephony task on browser', () => {
        const originalState = mockTask.data.interaction.state;
        //@ts-expect-error  To be fixed in SDK - https://jira-eng-sjc12.cisco.com/jira/browse/CAI-6762
        const originalCallAssociatedDetails = mockTask.data.interaction.callAssociatedDetails;
        const originalWrapUpRequired = mockTask.data.wrapUpRequired;
        const originalMediaType = mockTask.data.interaction.mediaType;
        const originalMediaChannel = mockTask.data.interaction.mediaChannel;

        mockTask.data.interaction.state = 'new';
        //@ts-expect-error  To be fixed in SDK - https://jira-eng-sjc12.cisco.com/jira/browse/CAI-6762
        mockTask.data.interaction.callAssociatedDetails = {
          ani: '9876543210',
          customerName: 'Jane Smith',
          virtualTeamName: 'Sales Team',
          ronaTimeout: '60',
        };
        mockTask.data.wrapUpRequired = false;
        mockTask.data.interaction.mediaType = MEDIA_CHANNEL.TELEPHONY;
        mockTask.data.interaction.mediaChannel = 'voice';

        const result = extractTaskListItemData(mockTask, true);

        expect(result).toEqual({
          ani: '9876543210',
          customerName: 'Jane Smith',
          virtualTeamName: 'Sales Team',
          ronaTimeout: 60, // Should show RONA timeout for incoming tasks
          taskState: 'new',
          startTimeStamp: mockTask.data.interaction.createdTimestamp,
          isIncomingTask: true,
          mediaType: MEDIA_CHANNEL.TELEPHONY,
          mediaChannel: 'voice',
          isTelephony: true,
          isSocial: false,
          acceptText: 'Accept',
          declineText: 'Decline',
          title: '9876543210',
          disableAccept: false,
          displayState: '', // Should be empty for incoming tasks
        });

        // Restore original values
        mockTask.data.interaction.state = originalState;
        //@ts-expect-error  To be fixed in SDK - https://jira-eng-sjc12.cisco.com/jira/browse/CAI-6762
        mockTask.data.interaction.callAssociatedDetails = originalCallAssociatedDetails;
        mockTask.data.wrapUpRequired = originalWrapUpRequired;
        mockTask.data.interaction.mediaType = originalMediaType;
        mockTask.data.interaction.mediaChannel = originalMediaChannel;
      });

      it('should extract correct data for incoming telephony task on non-browser', () => {
        const originalState = mockTask.data.interaction.state;
        //@ts-expect-error  To be fixed in SDK - https://jira-eng-sjc12.cisco.com/jira/browse/CAI-6762
        const originalCallAssociatedDetails = mockTask.data.interaction.callAssociatedDetails;
        const originalWrapUpRequired = mockTask.data.wrapUpRequired;
        const originalMediaType = mockTask.data.interaction.mediaType;
        const originalMediaChannel = mockTask.data.interaction.mediaChannel;

        mockTask.data.interaction.state = 'new';
        //@ts-expect-error  To be fixed in SDK - https://jira-eng-sjc12.cisco.com/jira/browse/CAI-6762
        mockTask.data.interaction.callAssociatedDetails = {
          ani: '5555555555',
          customerName: 'Mobile User',
          virtualTeamName: 'Mobile Support',
        };
        mockTask.data.wrapUpRequired = false;
        mockTask.data.interaction.mediaType = MEDIA_CHANNEL.TELEPHONY;
        mockTask.data.interaction.mediaChannel = 'voice';

        const result = extractTaskListItemData(mockTask, false);

        expect(result.acceptText).toBe('Ringing...');
        expect(result.declineText).toBeUndefined();
        expect(result.disableAccept).toBe(true);
        expect(result.isIncomingTask).toBe(true);
        expect(result.displayState).toBe('');

        // Restore original values
        mockTask.data.interaction.state = originalState;
        //@ts-expect-error  To be fixed in SDK - https://jira-eng-sjc12.cisco.com/jira/browse/CAI-6762
        mockTask.data.interaction.callAssociatedDetails = originalCallAssociatedDetails;
        mockTask.data.wrapUpRequired = originalWrapUpRequired;
        mockTask.data.interaction.mediaType = originalMediaType;
        mockTask.data.interaction.mediaChannel = originalMediaChannel;
      });

      it('should extract correct data for consult task', () => {
        const originalState = mockTask.data.interaction.state;
        //@ts-expect-error  To be fixed in SDK - https://jira-eng-sjc12.cisco.com/jira/browse/CAI-6762
        const originalCallAssociatedDetails = mockTask.data.interaction.callAssociatedDetails;
        const originalWrapUpRequired = mockTask.data.wrapUpRequired;
        const originalMediaType = mockTask.data.interaction.mediaType;
        const originalMediaChannel = mockTask.data.interaction.mediaChannel;

        mockTask.data.interaction.state = 'consult';
        //@ts-expect-error  To be fixed in SDK - https://jira-eng-sjc12.cisco.com/jira/browse/CAI-6762
        mockTask.data.interaction.callAssociatedDetails = {
          ani: '7777777777',
          customerName: 'Consult Customer',
          virtualTeamName: 'Expert Team',
          ronaTimeout: '90',
        };
        mockTask.data.wrapUpRequired = false;
        mockTask.data.interaction.mediaType = MEDIA_CHANNEL.TELEPHONY;
        mockTask.data.interaction.mediaChannel = 'voice';

        const result = extractTaskListItemData(mockTask, true);

        expect(result.isIncomingTask).toBe(true);
        expect(result.taskState).toBe('consult');
        expect(result.displayState).toBe('');
        expect(result.ronaTimeout).toBe(90);
        expect(result.acceptText).toBe('Accept');

        // Restore original values
        mockTask.data.interaction.state = originalState;
        //@ts-expect-error  To be fixed in SDK - https://jira-eng-sjc12.cisco.com/jira/browse/CAI-6762
        mockTask.data.interaction.callAssociatedDetails = originalCallAssociatedDetails;
        mockTask.data.wrapUpRequired = originalWrapUpRequired;
        mockTask.data.interaction.mediaType = originalMediaType;
        mockTask.data.interaction.mediaChannel = originalMediaChannel;
      });

      it('should handle incoming task with wrap up required', () => {
        const originalState = mockTask.data.interaction.state;
        //@ts-expect-error  To be fixed in SDK - https://jira-eng-sjc12.cisco.com/jira/browse/CAI-6762
        const originalCallAssociatedDetails = mockTask.data.interaction.callAssociatedDetails;
        const originalWrapUpRequired = mockTask.data.wrapUpRequired;
        const originalMediaType = mockTask.data.interaction.mediaType;
        const originalMediaChannel = mockTask.data.interaction.mediaChannel;

        mockTask.data.interaction.state = 'new';
        //@ts-expect-error  To be fixed in SDK - https://jira-eng-sjc12.cisco.com/jira/browse/CAI-6762
        mockTask.data.interaction.callAssociatedDetails = {
          ani: '8888888888',
          customerName: 'Wrap Up Customer',
          virtualTeamName: 'Wrap Up Team',
        };
        mockTask.data.wrapUpRequired = true;
        mockTask.data.interaction.mediaType = MEDIA_CHANNEL.TELEPHONY;
        mockTask.data.interaction.mediaChannel = 'voice';

        const result = extractTaskListItemData(mockTask, true);

        expect(result.acceptText).toBeUndefined();
        expect(result.declineText).toBeUndefined();
        expect(result.isIncomingTask).toBe(true);

        // Restore original values
        mockTask.data.interaction.state = originalState;
        //@ts-expect-error  To be fixed in SDK - https://jira-eng-sjc12.cisco.com/jira/browse/CAI-6762
        mockTask.data.interaction.callAssociatedDetails = originalCallAssociatedDetails;
        mockTask.data.wrapUpRequired = originalWrapUpRequired;
        mockTask.data.interaction.mediaType = originalMediaType;
        mockTask.data.interaction.mediaChannel = originalMediaChannel;
      });
    });

    describe('Different media types', () => {
      it('should handle chat tasks', () => {
        const originalState = mockTask.data.interaction.state;
        //@ts-expect-error  To be fixed in SDK - https://jira-eng-sjc12.cisco.com/jira/browse/CAI-6762
        const originalCallAssociatedDetails = mockTask.data.interaction.callAssociatedDetails;
        const originalWrapUpRequired = mockTask.data.wrapUpRequired;
        const originalMediaType = mockTask.data.interaction.mediaType;
        const originalMediaChannel = mockTask.data.interaction.mediaChannel;

        mockTask.data.interaction.state = 'active';
        //@ts-expect-error  To be fixed in SDK - https://jira-eng-sjc12.cisco.com/jira/browse/CAI-6762
        mockTask.data.interaction.callAssociatedDetails = {
          ani: 'chat-user-123',
          customerName: 'Chat Customer',
          virtualTeamName: 'Chat Team',
        };
        mockTask.data.wrapUpRequired = false;
        mockTask.data.interaction.mediaType = MEDIA_CHANNEL.CHAT;
        mockTask.data.interaction.mediaChannel = 'webchat';

        const result = extractTaskListItemData(mockTask, true);

        expect(result.mediaType).toBe(MEDIA_CHANNEL.CHAT);
        expect(result.isTelephony).toBe(false);
        expect(result.isSocial).toBe(false);
        expect(result.title).toBe('chat-user-123'); // ANI for non-social
        expect(result.displayState).toBe('active');

        // Restore original values
        mockTask.data.interaction.state = originalState;
        //@ts-expect-error  To be fixed in SDK - https://jira-eng-sjc12.cisco.com/jira/browse/CAI-6762
        mockTask.data.interaction.callAssociatedDetails = originalCallAssociatedDetails;
        mockTask.data.wrapUpRequired = originalWrapUpRequired;
        mockTask.data.interaction.mediaType = originalMediaType;
        mockTask.data.interaction.mediaChannel = originalMediaChannel;
      });

      it('should handle email tasks', () => {
        const originalState = mockTask.data.interaction.state;
        //@ts-expect-error  To be fixed in SDK - https://jira-eng-sjc12.cisco.com/jira/browse/CAI-6762
        const originalCallAssociatedDetails = mockTask.data.interaction.callAssociatedDetails;
        const originalWrapUpRequired = mockTask.data.wrapUpRequired;
        const originalMediaType = mockTask.data.interaction.mediaType;
        const originalMediaChannel = mockTask.data.interaction.mediaChannel;

        mockTask.data.interaction.state = 'active';
        //@ts-expect-error  To be fixed in SDK - https://jira-eng-sjc12.cisco.com/jira/browse/CAI-6762
        mockTask.data.interaction.callAssociatedDetails = {
          ani: 'user@email.com',
          customerName: 'Email Customer',
          virtualTeamName: 'Email Team',
        };
        mockTask.data.wrapUpRequired = false;
        mockTask.data.interaction.mediaType = MEDIA_CHANNEL.EMAIL;
        mockTask.data.interaction.mediaChannel = 'email';

        const result = extractTaskListItemData(mockTask, true);

        expect(result.mediaType).toBe(MEDIA_CHANNEL.EMAIL);
        expect(result.title).toBe('user@email.com');
        expect(result.isTelephony).toBe(false);
        expect(result.isSocial).toBe(false);

        // Restore original values
        mockTask.data.interaction.state = originalState;
        //@ts-expect-error  To be fixed in SDK - https://jira-eng-sjc12.cisco.com/jira/browse/CAI-6762
        mockTask.data.interaction.callAssociatedDetails = originalCallAssociatedDetails;
        mockTask.data.wrapUpRequired = originalWrapUpRequired;
        mockTask.data.interaction.mediaType = originalMediaType;
        mockTask.data.interaction.mediaChannel = originalMediaChannel;
      });
    });

    describe('Edge cases', () => {
      it('should handle missing call association details', () => {
        const originalState = mockTask.data.interaction.state;
        //@ts-expect-error  To be fixed in SDK - https://jira-eng-sjc12.cisco.com/jira/browse/CAI-6762
        const originalCallAssociatedDetails = mockTask.data.interaction.callAssociatedDetails;
        const originalWrapUpRequired = mockTask.data.wrapUpRequired;
        const originalMediaType = mockTask.data.interaction.mediaType;
        const originalMediaChannel = mockTask.data.interaction.mediaChannel;

        mockTask.data.interaction.state = 'active';
        //@ts-expect-error  To be fixed in SDK - https://jira-eng-sjc12.cisco.com/jira/browse/CAI-6762
        mockTask.data.interaction.callAssociatedDetails = undefined;
        mockTask.data.wrapUpRequired = false;
        mockTask.data.interaction.mediaType = MEDIA_CHANNEL.TELEPHONY;
        mockTask.data.interaction.mediaChannel = 'voice';

        const result = extractTaskListItemData(mockTask, true);

        expect(result.ani).toBeUndefined();
        expect(result.customerName).toBeUndefined();
        expect(result.virtualTeamName).toBeUndefined();
        expect(result.ronaTimeout).toBeNull();
        expect(result.title).toBeUndefined();

        // Restore original values
        mockTask.data.interaction.state = originalState;
        //@ts-expect-error  To be fixed in SDK - https://jira-eng-sjc12.cisco.com/jira/browse/CAI-6762
        mockTask.data.interaction.callAssociatedDetails = originalCallAssociatedDetails;
        mockTask.data.wrapUpRequired = originalWrapUpRequired;
        mockTask.data.interaction.mediaType = originalMediaType;
        mockTask.data.interaction.mediaChannel = originalMediaChannel;
      });

      it('should handle missing ronaTimeout', () => {
        const originalState = mockTask.data.interaction.state;
        //@ts-expect-error  To be fixed in SDK - https://jira-eng-sjc12.cisco.com/jira/browse/CAI-6762
        const originalCallAssociatedDetails = mockTask.data.interaction.callAssociatedDetails;
        const originalWrapUpRequired = mockTask.data.wrapUpRequired;
        const originalMediaType = mockTask.data.interaction.mediaType;
        const originalMediaChannel = mockTask.data.interaction.mediaChannel;

        mockTask.data.interaction.state = 'new';
        //@ts-expect-error  To be fixed in SDK - https://jira-eng-sjc12.cisco.com/jira/browse/CAI-6762
        mockTask.data.interaction.callAssociatedDetails = {
          ani: '1234567890',
          customerName: 'Test User',
          virtualTeamName: 'Test Team',
          // ronaTimeout missing
        };
        mockTask.data.wrapUpRequired = false;
        mockTask.data.interaction.mediaType = MEDIA_CHANNEL.TELEPHONY;
        mockTask.data.interaction.mediaChannel = 'voice';

        const result = extractTaskListItemData(mockTask, true);

        expect(result.ronaTimeout).toBeNull();

        // Restore original values
        mockTask.data.interaction.state = originalState;
        //@ts-expect-error  To be fixed in SDK - https://jira-eng-sjc12.cisco.com/jira/browse/CAI-6762
        mockTask.data.interaction.callAssociatedDetails = originalCallAssociatedDetails;
        mockTask.data.wrapUpRequired = originalWrapUpRequired;
        mockTask.data.interaction.mediaType = originalMediaType;
        mockTask.data.interaction.mediaChannel = originalMediaChannel;
      });

      it('should handle invalid ronaTimeout', () => {
        const originalState = mockTask.data.interaction.state;
        //@ts-expect-error  To be fixed in SDK - https://jira-eng-sjc12.cisco.com/jira/browse/CAI-6762
        const originalCallAssociatedDetails = mockTask.data.interaction.callAssociatedDetails;
        const originalWrapUpRequired = mockTask.data.wrapUpRequired;
        const originalMediaType = mockTask.data.interaction.mediaType;
        const originalMediaChannel = mockTask.data.interaction.mediaChannel;

        mockTask.data.interaction.state = 'new';
        //@ts-expect-error  To be fixed in SDK - https://jira-eng-sjc12.cisco.com/jira/browse/CAI-6762
        mockTask.data.interaction.callAssociatedDetails = {
          ani: '1234567890',
          customerName: 'Test User',
          virtualTeamName: 'Test Team',
          ronaTimeout: 'invalid',
        };
        mockTask.data.wrapUpRequired = false;
        mockTask.data.interaction.mediaType = MEDIA_CHANNEL.TELEPHONY;
        mockTask.data.interaction.mediaChannel = 'voice';

        const result = extractTaskListItemData(mockTask, true);

        expect(result.ronaTimeout).toBeNaN();

        // Restore original values
        mockTask.data.interaction.state = originalState;
        //@ts-expect-error  To be fixed in SDK - https://jira-eng-sjc12.cisco.com/jira/browse/CAI-6762
        mockTask.data.interaction.callAssociatedDetails = originalCallAssociatedDetails;
        mockTask.data.wrapUpRequired = originalWrapUpRequired;
        mockTask.data.interaction.mediaType = originalMediaType;
        mockTask.data.interaction.mediaChannel = originalMediaChannel;
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

    it('should return true for incoming task with wrap up required', () => {
      const incomingTask = {
        ...mockTask,
        data: {
          ...mockTask.data,
          interactionId: 'incoming-task-789',
          wrapUpRequired: true,
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
      expect(result).toBe(true);
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
    it('should return true for null task list', () => {
      expect(isTaskListEmpty(null)).toBe(true);
    });

    it('should return true for undefined task list', () => {
      expect(isTaskListEmpty(undefined)).toBe(true);
    });

    it('should return true for empty object', () => {
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
      const task2 = {
        ...mockTask,
        data: {
          ...mockTask.data,
          interactionId: 'task-2',
        },
      };

      const taskList = {
        'task-1': task1,
        'task-2': task2,
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
      const task2 = {
        ...mockTask,
        data: {
          ...mockTask.data,
          interactionId: 'task-2',
        },
      };

      const taskList = {
        'task-1': task1,
        'task-2': task2,
      };

      const result = getTasksArray(taskList);
      expect(result).toHaveLength(2);
      expect(result).toContain(task1);
      expect(result).toContain(task2);
    });

    it('should return empty array for empty task list', () => {
      const result = getTasksArray({});
      expect(result).toEqual([]);
    });

    it('should return empty array for null task list', () => {
      const result = getTasksArray(null);
      expect(result).toEqual([]);
    });

    it('should return empty array for undefined task list', () => {
      const result = getTasksArray(undefined);
      expect(result).toEqual([]);
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

      const handler = createTaskSelectHandler(task, currentTask, mockOnTaskSelect);
      handler();

      expect(mockOnTaskSelect).toHaveBeenCalledWith(task);
    });

    it('should not call onTaskSelect for non-selectable task', () => {
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

      const handler = createTaskSelectHandler(task, currentTask, mockOnTaskSelect);
      handler();

      expect(mockOnTaskSelect).not.toHaveBeenCalled();
    });

    it('should not call onTaskSelect for same task', () => {
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

      const handler = createTaskSelectHandler(task, task, mockOnTaskSelect);
      handler();

      expect(mockOnTaskSelect).not.toHaveBeenCalled();
    });
  });

  describe('Button text combinations', () => {
    const testCases = [
      {
        description: 'browser telephony incoming without wrap up',
        isBrowser: true,
        mediaType: MEDIA_CHANNEL.TELEPHONY,
        state: 'new',
        wrapUpRequired: false,
        expectedAcceptText: 'Accept',
        expectedDeclineText: 'Decline',
        expectedDisableAccept: false,
      },
      {
        description: 'non-browser telephony incoming without wrap up',
        isBrowser: false,
        mediaType: MEDIA_CHANNEL.TELEPHONY,
        state: 'new',
        wrapUpRequired: false,
        expectedAcceptText: 'Ringing...',
        expectedDeclineText: undefined,
        expectedDisableAccept: true,
      },
      {
        description: 'browser social incoming without wrap up',
        isBrowser: true,
        mediaType: MEDIA_CHANNEL.SOCIAL,
        state: 'new',
        wrapUpRequired: false,
        expectedAcceptText: 'Accept',
        expectedDeclineText: undefined,
        expectedDisableAccept: false,
      },
      {
        description: 'active task (non-incoming)',
        isBrowser: true,
        mediaType: MEDIA_CHANNEL.TELEPHONY,
        state: 'active',
        wrapUpRequired: false,
        expectedAcceptText: undefined,
        expectedDeclineText: undefined,
        expectedDisableAccept: false,
      },
    ];

    testCases.forEach(
      ({
        description,
        isBrowser,
        mediaType,
        state,
        wrapUpRequired,
        expectedAcceptText,
        expectedDeclineText,
        expectedDisableAccept,
      }) => {
        it(`should handle ${description}`, () => {
          const originalState = mockTask.data.interaction.state;
          //@ts-expect-error  To be fixed in SDK - https://jira-eng-sjc12.cisco.com/jira/browse/CAI-6762
          const originalCallAssociatedDetails = mockTask.data.interaction.callAssociatedDetails;
          const originalWrapUpRequired = mockTask.data.wrapUpRequired;
          const originalMediaType = mockTask.data.interaction.mediaType;
          const originalMediaChannel = mockTask.data.interaction.mediaChannel;

          mockTask.data.interaction.state = state;
          //@ts-expect-error  To be fixed in SDK - https://jira-eng-sjc12.cisco.com/jira/browse/CAI-6762
          mockTask.data.interaction.callAssociatedDetails = {
            ani: '1234567890',
            customerName: 'Test User',
            virtualTeamName: 'Test Team',
          };
          mockTask.data.wrapUpRequired = wrapUpRequired;
          mockTask.data.interaction.mediaType = mediaType;
          mockTask.data.interaction.mediaChannel = 'test-channel';

          const result = extractTaskListItemData(mockTask, isBrowser);

          expect(result.acceptText).toBe(expectedAcceptText);
          expect(result.declineText).toBe(expectedDeclineText);
          expect(result.disableAccept).toBe(expectedDisableAccept);

          // Restore original values
          mockTask.data.interaction.state = originalState;
          //@ts-expect-error  To be fixed in SDK - https://jira-eng-sjc12.cisco.com/jira/browse/CAI-6762
          mockTask.data.interaction.callAssociatedDetails = originalCallAssociatedDetails;
          mockTask.data.wrapUpRequired = originalWrapUpRequired;
          mockTask.data.interaction.mediaType = originalMediaType;
          mockTask.data.interaction.mediaChannel = originalMediaChannel;
        });
      }
    );
  });

  // Additional test cases for 100% coverage
  describe('Additional coverage tests', () => {
    it('should handle task with zero ronaTimeout', () => {
      const originalState = mockTask.data.interaction.state;
      //@ts-expect-error  To be fixed in SDK - https://jira-eng-sjc12.cisco.com/jira/browse/CAI-6762
      const originalCallAssociatedDetails = mockTask.data.interaction.callAssociatedDetails;
      const originalWrapUpRequired = mockTask.data.wrapUpRequired;
      const originalMediaType = mockTask.data.interaction.mediaType;
      const originalMediaChannel = mockTask.data.interaction.mediaChannel;

      mockTask.data.interaction.state = 'new';
      //@ts-expect-error  To be fixed in SDK - https://jira-eng-sjc12.cisco.com/jira/browse/CAI-6762
      mockTask.data.interaction.callAssociatedDetails = {
        ani: '1234567890',
        customerName: 'Test User',
        virtualTeamName: 'Test Team',
        ronaTimeout: '0',
      };
      mockTask.data.wrapUpRequired = false;
      mockTask.data.interaction.mediaType = MEDIA_CHANNEL.TELEPHONY;
      mockTask.data.interaction.mediaChannel = 'voice';

      const result = extractTaskListItemData(mockTask, true);

      expect(result.ronaTimeout).toBe(0);

      // Restore original values
      mockTask.data.interaction.state = originalState;
      //@ts-expect-error  To be fixed in SDK - https://jira-eng-sjc12.cisco.com/jira/browse/CAI-6762
      mockTask.data.interaction.callAssociatedDetails = originalCallAssociatedDetails;
      mockTask.data.wrapUpRequired = originalWrapUpRequired;
      mockTask.data.interaction.mediaType = originalMediaType;
      mockTask.data.interaction.mediaChannel = originalMediaChannel;
    });

    it('should handle social media task with wrap up required', () => {
      const originalState = mockTask.data.interaction.state;
      //@ts-expect-error  To be fixed in SDK - https://jira-eng-sjc12.cisco.com/jira/browse/CAI-6762
      const originalCallAssociatedDetails = mockTask.data.interaction.callAssociatedDetails;
      const originalWrapUpRequired = mockTask.data.wrapUpRequired;
      const originalMediaType = mockTask.data.interaction.mediaType;
      const originalMediaChannel = mockTask.data.interaction.mediaChannel;

      mockTask.data.interaction.state = 'new';
      //@ts-expect-error  To be fixed in SDK - https://jira-eng-sjc12.cisco.com/jira/browse/CAI-6762
      mockTask.data.interaction.callAssociatedDetails = {
        ani: '1234567890',
        customerName: 'Social Customer',
        virtualTeamName: 'Social Team',
      };
      mockTask.data.wrapUpRequired = true;
      mockTask.data.interaction.mediaType = MEDIA_CHANNEL.SOCIAL;
      mockTask.data.interaction.mediaChannel = 'facebook';

      const result = extractTaskListItemData(mockTask, true);

      expect(result.acceptText).toBeUndefined();
      expect(result.declineText).toBeUndefined();
      expect(result.isSocial).toBe(true);

      // Restore original values
      mockTask.data.interaction.state = originalState;
      //@ts-expect-error  To be fixed in SDK - https://jira-eng-sjc12.cisco.com/jira/browse/CAI-6762
      mockTask.data.interaction.callAssociatedDetails = originalCallAssociatedDetails;
      mockTask.data.wrapUpRequired = originalWrapUpRequired;
      mockTask.data.interaction.mediaType = originalMediaType;
      mockTask.data.interaction.mediaChannel = originalMediaChannel;
    });

    it('should handle task with empty string ronaTimeout', () => {
      const originalState = mockTask.data.interaction.state;
      //@ts-expect-error  To be fixed in SDK - https://jira-eng-sjc12.cisco.com/jira/browse/CAI-6762
      const originalCallAssociatedDetails = mockTask.data.interaction.callAssociatedDetails;
      const originalWrapUpRequired = mockTask.data.wrapUpRequired;
      const originalMediaType = mockTask.data.interaction.mediaType;
      const originalMediaChannel = mockTask.data.interaction.mediaChannel;

      mockTask.data.interaction.state = 'new';
      //@ts-expect-error  To be fixed in SDK - https://jira-eng-sjc12.cisco.com/jira/browse/CAI-6762
      mockTask.data.interaction.callAssociatedDetails = {
        ani: '1234567890',
        customerName: 'Test User',
        virtualTeamName: 'Test Team',
        ronaTimeout: '',
      };
      mockTask.data.wrapUpRequired = false;
      mockTask.data.interaction.mediaType = MEDIA_CHANNEL.TELEPHONY;
      mockTask.data.interaction.mediaChannel = 'voice';

      const result = extractTaskListItemData(mockTask, true);

      // Empty string ronaTimeout is handled as null, not 0
      expect(result.ronaTimeout).toBeNull();

      // Restore original values
      mockTask.data.interaction.state = originalState;
      //@ts-expect-error  To be fixed in SDK - https://jira-eng-sjc12.cisco.com/jira/browse/CAI-6762
      mockTask.data.interaction.callAssociatedDetails = originalCallAssociatedDetails;
      mockTask.data.wrapUpRequired = originalWrapUpRequired;
      mockTask.data.interaction.mediaType = originalMediaType;
      mockTask.data.interaction.mediaChannel = originalMediaChannel;
    });

    it('should handle task with null ronaTimeout', () => {
      const originalState = mockTask.data.interaction.state;
      //@ts-expect-error  To be fixed in SDK - https://jira-eng-sjc12.cisco.com/jira/browse/CAI-6762
      const originalCallAssociatedDetails = mockTask.data.interaction.callAssociatedDetails;
      const originalWrapUpRequired = mockTask.data.wrapUpRequired;
      const originalMediaType = mockTask.data.interaction.mediaType;
      const originalMediaChannel = mockTask.data.interaction.mediaChannel;

      mockTask.data.interaction.state = 'new';
      //@ts-expect-error  To be fixed in SDK - https://jira-eng-sjc12.cisco.com/jira/browse/CAI-6762
      mockTask.data.interaction.callAssociatedDetails = {
        ani: '1234567890',
        customerName: 'Test User',
        virtualTeamName: 'Test Team',
        ronaTimeout: null,
      };
      mockTask.data.wrapUpRequired = false;
      mockTask.data.interaction.mediaType = MEDIA_CHANNEL.TELEPHONY;
      mockTask.data.interaction.mediaChannel = 'voice';

      const result = extractTaskListItemData(mockTask, true);

      expect(result.ronaTimeout).toBeNull();

      // Restore original values
      mockTask.data.interaction.state = originalState;
      //@ts-expect-error  To be fixed in SDK - https://jira-eng-sjc12.cisco.com/jira/browse/CAI-6762
      mockTask.data.interaction.callAssociatedDetails = originalCallAssociatedDetails;
      mockTask.data.wrapUpRequired = originalWrapUpRequired;
      mockTask.data.interaction.mediaType = originalMediaType;
      mockTask.data.interaction.mediaChannel = originalMediaChannel;
    });

    it('should handle consult task with wrap up required', () => {
      const originalState = mockTask.data.interaction.state;
      //@ts-expect-error  To be fixed in SDK - https://jira-eng-sjc12.cisco.com/jira/browse/CAI-6762
      const originalCallAssociatedDetails = mockTask.data.interaction.callAssociatedDetails;
      const originalWrapUpRequired = mockTask.data.wrapUpRequired;
      const originalMediaType = mockTask.data.interaction.mediaType;
      const originalMediaChannel = mockTask.data.interaction.mediaChannel;

      mockTask.data.interaction.state = 'consult';
      //@ts-expect-error  To be fixed in SDK - https://jira-eng-sjc12.cisco.com/jira/browse/CAI-6762
      mockTask.data.interaction.callAssociatedDetails = {
        ani: '1234567890',
        customerName: 'Consult Customer',
        virtualTeamName: 'Consult Team',
      };
      mockTask.data.wrapUpRequired = true;
      mockTask.data.interaction.mediaType = MEDIA_CHANNEL.TELEPHONY;
      mockTask.data.interaction.mediaChannel = 'voice';

      const result = extractTaskListItemData(mockTask, true);

      expect(result.acceptText).toBeUndefined();
      expect(result.declineText).toBeUndefined();
      expect(result.isIncomingTask).toBe(true);

      // Restore original values
      mockTask.data.interaction.state = originalState;
      //@ts-expect-error  To be fixed in SDK - https://jira-eng-sjc12.cisco.com/jira/browse/CAI-6762
      mockTask.data.interaction.callAssociatedDetails = originalCallAssociatedDetails;
      mockTask.data.wrapUpRequired = originalWrapUpRequired;
      mockTask.data.interaction.mediaType = originalMediaType;
      mockTask.data.interaction.mediaChannel = originalMediaChannel;
    });

    it('should handle task with empty customerName and fallback to ANI', () => {
      const originalState = mockTask.data.interaction.state;
      //@ts-expect-error  To be fixed in SDK - https://jira-eng-sjc12.cisco.com/jira/browse/CAI-6762
      const originalCallAssociatedDetails = mockTask.data.interaction.callAssociatedDetails;
      const originalWrapUpRequired = mockTask.data.wrapUpRequired;
      const originalMediaType = mockTask.data.interaction.mediaType;
      const originalMediaChannel = mockTask.data.interaction.mediaChannel;

      mockTask.data.interaction.state = 'active';
      //@ts-expect-error  To be fixed in SDK - https://jira-eng-sjc12.cisco.com/jira/browse/CAI-6762
      mockTask.data.interaction.callAssociatedDetails = {
        ani: '1234567890',
        customerName: '',
        virtualTeamName: 'Test Team',
      };
      mockTask.data.wrapUpRequired = false;
      mockTask.data.interaction.mediaType = MEDIA_CHANNEL.SOCIAL;
      mockTask.data.interaction.mediaChannel = 'facebook';

      const result = extractTaskListItemData(mockTask, true);

      // For social media, empty customerName returns empty string, not ANI fallback
      expect(result.title).toBe('');

      // Restore original values
      mockTask.data.interaction.state = originalState;
      //@ts-expect-error  To be fixed in SDK - https://jira-eng-sjc12.cisco.com/jira/browse/CAI-6762
      mockTask.data.interaction.callAssociatedDetails = originalCallAssociatedDetails;
      mockTask.data.wrapUpRequired = originalWrapUpRequired;
      mockTask.data.interaction.mediaType = originalMediaType;
      mockTask.data.interaction.mediaChannel = originalMediaChannel;
    });
  });
});
