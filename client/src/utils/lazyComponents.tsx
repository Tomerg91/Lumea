import React, { lazy, Suspense, ComponentType } from 'react';

// Lightweight loading components for heavy dependencies
const SimpleLoader = () => (
  <div className="animate-pulse bg-gray-200 rounded-lg h-48 w-full flex items-center justify-center">
    <div className="text-gray-500">Loading...</div>
  </div>
);

const ChartLoader = () => (
  <div className="animate-pulse bg-gray-100 rounded-lg p-4 h-64 w-full">
    <div className="h-4 bg-gray-200 rounded mb-4 w-1/4"></div>
    <div className="space-y-2">
      <div className="h-3 bg-gray-200 rounded w-full"></div>
      <div className="h-3 bg-gray-200 rounded w-5/6"></div>
      <div className="h-3 bg-gray-200 rounded w-4/6"></div>
      <div className="h-3 bg-gray-200 rounded w-3/6"></div>
    </div>
  </div>
);

// Lazy load heavy animation library components with proper typing
export const LazyFramerMotion = {
  MotionDiv: lazy(() => import('framer-motion').then(module => ({ 
    default: module.motion.div 
  }))),
  AnimatePresence: lazy(() => import('framer-motion').then(module => ({ 
    default: module.AnimatePresence 
  }))),
};

// Lazy load chart components with optimized loading
export const LazyCharts = {
  LineChart: lazy(() => import('recharts').then(module => ({ 
    default: module.LineChart 
  }))),
  BarChart: lazy(() => import('recharts').then(module => ({ 
    default: module.BarChart 
  }))),
  PieChart: lazy(() => import('recharts').then(module => ({ 
    default: module.PieChart 
  }))),
  ResponsiveContainer: lazy(() => import('recharts').then(module => ({ 
    default: module.ResponsiveContainer as any
  }))),
};

// Lazy load drag and drop
export const LazyDragDrop = {
  DragDropContext: lazy(() => import('react-beautiful-dnd').then(module => ({ 
    default: module.DragDropContext 
  }))),
  Droppable: lazy(() => import('react-beautiful-dnd').then(module => ({ 
    default: module.Droppable 
  }))),
  Draggable: lazy(() => import('react-beautiful-dnd').then(module => ({ 
    default: module.Draggable 
  }))),
};

// Optimized wrapper for animation components
export const OptimizedMotion = ({ 
  children, 
  className = '', 
  ...props 
}: {
  children: React.ReactNode;
  className?: string;
  [key: string]: any;
}) => {
  // Check if reduced motion is preferred
  const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  
  if (prefersReducedMotion) {
    // Return simple div for reduced motion
    return <div className={className}>{children}</div>;
  }

  return (
    <Suspense fallback={<div className={className}>{children}</div>}>
      <LazyFramerMotion.MotionDiv className={className} {...props}>
        {children}
      </LazyFramerMotion.MotionDiv>
    </Suspense>
  );
};

// Optimized chart wrapper
export const OptimizedChart = ({ 
  type = 'line',
  data,
  children,
  height = 300,
  className = '',
  ...props
}: {
  type?: 'line' | 'bar' | 'pie';
  data: any[];
  children?: React.ReactNode;
  height?: number;
  className?: string;
  [key: string]: any;
}) => {
  const ChartComponent = type === 'bar' 
    ? LazyCharts.BarChart 
    : type === 'pie' 
    ? LazyCharts.PieChart 
    : LazyCharts.LineChart;

  return (
    <Suspense fallback={<ChartLoader />}>
      <div className={className}>
        <LazyCharts.ResponsiveContainer width="100%" height={height}>
          <ChartComponent data={data} {...props}>
            {children}
          </ChartComponent>
        </LazyCharts.ResponsiveContainer>
      </div>
    </Suspense>
  );
};

// Optimized drag and drop wrapper
export const OptimizedDragDrop = ({ 
  onDragEnd,
  children,
  className = ''
}: {
  onDragEnd: (result: any) => void;
  children: React.ReactNode;
  className?: string;
}) => {
  return (
    <Suspense fallback={<div className={className}>{children}</div>}>
      <LazyDragDrop.DragDropContext onDragEnd={onDragEnd}>
        <div className={className}>
          {children}
        </div>
      </LazyDragDrop.DragDropContext>
    </Suspense>
  );
};

// Higher-order component for lazy loading heavy components
export function withLazyLoading<T extends ComponentType<any>>(
  importFunc: () => Promise<{ default: T }>,
  fallbackComponent?: React.ComponentType
) {
  const LazyComponent = lazy(importFunc);
  
  return (props: React.ComponentProps<T>) => (
    <Suspense fallback={fallbackComponent ? React.createElement(fallbackComponent) : <SimpleLoader />}>
      <LazyComponent {...props} />
    </Suspense>
  );
}

// Preload heavy components when user is likely to need them
export const preloadHeavyComponents = () => {
  // Use requestIdleCallback to preload when browser is idle
  if ('requestIdleCallback' in window) {
    window.requestIdleCallback(() => {
      // Preload framer-motion
      import('framer-motion').catch(() => {});
      
      // Preload charts if user might need analytics
      if (window.location.pathname.includes('analytics') || 
          window.location.pathname.includes('dashboard')) {
        import('recharts').catch(() => {});
      }
      
      // Preload drag and drop for admin/coach interfaces
      if (window.location.pathname.includes('admin') || 
          window.location.pathname.includes('coach')) {
        import('react-beautiful-dnd').catch(() => {});
      }
    });
  }
};

// Initialize preloading based on user role and current page
export const initSmartPreloading = (userRole?: string, currentPath?: string) => {
  if (!userRole || !currentPath) return;
  
  // Smart preloading based on user behavior patterns
  const preloadPromises: Promise<any>[] = [];
  
  if (userRole === 'coach' || userRole === 'admin') {
    // Coaches likely to use analytics and drag/drop
    preloadPromises.push(
      import('recharts').catch(() => {}),
      import('react-beautiful-dnd').catch(() => {})
    );
  }
  
  if (currentPath.includes('dashboard')) {
    // Dashboard users likely to see animations
    preloadPromises.push(
      import('framer-motion').catch(() => {})
    );
  }
  
  // Execute all preloads
  Promise.all(preloadPromises);
}; 