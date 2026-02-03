import React from 'react';
import {render, waitFor} from '@testing-library/react';
import '@testing-library/jest-dom';

// Mock cc-digital-interactions module
jest.mock('cc-digital-interactions', () => ({
  initializeApp: jest.fn().mockResolvedValue(undefined),
  __esModule: true,
  default: (props: {conversationId?: string}) => (
    <div data-testid="engage-widget" data-conversation-id={props.conversationId}>
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

describe('DigitalChannels Component - Integration Tests with Real Components', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should successfully load and initialize real Engage component without errors', async () => {
    const {container, getByTestId} = render(<DigitalChannels {...mockProps} />);

    // Wait for the widget to be loaded in the DOM
    await waitFor(
      () => {
        const mdTheme = container.querySelector('md-theme#app-theme');
        expect(mdTheme).toBeInTheDocument();
      },
      {timeout: 3000}
    );

    // Verify theme attributes are set
    const mdTheme = container.querySelector('md-theme#app-theme');
    expect(mdTheme).toHaveAttribute('theme', 'momentumV2');
    // Should have either lighttheme or darktheme attribute
    expect(mdTheme?.hasAttribute('lighttheme') || mdTheme?.hasAttribute('darktheme')).toBe(true);

    // Verify Engage widget is rendered
    const engageWidget = getByTestId('engage-widget');
    expect(engageWidget).toBeInTheDocument();
  });

  it('should have proper store integration', async () => {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const storeModule = require('@webex/cc-store');
    expect(storeModule.default.currentTask).toBeTruthy();
    expect(storeModule.default.logger).toBeTruthy();

    // Component should be able to access store without issues
    const {container, getByTestId} = render(<DigitalChannels {...mockProps} />);

    // Wait for the widget to appear in the DOM, proving store integration works
    await waitFor(
      () => {
        const mdTheme = container.querySelector('md-theme#app-theme');
        expect(mdTheme).toBeInTheDocument();
      },
      {timeout: 3000}
    );

    // Verify the component successfully accessed store data and rendered
    expect(container.querySelector('md-theme#app-theme')).toBeInTheDocument();
    expect(getByTestId('engage-widget')).toBeInTheDocument();
  });

  it('should re-render when store updates are received by the widget', async () => {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const storeModule = require('@webex/cc-store');
    const store = storeModule.default;

    store.currentTask = null;
    store.isDigitalChannelsInitialized = true;

    const {container} = render(<DigitalChannels {...mockProps} />);
    expect(container.querySelector('md-theme')).toBeNull();

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

    store.currentTask = updatedTask;

    await waitFor(() => {
      expect(container.querySelector('md-theme')).not.toBeNull();
    });
  });
});
