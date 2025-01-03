import { renderHook, act, waitFor } from '@testing-library/react';
import { useUserState } from '../src/helper';

describe('useUserState Hook', () => {
  const mockCC = {
    setAgentState: jest.fn()
  };

  const idleCodes = [
    { id: '1', name: 'Idle Code 1', isSystem: false },
    { id: '2', name: 'Available', isSystem: false }
  ];

  const agentId = 'agent123';

  let workerMock;

  beforeEach(() => {
    jest.useFakeTimers();
    mockCC.setAgentState.mockReset();

    // Mocking the Web Worker
    workerMock = {
      postMessage: jest.fn(),
      terminate: jest.fn(),
      onmessage: null,
    };

    global.Worker = jest.fn(() => workerMock);

    // Mocking URL.createObjectURL
    global.URL.createObjectURL = jest.fn(() => 'blob:http://localhost:3000/12345');
  });

  afterEach(() => {
    jest.useRealTimers();
    jest.clearAllMocks();
  });

  it('should initialize with default values', () => {
    const { result } = renderHook(() => useUserState({ idleCodes, agentId, cc: mockCC }));

    expect(result.current).toMatchObject({
      isSettingAgentStatus: false,
      errorMessage: '',
      elapsedTime: 0,
      currentState: {}
    });
  });

  it('should increment elapsedTime every second', () => {
    const { result } = renderHook(() => useUserState({ idleCodes, agentId, cc: mockCC }));

    act(() => {
      workerMock.onmessage({ data: 1 });
      jest.advanceTimersByTime(1000);
      workerMock.onmessage({ data: 2 });
      jest.advanceTimersByTime(1000);
      workerMock.onmessage({ data: 3 });
    });

    expect(result.current.elapsedTime).toBe(3);
  });

  it('should reset elapsedTime when agent status is set', async () => {
    mockCC.setAgentState.mockResolvedValueOnce({});
    const { result } = renderHook(() => useUserState({ idleCodes, agentId, cc: mockCC }));

    act(() => {
      workerMock.onmessage({ data: 1 });
      jest.advanceTimersByTime(1000);
      workerMock.onmessage({ data: 2 });
      jest.advanceTimersByTime(1000);
      workerMock.onmessage({ data: 3 });
    });

    await waitFor(() => {
      expect(result.current.elapsedTime).toBe(3);
    });

    act(() => {
      result.current.setAgentStatus(idleCodes[0]);
      workerMock.onmessage({ data: 0 });
    });

    await waitFor(() => {
      expect(result.current.elapsedTime).toBe(0);
    });
  });

  it('should handle setAgentStatus correctly and update current state', async () => {
    mockCC.setAgentState.mockResolvedValueOnce({});
    const { result } = renderHook(() => useUserState({ idleCodes, agentId, cc: mockCC }));

    act(() => {
      result.current.setAgentStatus(idleCodes[1]);
    });

    expect(result.current.isSettingAgentStatus).toBe(true);

    await waitFor(() => {
      expect(result.current).toMatchObject({
        isSettingAgentStatus: false,
        errorMessage: '',
        currentState: idleCodes[1]
      });
    });
  });

  it('should handle errors from setAgentStatus and revert state', async () => {
    const errorMsg = 'Error setting agent status';
    mockCC.setAgentState.mockRejectedValueOnce(new Error(errorMsg));
    const { result } = renderHook(() => useUserState({ idleCodes, agentId, cc: mockCC }));

    act(() => {
      result.current.setAgentStatus(idleCodes[1]);
    });

    await waitFor(() => {
      expect(result.current).toMatchObject({
        isSettingAgentStatus: false,
        errorMessage: `Error: ${errorMsg}`,
        currentState: {}
      });
    });
  });
});