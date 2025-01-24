import React, {useRef, useState} from 'react';
import store from '@webex/cc-store';
import {observer} from 'mobx-react-lite';

import StationLoginPresentational from './station-login.presentational';
import {useStationLogin} from '../helper';
import {StationLoginProps} from './station-login.types';

const StationLogin: React.FunctionComponent<StationLoginProps> = observer(({onLogin, onLogout}) => {
  const {cc, teams, loginOptions, logger, deviceType, isAgentLoggedIn} = store;
  const result = useStationLogin({cc, onLogin, onLogout, logger, isAgentLoggedIn});

  const modalRef = useRef<HTMLDialogElement>(null);
  const [showAlert, setShowAlert] = useState(result.showMultipleLoginAlert);

  const handleContinue = () => {
    try {
      const modal = modalRef.current;
      if (modal) {
        modal.close();
        setShowAlert(false);
        cc.register();
        window.location.reload();
        logger.log(`Agent Relogin Success`, {
          module: 'widget-station-login#station-login/index.tsx',
          method: 'handleContinue',
        });
      }
    } catch (error) {
      logger.error(`Error handling agent multi login continue: ${error}`, {
        module: 'widget-station-login#station-login/index.tsx',
        method: 'handleContinue',
      });
    }
  };

  const props = {
    ...result,
    teams,
    loginOptions,
    cc,
    deviceType,
    handleContinue,
    modalRef,
    showAlert,
    setShowAlert,
  };

  return <StationLoginPresentational {...props} />;
});

export default StationLogin;
