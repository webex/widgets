import React from 'react';
import {Text, Toast} from '@momentum-design/components/dist/react';
import {WxAppTelephonyErrorDisplay} from '../task.types';
import './telephony-action-toast.style.scss';

export type TelephonyActionToastProps = {
  error: WxAppTelephonyErrorDisplay;
  onDismiss: () => void;
};

const TelephonyActionToast: React.FunctionComponent<TelephonyActionToastProps> = ({error, onDismiss}) => {
  return (
    <div className="telephony-action-toast-anchor" data-testid="telephony-action-toast">
      <Toast variant="error" closeButtonAriaLabel="Close toast" onClose={onDismiss}>
        <Text slot="toast-body-normal" tagname="span">
          {error.message}
        </Text>
      </Toast>
    </div>
  );
};

export default TelephonyActionToast;
