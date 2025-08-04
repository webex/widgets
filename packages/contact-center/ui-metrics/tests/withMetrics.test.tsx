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
});
