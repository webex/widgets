import React, {useEffect, useRef, useState} from 'react';
import store from '@webex/cc-store';
import {observer} from 'mobx-react-lite';
import {ErrorBoundary} from 'react-error-boundary';

import {StationLoginComponent, StationLoginComponentProps, E911Modal} from '@webex/cc-components';
import {useStationLogin} from '../helper';
import {StationLoginProps} from './station-login.types';

// A host can mount more than one StationLogin (e.g. the normal login widget and a separate
// profileMode settings widget) against the same store singleton. E911Modal is driven by
// store.showE911Modal, so without this guard every mounted instance would render its own copy
// and a single BROWSER login would pop duplicate blocking dialogs. Only the first-mounted
// instance renders the modal; ownership is released on unmount so another instance can take over.

let e911ModalOwner: symbol | null = null;

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

    const instanceIdRef = useRef<symbol>();
    if (!instanceIdRef.current) {
      instanceIdRef.current = Symbol('station-login-instance');
    }
    const [ownsE911Modal, setOwnsE911Modal] = useState(false);

    useEffect(() => {
      if (!e911ModalOwner) {
        e911ModalOwner = instanceIdRef.current;
        setOwnsE911Modal(true);
      }

      return () => {
        if (e911ModalOwner === instanceIdRef.current) {
          e911ModalOwner = null;
        }
      };
      // Re-run whenever showE911Modal changes (not just on mount) so that if the current owner
      // unmounts while another StationLogin instance stays mounted, that surviving instance gets
      // a chance to reclaim ownership on the next login/relogin instead of the modal never
      // rendering again for the rest of the session.
    }, [showE911Modal]);

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
        // Rethrow so E911Modal can surface a user-facing error and keep the modal open for retry.
        throw error;
      }
    };

    const handleE911Cancel = () => {
      setShowE911Modal(false);
    };

    return (
      <>
        <StationLoginComponent {...props} />
        {ownsE911Modal && (
          <E911Modal isOpen={showE911Modal} onSaveAndContinue={handleE911SaveAndContinue} onCancel={handleE911Cancel} />
        )}
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
