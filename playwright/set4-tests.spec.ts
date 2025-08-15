import {test} from '@playwright/test';
import createCallTaskControlsTests from './tests/basic-task-controls-test.spec';
test.describe('Call Task Controls Tests', createCallTaskControlsTests);
