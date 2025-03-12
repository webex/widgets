import r2wc from '@r2wc/react-to-web-component';
import UserStateComponent from './components/UserState/user-state';
import OutdialCallComponent from './components/OutdialCall/out-dial-call';

const WebUserState = r2wc(UserStateComponent);
const WebOutDialCallComponent = r2wc(OutdialCallComponent);

if (!customElements.get('component-cc-user-state')) {
  customElements.define('component-cc-user-state', WebUserState);
}

if (!customElements.get('component-cc-out-dial-call')) {
  customElements.define('component-cc-out-dial-call', WebOutDialCallComponent);
}
