import {test} from '@playwright/test';
import createDialNumberTaskControlTests from '../tests/dial-number-task-control-test.spec';
import createOutdialCallTests from '../tests/outdial-call-test.spec';

test.describe('Dial Number Task Control Tests', createDialNumberTaskControlTests);
test.describe('Outdial Call Tests', createOutdialCallTests);
