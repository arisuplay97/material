import L from 'leaflet';
if (typeof window !== 'undefined') {
  (window as any).L = L;
}

import { createRoot } from 'react-dom/client';
import App from './App';
import './index.css';

createRoot(document.getElementById('root')!).render(<App />);

