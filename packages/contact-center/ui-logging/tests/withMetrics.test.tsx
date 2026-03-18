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
    const mockTime = 1234567890;
    jest.setSystemTime(mockTime);

    const SpyComponent: React.FC<TestComponentProps> = (props) => <div>Test {props.name}</div>;
    const WrappedSpy = withMetrics<TestComponentProps>(SpyComponent, 'TestWidget', ['name']);

    const {rerender} = render(<WrappedSpy name="old" />);
    logMetricsSpy.mockClear();

    rerender(<WrappedSpy name="new" />);

    expect(logMetricsSpy).toHaveBeenCalledWith({
      widgetName: 'TestWidget',
      event: 'PROPS_UPDATED',
      props: {name: {oldValue: 'old', newValue: 'new'}},
      timestamp: mockTime,
    });
  });

  it('should not log PROPS_UPDATED when unwatched props change', () => {
    const mockTime = 1234567890;
    jest.setSystemTime(mockTime);

    const SpyComponent: React.FC<TestComponentProps> = (props) => <div>Test {props.name}</div>;
    const WrappedSpy = withMetrics<TestComponentProps>(SpyComponent, 'TestWidget', ['name']);

    const {rerender} = render(<WrappedSpy name="same" timer={1} />);
    logMetricsSpy.mockClear();

    rerender(<WrappedSpy name="same" timer={2} />);

    expect(logMetricsSpy).not.toHaveBeenCalledWith(
      expect.objectContaining({event: 'PROPS_UPDATED'})
    );
  });

  it('should not log PROPS_UPDATED when propsToWatch is empty', () => {
    const mockTime = 1234567890;
    jest.setSystemTime(mockTime);

    const SpyComponent: React.FC<TestComponentProps> = (props) => <div>Test {props.name}</div>;
    const WrappedSpy = withMetrics<TestComponentProps>(SpyComponent, 'TestWidget');

    const {rerender} = render(<WrappedSpy name="old" />);
    logMetricsSpy.mockClear();

    rerender(<WrappedSpy name="new" />);

    expect(logMetricsSpy).not.toHaveBeenCalledWith(
      expect.objectContaining({event: 'PROPS_UPDATED'})
    );
  });

  it('should log PROPS_UPDATED for multiple watched props that change simultaneously', () => {
    const mockTime = 1234567890;
    jest.setSystemTime(mockTime);

    interface MultiPropComponentProps {
      name?: string;
      status?: string;
      count?: number;
      [key: string]: any;
    }

    const SpyComponent: React.FC<MultiPropComponentProps> = (props) => (
      <div>
        {props.name} {props.status} {props.count}
      </div>
    );
    const WrappedSpy = withMetrics<MultiPropComponentProps>(SpyComponent, 'TestWidget', ['name', 'status']);

    const {rerender} = render(<WrappedSpy name="old" status="active" count={1} />);
    logMetricsSpy.mockClear();

    rerender(<WrappedSpy name="new" status="inactive" count={2} />);

    expect(logMetricsSpy).toHaveBeenCalledWith({
      widgetName: 'TestWidget',
      event: 'PROPS_UPDATED',
      props: {
        name: {oldValue: 'old', newValue: 'new'},
        status: {oldValue: 'active', newValue: 'inactive'},
      },
      timestamp: mockTime,
    });
  });

  it('should only log changed watched props when some watched props stay the same', () => {
    const mockTime = 1234567890;
    jest.setSystemTime(mockTime);

    const SpyComponent: React.FC<TestComponentProps> = (props) => <div>Test {props.name}</div>;
    const WrappedSpy = withMetrics<TestComponentProps>(SpyComponent, 'TestWidget', ['name']);

    const {rerender} = render(<WrappedSpy name="same" />);
    logMetricsSpy.mockClear();

    rerender(<WrappedSpy name="same" />);

    expect(logMetricsSpy).not.toHaveBeenCalled();
  });

  it('should not log PROPS_UPDATED on first render', () => {
    const mockTime = 1234567890;
    jest.setSystemTime(mockTime);

    const SpyComponent: React.FC<TestComponentProps> = (props) => <div>Test {props.name}</div>;
    const WrappedSpy = withMetrics<TestComponentProps>(SpyComponent, 'TestWidget', ['name']);

    render(<WrappedSpy name="initial" />);

    expect(logMetricsSpy).toHaveBeenCalledTimes(1);
    expect(logMetricsSpy).toHaveBeenCalledWith(
      expect.objectContaining({event: 'WIDGET_MOUNTED'})
    );
    expect(logMetricsSpy).not.toHaveBeenCalledWith(
      expect.objectContaining({event: 'PROPS_UPDATED'})
    );
  });

  it('should log correct widget name for different wrapped components', () => {
    const mockTime = 1234567890;
    jest.setSystemTime(mockTime);

    const ComponentA: React.FC<TestComponentProps> = () => <div>A</div>;
    const ComponentB: React.FC<TestComponentProps> = () => <div>B</div>;

    const WrappedA = withMetrics<TestComponentProps>(ComponentA, 'WidgetA');
    const WrappedB = withMetrics<TestComponentProps>(ComponentB, 'WidgetB');

    render(<WrappedA />);
    expect(logMetricsSpy).toHaveBeenCalledWith(
      expect.objectContaining({widgetName: 'WidgetA', event: 'WIDGET_MOUNTED'})
    );

    logMetricsSpy.mockClear();
    render(<WrappedB />);
    expect(logMetricsSpy).toHaveBeenCalledWith(
      expect.objectContaining({widgetName: 'WidgetB', event: 'WIDGET_MOUNTED'})
    );
  });

  it('should track prop changes across multiple re-renders', () => {
    const mockTime = 1234567890;
    jest.setSystemTime(mockTime);

    const SpyComponent: React.FC<TestComponentProps> = (props) => <div>Test {props.name}</div>;
    const WrappedSpy = withMetrics<TestComponentProps>(SpyComponent, 'TestWidget', ['name']);

    const {rerender} = render(<WrappedSpy name="first" />);
    logMetricsSpy.mockClear();

    rerender(<WrappedSpy name="second" />);
    expect(logMetricsSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        event: 'PROPS_UPDATED',
        props: {name: {oldValue: 'first', newValue: 'second'}},
      })
    );

    logMetricsSpy.mockClear();
    rerender(<WrappedSpy name="third" />);
    expect(logMetricsSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        event: 'PROPS_UPDATED',
        props: {name: {oldValue: 'second', newValue: 'third'}},
      })
    );
  });
});
