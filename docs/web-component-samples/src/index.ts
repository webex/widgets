import {WebStationLogin} from '@webex/cc-station-login';
import {WebUserState} from '@webex/cc-user-state';

if (!customElements.get('web-user-state')) {
  customElements.define('web-user-state', WebUserState);
}

if (!customElements.get('web-station-login')) {
  customElements.define('web-station-login', WebStationLogin);
}
