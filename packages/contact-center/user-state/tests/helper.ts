import { renderHook } from '@testing-library/react-hooks';
import { act } from 'react'; // Import act from react
import { useUserState } from '../src/helper'; // adjust the path accordingly

jest.useFakeTimers();

describe('useUserState', () => {
  let ccMock;

  beforeEach(() => {
    ccMock = {
      setAgentState: jest.fn(() => Promise.resolve()),
    };
  });

  it('should initialize with correct default values', () => {
    const { result } = renderHook(() => useUserState({ idleCodes: [], agentId: '123', cc: ccMock }));
    
    expect(result.current.isSettingAgentStatus).toBe(false);
    expect(result.current.errorMessage).toBe('');
    expect(result.current.elapsedTime).toBe(0);
  });

  it('should update elapsedTime every second', () => {
    const { result } = renderHook(() => useUserState({ idleCodes: [], agentId: '123', cc: ccMock }));
    
    act(() => {
      jest.advanceTimersByTime(3000);
    });

    expect(result.current.elapsedTime).toBe(3);
  });

  it('setAgentStatus should handle success', async () => {
    const { result, waitForNextUpdate } = renderHook(() => useUserState({ idleCodes: [], agentId: '123', cc: ccMock }));
    
    act(() => {
      result.current.setAgentStatus({ auxCodeId: '001', state: 'Available' });
    });

    expect(result.current.isSettingAgentStatus).toBe(true);

    await waitForNextUpdate();

    expect(ccMock.setAgentState).toHaveBeenCalledWith(expect.objectContaining({
      state: 'Available',
      auxCodeId: '001',
      agentId: '123'
    }));
    expect(result.current.isSettingAgentStatus).toBe(false);
    expect(result.current.errorMessage).toBe('');
    expect(result.current.elapsedTime).toBe(0);
  });

  it('setAgentStatus should handle error', async () => {
    ccMock.setAgentState.mockRejectedValueOnce(new Error('Network error'));
    const { result, waitForNextUpdate } = renderHook(() => useUserState({ idleCodes: [], agentId: '123', cc: ccMock }));

    act(() => {
      result.current.setAgentStatus({ auxCodeId: '001', state: 'Available' });
    });

    expect(result.current.isSettingAgentStatus).toBe(true);

    await waitForNextUpdate();

    expect(result.current.isSettingAgentStatus).toBe(false);
    expect(result.current.errorMessage).toBe('Error: Network error');
  });
});
