import React from 'react';
import {createRoot} from 'react-dom/client';

// Initialize AGENTX_SERVICE before any imports that might need it
window['AGENTX_SERVICE'] = {}; // Required by engage widgets

import App from './App';

const rootElement = document.getElementById('root');
if (rootElement) {
  rootElement.style.height = '100%';
  const root = createRoot(rootElement);
  root.render(<App />);
}
