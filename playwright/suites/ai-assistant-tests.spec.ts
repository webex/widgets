import {test} from '@playwright/test';
import createRealTimeAssistTests from '../tests/real-time-assist-test.spec';
import createRealTimeTranscriptTests from '../tests/real-time-transcript-test.spec';

test.describe('Real-Time Assist Tests', createRealTimeAssistTests);
test.describe('Real-Time Transcript Tests', createRealTimeTranscriptTests);
