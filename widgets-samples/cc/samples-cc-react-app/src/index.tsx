import React from 'react';
import {createRoot} from 'react-dom/client';
window['AGENTX_SERVICE'] = {};

import App from './App';

const rootElement = document.getElementById('root');
if (rootElement) {
  rootElement.style.height = '100%';
  const root = createRoot(rootElement);
  root.render(<App />);
}
