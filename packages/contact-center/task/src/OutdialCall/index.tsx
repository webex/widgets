import React from 'react';
import store from '@webex/cc-store';
import {observer} from 'mobx-react-lite';
import {ErrorBoundary} from 'react-error-boundary';
import {OutdialCallComponent} from '@webex/cc-components';
import {useOutdialCall} from '../helper';

const OutdialCallInternal: React.FunctionComponent = observer(() => {
  const {cc, logger} = store;

  const result = useOutdialCall({cc, logger});
  const props = {
    logger,
    ...result,
  };

  return <OutdialCallComponent {...props} />;
});

const OutdialCall: React.FunctionComponent = (props) => {
  return (
    <ErrorBoundary
      fallbackRender={() => <></>}
      onError={(error: Error) => {
        if (store.onErrorCallback) store.onErrorCallback('OutdialCall', error);
      }}
    >
      <OutdialCallInternal {...props} />
    </ErrorBoundary>
  );
};

export {OutdialCall};
