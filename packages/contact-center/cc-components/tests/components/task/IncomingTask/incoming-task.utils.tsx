import {extractIncomingTaskData} from '../../../../src/components/task/IncomingTask/incoming-task.utils';
import {MEDIA_CHANNEL} from '../../../../src/components/task/task.types';
import {ITask} from '@webex/cc-store';

describe('incoming-task.utils', () => {
  const createMockTask = (overrides = {}): ITask =>
    ({
      data: {
        interaction: {
          callAssociatedDetails: {
            ani: '1234567890',
            customerName: 'John Doe',
            virtualTeamName: 'Support Team',
            ronaTimeout: '30',
          },
          createdTimestamp: 1641234567890,
          mediaType: MEDIA_CHANNEL.TELEPHONY,
          mediaChannel: 'voice',
        },
        wrapUpRequired: false,
        interactionId: 'test-interaction-123',
        ...overrides,
      },
      ...overrides,
    }) as ITask;

  describe('extractIncomingTaskData', () => {
    describe('Telephony tasks', () => {
      it('should extract correct data for browser telephony task without wrap up', () => {
        const mockTask = createMockTask();
        const result = extractIncomingTaskData(mockTask, true);

        expect(result).toEqual({
          ani: '1234567890',
          customerName: 'John Doe',
          virtualTeamName: 'Support Team',
          ronaTimeout: 30,
          startTimeStamp: 1641234567890,
          mediaType: MEDIA_CHANNEL.TELEPHONY,
          mediaChannel: 'voice',
          isTelephony: true,
          isSocial: false,
          acceptText: 'Accept',
          declineText: 'Decline',
          title: '1234567890',
          disableAccept: false,
        });
      });

      it('should extract correct data for non-browser telephony task without wrap up', () => {
        const mockTask = createMockTask();
        const result = extractIncomingTaskData(mockTask, false);

        expect(result).toEqual({
          ani: '1234567890',
          customerName: 'John Doe',
          virtualTeamName: 'Support Team',
          ronaTimeout: 30,
          startTimeStamp: 1641234567890,
          mediaType: MEDIA_CHANNEL.TELEPHONY,
          mediaChannel: 'voice',
          isTelephony: true,
          isSocial: false,
          acceptText: 'Ringing...',
          declineText: undefined,
          title: '1234567890',
          disableAccept: true,
        });
      });

      it('should handle telephony task with wrap up required', () => {
        const mockTask = createMockTask({
          data: {
            wrapUpRequired: true,
            interaction: {
              callAssociatedDetails: {
                ani: '9876543210',
                customerName: 'Jane Smith',
                virtualTeamName: 'Sales Team',
                ronaTimeout: '45',
              },
              createdTimestamp: 1641234567890,
              mediaType: MEDIA_CHANNEL.TELEPHONY,
              mediaChannel: 'voice',
            },
          },
        });

        const result = extractIncomingTaskData(mockTask, true);

        expect(result.acceptText).toBeUndefined();
        expect(result.declineText).toBeUndefined();
        expect(result.isTelephony).toBe(true);
        expect(result.title).toBe('9876543210');
      });
    });

    describe('Social media tasks', () => {
      it('should extract correct data for social media task', () => {
        const mockTask = createMockTask({
          data: {
            interaction: {
              callAssociatedDetails: {
                ani: '1234567890',
                customerName: 'Alice Johnson',
                virtualTeamName: 'Social Team',
                ronaTimeout: '60',
              },
              createdTimestamp: 1641234567890,
              mediaType: MEDIA_CHANNEL.SOCIAL,
              mediaChannel: 'facebook',
            },
            wrapUpRequired: false,
          },
        });

        const result = extractIncomingTaskData(mockTask, true);

        expect(result).toEqual({
          ani: '1234567890',
          customerName: 'Alice Johnson',
          virtualTeamName: 'Social Team',
          ronaTimeout: 60,
          startTimeStamp: 1641234567890,
          mediaType: MEDIA_CHANNEL.SOCIAL,
          mediaChannel: 'facebook',
          isTelephony: false,
          isSocial: true,
          acceptText: 'Accept',
          declineText: undefined,
          title: 'Alice Johnson',
          disableAccept: false,
        });
      });

      it('should handle social media task with wrap up required', () => {
        const mockTask = createMockTask({
          data: {
            interaction: {
              callAssociatedDetails: {
                ani: '1234567890',
                customerName: 'Bob Wilson',
                virtualTeamName: 'Social Team',
              },
              createdTimestamp: 1641234567890,
              mediaType: MEDIA_CHANNEL.SOCIAL,
              mediaChannel: 'twitter',
            },
            wrapUpRequired: true,
          },
        });

        const result = extractIncomingTaskData(mockTask, true);

        expect(result.acceptText).toBeUndefined();
        expect(result.declineText).toBeUndefined();
        expect(result.isSocial).toBe(true);
        expect(result.title).toBe('Bob Wilson');
      });
    });

    describe('Edge cases and missing data', () => {
      it('should handle missing call association details', () => {
        const mockTask = createMockTask({
          data: {
            interaction: {
              callAssociatedDetails: undefined,
              createdTimestamp: 1641234567890,
              mediaType: MEDIA_CHANNEL.TELEPHONY,
              mediaChannel: 'voice',
            },
            wrapUpRequired: false,
          },
        });

        const result = extractIncomingTaskData(mockTask, true);

        expect(result.ani).toBeUndefined();
        expect(result.customerName).toBeUndefined();
        expect(result.virtualTeamName).toBeUndefined();
        expect(result.ronaTimeout).toBeNull();
        expect(result.title).toBeUndefined();
      });

      it('should handle missing ronaTimeout', () => {
        const mockTask = createMockTask({
          data: {
            interaction: {
              callAssociatedDetails: {
                ani: '1234567890',
                customerName: 'Test User',
                virtualTeamName: 'Test Team',
              },
              createdTimestamp: 1641234567890,
              mediaType: MEDIA_CHANNEL.TELEPHONY,
              mediaChannel: 'voice',
            },
            wrapUpRequired: false,
          },
        });

        const result = extractIncomingTaskData(mockTask, true);

        expect(result.ronaTimeout).toBeNull();
      });

      it('should handle invalid ronaTimeout', () => {
        const mockTask = createMockTask({
          data: {
            interaction: {
              callAssociatedDetails: {
                ani: '1234567890',
                customerName: 'Test User',
                virtualTeamName: 'Test Team',
                ronaTimeout: 'invalid-number',
              },
              createdTimestamp: 1641234567890,
              mediaType: MEDIA_CHANNEL.TELEPHONY,
              mediaChannel: 'voice',
            },
            wrapUpRequired: false,
          },
        });

        const result = extractIncomingTaskData(mockTask, true);

        expect(result.ronaTimeout).toBeNaN();
      });

      it('should handle zero ronaTimeout', () => {
        const mockTask = createMockTask({
          data: {
            interaction: {
              callAssociatedDetails: {
                ani: '1234567890',
                customerName: 'Test User',
                virtualTeamName: 'Test Team',
                ronaTimeout: '0',
              },
              createdTimestamp: 1641234567890,
              mediaType: MEDIA_CHANNEL.TELEPHONY,
              mediaChannel: 'voice',
            },
            wrapUpRequired: false,
          },
        });

        const result = extractIncomingTaskData(mockTask, true);

        expect(result.ronaTimeout).toBe(0);
      });
    });

    describe('Different media types', () => {
      it('should handle chat media type', () => {
        const mockTask = createMockTask({
          data: {
            interaction: {
              callAssociatedDetails: {
                ani: '1234567890',
                customerName: 'Chat User',
                virtualTeamName: 'Chat Team',
              },
              createdTimestamp: 1641234567890,
              mediaType: MEDIA_CHANNEL.CHAT,
              mediaChannel: 'webchat',
            },
            wrapUpRequired: false,
          },
        });

        const result = extractIncomingTaskData(mockTask, true);

        expect(result.isTelephony).toBe(false);
        expect(result.isSocial).toBe(false);
        expect(result.mediaType).toBe(MEDIA_CHANNEL.CHAT);
        expect(result.title).toBe('1234567890');
        expect(result.acceptText).toBe('Accept');
        expect(result.declineText).toBeUndefined();
        expect(result.disableAccept).toBe(false);
      });

      it('should handle email media type', () => {
        const mockTask = createMockTask({
          data: {
            interaction: {
              callAssociatedDetails: {
                ani: 'email@example.com',
                customerName: 'Email User',
                virtualTeamName: 'Email Team',
              },
              createdTimestamp: 1641234567890,
              mediaType: MEDIA_CHANNEL.EMAIL,
              mediaChannel: 'email',
            },
            wrapUpRequired: false,
          },
        });

        const result = extractIncomingTaskData(mockTask, true);

        expect(result.isTelephony).toBe(false);
        expect(result.isSocial).toBe(false);
        expect(result.mediaType).toBe(MEDIA_CHANNEL.EMAIL);
        expect(result.title).toBe('email@example.com');
      });
    });

    describe('Button state combinations', () => {
      const testCases = [
        {
          description: 'browser telephony without wrap up',
          isBrowser: true,
          mediaType: MEDIA_CHANNEL.TELEPHONY,
          wrapUpRequired: false,
          expectedAcceptText: 'Accept',
          expectedDeclineText: 'Decline',
          expectedDisableAccept: false,
        },
        {
          description: 'non-browser telephony without wrap up',
          isBrowser: false,
          mediaType: MEDIA_CHANNEL.TELEPHONY,
          wrapUpRequired: false,
          expectedAcceptText: 'Ringing...',
          expectedDeclineText: undefined,
          expectedDisableAccept: true,
        },
        {
          description: 'browser telephony with wrap up',
          isBrowser: true,
          mediaType: MEDIA_CHANNEL.TELEPHONY,
          wrapUpRequired: true,
          expectedAcceptText: undefined,
          expectedDeclineText: undefined,
          expectedDisableAccept: false,
        },
        {
          description: 'browser social without wrap up',
          isBrowser: true,
          mediaType: MEDIA_CHANNEL.SOCIAL,
          wrapUpRequired: false,
          expectedAcceptText: 'Accept',
          expectedDeclineText: undefined,
          expectedDisableAccept: false,
        },
        {
          description: 'browser chat without wrap up',
          isBrowser: true,
          mediaType: MEDIA_CHANNEL.CHAT,
          wrapUpRequired: false,
          expectedAcceptText: 'Accept',
          expectedDeclineText: undefined,
          expectedDisableAccept: false,
        },
      ];

      testCases.forEach(
        ({
          description,
          isBrowser,
          mediaType,
          wrapUpRequired,
          expectedAcceptText,
          expectedDeclineText,
          expectedDisableAccept,
        }) => {
          it(`should handle ${description}`, () => {
            const mockTask = createMockTask({
              data: {
                interaction: {
                  callAssociatedDetails: {
                    ani: '1234567890',
                    customerName: 'Test User',
                    virtualTeamName: 'Test Team',
                  },
                  createdTimestamp: 1641234567890,
                  mediaType,
                  mediaChannel: 'test-channel',
                },
                wrapUpRequired,
              },
            });

            const result = extractIncomingTaskData(mockTask, isBrowser);

            expect(result.acceptText).toBe(expectedAcceptText);
            expect(result.declineText).toBe(expectedDeclineText);
            expect(result.disableAccept).toBe(expectedDisableAccept);
          });
        }
      );
    });
  });
});
