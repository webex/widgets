import {
  buildHostConfig,
  extractCardText,
  extractCustomerStatementTitle,
  prepareCardForRender,
  resolveMomentumIconUrl,
} from '../../../src/components/AIAssistant/AdaptiveCardRenderer/adaptive-card-renderer.utils';

const createTimestampMetadata = (text = '${sourceTimestamp}') => ({
  type: 'RichTextBlock',
  id: 'source-timestamp-richTextBlock',
  inlines: [{type: 'TextRun', text}],
});

const createTimestampColumn = (properties: Record<string, unknown> = {}) => ({
  type: 'Column',
  items: [createTimestampMetadata()],
  ...properties,
});

const createFooterCard = (columns: Record<string, unknown>[]) => ({
  type: 'AdaptiveCard',
  body: [{type: 'ColumnSet', columns: [createTimestampColumn(), ...columns]}],
});

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

  it('resolves summary sourceTimestamp bindings alongside legacy tokens without mutating the payload', () => {
    const timestamp = new Date(2026, 9, 26, 10, 9).getTime();
    const card = {
      type: 'AdaptiveCard',
      body: [
        {
          type: 'Container',
          items: [
            {type: 'TextBlock', text: '${sourceTimestamp} / SOURCE_TIMESTAMP_PLACEHOLDER / ${sourceTimestamp}'},
            {type: 'RichTextBlock', inlines: [{type: 'TextRun', text: '${sourceTimestamp}'}]},
          ],
        },
      ],
    };
    const original = JSON.stringify(card);

    const prepared = prepareCardForRender(card, timestamp);

    expect(JSON.stringify(prepared)).toContain('10:09 / 10:09 / 10:09');
    expect(JSON.stringify(prepared)).not.toContain('${sourceTimestamp}');
    expect(JSON.stringify(prepared)).not.toContain('SOURCE_TIMESTAMP_PLACEHOLDER');
    expect(JSON.stringify(card)).toBe(original);
    expect(prepared.body[0]).not.toBe(card.body[0]);
  });

  it.each([undefined, '', 'invalid', Number.NaN, Number.POSITIVE_INFINITY])(
    'removes unresolved summary timestamp bindings for invalid input %s',
    (timestamp) => {
      const card = {type: 'AdaptiveCard', body: [{type: 'TextBlock', text: '${sourceTimestamp}'}]};

      expect(prepareCardForRender(card, timestamp).body[0].text).toBe('');
      expect(card.body[0].text).toBe('${sourceTimestamp}');
    }
  );

  it('omits only receiver timestamp metadata and its trailing separator from a render clone', () => {
    const card = {
      type: 'AdaptiveCard',
      body: [
        {type: 'TextBlock', text: 'The caller requested an update.'},
        {type: 'TextBlock', text: 'An update was requested at ${sourceTimestamp}.'},
        {type: 'TextBlock', id: 'line-separator-textBlock', text: ' '},
        {
          type: 'Container',
          items: [createTimestampMetadata('${sourceTimestamp} •')],
        },
      ],
    };
    const original = JSON.stringify(card);
    const timestamp = new Date(2026, 9, 26, 11, 9).getTime();

    const receiverCard = prepareCardForRender(card, timestamp, undefined, true);

    expect(receiverCard.body).toEqual([
      {type: 'TextBlock', text: 'The caller requested an update.'},
      {type: 'TextBlock', text: 'An update was requested at 11:09.'},
    ]);
    expect(prepareCardForRender(card, timestamp).body).toHaveLength(4);
    expect(JSON.stringify(card)).toBe(original);
  });

  it('recognizes timestamp-only inline metadata without removing unrelated empty layout containers', () => {
    const card = {
      type: 'AdaptiveCard',
      body: [
        {type: 'Container', items: []},
        {
          type: 'RichTextBlock',
          inlines: [
            {type: 'TextRun', text: '${sourceTimestamp}'},
            {type: 'TextRun', text: ' •'},
          ],
        },
        {type: 'TextBlock', text: 'Keep the summary text.'},
      ],
    };

    expect(prepareCardForRender(card, undefined, undefined, true).body).toEqual([
      {type: 'Container', items: []},
      {type: 'TextBlock', text: 'Keep the summary text.'},
    ]);
    expect(card.body).toHaveLength(3);
  });

  it('keeps substituted timestamp runs inside substantive rich text when omitting a dedicated footer', () => {
    const card = {
      type: 'AdaptiveCard',
      body: [
        {
          type: 'RichTextBlock',
          inlines: [
            {type: 'TextRun', text: 'Called at '},
            {type: 'TextRun', text: '${sourceTimestamp}'},
            {type: 'TextRun', text: ' yesterday'},
          ],
        },
        createTimestampMetadata(),
      ],
    };
    const original = JSON.stringify(card);

    const prepared = prepareCardForRender(card, new Date(2026, 9, 26, 11, 9).getTime(), undefined, true);

    expect(prepared.body).toHaveLength(1);
    expect(prepared.body[0].inlines.map((inline) => inline.text).join('')).toBe('Called at 11:09 yesterday');
    expect(JSON.stringify(card)).toBe(original);
  });

  it('removes a bullet-only timestamp column and old divider after its timestamp sibling is omitted', () => {
    const card = {
      type: 'AdaptiveCard',
      body: [
        {type: 'TextBlock', text: 'Keep this summary.'},
        {type: 'TextBlock', id: 'line-separator-textBlock', text: ' '},
        {
          type: 'ColumnSet',
          columns: [
            createTimestampColumn(),
            {type: 'Column', items: [{type: 'RichTextBlock', inlines: [{type: 'TextRun', text: ' • '}]}]},
          ],
        },
      ],
    };
    const original = JSON.stringify(card);

    expect(prepareCardForRender(card, 1792990040000, undefined, true).body).toEqual([
      {type: 'TextBlock', text: 'Keep this summary.'},
    ]);
    expect(JSON.stringify(card)).toBe(original);
  });

  it('keeps substantive and unrelated bullet content when removing timestamp decorations', () => {
    const card = {
      type: 'AdaptiveCard',
      body: [
        {
          type: 'ColumnSet',
          columns: [{type: 'Column', items: [{type: 'RichTextBlock', inlines: [{type: 'TextRun', text: '•'}]}]}],
        },
        {
          type: 'ColumnSet',
          columns: [
            createTimestampColumn(),
            {
              type: 'Column',
              items: [{type: 'RichTextBlock', inlines: [{type: 'TextRun', text: '• Customer requested a callback.'}]}],
            },
          ],
        },
      ],
    };

    const prepared = prepareCardForRender(card, undefined, undefined, true);

    expect(prepared.body).toHaveLength(2);
    expect(prepared.body[0]).toEqual(card.body[0]);
    expect(JSON.stringify(prepared)).toContain('• Customer requested a callback.');
    expect(JSON.stringify(prepared)).not.toContain('source-timestamp-richTextBlock');
  });

  it('collapses the real timestamp footer with stretch columns and suppressed feedback ActionSets', () => {
    const card = {
      type: 'AdaptiveCard',
      body: [
        {type: 'TextBlock', text: 'Keep the customer summary.'},
        {type: 'TextBlock', id: 'line-separator-textBlock', text: ' '},
        {
          type: 'ColumnSet',
          columns: [
            {type: 'Column', width: 'stretch'},
            createTimestampColumn({width: 'auto'}),
            {type: 'Column', items: [{type: 'RichTextBlock', inlines: [{type: 'TextRun', text: '•'}]}]},
            ...['likeButton', 'dislikeButton', 'copyButton'].map((id) => ({
              type: 'Column',
              items: [{type: 'ActionSet', actions: [{type: 'Action.Submit', id, title: ''}]}],
            })),
            {type: 'Column', items: []},
          ],
        },
      ],
    };
    const original = JSON.stringify(card);

    expect(prepareCardForRender(card, undefined, undefined, true).body).toEqual([
      {type: 'TextBlock', text: 'Keep the customer summary.'},
    ]);
    expect(JSON.stringify(card)).toBe(original);
  });

  it('preserves unknown ActionSets beside an omitted timestamp', () => {
    const card = createFooterCard([
      {type: 'Column', items: [{type: 'RichTextBlock', inlines: [{type: 'TextRun', text: '•'}]}]},
      {
        type: 'Column',
        items: [{type: 'ActionSet', actions: [{type: 'Action.OpenUrl', id: 'openCase', title: 'Open case'}]}],
      },
    ]);

    const prepared = prepareCardForRender(card, undefined, undefined, true);

    expect(prepared.body).toHaveLength(1);
    expect(JSON.stringify(prepared)).toContain('openCase');
    expect(JSON.stringify(prepared)).not.toContain('source-timestamp-richTextBlock');
  });

  it.each([
    {type: 'Action.OpenUrl', id: 'copyButton', title: 'Copy details', url: 'https://example.invalid/case'},
    {type: 'Action.Submit', id: 'copyDetails', title: 'Copy details'},
  ])('preserves unknown actions whose names resemble metadata controls %s', (action) => {
    const card = createFooterCard([{type: 'Column', items: [{type: 'ActionSet', actions: [action]}]}]);

    const prepared = prepareCardForRender(card, undefined, undefined, true);

    expect(prepared.body).toHaveLength(1);
    expect(prepared.body[0].columns).toEqual([{type: 'Column', items: [{type: 'ActionSet', actions: [action]}]}]);
  });

  it.each([
    {backgroundImage: 'https://example.invalid/summary.png'},
    {backgroundImage: 'https://example.invalid/summary.png', items: []},
    {selectAction: {type: 'Action.OpenUrl', url: 'https://example.invalid/case'}},
    {selectAction: {type: 'Action.OpenUrl', url: 'https://example.invalid/case'}, items: []},
  ])('preserves empty-looking columns with unsupported content %s', (content) => {
    const card = createFooterCard([{type: 'Column', width: 'stretch', ...content}]);

    const prepared = prepareCardForRender(card, undefined, undefined, true);

    expect(prepared.body).toHaveLength(1);
    expect(prepared.body[0].columns).toEqual([{type: 'Column', width: 'stretch', ...content}]);
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

  it('preserves existing extraction of hidden RTA text unless visible-only copying is requested', () => {
    const container = document.createElement('div');
    container.innerHTML = `
      <div class="ac-textBlock">Visible suggestion</div>
      <div style="display: none"><div class="ac-textBlock">Hidden suggestion</div></div>
      <div class="ac-richTextBlock" hidden>Hidden details</div>
      <div class="ac-textBlock">Source</div>
    `;

    expect(extractCardText(container)).toBe('Visible suggestion\nHidden suggestion\nHidden details');
  });

  it('excludes text blocks hidden by HTML attributes, CSS, or their ancestors', () => {
    const container = document.createElement('div');
    container.innerHTML = `
      <div class="ac-textBlock">Visible summary</div>
      <div hidden><div class="ac-textBlock">Hidden parent</div></div>
      <div style="display: none"><div class="ac-textBlock">Collapsed parent</div></div>
      <div class="ac-textBlock" hidden>Hidden block</div>
      <div class="ac-textBlock" style="visibility: hidden">Invisible block</div>
      <div style="visibility: hidden"><div class="ac-textBlock">Invisible parent</div></div>
      <div class="ac-richTextBlock" style="visibility: collapse">Collapsed block</div>
      <div class="ac-textBlock">Source</div>
      <div><div class="ac-richTextBlock">Visible next steps</div></div>
    `;

    expect(extractCardText(container, {visibleOnly: true})).toBe('Visible summary\nVisible next steps');
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
