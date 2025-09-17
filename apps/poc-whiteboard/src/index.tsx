import React from 'react';
import { createRoot } from 'react-dom/client';
import { App } from './components/App';
import { ErrorBoundary } from './components/ErrorBoundary';

console.log('🚀 Starting NSM Whiteboard App - index.tsx');

// Initialize the app
const container = document.getElementById('root');
if (!container) throw new Error('Failed to find root element');

const root = createRoot(container);
root.render(
  React.createElement(ErrorBoundary, null,
    React.createElement(App)
  )
);

console.log('✅ App rendered successfully');