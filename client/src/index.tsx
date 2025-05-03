import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import './index.css';
import App from './App';
import { AuthProvider } from './contexts/AuthContext';

// Preload critical assets for better performance
const preloadAssets = () => {
  // Fonts, critical images, or other assets
  const fontUrls = [
    // Add font URLs if using custom web fonts
  ];
  
  // Preload fonts if any
  fontUrls.forEach(url => {
    const link = document.createElement('link');
    link.rel = 'preload';
    link.href = url;
    link.as = 'font';
    link.crossOrigin = 'anonymous';
    document.head.appendChild(link);
  });
};

// Call preload function
preloadAssets();

// Use createRoot API for better performance
const rootElement = document.getElementById('root');
if (!rootElement) throw new Error('Failed to find the root element');

const root = ReactDOM.createRoot(rootElement);

// Render the app with React Strict Mode disabled in production
// This improves performance by preventing double rendering in production
const AppWithProviders = (
  process.env.NODE_ENV === 'production' ? (
    <BrowserRouter>
      <AuthProvider>
        <App />
      </AuthProvider>
    </BrowserRouter>
  ) : (
    <React.StrictMode>
      <BrowserRouter>
        <AuthProvider>
          <App />
        </AuthProvider>
      </BrowserRouter>
    </React.StrictMode>
  )
);

root.render(AppWithProviders); 