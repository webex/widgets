import React from 'react';
import store from '@webex/cc-store';
import {observer} from 'mobx-react-lite';
import {ErrorBoundary} from 'react-error-boundary';

import {useUserState} from '../helper';
import {UserStateComponent, UserStateComponentsProps} from '@webex/cc-components';
import {IUserStateProps} from '../user-state.types';

const UserStateInternal: React.FunctionComponent<IUserStateProps> = observer(({onStateChange}) => {
  const {
    cc,
    idleCodes,
    agentId,
    currentState,
    lastStateChangeTimestamp,
    lastIdleCodeChangeTimestamp,
    customState,
    logger,
    wellbeingBreakIdleCode,
  } = store;
  const isWellnessBreakState = Boolean(wellbeingBreakIdleCode && currentState === wellbeingBreakIdleCode.id);
  const displayedIdleCodes =
    isWellnessBreakState && wellbeingBreakIdleCode && !idleCodes.some(({id}) => id === wellbeingBreakIdleCode.id)
      ? [...idleCodes, wellbeingBreakIdleCode]
      : idleCodes;
  const props: UserStateComponentsProps = {
    ...useUserState({
      idleCodes: displayedIdleCodes,
      agentId,
      cc,
      currentState,
      customState,
      lastStateChangeTimestamp,
      logger,
      onStateChange,
      lastIdleCodeChangeTimestamp,
      isCurrentStateExternallyManaged: isWellnessBreakState,
    }),
    customState,
    logger,
  };

  return <UserStateComponent {...props} />;
});

const UserState: React.FunctionComponent<IUserStateProps> = (props) => {
  return (
    <ErrorBoundary
      fallbackRender={() => <></>}
      onError={(error: Error) => {
        if (store.onErrorCallback) store.onErrorCallback('UserState', error);
      }}
    >
      <UserStateInternal {...props} />
    </ErrorBoundary>
  );
};

export {UserState};
