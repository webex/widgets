import store from '@webex/cc-store';
import {logMetrics, havePropsChanged, getChangedWatchedProps, WidgetMetrics} from '../src/metricsLogger';

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

  describe('getChangedWatchedProps', () => {
    it('should return null when propsToWatch is empty', () => {
      expect(getChangedWatchedProps({a: 1}, {a: 2}, [])).toBeNull();
    });

    it('should return null when prev or next is null/undefined', () => {
      expect(getChangedWatchedProps(null, {a: 1}, ['a'])).toBeNull();
      expect(getChangedWatchedProps({a: 1}, null, ['a'])).toBeNull();
    });

    it('should return null when watched props have not changed', () => {
      const prev = {name: 'John', timer: 10, age: 30};
      const next = {name: 'John', timer: 20, age: 30};
      expect(getChangedWatchedProps(prev, next, ['name', 'age'])).toBeNull();
    });

    it('should return changes for watched props that changed', () => {
      const prev = {name: 'John', timer: 10, age: 30};
      const next = {name: 'Jane', timer: 20, age: 31};
      const result = getChangedWatchedProps(prev, next, ['name', 'age']);
      expect(result).toEqual({
        name: {oldValue: 'John', newValue: 'Jane'},
        age: {oldValue: 30, newValue: 31},
      });
    });

    it('should only report changes for watched props, ignoring unwatched', () => {
      const prev = {name: 'John', timer: 10};
      const next = {name: 'John', timer: 20};
      expect(getChangedWatchedProps(prev, next, ['name'])).toBeNull();
    });

    it('should handle watched props that do not exist on objects', () => {
      const prev = {name: 'John'};
      const next = {name: 'John'};
      expect(getChangedWatchedProps(prev, next, ['name', 'missing'])).toBeNull();
    });
  });
});
