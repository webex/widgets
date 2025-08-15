import {test} from '@playwright/test';

import createIncomingTaskAndControlsMultiSessionTests from './tests/incoming-task-and-controls-multi-session.spec';
import createDigitalIncomingTaskAndTaskControlsTests from './tests/digital-incoming-task-and-task-controls.spec';
test.describe('Digital Incoming and Task Controls Tests', createDigitalIncomingTaskAndTaskControlsTests);
test.describe('Incoming Task Multi-Session Tests', createIncomingTaskAndControlsMultiSessionTests);
