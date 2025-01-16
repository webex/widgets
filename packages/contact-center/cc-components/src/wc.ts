import r2wc from '@r2wc/react-to-web-component';
import UserStateComponent from './components/user-state/user-state';

const WebUserState = r2wc(UserStateComponent);

if (!customElements.get('component-cc-user-state')) {
  customElements.define('component-cc-user-state', WebUserState);
}