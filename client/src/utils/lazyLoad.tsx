import React, { Suspense, lazy, ComponentType } from 'react';

/**
 * Loading component to display while lazy-loaded components are loading
 */
const LoadingFallback = () => (
  <div className="flex items-center justify-center min-h-[200px] p-8">
    <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-primary"></div>
  </div>
);

/**
 * Function to lazy load components with a custom loading component
 * @param importFunc - Dynamic import function
 * @param loadingComponent - Optional custom loading component
 * @returns Lazy-loaded component wrapped in Suspense
 */
export function lazyLoad<T extends ComponentType<any>>(
  importFunc: () => Promise<{ default: T }>,
  loadingComponent: React.ReactNode = <LoadingFallback />
) {
  const LazyComponent = lazy(importFunc);
  
  return (props: React.ComponentProps<T>) => (
    <Suspense fallback={loadingComponent}>
      <LazyComponent {...props} />
    </Suspense>
  );
}

/**
 * Error fallback component
 */
const ErrorFallback = () => (
  <div className="text-red-500 p-4 border border-red-300 rounded-md bg-red-50 dark:bg-red-900/10">
    <h3 className="font-semibold">Something went wrong</h3>
    <p>There was an error loading this component. Please try refreshing the page.</p>
  </div>
);

// Define interface for ErrorBoundary props and state
interface ErrorBoundaryProps {
  children: React.ReactNode;
  fallback: React.ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
}

/**
 * Simple error boundary component
 */
class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(): ErrorBoundaryState {
    return { hasError: true };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('Error in component:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return this.props.fallback;
    }

    return this.props.children;
  }
}

/**
 * HOC (Higher Order Component) for lazy loading with error boundary
 * @param importFunc - Dynamic import function
 * @returns Lazy-loaded component with error handling
 */
export function withLazyLoading<T extends ComponentType<any>>(
  importFunc: () => Promise<{ default: T }>
) {
  const LazyLoadedComponent = lazyLoad(importFunc);
  
  return (props: React.ComponentProps<T>) => {
    return (
      <ErrorBoundary fallback={<ErrorFallback />}>
        <LazyLoadedComponent {...props} />
      </ErrorBoundary>
    );
  };
}

export default lazyLoad; 