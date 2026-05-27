import {calculateStateTimerData, calculateConsultTimerData} from '../../src/Utils/timer-utils';
import {
  TIMER_LABEL_WRAP_UP,
  TIMER_LABEL_POST_CALL,
  TIMER_LABEL_CONSULT_ON_HOLD,
  TIMER_LABEL_CONSULTING,
  TIMER_LABEL_CONSULT_REQUESTED,
} from '../../src/Utils/constants';
import {ITask} from '@webex/cc-store';
import {createEnabledMainTaskUIControls, disabledControl, enabledControl} from '@webex/test-fixtures';

const defaultControls = createEnabledMainTaskUIControls();
const wrapUpControls = createEnabledMainTaskUIControls({wrapup: enabledControl});

describe('timer-utils', () => {
  describe('calculateStateTimerData', () => {
    it('should return default when currentTask is null', () => {
      const result = calculateStateTimerData(null, defaultControls, 'agent1');
      expect(result).toEqual({label: null, timestamp: 0});
    });

    it('should return default when controlVisibility is null', () => {
      const mockTask = {
        data: {
          interaction: {
            participants: {
              agent1: {joinTimestamp: 1000},
            },
          },
        },
      } as unknown as ITask;

      const result = calculateStateTimerData(mockTask, null, 'agent1');
      expect(result).toEqual({label: null, timestamp: 0});
    });

    it('should return Wrap Up label when in wrapup state', () => {
      const mockTask = {
        data: {
          interaction: {
            participants: {
              agent1: {
                isWrapUp: true,
                lastUpdated: 3000,
              },
            },
          },
        },
      } as unknown as ITask;

      const result = calculateStateTimerData(mockTask, wrapUpControls, 'agent1');
      expect(result.label).toBe(TIMER_LABEL_WRAP_UP);
      expect(result.timestamp).toBe(3000);
    });

    it('should use wrapUpTimestamp when not currently in wrapup', () => {
      const mockTask = {
        data: {
          interaction: {
            participants: {
              agent1: {
                isWrapUp: false,
                wrapUpTimestamp: 2500,
              },
            },
          },
        },
      } as unknown as ITask;

      const result = calculateStateTimerData(mockTask, wrapUpControls, 'agent1');
      expect(result.label).toBe(TIMER_LABEL_WRAP_UP);
      expect(result.timestamp).toBe(2500);
    });

    it('should return Post Call label when in post_call state', () => {
      const mockTask = {
        data: {
          interaction: {
            state: 'post_call',
            participants: {
              agent1: {
                currentState: 'post_call',
                currentStateTimestamp: 4000,
              },
            },
          },
        },
      } as unknown as ITask;

      const controls = createEnabledMainTaskUIControls({wrapup: disabledControl});

      const result = calculateStateTimerData(mockTask, controls, 'agent1');
      expect(result.label).toBe(TIMER_LABEL_POST_CALL);
      expect(result.timestamp).toBe(4000);
    });

    it('should prioritize Wrap Up over Post Call', () => {
      const mockTask = {
        data: {
          interaction: {
            state: 'post_call',
            participants: {
              agent1: {
                isWrapUp: true,
                lastUpdated: 3000,
                currentStateTimestamp: 4000,
              },
            },
          },
        },
      } as unknown as ITask;

      const result = calculateStateTimerData(mockTask, wrapUpControls, 'agent1');
      expect(result.label).toBe(TIMER_LABEL_WRAP_UP);
      expect(result.timestamp).toBe(3000);
    });

    it('should return default when participant not found', () => {
      const mockTask = {
        data: {
          interaction: {
            participants: {
              agent2: {joinTimestamp: 1000},
            },
          },
        },
      } as unknown as ITask;

      const result = calculateStateTimerData(mockTask, defaultControls, 'agent1');
      expect(result).toEqual({label: null, timestamp: 0});
    });
  });

  describe('calculateConsultTimerData', () => {
    it('should return default when currentTask is null', () => {
      const result = calculateConsultTimerData(null, defaultControls, 'agent1');
      expect(result).toEqual({label: TIMER_LABEL_CONSULTING, timestamp: 0});
    });

    it('should return default when controlVisibility is null', () => {
      const mockTask = {
        data: {
          interaction: {
            participants: {
              agent1: {consultTimestamp: 2000},
            },
          },
        },
      } as unknown as ITask;

      const result = calculateConsultTimerData(mockTask, null, 'agent1');
      expect(result).toEqual({label: TIMER_LABEL_CONSULTING, timestamp: 0});
    });

    it('should return Consulting label with consultTimestamp', () => {
      const mockTask = {
        data: {
          interaction: {
            participants: {
              agent1: {
                consultTimestamp: 2000,
              },
            },
          },
        },
      } as unknown as ITask;

      const result = calculateConsultTimerData(mockTask, defaultControls, 'agent1');
      expect(result.label).toBe(TIMER_LABEL_CONSULTING);
      expect(result.timestamp).toBe(2000);
    });

    it('should use lastUpdated if consultTimestamp is not available', () => {
      const mockTask = {
        data: {
          interaction: {
            participants: {
              agent1: {
                lastUpdated: 2500,
              },
            },
          },
        },
      } as unknown as ITask;

      const result = calculateConsultTimerData(mockTask, defaultControls, 'agent1');
      expect(result.label).toBe(TIMER_LABEL_CONSULTING);
      expect(result.timestamp).toBe(2500);
    });

    it('should return Consult Requested label when consult is initiated', () => {
      const mockTask = {
        data: {
          consultStatus: 'consultInitiated',
          interaction: {
            participants: {
              agent1: {
                consultTimestamp: 2000,
                consultState: 'consultInitiated',
              },
            },
          },
        },
      } as unknown as ITask;

      const result = calculateConsultTimerData(mockTask, defaultControls, 'agent1');
      expect(result.label).toBe(TIMER_LABEL_CONSULT_REQUESTED);
      expect(result.timestamp).toBe(2000);
    });

    it('should return Consult on Hold when consult is held', () => {
      const mockTask = {
        data: {
          interaction: {
            media: {
              'consult-id': {
                mType: 'consult',
                isHold: true,
                holdTimestamp: 5000,
                mediaResourceId: 'consult-id',
                participants: ['agent1'],
              },
            },
            participants: {
              agent1: {
                consultTimestamp: 2000,
              },
            },
          },
        },
      } as unknown as ITask;

      const result = calculateConsultTimerData(mockTask, defaultControls, 'agent1');
      expect(result.label).toBe(TIMER_LABEL_CONSULT_ON_HOLD);
      expect(result.timestamp).toBe(5000);
    });

    it('should fallback to consulting when consult hold timestamp is 0', () => {
      const mockTask = {
        data: {
          interaction: {
            media: {
              'consult-id': {
                mType: 'consult',
                isHold: true,
                holdTimestamp: 0,
                mediaResourceId: 'consult-id',
                participants: ['agent1'],
              },
            },
            participants: {
              agent1: {
                consultTimestamp: 2000,
              },
            },
          },
        },
      } as unknown as ITask;

      const result = calculateConsultTimerData(mockTask, defaultControls, 'agent1');
      expect(result.label).toBe(TIMER_LABEL_CONSULTING);
      expect(result.timestamp).toBe(2000);
    });

    it('should return default when no consult timestamp available', () => {
      const mockTask = {
        data: {
          interaction: {
            participants: {
              agent1: {
                joinTimestamp: 1000,
              },
            },
          },
        },
      } as unknown as ITask;

      const result = calculateConsultTimerData(mockTask, defaultControls, 'agent1');
      expect(result).toEqual({label: TIMER_LABEL_CONSULTING, timestamp: 0});
    });

    it('should return default when participant not found', () => {
      const mockTask = {
        data: {
          interaction: {
            participants: {
              agent2: {consultTimestamp: 2000},
            },
          },
        },
      } as unknown as ITask;

      const result = calculateConsultTimerData(mockTask, defaultControls, 'agent1');
      expect(result).toEqual({label: TIMER_LABEL_CONSULTING, timestamp: 0});
    });
  });
});
