import {
  buildHostConfig,
  extractCustomerStatementTitle,
  hasRenderableCardContent,
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
          type: 'Action.Submit',
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

  it('strips remote images, image sets, media sources, action icons, and backgrounds', () => {
    const card = {
      type: 'AdaptiveCard',
      backgroundImage: 'https://example.invalid/background.png?SOURCE_TIMESTAMP_PLACEHOLDER',
      body: [
        {type: 'Image', url: 'https://example.invalid/customer.png', altText: 'Customer'},
        {type: 'Image', url: 'https://cdn.example.invalid/icons/like-regular.svg?theme=dark'},
        {
          type: 'ImageSet',
          images: [
            {url: 'https://example.invalid/tracker.png', altText: 'Tracker'},
            {url: '/copy-regular.svg', altText: 'Bundled copy'},
          ],
        },
        {
          type: 'Media',
          poster: 'https://example.invalid/poster.png',
          sources: [{url: 'https://example.invalid/video.mp4', mimeType: 'video/mp4'}],
        },
        {
          type: 'Container',
          backgroundImage: {url: 'https://example.invalid/container.png'},
          items: [{type: 'TextBlock', text: 'Keep this text'}],
        },
        {
          type: 'ActionSet',
          actions: [
            {type: 'Action.Submit', id: 'unsafeAction', title: 'Unsafe', iconUrl: 'https://example.invalid/unsafe.png'},
            {
              type: 'Action.Submit',
              id: 'copyButton',
              title: 'Copy',
              iconUrl: 'https://cdn.example.invalid/copy-regular.svg',
            },
          ],
        },
      ],
    };

    const prepared = prepareCardForRender(card);

    expect(prepared).not.toHaveProperty('backgroundImage');
    expect(prepared.body[0]).not.toHaveProperty('url');
    expect(prepared.body[1].url).toBe(resolveMomentumIconUrl('like-regular.svg'));
    expect(prepared.body[2].images[0]).not.toHaveProperty('url');
    expect(prepared.body[2].images[1].url).toBe(resolveMomentumIconUrl('copy-regular.svg'));
    expect(prepared.body[3]).not.toHaveProperty('poster');
    expect(prepared.body[3]).not.toHaveProperty('sources');
    expect(prepared.body[4]).not.toHaveProperty('backgroundImage');
    expect(prepared.body[4].items[0].text).toBe('Keep this text');
    expect(prepared.body[5].actions[0]).not.toHaveProperty('iconUrl');
    expect(prepared.body[5].actions[1].iconUrl).toBe(resolveMomentumIconUrl('copy-regular.svg'));
    expect(card.body[0].url).toBe('https://example.invalid/customer.png');
    expect(JSON.stringify(prepared)).not.toContain('example.invalid');
  });

  it.each([
    ['empty card shell', {type: 'AdaptiveCard'}, false],
    ['text block', {type: 'TextBlock', text: 'Summary text'}, true],
    ['rich text run', {type: 'RichTextBlock', inlines: [{type: 'TextRun', text: 'Inline summary'}]}, true],
    ['rich text string inline', {type: 'RichTextBlock', inlines: ['Inline summary']}, true],
    ['fact set', {type: 'FactSet', facts: [{title: 'Queue', value: 'Billing'}]}, true],
    ['bundled image source', prepareCardForRender({type: 'Image', url: '/like-regular.svg'}), true],
    ['bundled image-set source', prepareCardForRender({type: 'ImageSet', images: [{url: '/copy-regular.svg'}]}), true],
    ['action title', {type: 'Action.Submit', title: 'Open source'}, false],
    ['empty text', {type: 'TextBlock', text: '   '}, false],
    ['sanitized image only', prepareCardForRender({type: 'Image', url: 'https://example.invalid/only.png'}), false],
    [
      'sanitized background only',
      prepareCardForRender({type: 'AdaptiveCard', backgroundImage: 'https://example.invalid/background.png'}),
      false,
    ],
    ['empty array', [], false],
  ])('classifies %s renderability', (_label, card, expected) => {
    expect(hasRenderableCardContent(card)).toBe(expected);
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
