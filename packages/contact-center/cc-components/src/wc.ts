import r2wc from '@r2wc/react-to-web-component';
import UserStateComponent from './components/UserState/user-state';
import '@momentum-design/components/components/button';
import '@momentum-design/components/components/themeprovider';
import '@momentum-design/components/components/iconprovider';
import '@momentum-design/fonts/dist/css/fonts.css';
import '@momentum-design/tokens/dist/css/components/complete.css';

const WebUserState = r2wc(UserStateComponent);

if (!customElements.get('component-cc-user-state')) {
  customElements.define('component-cc-user-state', WebUserState);
}
