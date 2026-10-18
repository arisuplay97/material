import L from 'leaflet';
if (typeof window !== 'undefined') {
  (window as any).L = L;

  // Prevent third-party browser extensions (chrome-extension://) from throwing false-positive runtime crash overlays
  window.addEventListener(
    'error',
    (event) => {
      const source = event.filename || (event.error && event.error.stack) || '';
      if (typeof source === 'string' && source.includes('chrome-extension://')) {
        event.stopImmediatePropagation();
        event.preventDefault();
      }
    },
    true
  );

  window.addEventListener(
    'unhandledrejection',
    (event) => {
      const stack = (event.reason && (event.reason.stack || event.reason.message)) || '';
      if (typeof stack === 'string' && stack.includes('chrome-extension://')) {
        event.stopImmediatePropagation();
        event.preventDefault();
      }
    },
    true
  );
}

import { createRoot } from 'react-dom/client';
import App from './App';
import './index.css';

createRoot(document.getElementById('root')!).render(<App />);

