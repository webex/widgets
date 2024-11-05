import {WebStationLogin} from '@webex/widget-cc-station-login';
import {WebUserState} from '@webex/widget-cc-user-state';

if (!customElements.get('web-user-state')) {
  customElements.define('web-user-state', WebUserState);
}

if (!customElements.get('web-station-login')) {
  customElements.define('web-station-login', WebStationLogin);
}
