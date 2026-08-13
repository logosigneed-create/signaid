import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';
import App from './App';
import { ErrorBoundary } from './components/ErrorBoundary';

import { initializeLayout } from './utils/layoutInitializer';

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error("Could not find root element to mount to");
}

// FIX: Inject saved layout styles BEFORE rendering to prevent jumps (FOUC)
// initializeLayout(); // DISABLED: Removing the layout engine to hand control back to CSS/React

import { ProductProvider } from './context/ProductContext';

const root = ReactDOM.createRoot(rootElement);
root.render(
  <React.StrictMode>
    <ErrorBoundary>
      <ProductProvider>
        <App />
      </ProductProvider>
    </ErrorBoundary>
  </React.StrictMode>
);
