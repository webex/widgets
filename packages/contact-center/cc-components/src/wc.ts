import r2wc from '@r2wc/react-to-web-component';
import UserStateComponent from './components/UserState/user-state';
import '@momentum-ui/web-components';
import '@momentum-ui/icons/css/momentum-ui-icons.min.css';
import '@momentum-ui/core/css/momentum-ui.min.css';

const WebUserState = r2wc(UserStateComponent);

if (!customElements.get('component-cc-user-state')) {
  customElements.define('component-cc-user-state', WebUserState);
}