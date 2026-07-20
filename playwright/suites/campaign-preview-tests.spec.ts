import {test} from '@playwright/test';
import createCampaignPreviewTests from '../tests/campaign-preview-test.spec';

test.describe('Campaign Preview Tests', createCampaignPreviewTests);
