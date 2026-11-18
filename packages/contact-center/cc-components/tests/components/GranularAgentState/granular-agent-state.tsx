import React from 'react';
import {render, fireEvent, screen, act} from '@testing-library/react';
import '@testing-library/jest-dom';

jest.mock('@webex/cc-store', () => ({
  __esModule: true,
  ERROR_TRIGGERING_IDLE_CODES: {RONA: 'RONA'},
}));
jest.mock('@webex/cc-ui-logging', () => ({
  withMetrics: (component: React.ComponentType) => component,
}));

import GranularAgentStateComponent from '../../../src/components/GranularAgentState/granular-agent-state';
import {
  ChannelStateInfo,
  GranularAgentStateComponentProps,
} from '../../../src/components/GranularAgentState/granular-agent-state.types';

const channel = (overrides: Partial<ChannelStateInfo>): ChannelStateInfo => ({
  channelType: 'telephony',
  label: 'Voice',
  agentState: 'Available',
  displayState: 'Available',
  auxCodeId: '0',
  pendingIdle: false,
  elapsedTime: 308,
  isAvailable: true,
  ...overrides,
});

describe('GranularAgentStateComponent', () => {
  const logger = {log: jest.fn(), info: jest.fn(), warn: jest.fn(), error: jest.fn(), trace: jest.fn()};
  const idleCodes = [
    {id: '0', name: 'Available', isSystem: false, isDefault: false},
    {id: '10', name: 'Lunch Break', isSystem: false, isDefault: false},
    {id: '11', name: 'Meeting', isSystem: false, isDefault: true},
    {id: '12', name: 'Tea Break', isSystem: false, isDefault: false},
  ];
  const channels = [
    channel({}),
    channel({channelType: 'chat', label: 'Chat'}),
    channel({channelType: 'email', label: 'Email'}),
    channel({channelType: 'social', label: 'Social'}),
  ];

  const renderComponent = (overrides: Partial<GranularAgentStateComponentProps> = {}) => {
    const props: GranularAgentStateComponentProps = {
      idleCodes,
      channels,
      primaryChannel: channels[0],
      setAllAvailable: jest.fn(),
      setAllIdle: jest.fn(),
      applyChannelAvailability: jest.fn().mockResolvedValue(true),
      isSettingAgentState: false,
      logger,
      ...overrides,
    };
    return {props, ...render(<GranularAgentStateComponent {...props} />)};
  };

  const openMenu = () => fireEvent.click(screen.getByTestId('granular-state-pill'));

  beforeEach(() => {
    jest.clearAllMocks();
    if (typeof window.HTMLElement.prototype.attachInternals !== 'function') {
      window.HTMLElement.prototype.attachInternals = jest.fn();
    }
  });

  it('should render nothing without a primary channel', () => {
    const {container} = renderComponent({channels: [], primaryChannel: undefined});
    expect(container).toBeEmptyDOMElement();
  });

  it('should render the primary channel state, timer and secondary channel avatars on the pill', () => {
    renderComponent();

    expect(screen.getByTestId('granular-state-pill')).toHaveTextContent('Available - 05:08');
    expect(screen.getByTestId('granular-state-pill')).toHaveAttribute('aria-expanded', 'false');
    const secondary = screen.getByTestId('granular-state-pill-channels');
    ['chat', 'email', 'social'].forEach((type) =>
      expect(secondary.querySelector(`[data-testid="granular-channel-avatar-${type}"]`)).toBeInTheDocument()
    );
    expect(secondary.querySelector('[data-testid="granular-channel-avatar-telephony"]')).not.toBeInTheDocument();
  });

  it('should not render secondary avatars for a single channel agent', () => {
    renderComponent({channels: [channels[0]]});
    expect(screen.queryByTestId('granular-state-pill-channels')).not.toBeInTheDocument();
  });

  it('should show per-channel states and timers on hover and hide them when the menu opens', () => {
    renderComponent();
    fireEvent.mouseEnter(screen.getByTestId('granular-agent-state-container'));

    const preview = screen.getByTestId('granular-state-preview');
    expect(preview).toHaveTextContent('Voice : Available');
    expect(screen.getByTestId('granular-state-preview-item-social')).toHaveTextContent('00:05:08');

    openMenu();
    expect(screen.queryByTestId('granular-state-preview')).not.toBeInTheDocument();

    fireEvent.mouseLeave(screen.getByTestId('granular-agent-state-container'));
    expect(screen.queryByTestId('granular-state-preview')).not.toBeInTheDocument();
  });

  it('should list multi-channel actions and selectable idle codes in the menu', () => {
    renderComponent();
    openMenu();

    expect(screen.getByTestId('granular-state-pill')).toHaveAttribute('aria-expanded', 'true');
    expect(screen.getByTestId('granular-state-set-available')).toHaveTextContent('Set as Available (all channels)');
    expect(screen.getByTestId('granular-state-manage-channels')).toHaveTextContent('Manage Channel Availability');
    expect(screen.getByText('Set as Idle (all channels)')).toBeInTheDocument();
    expect(screen.getByText('Select a reason:')).toBeInTheDocument();
    expect(screen.queryByTestId('granular-state-idle-code-0')).not.toBeInTheDocument();
    ['10', '11', '12'].forEach((id) =>
      expect(screen.getByTestId(`granular-state-idle-code-${id}`)).toBeInTheDocument()
    );
  });

  it('should show a plain Available option instead of the multi-channel block for a single channel', () => {
    renderComponent({channels: [channels[0]]});
    openMenu();

    expect(screen.queryByTestId('granular-state-manage-channels')).not.toBeInTheDocument();
    expect(screen.getByTestId('granular-state-set-available')).toHaveTextContent('Available');
  });

  it('should set all channels available and close the menu', () => {
    const {props} = renderComponent();
    openMenu();
    fireEvent.click(screen.getByTestId('granular-state-set-available'));

    expect(props.setAllAvailable).toHaveBeenCalledTimes(1);
    expect(screen.queryByTestId('granular-state-panel')).not.toBeInTheDocument();
  });

  it('should set all channels idle with the chosen idle code', () => {
    const {props} = renderComponent();
    openMenu();
    fireEvent.click(screen.getByTestId('granular-state-idle-code-12'));

    expect(props.setAllIdle).toHaveBeenCalledWith(idleCodes[3]);
    expect(screen.queryByTestId('granular-state-panel')).not.toBeInTheDocument();
  });

  it('should filter idle codes by search and hide the multi-channel block while searching', () => {
    renderComponent();
    openMenu();

    const search = screen.getByTestId('granular-state-search');
    act(() => {
      (search as unknown as {value: string}).value = 'tea';
      fireEvent.input(search);
    });

    expect(screen.queryByTestId('granular-state-set-available')).not.toBeInTheDocument();
    expect(screen.getByTestId('granular-state-idle-code-12')).toBeInTheDocument();
    expect(screen.queryByTestId('granular-state-idle-code-10')).not.toBeInTheDocument();

    act(() => {
      (search as unknown as {value: string}).value = 'zzz';
      fireEvent.input(search);
    });
    expect(screen.getByText('No matches found')).toBeInTheDocument();
  });

  it('should disable menu actions while a state change is in flight', () => {
    renderComponent({isSettingAgentState: true});
    openMenu();

    expect(screen.getByTestId('granular-state-set-available')).toBeDisabled();
    expect(screen.getByTestId('granular-state-idle-code-10')).toBeDisabled();
  });

  it('should close the menu on Escape and on outside click', () => {
    renderComponent();
    openMenu();
    fireEvent.keyDown(document, {key: 'Escape'});
    expect(screen.queryByTestId('granular-state-panel')).not.toBeInTheDocument();

    openMenu();
    fireEvent.mouseDown(document.body);
    expect(screen.queryByTestId('granular-state-panel')).not.toBeInTheDocument();
  });

  describe('Manage channel availability', () => {
    const openManage = () => {
      openMenu();
      fireEvent.click(screen.getByTestId('granular-state-manage-channels'));
    };
    const toggle = (key: string) =>
      fireEvent(screen.getByTestId(`manage-channel-availability-toggle-${key}`), new Event('change'));

    it('should render the All row and a row per channel with its state', () => {
      renderComponent({
        channels: [
          channels[0],
          channel({channelType: 'chat', label: 'Chat', displayState: 'Meeting', isAvailable: false}),
        ],
      });
      openManage();

      expect(screen.getByTestId('manage-channel-availability-row-all')).toHaveTextContent('Available on all channels');
      expect(screen.getByTestId('manage-channel-availability-row-telephony')).toHaveTextContent('State : Available');
      expect(screen.getByTestId('manage-channel-availability-row-chat')).toHaveTextContent('State : Meeting');
      expect((screen.getByTestId('manage-channel-availability-toggle-all') as HTMLInputElement).checked).toBe(false);
    });

    it('should keep Apply disabled until a channel changes and send only changed channels', async () => {
      const {props} = renderComponent();
      openManage();

      const apply = screen.getByTestId('manage-channel-availability-apply') as HTMLButtonElement;
      expect(apply.disabled).toBe(true);

      toggle('chat');
      expect(apply.disabled).toBe(false);

      await act(async () => {
        fireEvent.click(apply);
      });
      expect(props.applyChannelAvailability).toHaveBeenCalledWith({chat: false});
      expect(screen.queryByTestId('granular-state-panel')).not.toBeInTheDocument();
    });

    it('should switch every channel with the All toggle', async () => {
      const {props} = renderComponent();
      openManage();

      toggle('all');
      await act(async () => {
        fireEvent.click(screen.getByTestId('manage-channel-availability-apply'));
      });

      expect(props.applyChannelAvailability).toHaveBeenCalledWith({
        telephony: false,
        chat: false,
        email: false,
        social: false,
      });
    });

    it('should disable Apply again when a change is reverted', () => {
      renderComponent();
      openManage();

      toggle('email');
      toggle('email');
      expect((screen.getByTestId('manage-channel-availability-apply') as HTMLButtonElement).disabled).toBe(true);
    });

    it('should return to the menu on Cancel and on Back', () => {
      const {props} = renderComponent();
      openManage();
      fireEvent.click(screen.getByTestId('manage-channel-availability-cancel'));
      expect(screen.getByTestId('granular-state-menu')).toBeInTheDocument();

      fireEvent.click(screen.getByTestId('granular-state-manage-channels'));
      fireEvent.click(screen.getByTestId('manage-channel-availability-back'));
      expect(screen.getByTestId('granular-state-menu')).toBeInTheDocument();
      expect(props.applyChannelAvailability).not.toHaveBeenCalled();
    });

    it('should show an error banner and keep the panel open when apply resolves false', async () => {
      const applyChannelAvailability = jest.fn().mockResolvedValue(false);
      renderComponent({applyChannelAvailability});
      openManage();

      toggle('chat');
      await act(async () => {
        fireEvent.click(screen.getByTestId('manage-channel-availability-apply'));
      });

      expect(screen.getByTestId('manage-channel-availability-error')).toHaveTextContent(
        'Failed to apply changes. Please try again.'
      );
      expect(screen.getByTestId('granular-state-panel')).toBeInTheDocument();
    });

    it('should preserve unconfirmed channel choices when SDK state updates during a partial apply', async () => {
      const initialChannels = [channels[0], channel({channelType: 'chat', label: 'Chat', isAvailable: false})];
      const applyChannelAvailability = jest.fn().mockResolvedValue(false);
      const {props, rerender} = renderComponent({
        channels: initialChannels,
        primaryChannel: initialChannels[0],
        applyChannelAvailability,
      });
      openManage();

      toggle('telephony');
      toggle('chat');
      await act(async () => {
        fireEvent.click(screen.getByTestId('manage-channel-availability-apply'));
      });

      expect(applyChannelAvailability).toHaveBeenCalledWith({telephony: false, chat: true});

      const updatedChannels = [
        channel({isAvailable: true}),
        channel({channelType: 'chat', label: 'Chat', isAvailable: true}),
      ];
      await act(async () => {
        rerender(
          <GranularAgentStateComponent
            {...props}
            channels={updatedChannels}
            primaryChannel={updatedChannels[0]}
            applyChannelAvailability={applyChannelAvailability}
          />
        );
      });

      expect((screen.getByTestId('manage-channel-availability-toggle-telephony') as HTMLInputElement).checked).toBe(
        false
      );
      expect((screen.getByTestId('manage-channel-availability-toggle-chat') as HTMLInputElement).checked).toBe(true);
      expect(screen.getByTestId('manage-channel-availability-apply')).toBeEnabled();
    });

    it('should show an error banner when apply rejects', async () => {
      const applyChannelAvailability = jest.fn().mockRejectedValue(new Error('network error'));
      renderComponent({applyChannelAvailability});
      openManage();

      toggle('email');
      await act(async () => {
        fireEvent.click(screen.getByTestId('manage-channel-availability-apply'));
      });

      expect(screen.getByTestId('manage-channel-availability-error')).toHaveTextContent(
        'Failed to apply changes. Please try again.'
      );
      expect(screen.getByTestId('granular-state-panel')).toBeInTheDocument();
    });

    it('should clear the error banner when returning to the menu via Cancel', async () => {
      const applyChannelAvailability = jest.fn().mockResolvedValue(false);
      renderComponent({applyChannelAvailability});
      openManage();

      toggle('chat');
      await act(async () => {
        fireEvent.click(screen.getByTestId('manage-channel-availability-apply'));
      });
      expect(screen.getByTestId('manage-channel-availability-error')).toBeInTheDocument();

      fireEvent.click(screen.getByTestId('manage-channel-availability-cancel'));
      expect(screen.getByTestId('granular-state-menu')).toBeInTheDocument();

      fireEvent.click(screen.getByTestId('granular-state-manage-channels'));
      expect(screen.queryByTestId('manage-channel-availability-error')).not.toBeInTheDocument();
    });
  });
});
