import React from 'react';
import store from '@webex/cc-store';
import {observer} from 'mobx-react-lite';
import {ErrorBoundary} from 'react-error-boundary';

import {StationLoginComponent, StationLoginComponentProps} from '@webex/cc-components';
import {useStationLogin} from '../helper';
import {StationLoginProps} from './station-login.types';

const StationLoginInternal: React.FunctionComponent<StationLoginProps> = observer(
  ({onLogin, onLogout, onCCSignOut, profileMode, onSaveStart, onSaveEnd, doStationLogout, hideDesktopLogin}) => {
    const {
      cc,
      teams,
      loginOptions,
      logger,
      isAgentLoggedIn,
      showMultipleLoginAlert,
      deviceType,
      dialNumber,
      setDeviceType,
      setDialNumber,
      teamId,
      setTeamId,
    } = store;

    const result = useStationLogin({
      cc,
      onLogin,
      onLogout,
      logger,
      deviceType,
      dialNumber,
      onSaveStart,
      onSaveEnd,
      teamId,
      isAgentLoggedIn,
      onCCSignOut,
      doStationLogout,
    });

    const dialNumberRegex = cc?.agentConfig?.regexUS;
    const props: StationLoginComponentProps = {
      ...result,
      setDeviceType,
      setDialNumber,
      teams,
      loginOptions,
      deviceType,
      dialNumberRegex,
      isAgentLoggedIn,
      showMultipleLoginAlert,
      setTeamId,
      logger,
      profileMode,
      hideDesktopLogin,
    };

    return <StationLoginComponent {...props} />;
  }
);

// Main component wrapped with ErrorBoundary.
const StationLogin: React.FunctionComponent<StationLoginProps> = (props) => {
  return (
    <ErrorBoundary
      fallbackRender={() => <></>}
      onError={(error: Error) => {
        if (store.onErrorCallback) store.onErrorCallback('StationLogin', error);
      }}
    >
      <StationLoginInternal {...props} />
    </ErrorBoundary>
  );
};

export {StationLogin};
