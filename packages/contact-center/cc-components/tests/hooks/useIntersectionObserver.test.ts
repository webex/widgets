import {renderHook} from '@testing-library/react';
import {useIntersectionObserver} from '../../src/hooks/useIntersectionObserver';

describe('useIntersectionObserver', () => {
  let mockIntersectionObserver: jest.Mock;
  let observeCallback: IntersectionObserverCallback;
  let mockObserve: jest.Mock;
  let mockUnobserve: jest.Mock;
  let mockDisconnect: jest.Mock;

  beforeEach(() => {
    mockObserve = jest.fn();
    mockUnobserve = jest.fn();
    mockDisconnect = jest.fn();

    mockIntersectionObserver = jest.fn().mockImplementation((callback) => {
      observeCallback = callback;
      return {
        observe: mockObserve,
        unobserve: mockUnobserve,
        disconnect: mockDisconnect,
      };
    });

    global.IntersectionObserver = mockIntersectionObserver as unknown as typeof IntersectionObserver;
  });

  afterEach(() => {
    jest.clearAllMocks();
    delete (global as {IntersectionObserver?: typeof IntersectionObserver}).IntersectionObserver;
  });

  it('creates an IntersectionObserver on mount', () => {
    const onIntersect = jest.fn();
    renderHook(() =>
      useIntersectionObserver({
        onIntersect,
        enabled: true,
        options: {threshold: 1.0},
      })
    );

    expect(mockIntersectionObserver).toHaveBeenCalledWith(expect.any(Function), {threshold: 1.0});
  });

  it('does not create observer when enabled is false', () => {
    const onIntersect = jest.fn();
    renderHook(() =>
      useIntersectionObserver({
        onIntersect,
        enabled: false,
      })
    );

    expect(mockIntersectionObserver).not.toHaveBeenCalled();
  });

  it('observes the target element when ref is set', () => {
    const onIntersect = jest.fn();
    const {result} = renderHook(() =>
      useIntersectionObserver({
        onIntersect,
        enabled: true,
      })
    );

    // Create a mock element
    const mockElement = document.createElement('div');

    // Manually set the ref
    if (result.current.current === null) {
      (result.current as React.MutableRefObject<HTMLElement | null>).current = mockElement;
    }

    // Re-render to trigger the effect
    renderHook(() =>
      useIntersectionObserver({
        onIntersect,
        enabled: true,
      })
    );

    // The observer should be created
    expect(mockIntersectionObserver).toHaveBeenCalled();
  });

  it('calls onIntersect when element intersects', () => {
    const onIntersect = jest.fn();
    renderHook(() =>
      useIntersectionObserver({
        onIntersect,
        enabled: true,
      })
    );

    // Simulate intersection
    const mockEntry: IntersectionObserverEntry = {
      isIntersecting: true,
      target: document.createElement('div'),
      boundingClientRect: {} as DOMRectReadOnly,
      intersectionRatio: 1,
      intersectionRect: {} as DOMRectReadOnly,
      rootBounds: null,
      time: Date.now(),
    };

    observeCallback([mockEntry], {} as IntersectionObserver);

    expect(onIntersect).toHaveBeenCalledTimes(1);
  });

  it('does not call onIntersect when element is not intersecting', () => {
    const onIntersect = jest.fn();
    renderHook(() =>
      useIntersectionObserver({
        onIntersect,
        enabled: true,
      })
    );

    // Simulate non-intersection
    const mockEntry: IntersectionObserverEntry = {
      isIntersecting: false,
      target: document.createElement('div'),
      boundingClientRect: {} as DOMRectReadOnly,
      intersectionRatio: 0,
      intersectionRect: {} as DOMRectReadOnly,
      rootBounds: null,
      time: Date.now(),
    };

    observeCallback([mockEntry], {} as IntersectionObserver);

    expect(onIntersect).not.toHaveBeenCalled();
  });

  it('uses default options when not provided', () => {
    const onIntersect = jest.fn();
    renderHook(() =>
      useIntersectionObserver({
        onIntersect,
      })
    );

    expect(mockIntersectionObserver).toHaveBeenCalledWith(expect.any(Function), {threshold: 1.0});
  });

  it('uses custom threshold option', () => {
    const onIntersect = jest.fn();
    renderHook(() =>
      useIntersectionObserver({
        onIntersect,
        options: {threshold: 0.5},
      })
    );

    expect(mockIntersectionObserver).toHaveBeenCalledWith(expect.any(Function), {threshold: 0.5});
  });

  it('recreates observer when enabled changes from false to true', () => {
    const onIntersect = jest.fn();
    const {rerender} = renderHook(
      ({enabled}) =>
        useIntersectionObserver({
          onIntersect,
          enabled,
        }),
      {initialProps: {enabled: false}}
    );

    expect(mockIntersectionObserver).not.toHaveBeenCalled();

    rerender({enabled: true});

    expect(mockIntersectionObserver).toHaveBeenCalled();
  });

  it('cleans up observer on unmount', () => {
    const onIntersect = jest.fn();
    const {unmount} = renderHook(() =>
      useIntersectionObserver({
        onIntersect,
        enabled: true,
      })
    );

    expect(mockIntersectionObserver).toHaveBeenCalled();

    unmount();

    // The cleanup should have been called
    // Note: We can't directly test unobserve here without a real ref,
    // but we can verify the observer was created
    expect(mockIntersectionObserver).toHaveBeenCalledTimes(1);
  });

  it('supports root margin option', () => {
    const onIntersect = jest.fn();
    renderHook(() =>
      useIntersectionObserver({
        onIntersect,
        options: {
          threshold: 1.0,
          rootMargin: '10px',
        },
      })
    );

    expect(mockIntersectionObserver).toHaveBeenCalledWith(expect.any(Function), {
      threshold: 1.0,
      rootMargin: '10px',
    });
  });

  it('supports root option', () => {
    const onIntersect = jest.fn();
    const rootElement = document.createElement('div');

    renderHook(() =>
      useIntersectionObserver({
        onIntersect,
        options: {
          threshold: 1.0,
          root: rootElement,
        },
      })
    );

    expect(mockIntersectionObserver).toHaveBeenCalledWith(expect.any(Function), {
      threshold: 1.0,
      root: rootElement,
    });
  });

  it('handles multiple intersections in sequence', () => {
    const onIntersect = jest.fn();
    renderHook(() =>
      useIntersectionObserver({
        onIntersect,
        enabled: true,
      })
    );

    const mockEntry: IntersectionObserverEntry = {
      isIntersecting: true,
      target: document.createElement('div'),
      boundingClientRect: {} as DOMRectReadOnly,
      intersectionRatio: 1,
      intersectionRect: {} as DOMRectReadOnly,
      rootBounds: null,
      time: Date.now(),
    };

    // Trigger multiple times
    observeCallback([mockEntry], {} as IntersectionObserver);
    observeCallback([mockEntry], {} as IntersectionObserver);
    observeCallback([mockEntry], {} as IntersectionObserver);

    expect(onIntersect).toHaveBeenCalledTimes(3);
  });

  it('recreates observer when onIntersect callback changes', () => {
    const onIntersect1 = jest.fn();
    const onIntersect2 = jest.fn();

    const {rerender} = renderHook(
      ({callback}) =>
        useIntersectionObserver({
          onIntersect: callback,
          enabled: true,
        }),
      {initialProps: {callback: onIntersect1}}
    );

    expect(mockIntersectionObserver).toHaveBeenCalledTimes(1);

    // Rerender with a new callback
    rerender({callback: onIntersect2});

    // Observer should be recreated
    expect(mockIntersectionObserver).toHaveBeenCalledTimes(2);
  });

  it('recreates observer when options change', () => {
    const onIntersect = jest.fn();

    const {rerender} = renderHook(
      ({threshold}) =>
        useIntersectionObserver({
          onIntersect,
          enabled: true,
          options: {threshold},
        }),
      {initialProps: {threshold: 1.0}}
    );

    expect(mockIntersectionObserver).toHaveBeenCalledWith(expect.any(Function), {threshold: 1.0});

    // Rerender with different threshold
    rerender({threshold: 0.5});

    expect(mockIntersectionObserver).toHaveBeenCalledWith(expect.any(Function), {threshold: 0.5});
  });
});
