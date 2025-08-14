import {test} from '@playwright/test';
import createStationLoginTests from './station-login-test.spec';
import createUserStateTests from './user-state-test.spec';

test.describe('Station Login Tests', createStationLoginTests);

test.describe('User State Tests', createUserStateTests);
