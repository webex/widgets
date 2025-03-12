import React from 'react';
import store from '@webex/cc-store';
import {observer} from 'mobx-react-lite';
import OutDialCallComponent from '../../../cc-components/src/components/OutdialCall/out-dial-call';
import {useOutdialCall} from '../helper';

const OutdialCallComponent: React.FunctionComponent = () => {
  const {cc, logger} = store;

  const result = useOutdialCall({cc, logger});
  const props = {
    cc,
    ...result,
  };

  return <OutDialCallComponent {...props} />;
};

const OutdialCall = observer(OutdialCallComponent);
export {OutdialCall};
