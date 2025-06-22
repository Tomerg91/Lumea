import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import './index.css';
import App from './App';
import './i18n';
import { AuthProvider } from './contexts/AuthContext';
import { LanguageProvider } from './contexts/LanguageContext';

// Create a client with optimized settings for Supabase
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // Reduce refetch frequency for better performance
      staleTime: 5 * 60 * 1000, // 5 minutes
      gcTime: 10 * 60 * 1000, // 10 minutes (formerly cacheTime)
      // Retry less aggressively for better user experience
      retry: 1,
      refetchOnWindowFocus: false,
      // Enable error boundaries for better error handling
      throwOnError: false,
    },
    mutations: {
      // Retry mutations once on failure
      retry: 1,
    },
  },
});

// Optimize performance monitoring - only load when needed
const initOptimizedPerformanceMonitoring = async () => {
  // Only load performance monitoring in production or when explicitly enabled
  if (import.meta.env.PROD || import.meta.env.VITE_ENABLE_PERFORMANCE_MONITORING === 'true') {
    const { initPerformanceMonitoring } = await import('./utils/performanceMonitoring');
    initPerformanceMonitoring();
  }
};

// Optimize mobile optimizations - load asynchronously
const applyMobileOptimizations = async () => {
  // Check if mobile optimizations are needed
  if (window.navigator.userAgent.includes('Mobile') || window.innerWidth < 768) {
    const mobileOptimizations = await import('./utils/mobileOptimizations');
    mobileOptimizations.default.applyOptimizedStyles();
  }
};

// Preload critical resources for better performance
const preloadCriticalResources = () => {
  // Preload critical routes that are likely to be visited
  const criticalRoutes = [
    () => import('./pages/Auth'),
    () => import('./pages/Dashboard'),
  ];

  // Use requestIdleCallback for non-blocking preloading
  if ('requestIdleCallback' in window) {
    window.requestIdleCallback(() => {
      criticalRoutes.forEach(route => {
        route().catch(() => {
          // Silently fail - this is just optimization
        });
      });
    });
  }
};

// Optimize root creation and rendering
const root = ReactDOM.createRoot(document.getElementById('root')!);

// Remove initial loading screen when React app is ready
const removeInitialLoader = () => {
  const initialLoading = document.getElementById('initial-loading');
  if (initialLoading) {
    initialLoading.style.opacity = '0';
    initialLoading.style.transition = 'opacity 0.3s ease';
    setTimeout(() => {
      initialLoading.remove();
    }, 300);
  }
};

// Initialize app with optimizations
const initApp = async () => {
  // Start async optimizations
  const optimizationPromises = [
    initOptimizedPerformanceMonitoring(),
    applyMobileOptimizations(),
  ];

  // Render app immediately - don't wait for optimizations
  root.render(
    <React.StrictMode>
      <QueryClientProvider client={queryClient}>
        <BrowserRouter>
          <LanguageProvider>
            <AuthProvider>
              <App />
            </AuthProvider>
          </LanguageProvider>
        </BrowserRouter>
      </QueryClientProvider>
    </React.StrictMode>
  );

  // Remove initial loader after first paint
  setTimeout(removeInitialLoader, 100);

  // Preload critical resources
  preloadCriticalResources();

  // Wait for optimizations to complete in background
  try {
    await Promise.all(optimizationPromises);
  } catch (error) {
    // Silently handle optimization errors
    console.debug('Performance optimizations failed:', error);
  }
};

// Start the app
initApp();
