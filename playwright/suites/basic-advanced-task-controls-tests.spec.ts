import {test} from '@playwright/test';
import createCallTaskControlsTests from '../tests/basic-task-controls-test.spec';
import createAdvanceCombinationsTests from '../tests/advance-task-control-combinations-test.spec';
import createRealTimeAssistTests from '../tests/real-time-assist-test.spec';
import createRealTimeTranscriptTests from '../tests/real-time-transcript-test.spec';

test.describe('Call Task Controls Tests', createCallTaskControlsTests);
test.describe('Advanced Combinations Tests', createAdvanceCombinationsTests);

test.describe('Real-Time Transcript Tests', createRealTimeTranscriptTests);
test.describe('Real-Time Assist Tests', createRealTimeAssistTests);