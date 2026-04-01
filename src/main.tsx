import React from 'react';
import ReactDOM from 'react-dom/client';
import { BlinkProvider, BlinkAuthProvider } from '@blinkdotnew/react';
import App from './App';
import './index.css';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <BlinkProvider 
      projectId={import.meta.env.VITE_BLINK_PROJECT_ID} 
      publishableKey={import.meta.env.VITE_BLINK_PUBLISHABLE_KEY}
      auth={{ mode: 'managed' }}
    >
      <BlinkAuthProvider>
        <App />
      </BlinkAuthProvider>
    </BlinkProvider>
  </React.StrictMode>,
);
