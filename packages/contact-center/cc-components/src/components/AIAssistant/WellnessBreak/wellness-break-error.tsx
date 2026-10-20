import React from 'react';
import {Text} from '@momentum-design/components/dist/react';
import type {WellnessBreakErrorProps} from '../ai-assistant.types';

const WellnessBreakError: React.FC<WellnessBreakErrorProps> = ({error}) => {
  if (!error) return null;
  const message =
    error.code === 'RESTORE_FAILED'
      ? 'We encountered an issue setting your status to Available.'
      : error.code === 'STATE_CHANGE_FAILED'
        ? "We couldn't start your well-being break due to a system issue. Please continue with your tasks and we will see you in your next well-being break."
        : "We couldn't start your well-being break due to a system issue.";

  return (
    <div className="wellness-break-error" role="alert" data-testid="wellness-break:error">
      <Text tagname="p" type="body-small-regular">
        {message}
      </Text>
    </div>
  );
};

export default WellnessBreakError;
