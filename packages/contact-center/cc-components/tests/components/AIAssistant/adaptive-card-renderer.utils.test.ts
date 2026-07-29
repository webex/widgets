import {
  buildHostConfig,
  extractCustomerStatementTitle,
  prepareCardForRender,
  resolveMomentumIconUrl,
} from '../../../src/components/AIAssistant/AdaptiveCardRenderer/adaptive-card-renderer.utils';

describe('AdaptiveCardRenderer utilities', () => {
  it('resolves all icons emitted by real-time assist cards', () => {
    expect(resolveMomentumIconUrl(' LIKE-REGULAR.SVG ')).toBeTruthy();
    expect(resolveMomentumIconUrl('cisco-ai-assistant-color.svg')).toBeTruthy();
    expect(resolveMomentumIconUrl('arrow-right-regular.svg')).toBeTruthy();
    expect(resolveMomentumIconUrl('arrow-down-regular.svg')).toBeTruthy();
    expect(resolveMomentumIconUrl('unknown-icon.svg')).toBeNull();
  });

  it('rewrites nested icon URLs and source timestamp placeholders without mutating the card', () => {
    const publishTimestamp = new Date(2026, 6, 28, 9, 5).getTime();
    const card = {
      type: 'AdaptiveCard',
      body: [
        {
          iconUrl: 'https://example.invalid/icons/like-regular.svg?theme=dark',
          text: 'Source · SOURCE_TIMESTAMP_PLACEHOLDER',
        },
      ],
    };

    const prepared = prepareCardForRender(card, publishTimestamp);

    expect(prepared).not.toBe(card);
    expect(prepared.body[0].iconUrl).not.toBe(card.body[0].iconUrl);
    expect(prepared.body[0].text).toBe('Source · 09:05');
    expect(card.body[0].text).toContain('SOURCE_TIMESTAMP_PLACEHOLDER');
  });

  it('uses solid bullets for suggestion lines', () => {
    const card = {
      type: 'AdaptiveCard',
      body: [{type: 'RichTextBlock', text: '- Acknowledge concern\n- Assure investigation'}],
    };

    expect(prepareCardForRender(card).body[0].text).toBe('• Acknowledge concern\n• Assure investigation');
    expect(card.body[0].text).toMatch(/^-/);
  });

  it('turns the backend separator placeholder into a horizontal rule', () => {
    const card = {
      type: 'AdaptiveCard',
      body: [{id: 'line-separator-textBlock', type: 'TextBlock', spacing: 'small', text: ' '}],
    };

    expect(prepareCardForRender(card).body[0]).toMatchObject({
      id: 'line-separator-textBlock',
      separator: true,
      text: ' ',
    });
  });

  it('extracts and removes a customer-statement header while preserving its quote', () => {
    const title = 'The customer said:';
    const card = {
      type: 'AdaptiveCard',
      body: [
        {
          type: 'Container',
          items: [
            {type: 'TextBlock', text: title},
            {type: 'TextBlock', text: 'I see a charge that I did not make'},
          ],
        },
      ],
    };

    expect(extractCustomerStatementTitle(card)).toBe(title);
    expect(prepareCardForRender(card, undefined, title).body[0].items).toEqual([
      {type: 'TextBlock', text: 'I see a charge that I did not make'},
    ]);
  });

  it('removes the backend card header when RealTimeAssist already renders the same title', () => {
    const title = "Block the customer's credit card and order a replacement";
    const card = {
      type: 'AdaptiveCard',
      body: [
        {
          type: 'ColumnSet',
          columns: [
            {type: 'Column', items: [{type: 'Image', url: '/cisco-ai-assistant-color.svg'}]},
            {type: 'Column', items: [{type: 'TextBlock', text: title}]},
          ],
        },
        {
          type: 'Container',
          items: [
            {
              type: 'ActionSet',
              actions: [
                {type: 'Action.ToggleVisibility', iconUrl: '/arrow-right-regular.svg'},
                {type: 'Action.ToggleVisibility', iconUrl: '/arrow-down-regular.svg'},
              ],
            },
          ],
        },
      ],
    };

    const prepared = prepareCardForRender(card, undefined, title);
    const preparedJson = JSON.stringify(prepared);

    expect(prepared.body).toHaveLength(1);
    expect(preparedJson).not.toContain('/arrow-right-regular.svg');
    expect(preparedJson).not.toContain('/arrow-down-regular.svg');
    expect(card.body).toHaveLength(2);
  });

  it('preserves unsupported values and removes an invalid source timestamp placeholder', () => {
    expect(prepareCardForRender(null)).toBeNull();
    expect(
      prepareCardForRender(
        {
          iconUrl: 'unknown-icon.svg',
          text: 'Source · SOURCE_TIMESTAMP_PLACEHOLDER',
        },
        'invalid'
      )
    ).toEqual({
      iconUrl: 'unknown-icon.svg',
      text: 'Source · ',
    });
  });

  it('uses transparent card containers and the compact action layout', () => {
    const config = buildHostConfig();

    expect(config.containerStyles.default.backgroundColor).toBe('transparent');
    expect(config.containerStyles.emphasis.backgroundColor).toBe('transparent');
    expect(config.spacing.padding).toBe(0);
    expect(config.actions).toMatchObject({
      maxActions: 5,
      actionsOrientation: 'horizontal',
      actionAlignment: 'left',
      buttonSpacing: 8,
    });
  });
});
