/* eslint-disable @typescript-eslint/no-explicit-any */
import React from 'react';
import {render, screen, fireEvent} from '@testing-library/react';
import '@testing-library/jest-dom';
import CallControlPopoverComponent from '../../../../src/components/task/CallControl/CallControlCustom/call-control-popover';

jest.mock('../../../../src/components/task/CallControl/CallControlCustom/call-control-list-item', () => {
  const MockListItem = (props: any) => (
    <div data-testid="CallControlListItemComponent" onClick={props.onButtonPress}>
      {props.title}
    </div>
  );
  MockListItem.displayName = 'CallControlListItemComponent';
  return MockListItem;
});

jest.mock('@momentum-design/components/dist/react', () => ({
  Icon: (props: any) => <div {...props} />,
}));

jest.mock('@momentum-ui/react-collaboration', () => ({
  Text: (props: any) => <div {...props} />,
  TabListNext: (props: any) => <div {...props} />,
  TabNext: (props: any) => <div {...props} />,
  ListNext: (props: any) => <div {...props} />,
}));

beforeAll(() => {
  jest.spyOn(console, 'error').mockImplementation(() => {});
});

afterAll(() => {
  (console.error as jest.Mock).mockRestore();
});

describe('CallControlPopoverComponent', () => {
  const mockOnAgentSelect = jest.fn();
  const baseProps = {
    heading: 'Select an Agent',
    buttonIcon: 'agent-icon',
    buddyAgents: [
      {agentId: 'agent1', agentName: 'Agent One', dn: '1001'},
      {agentId: 'agent2', agentName: 'Agent Two', dn: '1002'},
    ],
    onAgentSelect: mockOnAgentSelect,
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders heading and tab correctly', () => {
    render(<CallControlPopoverComponent {...baseProps} />);
    expect(screen.getByText('Select an Agent')).toBeInTheDocument();
    expect(screen.getByText('Agents')).toBeInTheDocument();
  });

  it('renders agents list when buddyAgents provided', () => {
    render(<CallControlPopoverComponent {...baseProps} />);
    expect(screen.getByText('Agent One')).toBeInTheDocument();
    expect(screen.getByText('Agent Two')).toBeInTheDocument();
  });

  it('renders no agents text when buddyAgents is empty', () => {
    render(<CallControlPopoverComponent {...baseProps} buddyAgents={[]} />);
    expect(screen.getByText('No agents found')).toBeInTheDocument();
  });

  it('calls onAgentSelect with correct agentId when agent button is clicked', () => {
    render(<CallControlPopoverComponent {...baseProps} />);
    fireEvent.click(screen.getByText('Agent One'));
    expect(mockOnAgentSelect).toHaveBeenCalledWith('agent1');
  });
});
