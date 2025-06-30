// Make AGENTX_SERVICE available globally before any modules load
// This is required by @webex-engage/wxengage-conversations
window['AGENTX_SERVICE'] = {};
// eslint-disable-next-line @typescript-eslint/no-explicit-any
(globalThis as any).AGENTX_SERVICE = {};

import React from 'react';
import {createRoot} from 'react-dom/client';
import App from './App';

const rootElement = document.getElementById('root');
if (rootElement) {
  rootElement.style.height = '100%';
  const root = createRoot(rootElement);
  root.render(<App />);
}
