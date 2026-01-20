import {calculateStateTimerData, calculateConsultTimerData} from '../../src/Utils/timer-utils';
import {
  TIMER_LABEL_WRAP_UP,
  TIMER_LABEL_POST_CALL,
  TIMER_LABEL_CONSULT_ON_HOLD,
  TIMER_LABEL_CONSULTING,
  TIMER_LABEL_CONSULT_REQUESTED,
} from '../../src/Utils/constants';
import {ITask} from '@webex/cc-store';

const mockControlVisibility = {
  accept: {isVisible: true, isEnabled: true},
  decline: {isVisible: true, isEnabled: true},
  end: {isVisible: true, isEnabled: true},
  muteUnmute: {isVisible: true, isEnabled: true},
  muteUnmuteConsult: {isVisible: true, isEnabled: true},
  holdResume: {isVisible: true, isEnabled: true},
  consult: {isVisible: true, isEnabled: true},
  transfer: {isVisible: true, isEnabled: true},
  conference: {isVisible: true, isEnabled: true},
  wrapup: {isVisible: true, isEnabled: true},
  pauseResumeRecording: {isVisible: true, isEnabled: true},
  endConsult: {isVisible: true, isEnabled: true},
  recordingIndicator: {isVisible: true, isEnabled: true},
  exitConference: {isVisible: false, isEnabled: false},
  mergeConference: {isVisible: false, isEnabled: false},
  mergeConferenceConsult: {isVisible: false, isEnabled: false},
  consultTransfer: {isVisible: false, isEnabled: false},
  consultTransferConsult: {isVisible: false, isEnabled: false},
  switchToMainCall: {isVisible: false, isEnabled: false},
  switchToConsult: {isVisible: false, isEnabled: false},
  isConferenceInProgress: false,
  isConsultInitiated: false,
  isConsultInitiatedAndAccepted: false,
  isConsultReceived: false,
  isConsultInitiatedOrAccepted: false,
  isHeld: false,
  consultCallHeld: false,
};

describe('timer-utils', () => {
  describe('calculateStateTimerData', () => {
    it('should return default when currentTask is null', () => {
      const result = calculateStateTimerData(null, mockControlVisibility, 'agent1');
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

      const result = calculateStateTimerData(mockTask, mockControlVisibility, 'agent1');
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

      const result = calculateStateTimerData(mockTask, mockControlVisibility, 'agent1');
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

      const visibility = {
        ...mockControlVisibility,
        wrapup: {isVisible: false, isEnabled: false},
      };

      const result = calculateStateTimerData(mockTask, visibility, 'agent1');
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

      const result = calculateStateTimerData(mockTask, mockControlVisibility, 'agent1');
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

      const result = calculateStateTimerData(mockTask, mockControlVisibility, 'agent1');
      expect(result).toEqual({label: null, timestamp: 0});
    });
  });

  describe('calculateConsultTimerData', () => {
    it('should return default when currentTask is null', () => {
      const result = calculateConsultTimerData(null, mockControlVisibility, 'agent1');
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

      const result = calculateConsultTimerData(mockTask, mockControlVisibility, 'agent1');
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

      const result = calculateConsultTimerData(mockTask, mockControlVisibility, 'agent1');
      expect(result.label).toBe(TIMER_LABEL_CONSULTING);
      expect(result.timestamp).toBe(2500);
    });

    it('should return Consult Requested label when consult is initiated', () => {
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

      const visibility = {
        ...mockControlVisibility,
        isConsultInitiated: true,
        consultCallHeld: false,
      };

      const result = calculateConsultTimerData(mockTask, visibility, 'agent1');
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

      const visibility = {
        ...mockControlVisibility,
        consultCallHeld: true,
      };

      const result = calculateConsultTimerData(mockTask, visibility, 'agent1');
      expect(result.label).toBe(TIMER_LABEL_CONSULT_ON_HOLD);
      expect(result.timestamp).toBe(5000);
    });

    it('should fallback to consultTimestamp if consultHoldTimestamp is 0', () => {
      const mockTask = {
        data: {
          interaction: {
            media: {},
            participants: {
              agent1: {
                consultTimestamp: 2000,
              },
            },
          },
        },
      } as unknown as ITask;

      const visibility = {
        ...mockControlVisibility,
        consultCallHeld: true,
      };

      const result = calculateConsultTimerData(mockTask, visibility, 'agent1');
      expect(result.label).toBe(TIMER_LABEL_CONSULT_ON_HOLD);
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

      const result = calculateConsultTimerData(mockTask, mockControlVisibility, 'agent1');
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

      const result = calculateConsultTimerData(mockTask, mockControlVisibility, 'agent1');
      expect(result).toEqual({label: TIMER_LABEL_CONSULTING, timestamp: 0});
    });
  });
});
