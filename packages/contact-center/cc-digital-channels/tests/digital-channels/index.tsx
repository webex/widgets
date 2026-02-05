import React from 'react';
import {render, waitFor, act} from '@testing-library/react';
import '@testing-library/jest-dom';
import {runInAction} from 'mobx';

// Mock cc-digital-interactions module with all props that Engage component receives
jest.mock('cc-digital-interactions', () => ({
  initializeApp: jest.fn().mockResolvedValue(undefined),
  __esModule: true,
  default: (props: {
    conversationId?: string;
    jwtToken?: string;
    dataCenter?: string;
    interactionId?: string;
    readonly?: boolean;
    theme?: string;
    isVisualRebrand?: boolean;
  }) => (
    <div
      data-testid="engage-widget"
      data-conversation-id={props.conversationId}
      data-jwt-token={props.jwtToken}
      data-datacenter={props.dataCenter}
      data-interaction-id={props.interactionId}
      data-readonly={String(props.readonly)}
      data-theme={props.theme}
      data-visual-rebrand={String(props.isVisualRebrand)}
    >
      Engage Widget
    </div>
  ),
}));

// Mock the store using fixtures - define inside the factory to avoid hoisting issues
jest.mock('@webex/cc-store', () => {
  const {makeAutoObservable, observable, runInAction} = jest.requireActual('mobx');
  const {mockTask} = jest.requireActual('@webex/test-fixtures');
  const mockCurrentTaskWithConversationId = {
    ...mockTask,
    data: {
      ...mockTask.data,
      interaction: {
        ...mockTask.data.interaction,
        callAssociatedDetails: {
          mediaResourceId: 'test-conversation-id',
        },
      },
    },
  };

  class MockStore {
    logger = {
      log: jest.fn(),
      error: jest.fn(),
      warn: jest.fn(),
      info: jest.fn(),
      trace: jest.fn(),
    };
    currentTask = mockCurrentTaskWithConversationId;
    isDigitalChannelsInitialized = false;
    dataCenter = 'produs1';
    onErrorCallback = jest.fn();

    constructor() {
      makeAutoObservable(this, {
        logger: observable.ref,
        currentTask: observable.ref,
      });
    }

    setDigitalChannelsInitialized = jest.fn(() => {
      runInAction(() => {
        this.isDigitalChannelsInitialized = true;
      });
    });

    getAccessToken = jest.fn().mockResolvedValue('test-jwt-token');
  }

  return {__esModule: true, default: new MockStore()};
});

import {DigitalChannels} from '../../src/digital-channels';
import {mockTask as mockTaskFixture} from '@webex/test-fixtures';

const mockProps = {};
let mockShouldThrow = false;

jest.mock('../../src/digital-channels/DigitalChannelsComponent', () => {
  const actual = jest.requireActual('../../src/digital-channels/DigitalChannelsComponent');
  return {
    __esModule: true,
    ...actual,
    DigitalChannelsComponent: (props: Record<string, unknown>) => {
      if (mockShouldThrow) {
        throw new Error('boom');
      }
      return actual.DigitalChannelsComponent(props);
    },
  };
});

describe('DigitalChannels Component - Integration Tests with Real Components', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should successfully load and initialize real Engage component without errors', async () => {
    const screen = render(<DigitalChannels {...mockProps} />);

    // Wait for the widget to be loaded in the DOM
    await waitFor(
      () => {
        const mdTheme = screen.container.querySelector('md-theme#app-theme');
        expect(mdTheme).toBeInTheDocument();
      },
      {timeout: 3000}
    );

    // Verify wrapper div exists
    const wrapperDiv = screen.container.querySelector('div');
    expect(wrapperDiv).toBeInTheDocument();

    // Verify md-theme element and all its attributes
    const mdTheme = screen.container.querySelector('md-theme#app-theme');
    expect(mdTheme).toBeInTheDocument();
    expect(mdTheme).toHaveAttribute('id', 'app-theme');
    expect(mdTheme).toHaveAttribute('theme', 'momentumV2');
    // Default theme is LIGHT, so lighttheme attribute should be present
    expect(mdTheme).toHaveAttribute('lighttheme');
    expect(mdTheme).not.toHaveAttribute('darktheme');

    // Verify Engage widget is rendered with all correct attributes
    const engageWidget = screen.getByTestId('engage-widget');
    expect(engageWidget).toBeInTheDocument();
    expect(engageWidget).toHaveTextContent('Engage Widget');
    expect(engageWidget).toHaveAttribute('data-testid', 'engage-widget');
    expect(engageWidget).toHaveAttribute('data-conversation-id', 'test-conversation-id');
    expect(engageWidget).toHaveAttribute('data-jwt-token', 'test-jwt-token');
    expect(engageWidget).toHaveAttribute('data-datacenter', 'produs1');
    expect(engageWidget).toHaveAttribute('data-interaction-id', '');
    expect(engageWidget).toHaveAttribute('data-readonly', 'false');
    expect(engageWidget).toHaveAttribute('data-theme', 'light');
    expect(engageWidget).toHaveAttribute('data-visual-rebrand', 'true');
  });

  it('should render with dark theme when currentTheme is DARK', async () => {
    const screen = render(<DigitalChannels currentTheme="DARK" />);

    // Wait for the widget to be loaded in the DOM
    await waitFor(
      () => {
        const mdTheme = screen.container.querySelector('md-theme#app-theme');
        expect(mdTheme).toBeInTheDocument();
      },
      {timeout: 3000}
    );

    // Verify md-theme has darktheme attribute for DARK theme
    const mdTheme = screen.container.querySelector('md-theme#app-theme');
    expect(mdTheme).toBeInTheDocument();
    expect(mdTheme).toHaveAttribute('id', 'app-theme');
    expect(mdTheme).toHaveAttribute('theme', 'momentumV2');
    expect(mdTheme).toHaveAttribute('darktheme');
    expect(mdTheme).not.toHaveAttribute('lighttheme');

    // Verify Engage widget receives dark theme
    const engageWidget = screen.getByTestId('engage-widget');
    expect(engageWidget).toBeInTheDocument();
    expect(engageWidget).toHaveAttribute('data-theme', 'dark');
  });

  it('should have proper store integration', async () => {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const storeModule = require('@webex/cc-store');
    expect(storeModule.default.currentTask).toBeTruthy();
    expect(storeModule.default.logger).toBeTruthy();
    expect(storeModule.default.dataCenter).toBe('produs1');
    expect(typeof storeModule.default.isDigitalChannelsInitialized).toBe('boolean');
    expect(storeModule.default.getAccessToken).toBeDefined();
    expect(storeModule.default.setDigitalChannelsInitialized).toBeDefined();
    expect(storeModule.default.onErrorCallback).toBeDefined();

    // Component should be able to access store without issues
    const screen = render(<DigitalChannels {...mockProps} />);

    // Wait for the widget to appear in the DOM, proving store integration works
    await waitFor(
      () => {
        const mdTheme = screen.container.querySelector('md-theme#app-theme');
        expect(mdTheme).toBeInTheDocument();
      },
      {timeout: 3000}
    );

    // Verify the component successfully accessed store data and rendered
    const mdTheme = screen.container.querySelector('md-theme#app-theme');
    expect(mdTheme).toBeInTheDocument();
    expect(mdTheme).toHaveAttribute('theme', 'momentumV2');
    expect(mdTheme).toHaveAttribute('lighttheme');

    // Verify Engage widget received correct props from store
    const engageWidget = screen.getByTestId('engage-widget');
    expect(engageWidget).toBeInTheDocument();
    expect(engageWidget).toHaveAttribute('data-conversation-id', 'test-conversation-id');
    expect(engageWidget).toHaveAttribute('data-jwt-token', 'test-jwt-token');
    expect(engageWidget).toHaveAttribute('data-datacenter', 'produs1');
  });

  it('should re-render when store updates are received by the widget', async () => {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const storeModule = require('@webex/cc-store');
    const store = storeModule.default;

    act(() => {
      runInAction(() => {
        store.currentTask = null;
        store.isDigitalChannelsInitialized = true;
      });
    });

    const screen = render(<DigitalChannels {...mockProps} />);

    // Verify nothing is rendered when currentTask is null
    expect(screen.container.querySelector('md-theme')).toBeNull();
    expect(screen.container.querySelector('md-theme#app-theme')).toBeNull();
    expect(screen.queryByTestId('engage-widget')).toBeNull();

    const updatedTask = {
      ...mockTaskFixture,
      data: {
        ...mockTaskFixture.data,
        interaction: {
          ...mockTaskFixture.data.interaction,
          callAssociatedDetails: {mediaResourceId: 'updated-conversation-id'},
        },
      },
    };

    act(() => {
      runInAction(() => {
        store.currentTask = updatedTask;
      });
    });

    await waitFor(() => {
      expect(screen.container.querySelector('md-theme')).not.toBeNull();
    });

    // Verify all DOM elements are rendered after store update
    const mdTheme = screen.container.querySelector('md-theme#app-theme');
    expect(mdTheme).toBeInTheDocument();
    expect(mdTheme).toHaveAttribute('theme', 'momentumV2');

    const engageWidget = screen.getByTestId('engage-widget');
    expect(engageWidget).toBeInTheDocument();
    expect(engageWidget).toHaveTextContent('Engage Widget');
    expect(engageWidget).toHaveAttribute('data-conversation-id', 'updated-conversation-id');
    expect(engageWidget).toHaveAttribute('data-visual-rebrand', 'true');
  });

  it('should not render when dataCenter is empty', async () => {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const storeModule = require('@webex/cc-store');
    const store = storeModule.default;
    const originalDataCenter = store.dataCenter;

    act(() => {
      runInAction(() => {
        store.dataCenter = '';
      });
    });

    const screen = render(<DigitalChannels {...mockProps} />);

    // Wait for any async updates to complete
    await waitFor(() => {
      expect(screen.container.querySelector('md-theme')).toBeNull();
    });

    // Verify no DOM elements are rendered when dataCenter is empty
    expect(screen.container.querySelector('md-theme#app-theme')).toBeNull();
    expect(screen.container.querySelector('div > md-theme')).toBeNull();
    expect(screen.queryByTestId('engage-widget')).toBeNull();
    expect(screen.container.innerHTML).toBe('');

    // Restore dataCenter for other tests
    act(() => {
      runInAction(() => {
        store.dataCenter = originalDataCenter;
      });
    });
  });

  it('should not render when currentTask is null', async () => {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const storeModule = require('@webex/cc-store');
    const store = storeModule.default;
    const originalTask = store.currentTask;

    act(() => {
      runInAction(() => {
        store.currentTask = null;
      });
    });

    const screen = render(<DigitalChannels {...mockProps} />);

    // Wait for any async updates to complete
    await waitFor(() => {
      expect(screen.container.querySelector('md-theme')).toBeNull();
    });

    // Verify no DOM elements are rendered when currentTask is null
    expect(screen.container.querySelector('md-theme#app-theme')).toBeNull();
    expect(screen.queryByTestId('engage-widget')).toBeNull();
    expect(screen.container.innerHTML).toBe('');

    // Restore currentTask for other tests
    act(() => {
      runInAction(() => {
        store.currentTask = originalTask;
      });
    });
  });
});

describe('DigitalChannels ErrorBoundary', () => {
  it('should call onErrorCallback when child throws', async () => {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const storeModule = require('@webex/cc-store');
    const store = storeModule.default;
    const onErrorCallback = jest.fn();
    store.onErrorCallback = onErrorCallback;

    const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
    mockShouldThrow = true;

    const screen = render(<DigitalChannels {...mockProps} />);

    await waitFor(() => {
      expect(onErrorCallback).toHaveBeenCalledWith('DigitalChannels', expect.any(Error));
    });

    // Verify fallback is rendered (empty fragment) - no DOM elements
    expect(screen.container.innerHTML).toBe('');
    expect(screen.container.querySelector('md-theme')).toBeNull();
    expect(screen.container.querySelector('md-theme#app-theme')).toBeNull();
    expect(screen.queryByTestId('engage-widget')).toBeNull();

    mockShouldThrow = false;
    consoleErrorSpy.mockRestore();
  });

  it('should handle error gracefully when onErrorCallback is undefined', async () => {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const storeModule = require('@webex/cc-store');
    const store = storeModule.default;
    const originalCallback = store.onErrorCallback;
    store.onErrorCallback = undefined;

    const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
    mockShouldThrow = true;

    // Render should not throw when onErrorCallback is undefined
    const screen = render(<DigitalChannels {...mockProps} />);

    // Wait for error boundary to catch and handle the error
    await waitFor(() => {
      // ErrorBoundary renders empty fragment as fallback
      expect(screen.container.innerHTML).toBe('');
    });

    // Verify no DOM elements are rendered after error
    expect(screen.container.querySelector('md-theme')).toBeNull();
    expect(screen.container.querySelector('md-theme#app-theme')).toBeNull();
    expect(screen.queryByTestId('engage-widget')).toBeNull();

    mockShouldThrow = false;
    store.onErrorCallback = originalCallback;
    consoleErrorSpy.mockRestore();
  });
});
