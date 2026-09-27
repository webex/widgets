import {
  applyVisualSummaryEdit,
  createPostCallVisualContent,
  POST_CALL_VISUAL_PAYLOAD,
} from '../../../../../../widgets-samples/cc/samples-cc-react-app/src/ai-summary-visual-content';

describe('production-shaped visual fixture', () => {
  it('preserves every supported SDK key in order and uses real editable production content', () => {
    const content = createPostCallVisualContent();
    expect(content.sections.map((section) => section.key)).toEqual(Object.keys(POST_CALL_VISUAL_PAYLOAD.sections));
    expect(content.sections.every((section) => section.editable)).toBe(true);
    const edited = applyVisualSummaryEdit(content, {key: 'initialContactReason', value: ''});
    expect(edited).toMatchObject({
      sections: [{key: 'initialContactReason', value: ''}, ...content.sections.slice(1)],
      resolution: content.resolution,
    });
    expect(content.sections[0].value).not.toBe('');
  });

  it('updates plain text without allowing a section key to overwrite it', () => {
    const content = {type: 'text' as const, summaryText: 'Before'};
    expect(applyVisualSummaryEdit(content, {key: 'initialContactReason', value: 'Wrong key'})).toEqual(content);
    expect(applyVisualSummaryEdit(content, {key: 'summaryText', value: 'Edited'})).toEqual({
      ...content,
      summaryText: 'Edited',
    });
  });
});
