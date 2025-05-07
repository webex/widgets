import {getControlsVisibility} from '../../src/Utils/task-util';
describe('getControlsVisibility', () => {
  it('should show correct controls when station logis is BROWSER, all flags are enabled and media type is telehphony', () => {
    const deviceType = 'BROWSER';
    const featureFlags = {
      isEndCallEnabled: true,
      isEndConsultEnabled: true,
      webRtcEnabled: true,
    };
    const task = {
      data: {
        interaction: {
          mediaType: 'telephony',
        },
        wrapUpRequired: true,
      },
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
      wrapup: true,
      pauseResumeRecording: true,
      endConsult: true,
      recordingIndicator: true,
    };

    expect(getControlsVisibility(deviceType, featureFlags, task)).toEqual(expectedControls);
  });

  it('should show correct controls when station logis is BROWSER, webRtcEnabled is disbaled and media type is telehphony', () => {
    const deviceType = 'BROWSER';
    const featureFlags = {
      isEndCallEnabled: true,
      isEndConsultEnabled: true,
      webRtcEnabled: false,
    };
    const task = {
      data: {
        interaction: {
          mediaType: 'telephony',
        },
        wrapUpRequired: true,
      },
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
      wrapup: true,
      pauseResumeRecording: false,
      endConsult: false,
      recordingIndicator: true,
    };

    expect(getControlsVisibility(deviceType, featureFlags, task)).toEqual(expectedControls);
  });

  it('should show correct controls when station logis is BROWSER, isEndCallEnabled is disbaled and media type is telehphony', () => {
    const deviceType = 'BROWSER';
    const featureFlags = {
      isEndCallEnabled: false,
      isEndConsultEnabled: true,
      webRtcEnabled: true,
    };
    const task = {
      data: {
        interaction: {
          mediaType: 'telephony',
        },
        wrapUpRequired: true,
      },
    };

    const expectedControls = {
      accept: true,
      decline: true,
      end: false,
      muteUnmute: true,
      holdResume: true,
      consult: true,
      transfer: true,
      conference: true,
      wrapup: true,
      pauseResumeRecording: true,
      endConsult: true,
      recordingIndicator: true,
    };

    expect(getControlsVisibility(deviceType, featureFlags, task)).toEqual(expectedControls);
  });

  it('should show correct controls when station logis is BROWSER, isEndConsultEnabled is disbaled and media type is telehphony', () => {
    const deviceType = 'BROWSER';
    const featureFlags = {
      isEndCallEnabled: true,
      isEndConsultEnabled: false,
      webRtcEnabled: true,
    };
    const task = {
      data: {
        interaction: {
          mediaType: 'telephony',
        },
        wrapUpRequired: true,
      },
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
      wrapup: true,
      pauseResumeRecording: true,
      endConsult: false,
      recordingIndicator: true,
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
    const task = {
      data: {
        interaction: {
          mediaType: 'telephony',
        },
        wrapUpRequired: true,
      },
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
      wrapup: true,
      pauseResumeRecording: true,
      endConsult: true,
      recordingIndicator: true,
    };

    expect(getControlsVisibility(deviceType, featureFlags, task)).toEqual(expectedControls);
  });

  it('should show correct controls when station logis is EXTENSION, all flags are enabled and media type is telehphony', () => {
    const deviceType = 'EXTENSION';
    const featureFlags = {
      isEndCallEnabled: true,
      isEndConsultEnabled: true,
      webRtcEnabled: true,
    };
    const task = {
      data: {
        interaction: {
          mediaType: 'telephony',
        },
        wrapUpRequired: true,
      },
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
      wrapup: true,
      pauseResumeRecording: true,
      endConsult: true,
      recordingIndicator: true,
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
    const task = {
      data: {
        interaction: {
          mediaType: 'chat',
        },
        wrapUpRequired: true,
      },
    };

    const expectedControls = {
      accept: true,
      decline: false,
      end: true,
      muteUnmute: false,
      holdResume: false,
      consult: false,
      transfer: true,
      conference: true,
      wrapup: true,
      pauseResumeRecording: false,
      endConsult: false,
      recordingIndicator: false,
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
    const task = {
      data: {
        interaction: {
          mediaType: 'email',
        },
      },
    };

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
    };

    expect(getControlsVisibility(deviceType, featureFlags, task)).toEqual(expectedControls);
  });
});
