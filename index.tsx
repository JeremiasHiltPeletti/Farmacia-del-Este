
import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import { canUseServiceWorker } from './platform';

const rootElement = document.getElementById('root');
if (!rootElement) throw new Error("Could not find root element to mount to");

// Registro SW (service-worker.js)
if (canUseServiceWorker) {
  window.addEventListener('load', async () => {
    try {
      // Registrar service-worker.js con timestamp para evitar caché del navegador
      const swUrl = `/service-worker.js?v=${Date.now()}`;
      const reg = await navigator.serviceWorker.register(swUrl, { scope: '/' });
      reg.update();

    } catch (err) {
      // Error handling
    }
  });
}

const root = ReactDOM.createRoot(rootElement);
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
