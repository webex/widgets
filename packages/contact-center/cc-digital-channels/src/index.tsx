import React from 'react';
import ReactDOM from 'react-dom/client';
import './App.css';
import App from './App';

// Extend the Window interface to include AGENTX_SERVICE
declare global {
  interface Window {
    AGENTX_SERVICE: Record<string, unknown>;
  }
}

// Setup global error handling to suppress common errors
window.AGENTX_SERVICE = {}; // Make it available in the window object for global access for engage widgets

// Override the default console.error to filter out specific errors
const originalConsoleError = console.error;
console.error = (...args: unknown[]): void => {
  // Check if the error is one of the ones we want to suppress
  const errorMessage = args.length > 0 ? String(args[0]) : '';
  
  // Suppress specific errors
  if (
    (errorMessage.includes("Cannot read properties of undefined (reading 'error')")) ||
    (errorMessage.includes("Cannot read properties of undefined (reading 'info')")) ||
    (errorMessage === "[object Object]") ||
    (args[0] && typeof args[0] === 'object' && args[0] && args[0].toString() === '[object Object]')
  ) {
    // Silently ignore these errors
    return;
  }
  
  // For any other errors, pass them through to the original console.error
  originalConsoleError.apply(console, args);
};

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error('Root element not found');
}

const root = ReactDOM.createRoot(rootElement);

root.render(
  <React.StrictMode>
      <App />
  </React.StrictMode>
);
