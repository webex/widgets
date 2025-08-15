import {test} from '@playwright/test';
import createAdvanceCombinationsTests from './tests/advance-task-control-combinations-test.spec';
test.describe('Advanced Combinations Tests', createAdvanceCombinationsTests);
