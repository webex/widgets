import React from 'react';
import store from '@webex/cc-store';
import {observer} from 'mobx-react-lite';
import {ErrorBoundary} from 'react-error-boundary';
import {OutdialCallComponent} from '@webex/cc-components';
import {useOutdialCall} from '../helper';
import {OutdialProps} from '../task.types';

const OutdialCallInternal: React.FunctionComponent<OutdialProps> = observer((props: OutdialProps) => {
  const {cc, logger} = store;

  const result = useOutdialCall({cc, logger});
  const resultProps = {
    logger,
    ...result,
    ...props,
  };

  return <OutdialCallComponent {...resultProps} />;
});

const OutdialCall: React.FunctionComponent<OutdialProps> = (props) => {
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
