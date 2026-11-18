import React from 'react';
import store from '@webex/cc-store';
import {observer} from 'mobx-react-lite';
import {ErrorBoundary} from 'react-error-boundary';

import {useGranularAgentState} from '../helper';
import {GranularAgentStateComponent, GranularAgentStateComponentProps} from '@webex/cc-components';
import {IGranularAgentStateProps} from '../granular-agent-state.types';

const GranularAgentStateInternal: React.FunctionComponent<IGranularAgentStateProps> = observer(({onStateChange}) => {
  const {cc, agentId, idleCodes, channelStatesMap, logger} = store;
  const props: GranularAgentStateComponentProps = {
    ...useGranularAgentState({
      cc,
      agentId,
      idleCodes,
      channelStatesMap,
      logger,
      onStateChange,
    }),
    logger,
  };

  return <GranularAgentStateComponent {...props} />;
});

// Renders only for sessions the SDK pinned to granular (V2) agent state; V1 sessions use UserState.
const GranularAgentStateGate: React.FunctionComponent<IGranularAgentStateProps> = observer((props) =>
  store.isGranularAgentStateActive ? <GranularAgentStateInternal {...props} /> : null
);

const GranularAgentState: React.FunctionComponent<IGranularAgentStateProps> = (props) => {
  return (
    <ErrorBoundary
      fallbackRender={() => <></>}
      onError={(error: Error) => {
        if (store.onErrorCallback) store.onErrorCallback('GranularAgentState', error);
      }}
    >
      <GranularAgentStateGate {...props} />
    </ErrorBoundary>
  );
};

export {GranularAgentState};
