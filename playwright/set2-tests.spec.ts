import {test} from '@playwright/test';
import createBasicTaskControlsTests from './basic-task-controls-test.spec';
import createAdvanceCombinationsTests from './advanceCombinationsTests.spec';

test.describe('Basic Task Controls Tests', createBasicTaskControlsTests);
test.describe('Advanced Combinations Tests', createAdvanceCombinationsTests);
