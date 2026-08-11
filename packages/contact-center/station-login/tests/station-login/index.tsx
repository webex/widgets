import React from 'react';
import {render, screen} from '@testing-library/react';
import {StationLogin} from '../../src';
import * as helper from '../../src/helper';
import '@testing-library/jest-dom';
import store from '@webex/cc-store';

const teamsMock = ['team123', 'team456'];
const ccMock = {
  on: () => {},
  off: () => {},
};
const loginOptionsMock = ['EXTENSION', 'AGENT_DN', 'BROWSER'];
const deviceTypeMock = 'BROWSER';
const dialNumberMock = '12345';
const dialNumberRegexMock = '1[0-9]{3}[2-9][0-9]{6}([,]{1,10}[0-9]+){0,1}';
const isAgentLoggedInMock = false;

// Mock the store import
jest.mock('@webex/cc-store', () => {
  const originalStore = jest.requireActual('@webex/cc-store'); // Get the actual implementation

  return {
    ...originalStore, // Spread the original properties
    cc: ccMock,
    teams: teamsMock,
    loginOptions: loginOptionsMock,
    deviceType: deviceTypeMock,
    dialNumber: dialNumberMock,
    dialNumberRegex: dialNumberRegexMock,
    logger: {
      log: jest.fn(),
      error: jest.fn(),
      warn: jest.fn(),
      info: jest.fn(),
    },
    isAgentLoggedIn: isAgentLoggedInMock,
    setCCCallback: jest.fn(),
    setLogoutCallback: jest.fn(),
    removeCCCallback: jest.fn(),
    CC_EVENTS: {
      AGENT_STATION_LOGIN_SUCCESS: 'AgentStationLoginSuccess',
    },
    onErrorCallback: jest.fn(),
  };
});

const loginCb = jest.fn();
const logoutCb = jest.fn();
const ccLogoutCb = jest.fn();
const onSaveStart = jest.fn();
const onSaveEnd = jest.fn();

describe('StationLogin Component', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Suppress console.error for error boundary tests
    jest.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('renders StationLoginPresentational with correct props', () => {
    const useStationLoginSpy = jest.spyOn(helper, 'useStationLogin');

    render(
      <StationLogin
        onLogin={loginCb}
        onLogout={logoutCb}
        onCCSignOut={ccLogoutCb}
        onSaveStart={onSaveStart}
        onSaveEnd={onSaveEnd}
        teamId="team123"
        profileMode={false}
      />
    );

    expect(useStationLoginSpy).toHaveBeenCalledWith({
      cc: ccMock,
      onLogin: loginCb,
      onLogout: logoutCb,
      logger: expect.any(Object),
      deviceType: deviceTypeMock,
      dialNumber: dialNumberMock,
      isAgentLoggedIn: false,
      onSaveEnd: onSaveEnd,
      onSaveStart: onSaveStart,
      teamId: undefined,
      onCCSignOut: ccLogoutCb,
      doStationLogout: undefined,
    });
  });

  describe('E911Modal single-owner rendering', () => {
    it('renders E911Modal in only one of multiple mounted StationLogin instances', () => {
      render(
        <>
          <StationLogin profileMode={false} />
          <StationLogin profileMode={true} />
        </>
      );

      // Two StationLogin widgets (e.g. the normal login widget + a profileMode settings widget)
      // are commonly mounted together against the same store singleton - only one should render
      // the E911Modal, otherwise a single BROWSER login would pop duplicate blocking dialogs.
      expect(screen.getAllByTestId('e911-modal')).toHaveLength(1);
    });

    it('lets a surviving instance reclaim the E911Modal after the owning instance unmounts', () => {
      const owner = render(<StationLogin profileMode={false} />);
      const survivor = render(<StationLogin profileMode={true} />);

      expect(screen.getAllByTestId('e911-modal')).toHaveLength(1);

      owner.unmount();
      expect(screen.queryAllByTestId('e911-modal')).toHaveLength(0);

      (store as unknown as {showE911Modal: boolean}).showE911Modal = true;
      // The observer-wrapped component memoizes on props, so re-rendering with the exact same
      // props would bail out before ever re-reading the (test-mocked, non-reactive) store value.
      // Change an unrelated prop to force React to re-invoke the component and pick up the update.
      survivor.rerender(<StationLogin profileMode={true} hideDesktopLogin={false} />);

      expect(screen.getAllByTestId('e911-modal')).toHaveLength(1);
    });
  });

  describe('ErrorBoundary Tests', () => {
    const mockOnErrorCallback = jest.fn();
    store.onErrorCallback = mockOnErrorCallback;
    it('should render empty fragment when ErrorBoundary catches an error', () => {
      // Mock the StationLoginInternal to throw an error by overriding the helper
      jest.spyOn(helper, 'useStationLogin').mockImplementation(() => {
        throw new Error('Test error in useStationLogin');
      });

      const {container} = render(<StationLogin profileMode={false} />);

      // The fallback should render an empty fragment (no content)
      expect(container.firstChild).toBeNull();
      expect(store.onErrorCallback).toHaveBeenCalledWith('StationLogin', Error('Test error in useStationLogin'));
    });
  });
});
