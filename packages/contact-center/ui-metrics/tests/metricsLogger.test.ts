import store from '@webex/cc-store';
import {logMetrics, havePropsChanged, WidgetMetrics} from '../src/metricsLogger';

// Mock the store
jest.mock('@webex/cc-store', () => ({
  logger: {
    log: jest.fn(),
  },
}));

describe('metricsLogger', () => {
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
      const consoleSpy = jest.spyOn(console, 'log');
      (store as any).logger = null;

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
      expect(havePropsChanged(1, 2)).toBe(true);
      expect(havePropsChanged('test', 'test2')).toBe(true);
      expect(havePropsChanged(true, false)).toBe(true);
    });

    it('should return true for different types', () => {
      expect(havePropsChanged(1, '1')).toBe(true);
      expect(havePropsChanged({}, [])).toBe(true);
      expect(havePropsChanged(null, undefined)).toBe(true);
    });

    it('should return true when object keys differ', () => {
      const obj1 = {a: 1, b: 2};
      const obj2 = {a: 1};
      expect(havePropsChanged(obj1, obj2)).toBe(true);
    });

    it('should return true when nested values differ', () => {
      const obj1 = {a: {b: 1}};
      const obj2 = {a: {b: 2}};
      expect(havePropsChanged(obj1, obj2)).toBe(true);
    });

    it('should return false for identical objects', () => {
      const obj1 = {a: 1, b: {c: 2}};
      const obj2 = {a: 1, b: {c: 2}};
      expect(havePropsChanged(obj1, obj2)).toBe(false);
    });

    it('should handle null and undefined', () => {
      expect(havePropsChanged(null, null)).toBe(false);
      expect(havePropsChanged(undefined, undefined)).toBe(false);
      expect(havePropsChanged(null, undefined)).toBe(true);
    });

    it('should handle circular references gracefully', () => {
      const obj1: any = {a: 1};
      const obj2: any = {a: 1};
      obj1.self = obj1;
      obj2.self = obj2;

      expect(havePropsChanged(obj1, obj2)).toBe(true);
    });
  });
});
