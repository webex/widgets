import React from 'react';
import {render} from '@testing-library/react';
import '@testing-library/jest-dom';

// Mock cc-digital-interactions module
jest.mock('cc-digital-interactions', () => ({
  initializeApp: jest.fn().mockResolvedValue(undefined),
  __esModule: true,
  default: (props: {conversationId?: string; theme?: string; isVisualRebrand?: boolean}) => (
    <div
      data-testid="engage-widget"
      data-conversation-id={props.conversationId}
      data-theme={props.theme}
      data-visual-rebrand={String(props.isVisualRebrand)}
    >
      Engage Widget
    </div>
  ),
}));

import {DigitalChannelsComponent} from '../../src/digital-channels/DigitalChannelsComponent';

describe('DigitalChannelsComponent', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should render dark theme when currentTheme is DARK', () => {
    const {container, getByTestId} = render(
      <DigitalChannelsComponent
        conversationId="conversation-id"
        jwtToken="jwt-token"
        dataCenter="produs1"
        currentTheme="DARK"
      />
    );

    const mdTheme = container.querySelector('md-theme#app-theme');
    expect(mdTheme).toBeInTheDocument();
    expect(mdTheme).toHaveAttribute('theme', 'momentumV2');
    expect(mdTheme).toHaveAttribute('darktheme');

    const engageWidget = getByTestId('engage-widget');
    expect(engageWidget).toHaveAttribute('data-theme', 'dark');
    expect(engageWidget).toHaveAttribute('data-visual-rebrand', 'true');
  });

  it('should render light theme when currentTheme is LIGHT', () => {
    const {container, getByTestId} = render(
      <DigitalChannelsComponent
        conversationId="conversation-id"
        jwtToken="jwt-token"
        dataCenter="produs1"
        currentTheme="LIGHT"
      />
    );

    const mdTheme = container.querySelector('md-theme#app-theme');
    expect(mdTheme).toBeInTheDocument();
    expect(mdTheme).toHaveAttribute('theme', 'momentumV2');
    expect(mdTheme).toHaveAttribute('lighttheme');

    const engageWidget = getByTestId('engage-widget');
    expect(engageWidget).toHaveAttribute('data-theme', 'light');
    expect(engageWidget).toHaveAttribute('data-visual-rebrand', 'true');
  });

  it('should default to light theme when currentTheme is not provided', () => {
    const {container, getByTestId} = render(
      <DigitalChannelsComponent conversationId="conversation-id" jwtToken="jwt-token" dataCenter="produs1" />
    );

    const mdTheme = container.querySelector('md-theme#app-theme');
    expect(mdTheme).toBeInTheDocument();
    expect(mdTheme).toHaveAttribute('lighttheme');

    const engageWidget = getByTestId('engage-widget');
    expect(engageWidget).toHaveAttribute('data-theme', 'light');
  });

  it('should pass correct props to Engage widget', () => {
    const {getByTestId} = render(
      <DigitalChannelsComponent
        conversationId="test-conv-123"
        jwtToken="test-token"
        dataCenter="produs1"
        currentTheme="DARK"
      />
    );

    const engageWidget = getByTestId('engage-widget');
    expect(engageWidget).toHaveAttribute('data-conversation-id', 'test-conv-123');
    expect(engageWidget).toHaveAttribute('data-visual-rebrand', 'true');
  });

  it('should render dark theme when currentTheme is lowercase "dark"', () => {
    const {container, getByTestId} = render(
      <DigitalChannelsComponent
        conversationId="conversation-id"
        jwtToken="jwt-token"
        dataCenter="produs1"
        currentTheme="dark"
      />
    );

    const mdTheme = container.querySelector('md-theme#app-theme');
    expect(mdTheme).toBeInTheDocument();
    expect(mdTheme).toHaveAttribute('darktheme');

    const engageWidget = getByTestId('engage-widget');
    expect(engageWidget).toHaveAttribute('data-theme', 'dark');
  });

  it('should render dark theme when currentTheme is mixed-case "Dark"', () => {
    const {container, getByTestId} = render(
      <DigitalChannelsComponent
        conversationId="conversation-id"
        jwtToken="jwt-token"
        dataCenter="produs1"
        currentTheme="Dark"
      />
    );

    const mdTheme = container.querySelector('md-theme#app-theme');
    expect(mdTheme).toBeInTheDocument();
    expect(mdTheme).toHaveAttribute('darktheme');

    const engageWidget = getByTestId('engage-widget');
    expect(engageWidget).toHaveAttribute('data-theme', 'dark');
  });

  it('should render light theme when currentTheme is lowercase "light"', () => {
    const {container, getByTestId} = render(
      <DigitalChannelsComponent
        conversationId="conversation-id"
        jwtToken="jwt-token"
        dataCenter="produs1"
        currentTheme="light"
      />
    );

    const mdTheme = container.querySelector('md-theme#app-theme');
    expect(mdTheme).toBeInTheDocument();
    expect(mdTheme).toHaveAttribute('lighttheme');

    const engageWidget = getByTestId('engage-widget');
    expect(engageWidget).toHaveAttribute('data-theme', 'light');
  });
});
