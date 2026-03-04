import React from 'react';
import {render} from '@testing-library/react';
import '@testing-library/jest-dom';
import withMetrics from '../src/withMetrics';
import store from '@webex/cc-store';
import * as metricsLogger from '../src/metricsLogger';

interface TestComponentProps {
  name?: string;
  [key: string]: any;
}

describe('withMetrics HOC', () => {
  store.store.logger = {
    log: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    trace: jest.fn(),
  };
  const logMetricsSpy = jest.spyOn(metricsLogger, 'logMetrics');

  const TestComponent: React.FC<TestComponentProps> = (props) => <div>Test Component {props.name}</div>;
  const WrappedComponent = withMetrics<TestComponentProps>(TestComponent, 'TestWidget');

  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('should log metrics on mount', () => {
    const mockTime = 1234567890;
    jest.setSystemTime(mockTime);

    render(<WrappedComponent name="test" />);

    expect(logMetricsSpy).toHaveBeenCalledWith({
      widgetName: 'TestWidget',
      event: 'WIDGET_MOUNTED',
      timestamp: mockTime,
    });
  });

  it('should log metrics on unmount', () => {
    const mockTime = 1234567890;
    jest.setSystemTime(mockTime);

    const {unmount} = render(<WrappedComponent name="test" />);

    // Clear the mount log
    logMetricsSpy.mockClear();

    // Unmount the component
    unmount();

    expect(logMetricsSpy).toHaveBeenCalledWith({
      widgetName: 'TestWidget',
      event: 'WIDGET_UNMOUNTED',
      timestamp: mockTime,
    });
  });

  it('should pass through props to wrapped component', () => {
    const {getByText} = render(<WrappedComponent name="test-name" />);
    expect(getByText('Test Component test-name')).toBeInTheDocument();
  });

  it('should not re-render when props have not changed', () => {
    const renderSpy = jest.fn();
    const SpyComponent: React.FC<TestComponentProps> = (props) => {
      renderSpy();
      return <div>Test Component {props.name}</div>;
    };

    const WrappedSpy = withMetrics<TestComponentProps>(SpyComponent, 'TestWidget');

    const {rerender} = render(<WrappedSpy name="test" />);
    expect(renderSpy).toHaveBeenCalledTimes(1);

    // Re-render with same props
    rerender(<WrappedSpy name="test" />);
    expect(renderSpy).toHaveBeenCalledTimes(1);
  });

  it('should re-render when props have changed', () => {
    const renderSpy = jest.fn();
    const SpyComponent: React.FC<TestComponentProps> = (props) => {
      renderSpy();
      return <div>Test Component {props.name}</div>;
    };

    const WrappedSpy = withMetrics<TestComponentProps>(SpyComponent, 'TestWidget');

    const {rerender} = render(<WrappedSpy name="test" />);
    expect(renderSpy).toHaveBeenCalledTimes(1);

    // Re-render with different props
    rerender(<WrappedSpy name="different" />);
    expect(renderSpy).toHaveBeenCalledTimes(2);
  });

  it('should log PROPS_UPDATED when watched props change', () => {
    const renderSpy = jest.fn();
    const SpyComponent: React.FC<TestComponentProps> = (props) => {
      renderSpy();
      return <div>Test Component {props.name}</div>;
    };

    const WrappedComponentWithProps = withMetrics<TestComponentProps>(SpyComponent, 'TestWidget', ['name', 'status']);

    const {rerender} = render(<WrappedComponentWithProps name="test" status="idle" />);
    expect(renderSpy).toHaveBeenCalledTimes(1);

    // Clear mount log and render spy
    (store.logger.log as jest.Mock).mockClear();
    renderSpy.mockClear();

    // Re-render with changed watched prop
    rerender(<WrappedComponentWithProps name="updated" status="idle" />);

    // Component should re-render
    expect(renderSpy).toHaveBeenCalledTimes(1);

    // Should log PROPS_UPDATED via store.logger.log
    const logCalls = (store.logger.log as jest.Mock).mock.calls;
    const propsUpdatedCall = logCalls.find((call) => call[0].includes('PROPS_UPDATED'));

    expect(propsUpdatedCall).toBeDefined();
    const loggedMetric = JSON.parse(propsUpdatedCall[0].replace('CC-Widgets: UI Metrics: ', ''));
    expect(loggedMetric).toMatchObject({
      widgetName: 'TestWidget',
      event: 'PROPS_UPDATED',
      additionalContext: {
        changedProps: {
          name: {prev: 'test', next: 'updated'},
        },
      },
    });
  });

  it('should not log PROPS_UPDATED when unwatched props change', () => {
    const WrappedComponent = withMetrics<TestComponentProps>(TestComponent, 'TestWidget', ['name']);

    const {rerender} = render(<WrappedComponent name="test" status="idle" timer={100} />);

    // Clear mount log
    logMetricsSpy.mockClear();

    // Re-render with only unwatched props changed
    rerender(<WrappedComponent name="test" status="active" timer={200} />);

    // Should not log PROPS_UPDATED since watched props haven't changed
    expect(logMetricsSpy).not.toHaveBeenCalledWith(
      expect.objectContaining({
        event: 'PROPS_UPDATED',
      })
    );
  });

  it('should not log PROPS_UPDATED when no propsToWatch specified', () => {
    const WrappedComponent = withMetrics<TestComponentProps>(TestComponent, 'TestWidget');

    const {rerender} = render(<WrappedComponent name="test" />);

    // Clear mount log
    logMetricsSpy.mockClear();

    // Re-render with changed props
    rerender(<WrappedComponent name="updated" />);

    // Should not log PROPS_UPDATED
    expect(logMetricsSpy).not.toHaveBeenCalledWith(
      expect.objectContaining({
        event: 'PROPS_UPDATED',
      })
    );
  });

  it('should track multiple watched prop changes', () => {
    const WrappedComponent = withMetrics<TestComponentProps>(TestComponent, 'TestWidget', ['name', 'status', 'count']);

    const {rerender} = render(<WrappedComponent name="test" status="idle" count={1} timer={100} />);

    // Clear mount log
    (store.logger.log as jest.Mock).mockClear();

    // Re-render with multiple watched props changed
    rerender(<WrappedComponent name="updated" status="active" count={2} timer={200} />);

    // Should log all changed watched props via store.logger.log
    const logCalls = (store.logger.log as jest.Mock).mock.calls;
    const propsUpdatedCall = logCalls.find((call) => call[0].includes('PROPS_UPDATED'));

    expect(propsUpdatedCall).toBeDefined();
    const loggedMetric = JSON.parse(propsUpdatedCall[0].replace('CC-Widgets: UI Metrics: ', ''));
    expect(loggedMetric).toMatchObject({
      widgetName: 'TestWidget',
      event: 'PROPS_UPDATED',
      additionalContext: {
        changedProps: {
          name: {prev: 'test', next: 'updated'},
          status: {prev: 'idle', next: 'active'},
          count: {prev: 1, next: 2},
        },
      },
    });

    // Verify timer is not included since it's not watched
    expect(loggedMetric.additionalContext.changedProps.timer).toBeUndefined();
  });
});
