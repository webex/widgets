/**
 * Common test setup utilities for mocking browser APIs
 * Used across multiple test files that need Worker, URL, and Blob mocks
 */

// Define proper interfaces for better type safety
export interface MockWorkerMessage {
  type: 'start' | 'stop';
  name: string;
  start?: number;
  countdown?: boolean;
  ronaTimeout?: number;
}

export interface MockWorkerInstance {
  simulateMessage: (name: string, time: string) => void;
  postMessage: (message: MockWorkerMessage) => void;
  addEventListener: (type: string, listener: EventListenerOrEventListenerObject) => void;
  removeEventListener: (type: string, listener?: EventListenerOrEventListenerObject) => void;
  terminate: () => void;
}

/**
 * Sets up basic Worker mock for tests that use TaskTimer component
 * TaskTimer uses Web Workers which are not available in Jest environment
 * This is a simple mock that only supports onmessage
 */
export const setupWorkerMock = (): void => {
  Object.defineProperty(window, 'Worker', {
    writable: true,
    value: class Worker {
      url: string;
      onmessage: ((this: Worker, ev: MessageEvent) => void) | null = null;
      onerror: ((this: Worker, ev: ErrorEvent) => void) | null = null;

      constructor(stringUrl: string | URL) {
        this.url = stringUrl.toString();
      }

      postMessage(message: unknown): void {
        if (this.onmessage) {
          setTimeout(() => {
            const event = new MessageEvent('message', {data: message});
            this.onmessage!(event);
          }, 0);
        }
      }

      addEventListener(type: string, listener: EventListenerOrEventListenerObject): void {
        if (type === 'message' && typeof listener === 'function') {
          this.onmessage = listener as (ev: MessageEvent) => void;
        }
      }

      removeEventListener(type: string): void {
        if (type === 'message') {
          this.onmessage = null;
        }
      }

      terminate(): void {
        this.onmessage = null;
        this.onerror = null;
      }
    },
  });
};

/**
 * Sets up enhanced Worker mock that properly handles both onmessage and addEventListener patterns
 * This mock also simulates realistic timer behavior and supports message filtering
 * Use this for comprehensive TaskTimer testing that requires message simulation
 */
export const setupEnhancedWorkerMock = (): void => {
  let workerInstance: MockWorkerInstance | null = null;

  Object.defineProperty(window, 'Worker', {
    writable: true,
    value: class Worker {
      url: string;
      onmessage: ((this: Worker, ev: MessageEvent) => void) | null = null;
      onerror: ((this: Worker, ev: ErrorEvent) => void) | null = null;
      private messageListeners: ((ev: MessageEvent) => void)[] = [];
      private currentTimerName: string | null = null;

      constructor(stringUrl: string | URL) {
        this.url = stringUrl.toString();
        workerInstance = this as unknown as MockWorkerInstance;
      }

      postMessage(message: MockWorkerMessage): void {
        // Store the timer name for simulation
        if (message.type === 'start') {
          this.currentTimerName = message.name;
        }

        // Simulate worker behavior - send back timer messages
        setTimeout(() => {
          if (message.type === 'start' && this.currentTimerName) {
            // Simulate timer message with correct name
            const event = new MessageEvent('message', {
              data: {name: this.currentTimerName, time: '00:01'},
            });

            // Call onmessage if set
            if (this.onmessage && typeof this.onmessage === 'function') {
              this.onmessage.call(this, event);
            }

            // Call addEventListener listeners
            this.messageListeners.forEach((listener) => {
              if (typeof listener === 'function') {
                listener.call(this, event);
              }
            });

            // Also test the negative case - message with wrong name
            setTimeout(() => {
              const wrongNameEvent = new MessageEvent('message', {
                data: {name: 'wrong-timer-name', time: '00:02'},
              });

              if (this.onmessage && typeof this.onmessage === 'function') {
                this.onmessage.call(this, wrongNameEvent);
              }

              this.messageListeners.forEach((listener) => {
                if (typeof listener === 'function') {
                  listener.call(this, wrongNameEvent);
                }
              });
            }, 5);
          }
        }, 10);
      }

      addEventListener(type: string, listener: EventListenerOrEventListenerObject): void {
        if (type === 'message' && typeof listener === 'function') {
          this.messageListeners.push(listener as (ev: MessageEvent) => void);
        }
      }

      removeEventListener(type: string, listener?: EventListenerOrEventListenerObject): void {
        if (type === 'message' && listener) {
          const index = this.messageListeners.indexOf(listener as (ev: MessageEvent) => void);
          if (index > -1) {
            this.messageListeners.splice(index, 1);
          }
        } else if (type === 'message') {
          this.messageListeners = [];
        }
      }

      terminate(): void {
        this.onmessage = null;
        this.onerror = null;
        this.messageListeners = [];
        this.currentTimerName = null;
      }

      // Expose method to simulate messages for testing
      simulateMessage(name: string, time: string): void {
        const event = new MessageEvent('message', {data: {name, time}});

        if (this.onmessage && typeof this.onmessage === 'function') {
          this.onmessage.call(this, event);
        }

        this.messageListeners.forEach((listener) => {
          if (typeof listener === 'function') {
            listener.call(this, event);
          }
        });
      }
    },
  });

  // Expose worker instance for testing with proper typing
  (globalThis as typeof globalThis & {getWorkerInstance: () => MockWorkerInstance | null}).getWorkerInstance = () =>
    workerInstance;
};

/**
 * Sets up URL mock for tests that use URL.createObjectURL
 * Required for TaskTimer's Web Worker blob creation
 */
export const setupURLMock = (): void => {
  Object.defineProperty(window, 'URL', {
    writable: true,
    value: {
      createObjectURL: jest.fn(() => `blob:mock-url-${Math.random()}`),
      revokeObjectURL: jest.fn(),
    },
  });
};

/**
 * Sets up Blob mock for tests that create Blob objects
 * Required for TaskTimer's Web Worker script creation
 */
export const setupBlobMock = (): void => {
  Object.defineProperty(window, 'Blob', {
    writable: true,
    value: class Blob {
      size: number;
      type: string;
      content: BlobPart[];

      constructor(blobParts?: BlobPart[], options?: BlobPropertyBag) {
        this.content = blobParts || [];
        this.type = options?.type || '';
        this.size = 0;

        if (blobParts) {
          this.size = blobParts.reduce((acc, part) => {
            if (typeof part === 'string') {
              return acc + part.length;
            }
            return acc;
          }, 0);
        }
      }

      slice(start?: number, end?: number, contentType?: string): Blob {
        return new Blob(this.content, {type: contentType || this.type});
      }

      stream(): ReadableStream {
        throw new Error('stream() not implemented in mock');
      }

      text(): Promise<string> {
        return Promise.resolve(this.content.join(''));
      }

      arrayBuffer(): Promise<ArrayBuffer> {
        throw new Error('arrayBuffer() not implemented in mock');
      }
    },
  });
};

/**
 * Sets up all browser API mocks needed for basic TaskTimer integration tests
 * Use this in test files that render components containing TaskTimer (simple scenarios)
 */
export const setupTaskTimerMocks = (): void => {
  setupWorkerMock();
  setupURLMock();
  setupBlobMock();
};

/**
 * Sets up all browser API mocks needed for comprehensive TaskTimer testing
 * Use this for tests that need message simulation and advanced worker behavior
 */
export const setupEnhancedTaskTimerMocks = (): void => {
  setupEnhancedWorkerMock();
  setupURLMock();
  setupBlobMock();
};

/**
 * Helper function to get the current worker instance for testing
 * Only available when using setupEnhancedWorkerMock
 */
export const getWorkerInstance = (): MockWorkerInstance | null => {
  const getInstanceFn = (
    globalThis as typeof globalThis & {
      getWorkerInstance?: () => MockWorkerInstance | null;
    }
  ).getWorkerInstance;

  return getInstanceFn ? getInstanceFn() : null;
};
