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

    it('should return false for the same object reference', () => {
      const obj = {a: 1, b: 2};
      expect(havePropsChanged(obj, obj)).toBe(false);
    });

    it('should return true when primitive value changes in flat object', () => {
      const prev = {name: 'John', age: 30};
      const next = {name: 'John', age: 31};
      expect(havePropsChanged(prev, next)).toBe(true);
    });

    it('should return false for objects with same primitive values', () => {
      const prev = {name: 'John', age: 30};
      const next = {name: 'John', age: 30};
      expect(havePropsChanged(prev, next)).toBe(false);
    });

    it('should return true when a value changes from object to null', () => {
      const prev = {a: {nested: true}};
      const next = {a: null};
      expect(havePropsChanged(prev, next)).toBe(true);
    });

    it('should return true when a value changes from null to object', () => {
      const prev = {a: null};
      const next = {a: {nested: true}};
      expect(havePropsChanged(prev, next)).toBe(true);
    });

    it('should return true when next has more keys than prev', () => {
      const prev = {a: 1};
      const next = {a: 1, b: 2};
      expect(havePropsChanged(prev, next)).toBe(true);
    });

    it('should handle empty objects', () => {
      expect(havePropsChanged({}, {})).toBe(false);
    });

    it('should return false when both arrays are different references but same nested objects', () => {
      const prev = {items: [1, 2, 3]};
      const next = {items: [1, 2, 4]};
      expect(havePropsChanged(prev, next)).toBe(false);
    });

    it('should return true when function references differ', () => {
      const prev = {onClick: () => {}};
      const next = {onClick: () => {}};
      expect(havePropsChanged(prev, next)).toBe(true);
    });

    it('should return false when function reference is the same', () => {
      const fn = () => {};
      const prev = {onClick: fn};
      const next = {onClick: fn};
      expect(havePropsChanged(prev, next)).toBe(false);
    });

    it('should return true when a primitive changes to undefined', () => {
      const prev = {a: 'hello'};
      const next = {a: undefined};
      expect(havePropsChanged(prev, next)).toBe(true);
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

    it('should detect when a watched prop changes from undefined to a value', () => {
      const prev = {name: undefined};
      const next = {name: 'John'};
      const result = getChangedWatchedProps(prev, next, ['name']);
      expect(result).toEqual({
        name: {oldValue: undefined, newValue: 'John'},
      });
    });

    it('should detect when a watched prop changes from a value to undefined', () => {
      const prev = {name: 'John'};
      const next = {name: undefined};
      const result = getChangedWatchedProps(prev, next, ['name']);
      expect(result).toEqual({
        name: {oldValue: 'John', newValue: undefined},
      });
    });

    it('should return only the changed watched prop when multiple are watched', () => {
      const prev = {name: 'John', status: 'active', role: 'admin'};
      const next = {name: 'John', status: 'inactive', role: 'admin'};
      const result = getChangedWatchedProps(prev, next, ['name', 'status', 'role']);
      expect(result).toEqual({
        status: {oldValue: 'active', newValue: 'inactive'},
      });
    });

    it('should detect changes for boolean watched props', () => {
      const prev = {isActive: true, name: 'John'};
      const next = {isActive: false, name: 'John'};
      const result = getChangedWatchedProps(prev, next, ['isActive']);
      expect(result).toEqual({
        isActive: {oldValue: true, newValue: false},
      });
    });

    it('should detect changes for numeric watched props', () => {
      const prev = {count: 0, name: 'John'};
      const next = {count: 5, name: 'John'};
      const result = getChangedWatchedProps(prev, next, ['count']);
      expect(result).toEqual({
        count: {oldValue: 0, newValue: 5},
      });
    });

    it('should return null when both prev and next are null', () => {
      expect(getChangedWatchedProps(null, null, ['a'])).toBeNull();
    });

    it('should return null when both prev and next are undefined', () => {
      expect(getChangedWatchedProps(undefined, undefined, ['a'])).toBeNull();
    });
  });
});
