import {mockTask} from '@webex/test-fixtures';
import {findHoldTimestamp, getControlsVisibility} from '../../src/Utils/task-util';
describe('getControlsVisibility', () => {
  it('should show correct controls when station logis is BROWSER, all flags are enabled and media type is telehphony', () => {
    const deviceType = 'BROWSER';
    const featureFlags = {
      isEndCallEnabled: true,
      isEndConsultEnabled: true,
      webRtcEnabled: true,
    };
    // Updating
    const expectedControls = {
      accept: true,
      decline: true,
      end: true,
      muteUnmute: true,
      holdResume: true,
      consult: true,
      transfer: true,
      conference: true,
      wrapup: false,
      pauseResumeRecording: true,
      endConsult: true,
      recordingIndicator: true,
      isConferenceInProgress: false,
    };

    expect(getControlsVisibility(deviceType, featureFlags, mockTask)).toEqual(expectedControls);
  });

  it('should show correct controls when station logis is BROWSER, webRtcEnabled is disbaled and media type is telehphony', () => {
    const deviceType = 'BROWSER';
    const featureFlags = {
      isEndCallEnabled: true,
      isEndConsultEnabled: true,
      webRtcEnabled: false,
    };

    const expectedControls = {
      accept: false,
      decline: false,
      end: true,
      muteUnmute: false,
      holdResume: false,
      consult: false,
      transfer: false,
      conference: false,
      wrapup: false,
      pauseResumeRecording: false,
      endConsult: false,
      recordingIndicator: true,
      isConferenceInProgress: false,
    };

    expect(getControlsVisibility(deviceType, featureFlags, mockTask)).toEqual(expectedControls);
  });

  it('should show correct controls when station logis is BROWSER, isEndCallEnabled is disbaled and media type is telehphony', () => {
    const deviceType = 'BROWSER';
    const featureFlags = {
      isEndCallEnabled: false,
      isEndConsultEnabled: true,
      webRtcEnabled: true,
    };

    const expectedControls = {
      accept: true,
      decline: true,
      end: true,
      muteUnmute: true,
      holdResume: true,
      consult: true,
      transfer: true,
      conference: true,
      wrapup: false,
      pauseResumeRecording: true,
      endConsult: true,
      recordingIndicator: true,
      isConferenceInProgress: false,
    };

    expect(getControlsVisibility(deviceType, featureFlags, mockTask)).toEqual(expectedControls);
  });

  it('should show correct controls when station logis is BROWSER, isEndConsultEnabled is disbaled and media type is telehphony', () => {
    const deviceType = 'BROWSER';
    const featureFlags = {
      isEndCallEnabled: true,
      isEndConsultEnabled: false,
      webRtcEnabled: true,
    };

    const task = mockTask;
    task.data.interaction = {
      ...task.data.interaction,
      mediaType: 'telephony',
    };

    const expectedControls = {
      accept: true,
      decline: true,
      end: true,
      muteUnmute: true,
      holdResume: true,
      consult: true,
      transfer: true,
      conference: true,
      wrapup: false,
      pauseResumeRecording: true,
      endConsult: false,
      recordingIndicator: true,
      isConferenceInProgress: false,
    };

    expect(getControlsVisibility(deviceType, featureFlags, task)).toEqual(expectedControls);
  });

  it('should show correct controls when station logis is AGENT_DN, all flags are enabled and media type is telehphony', () => {
    const deviceType = 'AGENT_DN';
    const featureFlags = {
      isEndCallEnabled: true,
      isEndConsultEnabled: true,
      webRtcEnabled: true,
    };

    const expectedControls = {
      accept: false,
      decline: false,
      end: true,
      muteUnmute: false,
      holdResume: true,
      consult: true,
      transfer: true,
      conference: false,
      wrapup: false,
      pauseResumeRecording: true,
      endConsult: true,
      recordingIndicator: true,
      isConferenceInProgress: false,
    };

    expect(getControlsVisibility(deviceType, featureFlags, mockTask)).toEqual(expectedControls);
  });

  it('should show correct controls when station logis is EXTENSION, all flags are enabled and media type is telehphony', () => {
    const deviceType = 'EXTENSION';
    const featureFlags = {
      isEndCallEnabled: true,
      isEndConsultEnabled: true,
      webRtcEnabled: true,
    };

    const task = mockTask;
    task.data.interaction.mediaType = 'telephony';

    const expectedControls = {
      accept: false,
      decline: false,
      end: true,
      muteUnmute: false,
      holdResume: true,
      consult: true,
      transfer: true,
      conference: false,
      wrapup: false,
      pauseResumeRecording: true,
      endConsult: true,
      recordingIndicator: true,
      isConferenceInProgress: false,
    };

    expect(getControlsVisibility(deviceType, featureFlags, task)).toEqual(expectedControls);
  });

  it('should show correct controls when station logis is EXTENSION, all flags are enabled and media type is chat', () => {
    const deviceType = 'EXTENSION';
    const featureFlags = {
      isEndCallEnabled: true,
      isEndConsultEnabled: true,
      webRtcEnabled: true,
    };

    const task = mockTask;
    task.data.interaction.mediaType = 'chat';

    const expectedControls = {
      accept: true,
      decline: false,
      end: true,
      muteUnmute: false,
      holdResume: false,
      consult: false,
      transfer: true,
      conference: true,
      wrapup: false,
      pauseResumeRecording: false,
      endConsult: false,
      recordingIndicator: false,
      isConferenceInProgress: false,
    };

    expect(getControlsVisibility(deviceType, featureFlags, task)).toEqual(expectedControls);
  });

  it('should show correct controls when station logis is BROWSER, all flags are enabled and media type is email', () => {
    const deviceType = 'BROWSER';
    const featureFlags = {
      isEndCallEnabled: true,
      isEndConsultEnabled: true,
      webRtcEnabled: true,
    };

    const task = mockTask;
    task.data.interaction.mediaType = 'email';

    const expectedControls = {
      accept: true,
      decline: false,
      end: true,
      muteUnmute: false,
      holdResume: false,
      consult: false,
      transfer: true,
      conference: false,
      wrapup: false,
      pauseResumeRecording: false,
      endConsult: false,
      recordingIndicator: false,
      isConferenceInProgress: false,
    };

    expect(getControlsVisibility(deviceType, featureFlags, task)).toEqual(expectedControls);
  });

  it('should handle errors when accessing featureFlags and return safe defaults', () => {
    const logger = {
      error: jest.fn(),
      log: jest.fn(),
      warn: jest.fn(),
      info: jest.fn(),
      trace: jest.fn(),
    };
    const deviceType = 'BROWSER';
    // Create problematic featureFlags that throw when accessing properties
    const problematicFeatureFlags = new Proxy(
      {},
      {
        get: () => {
          throw new Error('FeatureFlags access error');
        },
      }
    );

    const result = getControlsVisibility(deviceType, problematicFeatureFlags, mockTask, logger);

    expect(logger.error).toHaveBeenCalledWith(
      'CC-Widgets: Task: Error in getControlsVisibility - FeatureFlags access error',
      {
        module: 'task-util',
        method: 'getControlsVisibility',
      }
    );

    expect(result).toEqual({
      accept: false,
      decline: false,
      end: false,
      muteUnmute: false,
      holdResume: false,
      consult: false,
      transfer: false,
      conference: false,
      wrapup: false,
      pauseResumeRecording: false,
      endConsult: false,
      recordingIndicator: false,
      isConferenceInProgress: false,
    });
  });
});

describe('findHoldTimestamp', () => {
  it('returns the holdTimestamp for the correct mType', () => {
    const interaction = {
      media: {
        main: {mType: 'mainCall', holdTimestamp: 123456},
        aux: {mType: 'auxCall', holdTimestamp: 654321},
      },
    };
    expect(findHoldTimestamp(interaction, 'mainCall')).toBe(123456);
    expect(findHoldTimestamp(interaction, 'auxCall')).toBe(654321);
  });

  it('returns null if mType is not found', () => {
    const interaction = {
      media: {
        main: {mType: 'mainCall', holdTimestamp: 123456},
      },
    };
    expect(findHoldTimestamp(interaction, 'otherCall')).toBeNull();
  });

  it('returns null if holdTimestamp is missing', () => {
    const interaction = {
      media: {
        main: {mType: 'mainCall'},
      },
    };
    expect(findHoldTimestamp(interaction, 'mainCall')).toBeNull();
  });

  it('returns null if media is missing', () => {
    const interaction = {};
    expect(findHoldTimestamp(interaction, 'mainCall')).toBeNull();
  });

  it('returns 0 if holdTimestamp is 0', () => {
    const interaction = {
      media: {
        main: {mType: 'mainCall', holdTimestamp: 0},
      },
    };
    expect(findHoldTimestamp(interaction, 'mainCall')).toBe(0);
  });

  it('works with extra unknown properties', () => {
    const interaction = {
      media: {
        main: {mType: 'mainCall', holdTimestamp: 42, foo: 'bar'},
      },
      extra: 123,
    };
    expect(findHoldTimestamp(interaction, 'mainCall')).toBe(42);
  });

  it('should handle errors when accessing interaction media and return null', () => {
    const logger = {
      error: jest.fn(),
      log: jest.fn(),
      warn: jest.fn(),
      info: jest.fn(),
      trace: jest.fn(),
    };
    // Create a problematic interaction that throws when accessing media
    const problematicInteraction = new Proxy(
      {},
      {
        get: (target, prop) => {
          if (prop === 'media') {
            throw new Error('Media access error');
          }
          return target[prop];
        },
      }
    );

    const result = findHoldTimestamp(problematicInteraction, 'mainCall', logger);

    expect(logger.error).toHaveBeenCalledWith('CC-Widgets: Task: Error in findHoldTimestamp - Media access error', {
      module: 'task-util',
      method: 'findHoldTimestamp',
    });

    expect(result).toBeNull();
  });
});
