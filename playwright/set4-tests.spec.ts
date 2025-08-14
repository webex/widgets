import {test} from '@playwright/test';

import createIncomingTaskTests from './incoming-task-test.spec';
import createIncomingTaskMultiSessionTests from './incoming-task-multi-session.spec';

test.describe('Incoming Task Tests', createIncomingTaskTests);
test.describe('Incoming Task Multi-Session Tests', createIncomingTaskMultiSessionTests);
