import React from 'react';
import store from '@webex/cc-store';
import {observer} from 'mobx-react-lite';
import {withMetrics} from '@webex/ui-metrics';
import {OutdialCallComponent} from '@webex/cc-components';
import {useOutdialCall} from '../helper';

const OutdialCall: React.FunctionComponent = observer(() => {
  const {cc, logger} = store;

  const result = useOutdialCall({cc, logger});
  const props = {
    ...result,
  };

  const OutdialCallWithMetrics = withMetrics(OutdialCallComponent, 'OutdialCall');
  return <OutdialCallWithMetrics {...props} />;
});

export {OutdialCall};
