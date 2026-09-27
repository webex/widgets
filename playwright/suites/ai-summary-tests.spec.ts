import {expect} from '@playwright/test';
import {
  assertAISummaryVisualRegistry,
  AI_SUMMARY_STRUCTURAL_CASE_REGISTRY,
  getAISummaryVisualArgs,
} from '../visual/ai-summary-visual-cases';
import {
  finalizeAISummaryVisualEvidence,
  getAISummaryVisualCases,
  recordAllAISummaryStructuralEvidence,
  recordAISummaryVisual,
  test,
} from '../Utils/aiSummaryUtils';

test.describe('AI Summary visual evidence manager', () => {
  // The descriptor and sealed PNGs declare two physical pixels per CSS pixel.
  // Interaction-only journeys retain their ordinary 1x browser context.
  test.use({deviceScaleFactor: 2});

  test.afterAll(async () => {
    await finalizeAISummaryVisualEvidence();
  });

  test('visual and structural registries are complete and non-overlapping', async () => {
    assertAISummaryVisualRegistry();
    expect(getAISummaryVisualCases()).toHaveLength(10);
    expect(getAISummaryVisualCases().find((entry) => entry.sourceId === 'UX-010')?.acceptanceOverride)
      .toBe('requirement-availability-override');
    expect(AI_SUMMARY_STRUCTURAL_CASE_REGISTRY.some((entry) => entry.screenshotId === 'S10')).toBe(true);
  });

  for (const visualCase of getAISummaryVisualCases()) {
    test(`records ${visualCase.sourceId}/${visualCase.screenshotId} evidence`, async ({page}) => {
      await recordAISummaryVisual(page, ...getAISummaryVisualArgs(visualCase));
    });
  }

  test('records structural accessibility coverage for the closed state inventory', async ({page}) => {
    await recordAllAISummaryStructuralEvidence(page);
  });
});
