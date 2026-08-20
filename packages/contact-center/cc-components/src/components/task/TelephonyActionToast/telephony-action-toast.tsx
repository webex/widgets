import React from 'react';
import {Text, Toast} from '@momentum-design/components/dist/react';
import errorLegacyBoldIcon from '@momentum-design/icons/dist/svg/error-legacy-bold.svg';
import {WxAppTelephonyErrorDisplay} from '../task.types';
import './telephony-action-toast.style.scss';

export type TelephonyActionToastProps = {
  error: WxAppTelephonyErrorDisplay;
  onDismiss: () => void;
};

const TelephonyActionToast: React.FunctionComponent<TelephonyActionToastProps> = ({error, onDismiss}) => {
  return (
    <div className="telephony-action-toast-anchor" data-testid="telephony-action-toast">
      <Toast variant="custom" closeButtonAriaLabel="Close toast" onClose={onDismiss}>
        <span
          slot="content-prefix"
          className="telephony-action-toast-icon-wrap"
          style={{'--telephony-toast-icon-url': `url("${errorLegacyBoldIcon}")`} as React.CSSProperties}
          aria-hidden="true"
        >
          <span className="telephony-action-toast-icon" />
        </span>
        <Text slot="toast-body-normal" tagname="span">
          {error.message}
        </Text>
      </Toast>
    </div>
  );
};

export default TelephonyActionToast;
