import {StationLogin, AIAssistant} from '@webex/cc-widgets';
import {AIAssistant as DirectAssistant} from '@webex/cc-ai-assistant';

window.widgetImportCheck = {
  stationLogin: typeof StationLogin,
  assistant: typeof AIAssistant,
  directAssistant: typeof DirectAssistant,
  loadWebComponents: () => import('@webex/cc-widgets/wc'),
};
