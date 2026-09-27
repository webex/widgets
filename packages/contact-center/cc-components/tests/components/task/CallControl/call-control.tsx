import React from 'react';
import {render, fireEvent, waitFor} from '@testing-library/react';
import '@testing-library/jest-dom';
import CallControlComponent from '../../../../src/components/task/CallControl/call-control';
import {CallControlComponentProps, CallControlMenuType, TARGET_TYPE} from '../../../../src/components/task/task.types';
import * as callControlUtils from '../../../../src/components/task/CallControl/call-control.utils';
import {mockTask, createEnabledMainTaskUIControls, disabledControl, enabledControl} from '@webex/test-fixtures';

// Mock MediaStream for testing
Object.defineProperty(window, 'MediaStream', {
  writable: true,
  value: jest.fn().mockImplementation(() => ({
    getTracks: jest.fn(() => []),
    addTrack: jest.fn(),
    removeTrack: jest.fn(),
  })),
});

describe('CallControlComponent', () => {
  const mockLogger = {
    log: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    debug: jest.fn(),
    trace: jest.fn(),
  };

  const mockCurrentTask = {
    ...mockTask,
    id: 'task-123',
    mediaType: 'telephony',
    status: 'connected',
    isHeld: false,
    recording: {isRecording: false},
    wrapUpReason: null,
  };

  const mockWrapupCodes = [
    {id: 'wrap1', name: 'Customer Issue', isSystem: false},
    {id: 'wrap2', name: 'Technical Support', isSystem: false},
  ];

  const mockBuddyAgents = [
    {
      agentId: 'agent1',
      id: 'agent1',
      firstName: 'John',
      lastName: 'Doe',
      agentName: 'John Doe',
      dn: '1001',
      teamId: 'team1',
      teamName: 'Support Team',
      siteId: 'site1',
      siteName: 'Main Site',
      profileId: 'profile1',
      agentSessionId: 'session1',
      state: 'Available',
      stateChangeTime: 1234567890,
      auxiliaryCodeId: null,
      teamIds: ['team1'],
    },
  ];

  const mockControls = createEnabledMainTaskUIControls();

  const deferred = <T,>() => {
    let resolve!: (value: T) => void;
    let reject!: (reason?: unknown) => void;
    const promise = new Promise<T>((res, rej) => {
      resolve = res;
      reject = rej;
    });
    return {promise, resolve, reject};
  };

  const createMidCallSummary = (actionType: 'CONSULT' | 'TRANSFER', revision = 4) => ({
    state: 'content' as const,
    content: {type: 'text' as const, summaryText: 'Customer needs billing support.'},
    contentRevision: revision,
    actionType,
    selectedFeedback: 'none' as const,
    onEdit: jest.fn(),
    onCopy: jest.fn().mockReturnValue(true),
    onFeedback: jest.fn().mockResolvedValue({outcome: 'confirmed'}),
  });

  const createPostCallSummary = (overrides = {}) => ({
    state: 'generating' as const,
    content: {type: 'text' as const, summaryText: ''},
    contentRevision: 0,
    selectedFeedback: 'none' as const,
    requestPending: true,
    completionEscape: false,
    onEdit: jest.fn().mockReturnValue(false),
    onCopy: jest.fn().mockReturnValue(false),
    onFeedback: jest.fn().mockReturnValue(false),
    onRetry: jest.fn().mockResolvedValue({outcome: 'blocked'}),
    onCopyVisualStateChange: jest.fn(),
    ...overrides,
  });

  const renderMidCallPreActionCase = (
    action: 'transfer' | 'consult' | 'transferConference' | 'merge',
    sendMidCallSummaryBeforeAction: jest.Mock
  ) => {
    const requestMidCallSummary = jest.fn().mockResolvedValue({outcome: 'accepted', revision: 22});

    if (action === 'transfer') {
      const transferCall = jest.fn();
      const screen = render(
        <CallControlComponent
          {...defaultProps}
          transferCall={transferCall}
          controls={{
            ...createEnabledMainTaskUIControls(),
            consultTransferDestinations: {
              consult: [],
              transfer: ['agent'],
            },
          }}
          aiSummary={{
            transfer: createMidCallSummary('TRANSFER', 22),
            requestMidCallSummary,
            sendMidCallSummaryBeforeAction,
          }}
        />
      );

      return {
        actionSpy: transferCall,
        actionType: 'TRANSFER',
        revision: 22,
        activate: async () => {
          fireEvent.click(screen.getByLabelText('Transfer'));
          const selectAgent = await screen.findByLabelText('Select John Doe');
          fireEvent.click(selectAgent);
          fireEvent.click(selectAgent);
        },
      };
    }

    if (action === 'consult') {
      jest.spyOn(callControlUtils, 'filterButtonsForConsultation').mockReturnValue([
        {
          id: 'consult',
          icon: 'consult',
          tooltip: 'Consult',
          className: 'call-control-button',
          disabled: false,
          menuType: 'Consult',
          isVisible: true,
          dataTestId: 'consult-button',
        },
      ]);
      const consultCall = jest.fn();
      const screen = render(
        <CallControlComponent
          {...defaultProps}
          consultCall={consultCall}
          controls={{
            ...createEnabledMainTaskUIControls({transfer: disabledControl}),
            consultTransferDestinations: {
              consult: ['agent'],
              transfer: [],
            },
          }}
          aiSummary={{
            consult: createMidCallSummary('CONSULT', 23),
            requestMidCallSummary,
            sendMidCallSummaryBeforeAction,
          }}
        />
      );

      return {
        actionSpy: consultCall,
        actionType: 'CONSULT',
        revision: 23,
        activate: async () => {
          fireEvent.click(screen.getByLabelText('Consult'));
          const selectAgent = await screen.findByLabelText('Select John Doe');
          fireEvent.click(selectAgent);
          fireEvent.click(selectAgent);
        },
      };
    }

    if (action === 'transferConference') {
      jest.spyOn(callControlUtils, 'filterButtonsForConsultation').mockReturnValue([
        {
          id: 'transferConsult',
          icon: 'next-bold',
          tooltip: 'Transfer Conference',
          className: 'call-control-button',
          disabled: false,
          isVisible: true,
        },
      ]);
      const consultTransfer = jest.fn();
      const screen = render(
        <CallControlComponent
          {...defaultProps}
          consultTransfer={consultTransfer}
          aiSummary={{
            transfer: createMidCallSummary('TRANSFER', 24),
            requestMidCallSummary,
            sendMidCallSummaryBeforeAction,
          }}
        />
      );

      return {
        actionSpy: consultTransfer,
        actionType: 'TRANSFER',
        revision: 24,
        activate: async () => {
          fireEvent.click(screen.getByLabelText('Transfer Conference'));
          const confirm = await screen.findByTestId('consult-transfer:existing-party-confirm');
          fireEvent.click(confirm);
          fireEvent.click(confirm);
        },
      };
    }

    jest.spyOn(callControlUtils, 'filterButtonsForConsultation').mockReturnValue([
      {
        id: 'conference',
        icon: 'call-merge-bold',
        tooltip: 'Merge',
        className: 'call-control-button',
        disabled: false,
        isVisible: true,
      },
    ]);
    const consultConference = jest.fn();
    const screen = render(
      <CallControlComponent
        {...defaultProps}
        consultConference={consultConference}
        aiSummary={{
          consult: createMidCallSummary('CONSULT', 25),
          requestMidCallSummary,
          sendMidCallSummaryBeforeAction,
        }}
      />
    );

    return {
      actionSpy: consultConference,
      actionType: 'CONSULT',
      revision: 25,
      activate: async () => {
        fireEvent.click(screen.getByLabelText('Merge'));
        const confirm = await screen.findByTestId('consult-transfer:existing-party-confirm');
        fireEvent.click(confirm);
        fireEvent.click(confirm);
      },
    };
  };

  const defaultProps: CallControlComponentProps = {
    currentTask: mockCurrentTask,
    wrapupCodes: mockWrapupCodes,
    toggleHold: jest.fn(),
    toggleRecording: jest.fn(),
    toggleMute: jest.fn(),
    sendDtmf: jest.fn(),
    isMuted: false,
    endCall: jest.fn(),
    wrapupCall: jest.fn(),
    isRecording: false,
    setIsRecording: jest.fn(),
    buddyAgents: mockBuddyAgents,
    loadBuddyAgents: jest.fn(),
    loadingBuddyAgents: false,
    transferCall: jest.fn(),
    consultCall: jest.fn(),
    endConsultCall: jest.fn(),
    consultTransfer: jest.fn(),
    callControlAudio: null as unknown as MediaStream,
    consultAgentName: '',
    setConsultAgentName: jest.fn(),
    holdTime: 0,
    callControlClassName: '',
    callControlConsultClassName: '',
    startTimestamp: Date.now(),
    stateTimerLabel: null,
    stateTimerTimestamp: 0,
    consultTimerLabel: 'Consulting',
    consultTimerTimestamp: 0,
    allowConsultToQueue: true,
    lastTargetType: TARGET_TYPE.AGENT,
    setLastTargetType: jest.fn(),
    isHeld: false,
    conferenceEnabled: true,
    controls: mockControls,
    logger: mockLogger,
    secondsUntilAutoWrapup: null,
    cancelAutoWrapup: jest.fn(),
    exitConference: jest.fn(),
    consultConference: jest.fn(),
    switchToMainCall: jest.fn(),
    switchToConsult: jest.fn(),
    conferenceParticipants: [],
  };

  // Utility function spies
  let buildCallControlButtonsSpy: jest.SpyInstance;
  let getMediaTypeSpy: jest.SpyInstance;
  let isTelephonyMediaTypeSpy: jest.SpyInstance;
  let updateCallStateFromTaskSpy: jest.SpyInstance;

  beforeEach(() => {
    // Mock utility functions with proper return values
    getMediaTypeSpy = jest.spyOn(callControlUtils, 'getMediaType').mockReturnValue({
      labelName: 'Voice',
    });

    isTelephonyMediaTypeSpy = jest.spyOn(callControlUtils, 'isTelephonyMediaType').mockReturnValue(true);
    buildCallControlButtonsSpy = jest.spyOn(callControlUtils, 'buildCallControlButtons').mockReturnValue([
      {
        id: 'mute',
        icon: 'mute',
        onClick: jest.fn(),
        tooltip: 'Mute',
        className: 'mute-btn',
        disabled: false,
        isVisible: true,
      },
      {
        id: 'hold',
        icon: 'hold',
        onClick: jest.fn(),
        tooltip: 'Hold',
        className: 'hold-btn',
        disabled: false,
        isVisible: true,
      },
      {
        id: 'transfer',
        icon: 'next-bold',
        tooltip: 'Transfer',
        className: 'call-control-button',
        disabled: false,
        menuType: 'Transfer',
        isVisible: true,
      },
    ]);
    updateCallStateFromTaskSpy = jest.spyOn(callControlUtils, 'updateCallStateFromTask').mockImplementation(() => {});

    // Reset all mocks
    jest.clearAllMocks();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });
  describe('Rendering', () => {
    it('does not render the CallControlCAD participant roster surface', () => {
      const screen = render(
        <CallControlComponent
          {...defaultProps}
          conferenceParticipantDropRoster={{customer: null, participants: [], isDropDisabled: false}}
          requestParticipantDrop={jest.fn()}
        />
      );

      expect(screen.queryByTestId('call-control:participants-trigger')).not.toBeInTheDocument();
    });

    it('renders mute and hold buttons and responds to user interactions', async () => {
      const modifiedProps = {
        ...defaultProps,
        isMuted: false,
        isHeld: false,
      };

      const screen = render(<CallControlComponent {...modifiedProps} />);

      // Perform user interactions
      const muteButton = screen.getByLabelText('Mute');
      fireEvent.click(muteButton);

      const holdButton = screen.getByLabelText('Hold');
      fireEvent.click(holdButton);

      // Verify mute button functionality
      expect(muteButton).toBeInTheDocument();
      expect(muteButton).toHaveAttribute('aria-label', 'Mute');
      expect(muteButton).toHaveAttribute('data-disabled', 'false');

      // Verify hold button functionality
      expect(holdButton).toBeInTheDocument();
      expect(holdButton).toHaveAttribute('aria-label', 'Hold');
      expect(holdButton).toHaveAttribute('data-disabled', 'false');
    });
    it('displays wrapup button when call is muted and held', async () => {
      const modifiedProps = {
        ...defaultProps,
        isMuted: true,
        isHeld: true,
        controls: createEnabledMainTaskUIControls({wrapup: enabledControl}),
      };

      const screen = await render(<CallControlComponent {...modifiedProps} />);

      // Verify wrapup button is available when conditions are met
      const wrapupButton = screen.getByTestId('call-control:wrapup-button');
      expect(wrapupButton).toBeInTheDocument();
      expect(wrapupButton).toHaveAttribute('aria-expanded', 'false');
      expect(wrapupButton).toHaveAttribute('aria-haspopup', 'dialog');
      expect(wrapupButton).toHaveAttribute('type', 'button');
      expect(wrapupButton).toHaveTextContent('Wrap up');
    });

    it('uses the projected post-call completion escape while retry is pending', async () => {
      const wrapupCall = jest.fn().mockResolvedValue({wrapup: 'succeeded', response: 'not-required'});
      const screen = render(
        <CallControlComponent
          {...defaultProps}
          wrapupCall={wrapupCall}
          controls={createEnabledMainTaskUIControls({wrapup: enabledControl})}
          aiSummary={{
            postCall: createPostCallSummary({
              state: 'content',
              content: {type: 'text', summaryText: 'Customer issue was resolved.'},
              contentRevision: 5,
              requestPending: false,
              completionEscape: true,
            }),
          }}
        />
      );

      fireEvent.click(screen.getByTestId('call-control:wrapup-button'));
      fireEvent.click(await screen.findByRole('radio', {name: 'Customer Issue'}));

      screen.rerender(
        <CallControlComponent
          {...defaultProps}
          wrapupCall={wrapupCall}
          controls={createEnabledMainTaskUIControls({wrapup: enabledControl})}
          aiSummary={{
            postCall: createPostCallSummary({completionEscape: true}),
          }}
        />
      );
      fireEvent.click(await screen.findByRole('button', {name: 'Complete Wrap-Up'}));

      await waitFor(() => expect(wrapupCall).toHaveBeenCalledWith('Customer Issue', 'wrap1'));
    });

    it('renders the eligible post-call wrap-up branch even before summary content exists', async () => {
      const screen = render(
        <CallControlComponent
          {...defaultProps}
          controls={createEnabledMainTaskUIControls({wrapup: enabledControl})}
          aiSummary={{
            postCall: createPostCallSummary({
              state: 'omitted',
              requestPending: false,
            }),
          }}
        />
      );

      fireEvent.click(screen.getByTestId('call-control:wrapup-button'));

      expect(await screen.findByTestId('wrap-up-summary')).toBeInTheDocument();
      expect(screen.queryByTestId('call-control:wrapup-select')).not.toBeInTheDocument();
    });

    it('transitions post-call wrap-up branches in both directions while retaining the selected draft', async () => {
      const wrapupCall = jest.fn().mockResolvedValue({wrapup: 'succeeded', response: 'submitted'});
      const retainedPostCallSummary = createPostCallSummary({
        state: 'content',
        content: {type: 'text', summaryText: 'Edited draft kept by store.'},
        contentRevision: 8,
        requestPending: false,
      });
      const screen = render(
        <CallControlComponent
          {...defaultProps}
          wrapupCall={wrapupCall}
          controls={createEnabledMainTaskUIControls({wrapup: enabledControl})}
        />
      );

      fireEvent.click(screen.getByTestId('call-control:wrapup-button'));
      expect(await screen.findByTestId('call-control:wrapup-select')).toBeInTheDocument();

      screen.rerender(
        <CallControlComponent
          {...defaultProps}
          wrapupCall={wrapupCall}
          controls={createEnabledMainTaskUIControls({wrapup: enabledControl})}
          aiSummary={{
            postCall: retainedPostCallSummary,
          }}
        />
      );
      expect(await screen.findByTestId('wrap-up-summary')).toBeInTheDocument();
      expect(screen.getByText('Edited draft kept by store.')).toBeInTheDocument();
      fireEvent.click(await screen.findByRole('radio', {name: 'Customer Issue'}));

      screen.rerender(
        <CallControlComponent
          {...defaultProps}
          wrapupCall={wrapupCall}
          controls={createEnabledMainTaskUIControls({wrapup: enabledControl})}
        />
      );
      expect(await screen.findByTestId('call-control:wrapup-select')).toBeInTheDocument();
      expect(screen.queryByTestId('wrap-up-summary')).not.toBeInTheDocument();

      screen.rerender(
        <CallControlComponent
          {...defaultProps}
          wrapupCall={wrapupCall}
          controls={createEnabledMainTaskUIControls({wrapup: enabledControl})}
          aiSummary={{
            postCall: retainedPostCallSummary,
          }}
        />
      );
      const complete = await screen.findByRole('button', {name: 'Complete Wrap-Up'});
      expect(complete).not.toBeDisabled();
      expect(screen.getByText('Edited draft kept by store.')).toBeInTheDocument();

      fireEvent.click(complete);
      await waitFor(() => expect(wrapupCall).toHaveBeenCalledWith('Customer Issue', 'wrap1'));
    });

    it('keeps post-call Complete Wrap-Up once-only while wrap-up is pending', async () => {
      const completion = deferred<{wrapup: 'succeeded'; response: 'submitted'}>();
      const wrapupCall = jest.fn().mockReturnValue(completion.promise);
      const screen = render(
        <CallControlComponent
          {...defaultProps}
          wrapupCall={wrapupCall}
          controls={createEnabledMainTaskUIControls({wrapup: enabledControl})}
          aiSummary={{
            postCall: createPostCallSummary({
              state: 'content',
              content: {type: 'text', summaryText: 'Customer issue was resolved.'},
              contentRevision: 5,
              requestPending: false,
            }),
          }}
        />
      );

      fireEvent.click(screen.getByTestId('call-control:wrapup-button'));
      fireEvent.click(await screen.findByRole('radio', {name: 'Customer Issue'}));
      const complete = await screen.findByRole('button', {name: 'Complete Wrap-Up'});
      fireEvent.click(complete);
      fireEvent.click(complete);

      await waitFor(() => expect(wrapupCall).toHaveBeenCalledTimes(1));
      expect(wrapupCall).toHaveBeenCalledWith('Customer Issue', 'wrap1');
      await waitFor(() => expect(complete).toBeDisabled());

      completion.resolve({wrapup: 'succeeded', response: 'submitted'});
      await waitFor(() => expect(wrapupCall).toHaveBeenCalledTimes(1));
    });

    it('keeps the legacy wrap-up submit once-only while wrap-up is pending', async () => {
      const completion = deferred<{wrapup: 'succeeded'; response: 'not-required'}>();
      const wrapupCall = jest.fn().mockReturnValue(completion.promise);
      const screen = render(
        <CallControlComponent
          {...defaultProps}
          wrapupCall={wrapupCall}
          controls={createEnabledMainTaskUIControls({wrapup: enabledControl})}
        />
      );

      fireEvent.click(screen.getByTestId('call-control:wrapup-button'));
      fireEvent(
        await screen.findByTestId('call-control:wrapup-select'),
        new CustomEvent('change', {bubbles: true, detail: {value: 'wrap1'}})
      );
      const submit = await screen.findByTestId('call-control:wrapup-submit');
      fireEvent.click(submit);
      fireEvent.click(submit);

      await waitFor(() => expect(wrapupCall).toHaveBeenCalledTimes(1));
      expect(wrapupCall).toHaveBeenCalledWith('Customer Issue', 'wrap1');
      await waitFor(() => expect(submit).toBeDisabled());

      completion.resolve({wrapup: 'succeeded', response: 'not-required'});
      await waitFor(() => expect(wrapupCall).toHaveBeenCalledTimes(1));
    });

    it('retains the legacy selected reason after failed wrap-up and clears it only after success', async () => {
      const wrapupCall = jest
        .fn()
        .mockResolvedValueOnce({wrapup: 'failed'})
        .mockResolvedValueOnce({wrapup: 'succeeded', response: 'not-required'});
      const screen = render(
        <CallControlComponent
          {...defaultProps}
          wrapupCall={wrapupCall}
          controls={createEnabledMainTaskUIControls({wrapup: enabledControl})}
        />
      );

      fireEvent.click(screen.getByTestId('call-control:wrapup-button'));
      fireEvent(
        await screen.findByTestId('call-control:wrapup-select'),
        new CustomEvent('change', {bubbles: true, detail: {value: 'wrap1'}})
      );
      const submit = await screen.findByTestId('call-control:wrapup-submit');
      fireEvent.click(submit);

      await waitFor(() => expect(wrapupCall).toHaveBeenCalledTimes(1));
      await waitFor(() => expect(submit).not.toBeDisabled());

      fireEvent.click(submit);

      await waitFor(() => expect(wrapupCall).toHaveBeenCalledTimes(2));
      expect(wrapupCall).toHaveBeenLastCalledWith('Customer Issue', 'wrap1');
      await waitFor(() => expect(submit).toBeDisabled());
    });

    it('renders all call control elements with proper attributes and accessibility features', async () => {
      const screen = await render(<CallControlComponent {...defaultProps} />);

      // Verify main container structure
      const callControlContainer = screen.getByTestId('call-control-container');
      expect(callControlContainer).toBeInTheDocument();
      expect(callControlContainer).toHaveAttribute('class', 'call-control-container');
      expect(callControlContainer).toHaveAttribute('data-testid', 'call-control-container');

      // Verify audio element for call playback
      const remoteAudio = screen.container.querySelector('#remote-audio');
      expect(remoteAudio).toBeInTheDocument();
      expect(remoteAudio).toHaveAttribute('autoplay', '');
      expect(remoteAudio).toHaveAttribute('id', 'remote-audio');

      // Verify button group container
      const buttonGroup = callControlContainer.querySelector('.button-group');
      expect(buttonGroup).toBeInTheDocument();
      expect(buttonGroup).toHaveAttribute('class', 'button-group');

      // Verify mute button and its properties
      const muteButton = screen.getByLabelText('Mute');
      expect(muteButton).toBeInTheDocument();
      expect(muteButton).toHaveAttribute('type', 'button');
      expect(muteButton).toHaveAttribute('aria-label', 'Mute');
      expect(muteButton).toHaveAttribute('class', 'md-button-circle-wrapper mute-btn md-button-simple-wrapper');
      expect(muteButton).toHaveAttribute('data-color', 'primary');
      expect(muteButton).toHaveAttribute('data-disabled', 'false');
      expect(muteButton).toHaveAttribute('data-size', '40');

      // Verify mute button icon
      const muteIcon = muteButton.querySelector('mdc-icon');
      expect(muteIcon).toBeInTheDocument();
      expect(muteIcon).toHaveAttribute('class', 'mute-btn-icon');
      expect(muteIcon).toHaveAttribute('name', 'mute');

      // Verify mute button tooltip
      const muteTooltip = screen.getByText('Mute').closest('.md-tooltip-label');
      expect(muteTooltip).toBeInTheDocument();
      expect(muteTooltip).toHaveAttribute('class', 'md-tooltip-label');

      // Verify hold button and its properties
      const holdButton = screen.getByLabelText('Hold');
      expect(holdButton).toBeInTheDocument();
      expect(holdButton).toHaveAttribute('type', 'button');
      expect(holdButton).toHaveAttribute('aria-label', 'Hold');
      expect(holdButton).toHaveAttribute('class', 'md-button-circle-wrapper hold-btn md-button-simple-wrapper');
      expect(holdButton).toHaveAttribute('data-color', 'primary');
      expect(holdButton).toHaveAttribute('data-disabled', 'false');
      expect(holdButton).toHaveAttribute('data-size', '40');

      // Verify hold button icon
      const holdIcon = holdButton.querySelector('mdc-icon');
      expect(holdIcon).toBeInTheDocument();
      expect(holdIcon).toHaveAttribute('class', 'hold-btn-icon');
      expect(holdIcon).toHaveAttribute('name', 'hold');

      // Verify hold button tooltip
      const holdTooltip = screen.getByText('Hold').closest('.md-tooltip-label');
      expect(holdTooltip).toBeInTheDocument();
      expect(holdTooltip).toHaveAttribute('class', 'md-tooltip-label');

      // Verify transfer button and its properties
      const transferButton = screen.getByLabelText('Transfer');
      expect(transferButton).toBeInTheDocument();
      expect(transferButton).toHaveAttribute('type', 'button');
      expect(transferButton).toHaveAttribute('aria-label', 'Transfer');
      expect(transferButton).toHaveAttribute('aria-expanded', 'false');
      expect(transferButton).toHaveAttribute('aria-haspopup', 'dialog');
      expect(transferButton).toHaveAttribute(
        'class',
        'md-button-circle-wrapper call-control-button md-button-simple-wrapper'
      );
      expect(transferButton).toHaveAttribute('data-color', 'primary');
      expect(transferButton).toHaveAttribute('data-disabled', 'false');
      expect(transferButton).toHaveAttribute('data-size', '40');

      // Verify transfer button icon
      const transferIcon = transferButton.querySelector('mdc-icon');
      expect(transferIcon).toBeInTheDocument();
      expect(transferIcon).toHaveAttribute('class', 'call-control-button-icon');
      expect(transferIcon).toHaveAttribute('name', 'next-bold');

      // Verify transfer button tooltip
      const transferTooltip = screen.getByText('Transfer').closest('.md-tooltip-label');
      expect(transferTooltip).toBeInTheDocument();
      expect(transferTooltip).toHaveAttribute('class', 'md-tooltip-label');

      // Verify utility functions were called
      expect(getMediaTypeSpy).toHaveBeenCalled();
      expect(isTelephonyMediaTypeSpy).toHaveBeenCalled();
      expect(buildCallControlButtonsSpy).toHaveBeenCalled();
      expect(updateCallStateFromTaskSpy).toHaveBeenCalled();
    });
  });
  describe('Button interactions', () => {
    it('responds to hover events and maintains button state during interactions', async () => {
      // Use the default buildCallControlButtons to ensure mute and hold buttons are rendered
      const modifiedProps = {
        ...defaultProps,
        buddyAgents: mockBuddyAgents,
        controls: {
          ...defaultProps.controls,
          consultTransferDestinations: {
            consult: [],
            transfer: ['agent' as const],
          },
        },
      };

      const screen = await render(<CallControlComponent {...modifiedProps} />);

      // Test hover interactions on mute button
      const muteButton = screen.getByLabelText('Mute');
      fireEvent.mouseEnter(muteButton);
      fireEvent.mouseOver(muteButton);
      expect(muteButton).toBeInTheDocument();
      fireEvent.mouseLeave(muteButton);

      // Test hover interactions on hold button
      const holdButton = screen.getByLabelText('Hold');
      fireEvent.mouseEnter(holdButton);
      fireEvent.mouseOver(holdButton);
      expect(holdButton).toBeInTheDocument();
      fireEvent.mouseLeave(holdButton);

      // Test hover and click interactions on transfer button
      const transferButton = screen.getByLabelText('Transfer');

      // Verify accessibility attributes before interaction
      expect(transferButton).toHaveAttribute('aria-haspopup', 'dialog');
      expect(transferButton).toHaveAttribute('aria-expanded', 'false');

      fireEvent.mouseEnter(transferButton);
      fireEvent.mouseOver(transferButton);
      fireEvent.click(transferButton); // Trigger potential popover functionality
      fireEvent.mouseLeave(transferButton);

      // After clicking, the popover should be expanded
      expect(transferButton).toHaveAttribute('aria-expanded', 'true');
      expect(modifiedProps.loadBuddyAgents).toHaveBeenCalledWith('Transfer');

      // Verify buttons maintain their CSS classes after interactions
      expect(transferButton).toHaveClass('call-control-button');
      expect(muteButton).toHaveClass('mute-btn');
      expect(holdButton).toHaveClass('hold-btn');
    });
    it('handles various user interaction patterns on consultation buttons', async () => {
      const modifiedProps = {
        ...defaultProps,
        buddyAgents: mockBuddyAgents,
      };

      // Mock filterButtonsForConsultation to return a consult button
      jest.spyOn(callControlUtils, 'filterButtonsForConsultation').mockReturnValue([
        {
          id: 'consult',
          icon: 'consult',
          tooltip: 'Consult',
          className: 'call-control-button',
          disabled: false,
          menuType: 'Consult',
          isVisible: true,
          dataTestId: 'consult-button',
        },
      ]);

      const screen = await render(<CallControlComponent {...modifiedProps} />);

      // Locate consultation button for testing
      const consultButton = screen.getByLabelText('Consult');
      expect(consultButton).toBeInTheDocument();

      // Test keyboard interactions
      fireEvent.focus(consultButton);
      fireEvent.keyDown(consultButton, {key: 'Enter', code: 'Enter'});
      fireEvent.keyUp(consultButton, {key: 'Enter', code: 'Enter'});

      fireEvent.focus(consultButton);
      fireEvent.keyDown(consultButton, {key: ' ', code: 'Space'});
      fireEvent.keyUp(consultButton, {key: ' ', code: 'Space'});

      // Test mouse interactions
      fireEvent.mouseDown(consultButton);
      fireEvent.mouseUp(consultButton);
      fireEvent.click(consultButton);

      // Test touch interactions for mobile compatibility
      fireEvent.touchStart(consultButton);
      fireEvent.touchEnd(consultButton);

      // Verify button maintains accessibility and functionality
      expect(consultButton).toHaveAttribute('type', 'button');
      expect(consultButton).toHaveAttribute('aria-label', 'Consult');

      // Verify button parent structure exists
      const buttonParent = consultButton.parentElement;
      expect(buttonParent).toBeInTheDocument();
    });

    it('manages popover functionality for consultation and transfer operations', async () => {
      // Configure consultation button for popover testing
      const consultButton = {
        id: 'consult',
        icon: 'consult',
        tooltip: 'Consult',
        className: 'call-control-button',
        disabled: false,
        menuType: 'Consult' as CallControlMenuType,
        isVisible: true,
        dataTestId: 'consult-button',
        onClick: jest.fn(),
      };

      jest.spyOn(callControlUtils, 'filterButtonsForConsultation').mockReturnValue([consultButton]);

      // Mock popover event handlers
      const mockHandleCloseButtonPress = jest.fn();

      jest.spyOn(callControlUtils, 'handleCloseButtonPress').mockImplementation(mockHandleCloseButtonPress);

      const modifiedProps = {
        ...defaultProps,
        buddyAgents: mockBuddyAgents,
      };

      const screen = await render(<CallControlComponent {...modifiedProps} />);

      // Locate and interact with consultation button
      const consultButtonElement = screen.getByLabelText('Consult');
      expect(consultButtonElement).toBeInTheDocument();

      // Verify popover accessibility attributes before interaction
      expect(consultButtonElement).toHaveAttribute('aria-haspopup', 'dialog');
      expect(consultButtonElement).toHaveAttribute('aria-expanded', 'false');

      // Simulate user click to trigger popover functionality
      fireEvent.click(consultButtonElement);

      // After clicking, the popover should be expanded
      expect(consultButtonElement).toHaveAttribute('aria-expanded', 'true');

      // Test additional interactions that exercise popover behavior
      fireEvent.mouseEnter(consultButtonElement);
      fireEvent.focus(consultButtonElement);
      fireEvent.blur(consultButtonElement);
      fireEvent.mouseLeave(consultButtonElement);

      // Verify button integrity after interactions
      expect(consultButtonElement).toBeInTheDocument();
      expect(consultButtonElement).toHaveClass('call-control-button');
    });

    it('passes consultTransferOptions to popover and hides tabs accordingly', async () => {
      jest.spyOn(callControlUtils, 'filterButtonsForConsultation').mockReturnValue([
        {
          id: 'consult',
          icon: 'consult',
          tooltip: 'Consult',
          className: 'call-control-button',
          disabled: false,
          menuType: 'Consult',
          isVisible: true,
          dataTestId: 'consult-button',
        },
      ]);

      const screen = await render(
        <CallControlComponent
          {...defaultProps}
          controls={{
            ...createEnabledMainTaskUIControls({transfer: disabledControl}),
            consultTransferDestinations: {
              consult: ['agent', 'queue', 'dialNumber', 'entryPoint'],
              transfer: [],
            },
          }}
          consultTransferOptions={{showDialNumberTab: false}}
        />
      );

      const consultButton = screen.getByLabelText('Consult');
      fireEvent.click(consultButton);

      await screen.findByRole('radio', {name: 'Agent'});
      expect(defaultProps.loadBuddyAgents).toHaveBeenCalledWith('Consult');
      expect(screen.getByRole('radio', {name: 'Queues'})).toBeInTheDocument();
      expect(screen.getByRole('radio', {name: 'Entry point'})).toBeInTheDocument();
      expect(screen.queryByRole('radio', {name: 'Dial number'})).not.toBeInTheDocument();
    });

    it('does not load buddy agents when the SDK omits the Agents destination', async () => {
      jest.spyOn(callControlUtils, 'filterButtonsForConsultation').mockReturnValue([
        {
          id: 'consult',
          icon: 'consult',
          tooltip: 'Consult',
          className: 'call-control-button',
          disabled: false,
          menuType: 'Consult',
          isVisible: true,
          dataTestId: 'consult-button',
        },
      ]);

      const screen = await render(
        <CallControlComponent
          {...defaultProps}
          controls={{
            ...createEnabledMainTaskUIControls({transfer: disabledControl}),
            consultTransferDestinations: {
              consult: ['queue'],
              transfer: [],
            },
          }}
        />
      );

      fireEvent.click(screen.getByLabelText('Consult'));

      await screen.findByRole('radio', {name: 'Queues'});
      expect(defaultProps.loadBuddyAgents).not.toHaveBeenCalled();
      expect(screen.queryByRole('radio', {name: 'Agent'})).not.toBeInTheDocument();
    });

    it('requests an initiating summary when a voice consult popover opens', async () => {
      jest.spyOn(callControlUtils, 'filterButtonsForConsultation').mockReturnValue([
        {
          id: 'consult',
          icon: 'consult',
          tooltip: 'Consult',
          className: 'call-control-button',
          disabled: false,
          menuType: 'Consult',
          isVisible: true,
          dataTestId: 'consult-button',
        },
      ]);
      const requestMidCallSummary = jest.fn().mockResolvedValue({outcome: 'accepted', revision: 7});

      const screen = render(
        <CallControlComponent
          {...defaultProps}
          controls={{
            ...createEnabledMainTaskUIControls({transfer: disabledControl}),
            consultTransferDestinations: {
              consult: ['agent'],
              transfer: [],
            },
          }}
          aiSummary={{
            consult: {
              state: 'omitted',
              content: {type: 'text', summaryText: ''},
              contentRevision: 0,
              actionType: 'CONSULT',
              selectedFeedback: 'none',
              onEdit: jest.fn(),
              onCopy: jest.fn().mockReturnValue(false),
              onFeedback: jest.fn().mockResolvedValue({outcome: 'blocked'}),
            },
            requestMidCallSummary,
          }}
        />
      );

      fireEvent.click(screen.getByLabelText('Consult'));

      await waitFor(() => expect(requestMidCallSummary).toHaveBeenCalledTimes(1));
      expect(requestMidCallSummary).toHaveBeenCalledWith('CONSULT');
    });

    it.each([
      {action: 'transfer' as const, settlement: 'sent' as const},
      {action: 'consult' as const, settlement: 'failed' as const},
      {action: 'transferConference' as const, settlement: 'blocked' as const},
      {action: 'merge' as const, settlement: 'stale' as const},
      {action: 'transfer' as const, settlement: 'rejected' as const},
      {action: 'merge' as const, settlement: 'thrown' as const},
    ])(
      'delays $action telephony until a $settlement pre-action settlement and runs once',
      async ({action, settlement}) => {
        const response = deferred<{outcome: 'sent' | 'failed' | 'blocked' | 'stale'}>();
        const sendMidCallSummaryBeforeAction = jest.fn(() => {
          if (settlement === 'thrown') {
            throw new Error('pre-action threw');
          }
          return response.promise;
        });
        const {actionSpy, actionType, revision, activate} = renderMidCallPreActionCase(
          action,
          sendMidCallSummaryBeforeAction
        );

        await activate();

        await waitFor(() => expect(sendMidCallSummaryBeforeAction).toHaveBeenCalledTimes(1));
        expect(sendMidCallSummaryBeforeAction).toHaveBeenCalledWith(actionType, revision);
        if (settlement !== 'thrown') {
          expect(actionSpy).not.toHaveBeenCalled();
        }

        if (settlement === 'rejected') {
          response.reject(new Error('pre-action rejected'));
        } else if (settlement !== 'thrown') {
          response.resolve({outcome: settlement});
        }

        await waitFor(() => expect(actionSpy).toHaveBeenCalledTimes(1));
      }
    );

    it('keeps destination transfer telephony uncalled until the pre-action response settles and ignores re-entry', async () => {
      const response = deferred<{outcome: 'sent'}>();
      const sendMidCallSummaryBeforeAction = jest.fn().mockReturnValue(response.promise);
      const transferCall = jest.fn();

      const screen = render(
        <CallControlComponent
          {...defaultProps}
          transferCall={transferCall}
          controls={{
            ...createEnabledMainTaskUIControls(),
            consultTransferDestinations: {
              consult: [],
              transfer: ['agent'],
            },
          }}
          aiSummary={{
            transfer: createMidCallSummary('TRANSFER', 14),
            requestMidCallSummary: jest.fn().mockResolvedValue({outcome: 'accepted', revision: 14}),
            sendMidCallSummaryBeforeAction,
          }}
        />
      );

      fireEvent.click(screen.getByLabelText('Transfer'));
      const selectAgent = await screen.findByLabelText('Select John Doe');
      fireEvent.click(selectAgent);
      fireEvent.click(selectAgent);

      await waitFor(() => expect(sendMidCallSummaryBeforeAction).toHaveBeenCalledTimes(1));
      expect(sendMidCallSummaryBeforeAction).toHaveBeenCalledWith('TRANSFER', 14);
      expect(transferCall).not.toHaveBeenCalled();

      response.resolve({outcome: 'sent'});
      await waitFor(() => expect(transferCall).toHaveBeenCalledTimes(1));
      expect(transferCall).toHaveBeenCalledWith('agent1', 'agent');
    });

    it('commits destination consult UI state only after async consult telephony fulfills', async () => {
      jest.spyOn(callControlUtils, 'filterButtonsForConsultation').mockReturnValue([
        {
          id: 'consult',
          icon: 'consult',
          tooltip: 'Consult',
          className: 'call-control-button',
          disabled: false,
          menuType: 'Consult',
          isVisible: true,
          dataTestId: 'consult-button',
        },
      ]);
      const response = deferred<{outcome: 'sent'}>();
      const consult = deferred<void>();
      const sendMidCallSummaryBeforeAction = jest.fn().mockReturnValue(response.promise);
      const consultCall = jest.fn().mockReturnValue(consult.promise);
      const setConsultAgentName = jest.fn();
      const setLastTargetType = jest.fn();

      const screen = render(
        <CallControlComponent
          {...defaultProps}
          consultCall={consultCall}
          setConsultAgentName={setConsultAgentName}
          setLastTargetType={setLastTargetType}
          controls={{
            ...createEnabledMainTaskUIControls({transfer: disabledControl}),
            consultTransferDestinations: {
              consult: ['agent'],
              transfer: [],
            },
          }}
          aiSummary={{
            consult: createMidCallSummary('CONSULT', 18),
            requestMidCallSummary: jest.fn().mockResolvedValue({outcome: 'accepted', revision: 18}),
            sendMidCallSummaryBeforeAction,
          }}
        />
      );

      fireEvent.click(screen.getByLabelText('Consult'));
      const selectAgent = await screen.findByLabelText('Select John Doe');
      fireEvent.click(selectAgent);
      fireEvent.click(selectAgent);

      await waitFor(() => expect(sendMidCallSummaryBeforeAction).toHaveBeenCalledTimes(1));
      expect(consultCall).not.toHaveBeenCalled();
      expect(setConsultAgentName).not.toHaveBeenCalled();
      expect(setLastTargetType).not.toHaveBeenCalled();

      response.resolve({outcome: 'sent'});
      await waitFor(() => expect(consultCall).toHaveBeenCalledTimes(1));
      expect(consultCall).toHaveBeenCalledWith('agent1', 'agent', false);
      expect(setConsultAgentName).not.toHaveBeenCalled();
      expect(setLastTargetType).not.toHaveBeenCalled();

      consult.resolve();
      await waitFor(() => expect(setConsultAgentName).toHaveBeenCalledWith('John Doe'));
      expect(setLastTargetType).toHaveBeenCalledWith('agent');
    });

    it('opens Transfer Conference summary confirmation and continues once after a non-sent response outcome', async () => {
      const response = deferred<{outcome: 'blocked'}>();
      const requestMidCallSummary = jest.fn().mockResolvedValue({outcome: 'accepted', revision: 15});
      const sendMidCallSummaryBeforeAction = jest.fn().mockReturnValue(response.promise);
      const consultTransfer = jest.fn();
      jest.spyOn(callControlUtils, 'filterButtonsForConsultation').mockReturnValue([
        {
          id: 'transferConsult',
          icon: 'next-bold',
          tooltip: 'Transfer Conference',
          className: 'call-control-button',
          disabled: false,
          isVisible: true,
        },
      ]);

      const screen = render(
        <CallControlComponent
          {...defaultProps}
          consultTransfer={consultTransfer}
          aiSummary={{
            transfer: createMidCallSummary('TRANSFER', 15),
            requestMidCallSummary,
            sendMidCallSummaryBeforeAction,
          }}
        />
      );

      fireEvent.click(screen.getByLabelText('Transfer Conference'));
      const confirm = await screen.findByTestId('consult-transfer:existing-party-confirm');
      await waitFor(() => expect(requestMidCallSummary).toHaveBeenCalledWith('TRANSFER'));
      fireEvent.click(confirm);
      fireEvent.click(confirm);

      await waitFor(() => expect(sendMidCallSummaryBeforeAction).toHaveBeenCalledTimes(1));
      expect(consultTransfer).not.toHaveBeenCalled();
      response.resolve({outcome: 'blocked'});
      await waitFor(() => expect(consultTransfer).toHaveBeenCalledTimes(1));
    });

    it('consumes existing-party async telephony rejection after the pre-action response settles', async () => {
      const sendMidCallSummaryBeforeAction = jest.fn().mockResolvedValue({outcome: 'sent'});
      const consultTransfer = jest.fn().mockRejectedValue(new Error('Transfer conference failed'));
      jest.spyOn(callControlUtils, 'filterButtonsForConsultation').mockReturnValue([
        {
          id: 'transferConsult',
          icon: 'next-bold',
          tooltip: 'Transfer Conference',
          className: 'call-control-button',
          disabled: false,
          isVisible: true,
        },
      ]);

      const screen = render(
        <CallControlComponent
          {...defaultProps}
          consultTransfer={consultTransfer}
          aiSummary={{
            transfer: createMidCallSummary('TRANSFER', 19),
            requestMidCallSummary: jest.fn().mockResolvedValue({outcome: 'accepted', revision: 19}),
            sendMidCallSummaryBeforeAction,
          }}
        />
      );

      fireEvent.click(screen.getByLabelText('Transfer Conference'));
      fireEvent.click(await screen.findByTestId('consult-transfer:existing-party-confirm'));

      await waitFor(() => expect(consultTransfer).toHaveBeenCalledTimes(1));
      await waitFor(() =>
        expect(mockLogger.error).toHaveBeenCalledWith(
          'CC-Widgets: CallControl: Error running mid-call telephony action - Error: Transfer conference failed',
          {
            module: 'call-control.tsx',
            method: 'handleExistingPartyConfirm',
          }
        )
      );
    });

    it('opens Merge summary confirmation without a new summary request and sends CONSULT before merge', async () => {
      const sendMidCallSummaryBeforeAction = jest.fn().mockResolvedValue({outcome: 'sent'});
      const requestMidCallSummary = jest.fn().mockResolvedValue({outcome: 'accepted', revision: 16});
      const consultConference = jest.fn();
      jest.spyOn(callControlUtils, 'filterButtonsForConsultation').mockReturnValue([
        {
          id: 'conference',
          icon: 'call-merge-bold',
          tooltip: 'Merge',
          className: 'call-control-button',
          disabled: false,
          isVisible: true,
        },
      ]);

      const screen = render(
        <CallControlComponent
          {...defaultProps}
          consultConference={consultConference}
          aiSummary={{
            consult: createMidCallSummary('CONSULT', 16),
            requestMidCallSummary,
            sendMidCallSummaryBeforeAction,
          }}
        />
      );

      fireEvent.click(screen.getByLabelText('Merge'));
      fireEvent.click(await screen.findByTestId('consult-transfer:existing-party-confirm'));

      await waitFor(() => expect(consultConference).toHaveBeenCalledTimes(1));
      expect(requestMidCallSummary).not.toHaveBeenCalled();
      expect(sendMidCallSummaryBeforeAction).toHaveBeenCalledWith('CONSULT', 16);
    });

    it.each([
      {id: 'transferConsult', label: 'Transfer Conference', summaryKey: 'transfer', action: 'TRANSFER'},
      {id: 'conference', label: 'Merge', summaryKey: 'consult', action: 'CONSULT'},
    ] as const)(
      'prepares an eligible fresh $label summary and guards its confirmation',
      async ({id, label, summaryKey, action}) => {
        const telephony = jest.fn();
        const requestMidCallSummary = jest.fn().mockResolvedValue({outcome: 'accepted', revision: 25});
        const response = deferred<{outcome: 'sent'}>();
        const sendMidCallSummaryBeforeAction = jest.fn().mockReturnValue(response.promise);
        jest.spyOn(callControlUtils, 'filterButtonsForConsultation').mockReturnValue([
          {
            id,
            icon: 'next-bold',
            tooltip: label,
            onClick: telephony,
            className: 'call-control-button',
            disabled: false,
            isVisible: true,
          },
        ]);
        const component = (state: 'omitted' | 'generating' | 'content', requestPending = false) => (
          <CallControlComponent
            {...defaultProps}
            consultTransfer={telephony}
            consultConference={telephony}
            aiSummary={{
              [summaryKey]: {
                ...createMidCallSummary(action, 25),
                state,
                requestPending,
              },
              requestMidCallSummary,
              sendMidCallSummaryBeforeAction,
            }}
          />
        );
        const screen = render(component('omitted'));

        fireEvent.click(screen.getByLabelText(label));
        await waitFor(() => expect(requestMidCallSummary).toHaveBeenCalledWith(action));
        expect(telephony).not.toHaveBeenCalled();

        screen.rerender(component('generating', true));
        const confirm = await screen.findByTestId('consult-transfer:existing-party-confirm');
        expect(confirm).toHaveAttribute('aria-disabled', 'true');
        fireEvent.click(confirm);
        expect(sendMidCallSummaryBeforeAction).not.toHaveBeenCalled();
        expect(telephony).not.toHaveBeenCalled();

        screen.rerender(component('content'));
        fireEvent.click(confirm);
        fireEvent.click(confirm);
        await waitFor(() => expect(sendMidCallSummaryBeforeAction).toHaveBeenCalledTimes(1));
        expect(sendMidCallSummaryBeforeAction).toHaveBeenCalledWith(action, 25);
        expect(telephony).not.toHaveBeenCalled();
        response.resolve({outcome: 'sent'});
        await waitFor(() => expect(telephony).toHaveBeenCalledTimes(1));
        expect(requestMidCallSummary).toHaveBeenCalledTimes(1);
      }
    );

    it.each([
      {id: 'transferConsult', label: 'Transfer Conference'},
      {id: 'conference', label: 'Merge'},
    ])('keeps absent/ineligible $label summaries on the immediate legacy path', ({id, label}) => {
      const telephony = jest.fn();
      const requestMidCallSummary = jest.fn();
      const sendMidCallSummaryBeforeAction = jest.fn();
      jest.spyOn(callControlUtils, 'filterButtonsForConsultation').mockReturnValue([
        {
          id,
          icon: 'next-bold',
          tooltip: label,
          onClick: telephony,
          className: 'call-control-button',
          disabled: false,
          isVisible: true,
        },
      ]);

      const screen = render(
        <CallControlComponent
          {...defaultProps}
          consultTransfer={telephony}
          consultConference={telephony}
          aiSummary={{
            requestMidCallSummary,
            sendMidCallSummaryBeforeAction,
          }}
        />
      );

      fireEvent.click(screen.getByLabelText(label));

      expect(telephony).toHaveBeenCalledTimes(1);
      expect(requestMidCallSummary).not.toHaveBeenCalled();
      expect(sendMidCallSummaryBeforeAction).not.toHaveBeenCalled();
      expect(screen.queryByTestId('consult-transfer:existing-party-confirm')).not.toBeInTheDocument();
    });

    it('hides Dial Number and Entry Point tabs for non-telephony media', async () => {
      jest.spyOn(callControlUtils, 'filterButtonsForConsultation').mockReturnValue([
        {
          id: 'consult',
          icon: 'consult',
          tooltip: 'Consult',
          className: 'call-control-button',
          disabled: false,
          menuType: 'Consult',
          isVisible: true,
          dataTestId: 'consult-button',
        },
      ]);

      isTelephonyMediaTypeSpy.mockReturnValue(false);

      const screen = await render(
        <CallControlComponent
          {...defaultProps}
          controls={{
            ...createEnabledMainTaskUIControls({transfer: disabledControl}),
            consultTransferDestinations: {
              consult: ['agent', 'queue'],
              transfer: [],
            },
          }}
        />
      );

      const consultButton = screen.getByLabelText('Consult');
      fireEvent.click(consultButton);

      await screen.findByRole('button', {name: 'Agents'});
      expect(screen.getByRole('button', {name: 'Queues'})).toBeInTheDocument();
      expect(screen.queryByRole('button', {name: 'Dial Number'})).not.toBeInTheDocument();
      expect(screen.queryByRole('button', {name: 'Entry Point'})).not.toBeInTheDocument();
    });
  });
});
