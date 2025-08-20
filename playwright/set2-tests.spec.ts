import {test} from '@playwright/test';
import createAdvanceCombinationsTests from './tests/advance-task-control-combinations-test.spec';
import createTaskListTests from './tests/tasklist-test.spec';
test.describe('Advanced Combinations Tests', createAdvanceCombinationsTests);
test.describe('Task List Tests', createTaskListTests);
