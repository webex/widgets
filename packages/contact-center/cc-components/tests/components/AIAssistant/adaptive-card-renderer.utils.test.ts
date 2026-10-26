import '@testing-library/jest-dom';
import editRegularIcon from '@momentum-design/icons/dist/svg/edit-regular.svg';
import sparkleFilledIcon from '@momentum-design/icons/dist/svg/sparkle-filled.svg';
import {
  buildHostConfig,
  copyToClipboard,
  extractCardText,
  extractCustomerStatementTitle,
  prepareCardForRender,
  resolveMomentumIconUrl,
} from '../../../src/components/AIAssistant/AdaptiveCardRenderer/adaptive-card-renderer.utils';

describe('AdaptiveCardRenderer utilities', () => {
  it('uses Desktop typography for summary cards while retaining suggestion spacing', () => {
    const suggestion = buildHostConfig();
    expect(buildHostConfig('summary')).toMatchObject({
      fontSizes: {small: 10, default: 12, medium: 14, large: 17, extraLarge: 20},
      fontWeights: {lighter: 300, default: 400, bolder: 600},
      spacing: {small: 8, default: 16, medium: 20, large: 24, extraLarge: 32, padding: 0},
      containerStyles: {accent: {backgroundColor: 'transparent'}, attention: {backgroundColor: 'transparent'}},
      actions: {buttonSpacing: 4, actionAlignment: 'stretch', iconSize: 24},
    });
    expect(suggestion).toMatchObject({
      spacing: {small: 4, default: 8},
      actions: {buttonSpacing: 8, actionAlignment: 'left'},
    });
    expect(suggestion).not.toHaveProperty('fontSizes');
    expect(suggestion).not.toHaveProperty('fontWeights');
    expect(suggestion.actions).not.toHaveProperty('iconSize');
    expect(suggestion.containerStyles).not.toHaveProperty('accent');
    expect(suggestion.containerStyles).not.toHaveProperty('attention');
  });
  it('resolves all icons emitted by real-time assist cards', () => {
    expect(resolveMomentumIconUrl(' LIKE-REGULAR.SVG ')).toBeTruthy();
    expect(resolveMomentumIconUrl('cisco-ai-assistant-color.svg')).toBeTruthy();
    expect(resolveMomentumIconUrl('arrow-right-regular.svg')).toBeTruthy();
    expect(resolveMomentumIconUrl('arrow-down-regular.svg')).toBeTruthy();
    expect(resolveMomentumIconUrl('unknown-icon.svg')).toBeNull();
  });

  it('resolves summary Edit and AI sparkle icons to their bundled Momentum assets', () => {
    expect(resolveMomentumIconUrl('edit-regular.svg')).toBe(editRegularIcon);
    expect(resolveMomentumIconUrl('sparkle-filled.svg')).toBe(sparkleFilledIcon);
    expect(
      prepareCardForRender({actions: [{iconUrl: '/edit-regular.svg'}], body: [{url: '/sparkle-filled.svg'}]})
    ).toEqual({
      actions: [{iconUrl: editRegularIcon}],
      body: [{url: sparkleFilledIcon}],
    });
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

  it('preserves ordinary card array entries when receiver metadata omission is not requested', () => {
    const card = {type: 'AdaptiveCard', body: [undefined, {type: 'TextBlock', text: 'Ordinary suggestion'}]};
    expect(prepareCardForRender(card).body).toEqual(card.body);
    expect(prepareCardForRender(card).body).not.toBe(card.body);
  });

  it('omits only receiver timestamp metadata and newly emptied footer decorations from a render clone', () => {
    const card = {
      type: 'AdaptiveCard',
      body: [
        {type: 'TextBlock', text: 'Keep this summary'},
        {id: 'line-separator-textBlock', type: 'TextBlock', text: ' '},
        {
          type: 'ColumnSet',
          columns: [
            {
              type: 'Column',
              items: [
                {
                  type: 'RichTextBlock',
                  id: 'source-timestamp-richTextBlock',
                  inlines: [{type: 'TextRun', text: '${sourceTimestamp}'}],
                },
              ],
            },
          ],
        },
      ],
    };
    const original = JSON.stringify(card);
    const timestamp = new Date(2026, 9, 26, 14, 7).getTime();

    expect(prepareCardForRender(card, timestamp, undefined, true).body).toEqual([
      {type: 'TextBlock', text: 'Keep this summary'},
    ]);
    expect(prepareCardForRender(card, timestamp).body).toHaveLength(3);
    expect(JSON.stringify(card)).toBe(original);
  });

  it('keeps timestamp runs within substantive rich text while omitting complete timestamp-only blocks', () => {
    const card = {
      type: 'AdaptiveCard',
      body: [
        {
          type: 'RichTextBlock',
          inlines: [
            {type: 'TextRun', text: 'Updated at '},
            {type: 'TextRun', text: '${sourceTimestamp}'},
          ],
        },
        {type: 'RichTextBlock', inlines: [{type: 'TextRun', text: '${sourceTimestamp}'}]},
        {type: 'TextBlock', text: '${sourceTimestamp}'},
      ],
    };
    const timestamp = new Date(2026, 9, 26, 14, 7).getTime();
    const prepared = prepareCardForRender(card, timestamp, undefined, true);

    expect(prepared.body).toEqual([
      {
        type: 'RichTextBlock',
        inlines: [
          {type: 'TextRun', text: 'Updated at '},
          {type: 'TextRun', text: '14:07'},
        ],
      },
    ]);
    expect(card.body).toHaveLength(3);
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
            {
              type: 'Column',
              items: [
                {
                  type: 'RichTextBlock',
                  id: 'source-timestamp-richTextBlock',
                  inlines: [{type: 'TextRun', text: '${sourceTimestamp}'}],
                },
              ],
            },
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
            {
              type: 'Column',
              items: [
                {
                  type: 'RichTextBlock',
                  id: 'source-timestamp-richTextBlock',
                  inlines: [{type: 'TextRun', text: '${sourceTimestamp}'}],
                },
              ],
            },
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

  it('collapses a reconstructed timestamp footer with stretch columns and suppressed feedback ActionSets', () => {
    const card = {
      type: 'AdaptiveCard',
      body: [
        {type: 'TextBlock', text: 'Keep the customer summary.'},
        {type: 'TextBlock', id: 'line-separator-textBlock', text: ' '},
        {
          type: 'ColumnSet',
          columns: [
            {type: 'Column', width: 'stretch'},
            {
              type: 'Column',
              width: 'auto',
              items: [
                {
                  type: 'RichTextBlock',
                  id: 'source-timestamp-richTextBlock',
                  inlines: [{type: 'TextRun', text: '${sourceTimestamp}'}],
                },
              ],
            },
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
    const card = {
      type: 'AdaptiveCard',
      body: [
        {
          type: 'ColumnSet',
          columns: [
            {
              type: 'Column',
              items: [
                {
                  type: 'RichTextBlock',
                  id: 'source-timestamp-richTextBlock',
                  inlines: [{type: 'TextRun', text: '${sourceTimestamp}'}],
                },
              ],
            },
            {type: 'Column', items: [{type: 'RichTextBlock', inlines: [{type: 'TextRun', text: '•'}]}]},
            {
              type: 'Column',
              items: [{type: 'ActionSet', actions: [{type: 'Action.OpenUrl', id: 'openCase', title: 'Open case'}]}],
            },
          ],
        },
      ],
    };

    const prepared = prepareCardForRender(card, undefined, undefined, true);

    expect(prepared.body).toHaveLength(1);
    expect(JSON.stringify(prepared)).toContain('openCase');
    expect(JSON.stringify(prepared)).not.toContain('source-timestamp-richTextBlock');
  });

  it.each([
    {type: 'Action.OpenUrl', id: 'copyButton', title: 'Copy details', url: 'https://example.invalid/case'},
    {type: 'Action.Submit', id: 'copyDetails', title: 'Copy details'},
  ])('preserves unknown actions whose names resemble metadata controls %s', (action) => {
    const card = {
      type: 'AdaptiveCard',
      body: [
        {
          type: 'ColumnSet',
          columns: [
            {
              type: 'Column',
              items: [
                {
                  type: 'RichTextBlock',
                  id: 'source-timestamp-richTextBlock',
                  inlines: [{type: 'TextRun', text: '${sourceTimestamp}'}],
                },
              ],
            },
            {type: 'Column', items: [{type: 'ActionSet', actions: [action]}]},
          ],
        },
      ],
    };

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
    const card = {
      type: 'AdaptiveCard',
      body: [
        {
          type: 'ColumnSet',
          columns: [
            {
              type: 'Column',
              items: [
                {
                  type: 'RichTextBlock',
                  id: 'source-timestamp-richTextBlock',
                  inlines: [{type: 'TextRun', text: '${sourceTimestamp}'}],
                },
              ],
            },
            {type: 'Column', width: 'stretch', ...content},
          ],
        },
      ],
    };

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

    expect(extractCardText(container, {summaryOnly: true})).toBe('Visible summary\nVisible next steps');
  });

  it('copies visible summary inputs and excludes Desktop source metadata and action chrome on request', () => {
    const container = document.createElement('div');
    container.innerHTML = `
      <div class="ac-textBlock">Summary heading</div>
      <div class="ac-richTextBlock" id="source-timestamp-richTextBlock">12:30</div>
      <div class="ac-richTextBlock" id="source-subtitle-richTextBlock">Source label</div>
      <div class="ac-richTextBlock" id="source-link-richTextBlock">https://source.example</div>
      <div class="ac-columnSet"><div class="ac-textBlock">AI generated</div><button class="ac-pushButton">Copy</button></div>
      <textarea class="ac-textInput">Edited summary</textarea>
      <div hidden><div class="ac-textBlock">Hidden summary</div></div>
    `;
    expect(extractCardText(container, {summaryOnly: true})).toBe('Summary heading\nEdited summary');
    expect(extractCardText(container)).toContain('12:30');
    expect(extractCardText(container)).not.toContain('Edited summary');
  });

  it('reports clipboard failure without showing success feedback', async () => {
    Object.defineProperty(navigator, 'clipboard', {
      configurable: true,
      value: {writeText: jest.fn().mockRejectedValue(new Error('Clipboard unavailable'))},
    });
    const button = document.createElement('button');
    button.innerHTML = '<img src="copy.svg" />';
    document.body.appendChild(button);
    try {
      expect(await copyToClipboard('Summary', button)).toBe(false);
      expect(button).not.toHaveAttribute('data-copied');
    } finally {
      button.remove();
    }
  });

  it('reports actual clipboard fallback success and removes its temporary textarea', async () => {
    Object.defineProperty(navigator, 'clipboard', {configurable: true, value: undefined});
    const previousExecCommand = document.execCommand;
    document.execCommand = jest.fn().mockReturnValue(false);
    try {
      expect(await copyToClipboard('Summary')).toBe(false);
      expect(document.querySelector('textarea')).toBeNull();
      document.execCommand = jest.fn().mockReturnValue(true);
      expect(await copyToClipboard('Summary')).toBe(true);
      expect(document.querySelector('textarea')).toBeNull();
    } finally {
      document.execCommand = previousExecCommand;
    }
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
