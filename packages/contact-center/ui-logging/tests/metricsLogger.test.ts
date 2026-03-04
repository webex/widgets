import store from '@webex/cc-store';
import {logMetrics, havePropsChanged, logPropsUpdated, WidgetMetrics} from '../src/metricsLogger';

describe('metricsLogger', () => {
  store.store.logger = {
    log: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    trace: jest.fn(),
  };
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('logMetrics', () => {
    it('should log metrics when logger is available', () => {
      const metric: WidgetMetrics = {
        widgetName: 'TestWidget',
        event: 'WIDGET_MOUNTED',
        timestamp: 1234567890,
        props: {test: 'prop'},
        additionalContext: {context: 'test'},
      };

      logMetrics(metric);

      expect(store.logger.log).toHaveBeenCalledWith(`CC-Widgets: UI Metrics: ${JSON.stringify(metric, null, 2)}`, {
        module: 'metricsLogger.tsx',
        method: 'logMetrics',
      });
    });

    it('should handle case when logger is not available', () => {
      const consoleSpy = jest.spyOn(console, 'warn');
      store.store.logger = undefined;

      const metric: WidgetMetrics = {
        widgetName: 'TestWidget',
        event: 'WIDGET_MOUNTED',
        timestamp: 1234567890,
      };

      logMetrics(metric);

      expect(consoleSpy).toHaveBeenCalledWith('CC-Widgets: UI Metrics: No logger found');
      consoleSpy.mockRestore();
    });
  });

  describe('havePropsChanged', () => {
    it('should return false for identical primitives', () => {
      expect(havePropsChanged(1, 1)).toBe(false);
      expect(havePropsChanged('test', 'test')).toBe(false);
      expect(havePropsChanged(true, true)).toBe(false);
    });

    it('should return true for different primitives', () => {
      expect(havePropsChanged('test', 'test2')).toBe(true);
      expect(havePropsChanged(true, false)).toBe(true);
    });

    it('should return true for different types', () => {
      expect(havePropsChanged(1, '1')).toBe(true);
      expect(havePropsChanged(null, undefined)).toBe(true);
    });

    it('should return true when object keys differ', () => {
      const obj1 = {a: 1, b: 2};
      const obj2 = {a: 1};
      expect(havePropsChanged(obj1, obj2)).toBe(true);
    });

    it('should return false when nested values differ', () => {
      const obj1 = {a: {b: 1}};
      const obj2 = {a: {b: 2}};
      expect(havePropsChanged(obj1, obj2)).toBe(false);
    });

    it('should handle null and undefined', () => {
      expect(havePropsChanged(null, null)).toBe(false);
      expect(havePropsChanged(undefined, undefined)).toBe(false);
      expect(havePropsChanged(null, undefined)).toBe(true);
    });
  });

  describe('logPropsUpdated', () => {
    beforeEach(() => {
      store.store.logger = {
        log: jest.fn(),
        info: jest.fn(),
        warn: jest.fn(),
        error: jest.fn(),
        trace: jest.fn(),
      };
      jest.useFakeTimers();
    });

    afterEach(() => {
      jest.useRealTimers();
    });

    it('should log PROPS_UPDATED event when watched props change', () => {
      const mockTime = 1234567890;
      jest.setSystemTime(mockTime);

      const prevProps = {status: 'idle', taskId: '123', timer: 100};
      const nextProps = {status: 'active', taskId: '123', timer: 200};
      const propsToWatch = ['status', 'taskId'];

      logPropsUpdated('TestWidget', propsToWatch, prevProps, nextProps);

      expect(store.logger.log).toHaveBeenCalledWith(
        expect.stringContaining('PROPS_UPDATED'),
        expect.objectContaining({
          module: 'metricsLogger.tsx',
          method: 'logMetrics',
        })
      );

      const logCall = (store.logger.log as jest.Mock).mock.calls[0][0];
      const loggedMetric = JSON.parse(logCall.replace('CC-Widgets: UI Metrics: ', ''));

      expect(loggedMetric.widgetName).toBe('TestWidget');
      expect(loggedMetric.event).toBe('PROPS_UPDATED');
      expect(loggedMetric.timestamp).toBe(mockTime);
      expect(loggedMetric.additionalContext.changedProps).toEqual({
        status: {prev: 'idle', next: 'active'},
      });
    });

    it('should not log when watched props have not changed', () => {
      const prevProps = {status: 'idle', taskId: '123', timer: 100};
      const nextProps = {status: 'idle', taskId: '123', timer: 200};
      const propsToWatch = ['status', 'taskId'];

      logPropsUpdated('TestWidget', propsToWatch, prevProps, nextProps);

      expect(store.logger.log).not.toHaveBeenCalled();
    });

    it('should not log when propsToWatch is empty', () => {
      const prevProps = {status: 'idle', taskId: '123'};
      const nextProps = {status: 'active', taskId: '456'};

      logPropsUpdated('TestWidget', [], prevProps, nextProps);

      expect(store.logger.log).not.toHaveBeenCalled();
    });

    it('should not log when propsToWatch is undefined', () => {
      const prevProps = {status: 'idle', taskId: '123'};
      const nextProps = {status: 'active', taskId: '456'};

      logPropsUpdated('TestWidget', undefined as any, prevProps, nextProps);

      expect(store.logger.log).not.toHaveBeenCalled();
    });

    it('should track multiple prop changes', () => {
      const mockTime = 1234567890;
      jest.setSystemTime(mockTime);

      const prevProps = {status: 'idle', taskId: '123', name: 'Test'};
      const nextProps = {status: 'active', taskId: '456', name: 'Updated'};
      const propsToWatch = ['status', 'taskId', 'name'];

      logPropsUpdated('TestWidget', propsToWatch, prevProps, nextProps);

      const logCall = (store.logger.log as jest.Mock).mock.calls[0][0];
      const loggedMetric = JSON.parse(logCall.replace('CC-Widgets: UI Metrics: ', ''));

      expect(loggedMetric.additionalContext.changedProps).toEqual({
        status: {prev: 'idle', next: 'active'},
        taskId: {prev: '123', next: '456'},
        name: {prev: 'Test', next: 'Updated'},
      });
    });

    it('should ignore props not in propsToWatch list', () => {
      const mockTime = 1234567890;
      jest.setSystemTime(mockTime);

      const prevProps = {status: 'idle', taskId: '123', timer: 100, internalState: 'foo'};
      const nextProps = {status: 'active', taskId: '123', timer: 200, internalState: 'bar'};
      const propsToWatch = ['status'];

      logPropsUpdated('TestWidget', propsToWatch, prevProps, nextProps);

      const logCall = (store.logger.log as jest.Mock).mock.calls[0][0];
      const loggedMetric = JSON.parse(logCall.replace('CC-Widgets: UI Metrics: ', ''));

      expect(loggedMetric.additionalContext.changedProps).toEqual({
        status: {prev: 'idle', next: 'active'},
      });
      expect(loggedMetric.additionalContext.changedProps.timer).toBeUndefined();
      expect(loggedMetric.additionalContext.changedProps.internalState).toBeUndefined();
    });
  });
});
