import React from 'react';
import {render, screen, cleanup} from '@testing-library/react';
import '@testing-library/jest-dom';
import IncomingTaskPresentational from '../../src/IncomingTask/incoming-task.presentational';

jest.mock('@momentum-ui/react-collaboration', () => ({
  ButtonPill: () => <div data-testid="ButtonPill" />,
  ListItemBase: () => <div data-testid="ListItemBase" />,
  ListItemBaseSection: () => <div data-testid="ListItemBaseSection" />,
  Text: () => <div data-testid="Text" />,
}));

jest.mock('@momentum-design/components/dist/react', () => ({
  Avatar: () => <div data-testid="Avatar" />,
}));

describe('IncomingTaskPresentational', () => {
  afterEach(cleanup);

  it('renders incoming call for browser option', () => {
    const mockTask = {
      data: {
        interaction: {
          callAssociatedDetails: {
            ani: '1234567890',
            dn: '987654321',
            virtualTeamName: 'Sales Team',
          },
        },
      },
    };

    const props = {
      incomingTask: mockTask,
      accept: jest.fn(),
      decline: jest.fn(),
      isBrowser: true,
      isAnswered: false,
      isEnded: false,
      isMissed: false,
    };

    render(<IncomingTaskPresentational {...props} />);

    expect(screen.getAllByTestId('ListItemBase')).toHaveLength(1);
  });
});
