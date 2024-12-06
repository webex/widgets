import {StationLogin} from '@webex/cc-station-login';
import {UserState} from '@webex/cc-user-state';
import store from '@webex/cc-store';
import r2wc from '@r2wc/react-to-web-component';

const WebUserState = r2wc(UserState);

const WebStationLogin = r2wc(StationLogin, {
  props: {
    onLogin: 'function',
    onLogout: 'function',
  },
});

if (!customElements.get('widget-cc-user-state')) {
  customElements.define('widget-cc-user-state', WebUserState);
}

if (!customElements.get('widget-cc-station-login')) {
  customElements.define('widget-cc-station-login', WebStationLogin);
}

export {StationLogin, UserState, store};
