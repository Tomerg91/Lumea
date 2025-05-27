import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import './index.css';
import App from './App';
import './i18n';
import { initPerformanceMonitoring } from './utils/performanceMonitoring';
import mobileOptimizations from './utils/mobileOptimizations';
import { AuthProvider } from './contexts/AuthContext';

// Initialize performance monitoring only in production or when explicitly enabled
if (import.meta.env.PROD || import.meta.env.VITE_ENABLE_PERFORMANCE_MONITORING === 'true') {
  initPerformanceMonitoring();
}

// Apply mobile-specific optimizations
mobileOptimizations.applyOptimizedStyles();

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <BrowserRouter>
      <AuthProvider>
        <App />
      </AuthProvider>
    </BrowserRouter>
  </React.StrictMode>
);
