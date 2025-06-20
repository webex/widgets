// EmptyState.tsx
import React from 'react';

const ConsultTransferEmptyState: React.FC<{message: string}> = ({message}) => (
  <div className="consult-empty-state">
    <div className="consult-empty-state-svg" />
    <div className="consult-empty-message">{message}</div>
  </div>
);

export default ConsultTransferEmptyState;
