import React from 'react';
import store from '@webex/cc-store';
import {observer} from 'mobx-react-lite';

import OutdialCallPresentational from './out-dial-call.presentational';
import {useOutdialCall} from '../helper';

const OutdialCallComponent: React.FunctionComponent = () => {
  const {cc, logger} = store;

  const result = useOutdialCall({cc, logger});
  const props = {
    cc,
    ...result,
  };

  return <OutdialCallPresentational {...props} />;
};

const OutdialCall = observer(OutdialCallComponent);
export {OutdialCall};
