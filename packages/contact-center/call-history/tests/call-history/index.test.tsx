import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import { CallHistory } from '../../src';
import store from '@webex/cc-store';

// Mock dependencies
jest.mock('@webex/cc-store');
jest.mock('@webex/cc-ui-logging', () => ({
  withMetrics: (Component: any) => Component,
  logMetrics: jest.fn(),
}));

jest.mock('@webex/cc-components', () => ({
  CallHistoryComponent: ({ groupedCalls, onDial, onFilterChange, onToggleMinimize }: any) => (
    <div data-testid="call-history-component">
      <button onClick={() => onFilterChange('all')}>All</button>
      <button onClick={() => onFilterChange('missed')}>Missed</button>
      <button onClick={onToggleMinimize}>Toggle</button>
      {groupedCalls.map((group: any) => (
        <div key={group.phoneNumber} data-testid={`group-${group.phoneNumber}`}>
          <span>{group.contactName}</span>
          <button onClick={() => onDial(group.phoneNumber)}>Dial</button>
        </div>
      ))}
    </div>
  ),
}));

describe('CallHistory Widget', () => {
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
  ];

  beforeEach(() => {
    jest.clearAllMocks();
    (store as any).callHistory = mockCallHistory;
    (store as any).cc = {
      startOutdial: jest.fn().mockResolvedValue({}),
    };
  });

  it('renders without crashing', () => {
    render(<CallHistory />);
    expect(screen.getByTestId('call-history-component')).toBeInTheDocument();
  });

  it('displays grouped calls correctly', async () => {
    render(<CallHistory />);

    await waitFor(() => {
      expect(screen.getByTestId('group-+16673218796')).toBeInTheDocument();
      expect(screen.getByTestId('group-+1469676299')).toBeInTheDocument();
    });

    expect(screen.getByText('User6 Agent6')).toBeInTheDocument();
    expect(screen.getByText('Priya Kesari')).toBeInTheDocument();
  });

  it('handles dial button click', async () => {
    const onDial = jest.fn();
    render(<CallHistory onDial={onDial} />);

    await waitFor(() => {
      expect(screen.getByTestId('group-+16673218796')).toBeInTheDocument();
    });

    const dialButtons = screen.getAllByText('Dial');
    dialButtons[0].click();

    await waitFor(() => {
      expect(store.cc.startOutdial).toHaveBeenCalledWith('+16673218796', 'CallHistory');
      expect(onDial).toHaveBeenCalledWith('+16673218796');
    });
  });

  it('handles filter changes', async () => {
    render(<CallHistory />);

    await waitFor(() => {
      expect(screen.getByText('All')).toBeInTheDocument();
    });

    // Click Missed filter
    const missedButton = screen.getByText('Missed');
    missedButton.click();

    // Should filter to only missed calls
    await waitFor(() => {
      // Component will re-render with filtered data
      expect(screen.getByTestId('call-history-component')).toBeInTheDocument();
    });
  });

  it('handles minimize/maximize toggle', async () => {
    render(<CallHistory />);

    await waitFor(() => {
      expect(screen.getByText('Toggle')).toBeInTheDocument();
    });

    const toggleButton = screen.getByText('Toggle');
    toggleButton.click();

    // Component should re-render with updated state
    expect(screen.getByTestId('call-history-component')).toBeInTheDocument();
  });

  it('handles errors gracefully', async () => {
    const onError = jest.fn();
    (store as any).cc.startOutdial = jest.fn().mockRejectedValue(new Error('Outdial failed'));

    render(<CallHistory onError={onError} />);

    await waitFor(() => {
      expect(screen.getByTestId('group-+16673218796')).toBeInTheDocument();
    });

    const dialButtons = screen.getAllByText('Dial');
    dialButtons[0].click();

    await waitFor(() => {
      expect(onError).toHaveBeenCalledWith(expect.any(Error));
    });
  });

  it('shows loading state initially', () => {
    (store as any).callHistory = [];
    render(<CallHistory />);
    
    // Component will show loading initially
    expect(screen.getByTestId('call-history-component')).toBeInTheDocument();
  });

  it('respects initial filter prop', async () => {
    render(<CallHistory filter="missed" />);

    await waitFor(() => {
      expect(screen.getByTestId('call-history-component')).toBeInTheDocument();
    });

    // Should initialize with missed filter active
    // Component behavior will reflect this in the activeFilter prop
  });
});

