import React from 'react';
import {Text} from '@momentum-design/components/dist/react';
import {WxAppTelephonyErrorDisplay} from '../task.types';
import './wxapp-offer-action-error.style.scss';

export type WxAppOfferActionErrorProps = {
  error: WxAppTelephonyErrorDisplay;
};

const WxAppOfferActionError: React.FunctionComponent<WxAppOfferActionErrorProps> = ({error}) => {
  return (
    <div className="wxapp-offer-action-error" role="alert" data-testid="wxapp-offer-action-error">
      <Text tagname="p" type="body-midsize-regular" className="wxapp-offer-action-error-message">
        {error.message}
      </Text>
    </div>
  );
};

export default WxAppOfferActionError;
