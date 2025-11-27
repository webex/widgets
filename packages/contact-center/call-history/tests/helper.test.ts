import { renderHook, act, waitFor } from '@testing-library/react';
import { useCallHistory } from '../src/helper';
import store from '@webex/cc-store';

// Mock dependencies
jest.mock('@webex/cc-store');

describe('useCallHistory Hook', () => {
  const mockCallHistory = [
    {
      id: '1',
      contactName: 'User6 Agent6',
      phoneNumber: '+16673218796',
      date: new Date('2025-10-30T10:00:00'),
      type: 'incoming' as const,
      duration: 1166,
    },
    {
      id: '2',
      contactName: 'User6 Agent6',
      phoneNumber: '+16673218796',
      date: new Date('2025-10-30T10:05:00'),
      type: 'incoming' as const,
      duration: 264,
    },
    {
      id: '3',
      contactName: 'User6 Agent6',
      phoneNumber: '+16673218796',
      date: new Date('2025-10-30T10:10:00'),
      type: 'missed' as const,
      duration: 0,
    },
    {
      id: '4',
      contactName: 'Priya Kesari',
      phoneNumber: '+1469676299',
      date: new Date('2025-10-30T12:25:00'),
      type: 'incoming' as const,
      duration: 180,
    },
    {
      id: '5',
      contactName: 'Priya Kesari',
      phoneNumber: '+1469676299',
      date: new Date('2025-10-30T12:30:00'),
      type: 'missed' as const,
      duration: 0,
    },
  ];

  beforeEach(() => {
    jest.clearAllMocks();
    (store as any).callHistory = mockCallHistory;
    (store as any).cc = {
      startOutdial: jest.fn().mockResolvedValue({}),
    };
  });

  it('initializes with loading state', () => {
    const { result } = renderHook(() => useCallHistory({}));
    expect(result.current.isLoading).toBe(true);
  });

  it('groups calls by phone number', async () => {
    const { result } = renderHook(() => useCallHistory({}));

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.groupedCalls).toHaveLength(2);
    
    // First group (User6 Agent6) should have 3 calls
    const group1 = result.current.groupedCalls.find(g => g.phoneNumber === '+16673218796');
    expect(group1).toBeDefined();
    expect(group1?.callCount).toBe(3);
    expect(group1?.contactName).toBe('User6 Agent6');
    expect(group1?.avatar).toBe('UA'); // Initials
    expect(group1?.calls).toHaveLength(3);

    // Second group (Priya Kesari) should have 2 calls
    const group2 = result.current.groupedCalls.find(g => g.phoneNumber === '+1469676299');
    expect(group2).toBeDefined();
    expect(group2?.callCount).toBe(2);
    expect(group2?.contactName).toBe('Priya Kesari');
    expect(group2?.avatar).toBe('PK'); // Initials
    expect(group2?.calls).toHaveLength(2);
  });

  it('filters calls by "all" filter', async () => {
    const { result } = renderHook(() => useCallHistory({ filter: 'all' }));

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.activeFilter).toBe('all');
    expect(result.current.groupedCalls).toHaveLength(2);
    
    // Total calls across all groups should be 5
    const totalCalls = result.current.groupedCalls.reduce(
      (sum, group) => sum + group.callCount,
      0
    );
    expect(totalCalls).toBe(5);
  });

  it('filters calls by "missed" filter', async () => {
    const { result } = renderHook(() => useCallHistory({ filter: 'missed' }));

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.activeFilter).toBe('missed');
    expect(result.current.groupedCalls).toHaveLength(2);
    
    // Each group should only have missed calls
    result.current.groupedCalls.forEach(group => {
      group.calls.forEach(call => {
        expect(call.type).toBe('missed');
      });
    });
  });

  it('handles filter change', async () => {
    const { result } = renderHook(() => useCallHistory({}));

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.activeFilter).toBe('all');

    // Change to missed filter
    act(() => {
      result.current.handleFilterChange('missed');
    });

    expect(result.current.activeFilter).toBe('missed');
    
    // Should now only show missed calls
    const totalCalls = result.current.groupedCalls.reduce(
      (sum, group) => sum + group.callCount,
      0
    );
    expect(totalCalls).toBe(2); // 2 missed calls
  });

  it('handles dial action', async () => {
    const onDial = jest.fn();
    const { result } = renderHook(() => useCallHistory({ onDial }));

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    await act(async () => {
      await result.current.handleDial('+16673218796');
    });

    expect(store.cc.startOutdial).toHaveBeenCalledWith('+16673218796', 'CallHistory');
    expect(onDial).toHaveBeenCalledWith('+16673218796');
  });

  it('handles dial errors', async () => {
    const onError = jest.fn();
    (store as any).cc.startOutdial = jest.fn().mockRejectedValue(new Error('Outdial failed'));

    const { result } = renderHook(() => useCallHistory({ onError }));

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    await act(async () => {
      await result.current.handleDial('+16673218796');
    });

    expect(onError).toHaveBeenCalledWith(expect.any(Error));
    expect(result.current.error).toBeDefined();
  });

  it('handles minimize/maximize toggle', async () => {
    const { result } = renderHook(() => useCallHistory({}));

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.isMinimized).toBe(false);

    act(() => {
      result.current.handleToggleMinimize();
    });

    expect(result.current.isMinimized).toBe(true);

    act(() => {
      result.current.handleToggleMinimize();
    });

    expect(result.current.isMinimized).toBe(false);
  });

  it('sorts groups by most recent call', async () => {
    const { result } = renderHook(() => useCallHistory({}));

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    // Priya Kesari's most recent call is at 12:30
    // User6 Agent6's most recent call is at 10:10
    // So Priya should be first
    expect(result.current.groupedCalls[0].contactName).toBe('Priya Kesari');
    expect(result.current.groupedCalls[1].contactName).toBe('User6 Agent6');
  });

  it('generates correct avatar initials', async () => {
    const { result } = renderHook(() => useCallHistory({}));

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    const user6Group = result.current.groupedCalls.find(
      g => g.contactName === 'User6 Agent6'
    );
    expect(user6Group?.avatar).toBe('UA');

    const priyaGroup = result.current.groupedCalls.find(
      g => g.contactName === 'Priya Kesari'
    );
    expect(priyaGroup?.avatar).toBe('PK');
  });
});

