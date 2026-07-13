import React from 'react';
import store from '@webex/cc-store';
import {observer} from 'mobx-react-lite';
import {ErrorBoundary} from 'react-error-boundary';

import {StationLoginComponent, StationLoginComponentProps, E911Modal} from '@webex/cc-components';
import {useStationLogin} from '../helper';
import {StationLoginProps} from './station-login.types';

const StationLoginInternal: React.FunctionComponent<StationLoginProps> = observer(
  ({
    onLogin,
    onLogout,
    onCCSignOut,
    profileMode,
    onSaveStart,
    onSaveEnd,
    doStationLogout,
    hideDesktopLogin,
    allowInternationalDn,
  }) => {
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
      showE911Modal,
      setShowE911Modal,
      updateEmergencyModalAcknowledgment,
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
      allowInternationalDn,
    };

    const handleE911SaveAndContinue = async () => {
      try {
        await updateEmergencyModalAcknowledgment();
      } catch (error) {
        logger.error('CC-Widgets: Failed to update E911 acknowledgment', {
          module: 'widget-station-login#index.tsx',
          method: 'handleE911SaveAndContinue',
          error,
        });
      }
    };

    const handleE911Cancel = () => {
      setShowE911Modal(false);
    };

    return (
      <>
        <StationLoginComponent {...props} />
        <E911Modal isOpen={showE911Modal} onSaveAndContinue={handleE911SaveAndContinue} onCancel={handleE911Cancel} />
      </>
    );
  }
);

// Main component wrapped with ErrorBoundary
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
