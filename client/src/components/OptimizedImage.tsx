import React, { useState, useEffect, useRef, useCallback } from 'react';
import { usePerformanceMonitoring } from '../hooks/usePerformanceMonitoring';
import { cn } from '../lib/utils';

interface OptimizedImageProps {
  src: string;
  alt: string;
  width?: number;
  height?: number;
  className?: string;
  placeholderClassName?: string;
  quality?: 'auto' | 'low' | 'medium' | 'high';
  priority?: boolean;
  lazy?: boolean;
  onLoad?: () => void;
  onError?: () => void;
}

const OptimizedImage: React.FC<OptimizedImageProps> = ({
  src,
  alt,
  width,
  height,
  className,
  placeholderClassName,
  quality = 'auto',
  priority = false,
  lazy = true,
  onLoad,
  onError,
}) => {
  const [isLoaded, setIsLoaded] = useState(false);
  const [hasError, setHasError] = useState(false);
  const [currentSrc, setCurrentSrc] = useState<string>('');
  const imgRef = useRef<HTMLImageElement>(null);
  const { metrics, isSlowDevice } = usePerformanceMonitoring();

  // Determine optimal image quality based on connection and device
  const getOptimalQuality = useCallback(() => {
    if (quality !== 'auto') return quality;

    if (metrics.isSlowConnection || isSlowDevice) {
      return 'low';
    } else if (metrics.connectionType === '4g') {
      return 'high';
    } else {
      return 'medium';
    }
  }, [quality, metrics.isSlowConnection, metrics.connectionType, isSlowDevice]);

  // Generate optimized image URL
  const getOptimizedImageUrl = useCallback((originalSrc: string, targetQuality: string) => {
    // If it's already an optimized URL or a data URL, return as-is
    if (originalSrc.includes('q_') || originalSrc.startsWith('data:')) {
      return originalSrc;
    }

    // For demo purposes, we'll add quality parameters
    // In a real app, this would integrate with your image optimization service
    const qualityMap = {
      low: 30,
      medium: 60,
      high: 85,
    };

    const qualityValue = qualityMap[targetQuality as keyof typeof qualityMap] || 60;
    
    // Simulate image optimization service URL
    const params = new URLSearchParams();
    params.set('q', qualityValue.toString());
    
    if (width) params.set('w', width.toString());
    if (height) params.set('h', height.toString());
    
    // Add format optimization for modern browsers
    const canvas = document.createElement('canvas');
    const supportsWebP = canvas.toDataURL('image/webp').indexOf('data:image/webp') === 0;
    if (supportsWebP) {
      params.set('f', 'webp');
    }

    // For development, just return the original src with a hash to indicate optimization
    return `${originalSrc}${originalSrc.includes('?') ? '&' : '?'}${params.toString()}`;
  }, [width, height]);

  // Update image source when quality or connection changes
  useEffect(() => {
    const optimalQuality = getOptimalQuality();
    const optimizedSrc = getOptimizedImageUrl(src, optimalQuality);
    setCurrentSrc(optimizedSrc);
  }, [src, getOptimalQuality, getOptimizedImageUrl]);

  // Intersection Observer for lazy loading
  useEffect(() => {
    if (!lazy || priority || !imgRef.current) return;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            const img = entry.target as HTMLImageElement;
            if (currentSrc && !img.src) {
              img.src = currentSrc;
            }
            observer.unobserve(img);
          }
        });
      },
      {
        rootMargin: '50px', // Start loading 50px before entering viewport
        threshold: 0.1,
      }
    );

    observer.observe(imgRef.current);

    return () => {
      observer.disconnect();
    };
  }, [lazy, priority, currentSrc]);

  // Preload high priority images
  useEffect(() => {
    if (priority && currentSrc) {
      const link = document.createElement('link');
      link.rel = 'preload';
      link.as = 'image';
      link.href = currentSrc;
      document.head.appendChild(link);

      return () => {
        document.head.removeChild(link);
      };
    }
  }, [priority, currentSrc]);

  const handleLoad = useCallback(() => {
    setIsLoaded(true);
    onLoad?.();
  }, [onLoad]);

  const handleError = useCallback(() => {
    setHasError(true);
    onError?.();
  }, [onError]);

  // Progressive loading placeholder
  const renderPlaceholder = () => (
    <div
      className={cn(
        'bg-gray-200 animate-pulse flex items-center justify-center',
        placeholderClassName,
        className
      )}
      style={{ width, height }}
    >
      <svg
        className="w-8 h-8 text-gray-400"
        fill="currentColor"
        viewBox="0 0 20 20"
      >
        <path
          fillRule="evenodd"
          d="M4 3a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V5a2 2 0 00-2-2H4zm12 12H4l4-8 3 6 2-4 3 6z"
          clipRule="evenodd"
        />
      </svg>
    </div>
  );

  // Error state
  if (hasError) {
    return (
      <div
        className={cn(
          'bg-red-50 border border-red-200 text-red-600 flex items-center justify-center',
          className
        )}
        style={{ width, height }}
      >
        <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 20 20">
          <path
            fillRule="evenodd"
            d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z"
            clipRule="evenodd"
          />
        </svg>
      </div>
    );
  }

  return (
    <div className="relative">
      {/* Placeholder shown while loading */}
      {!isLoaded && renderPlaceholder()}
      
      {/* Actual image */}
      <img
        ref={imgRef}
        src={priority ? currentSrc : undefined} // For lazy loading, src is set by intersection observer
        alt={alt}
        width={width}
        height={height}
        className={cn(
          'transition-opacity duration-300',
          isLoaded ? 'opacity-100' : 'opacity-0',
          !isLoaded && 'absolute inset-0',
          className
        )}
        onLoad={handleLoad}
        onError={handleError}
        loading={priority ? 'eager' : 'lazy'}
        decoding="async"
      />
    </div>
  );
};

// Avatar component with optimized loading
export const OptimizedAvatar: React.FC<{
  src?: string;
  name: string;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}> = ({ src, name, size = 'md', className }) => {
  const sizeClasses = {
    sm: 'w-8 h-8 text-xs',
    md: 'w-12 h-12 text-sm',
    lg: 'w-16 h-16 text-base',
  };

  const initials = name
    .split(' ')
    .map(n => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);

  if (!src) {
    return (
      <div
        className={cn(
          'bg-purple-100 text-purple-600 rounded-full flex items-center justify-center font-medium',
          sizeClasses[size],
          className
        )}
      >
        {initials}
      </div>
    );
  }

  return (
    <OptimizedImage
      src={src}
      alt={`${name} avatar`}
      width={size === 'sm' ? 32 : size === 'md' ? 48 : 64}
      height={size === 'sm' ? 32 : size === 'md' ? 48 : 64}
      className={cn('rounded-full object-cover', sizeClasses[size], className)}
      placeholderClassName="rounded-full"
      quality="medium"
      priority={false}
    />
  );
};

// Background image component with progressive enhancement
export const OptimizedBackgroundImage: React.FC<{
  src: string;
  children: React.ReactNode;
  className?: string;
  overlay?: boolean;
}> = ({ src, children, className, overlay = false }) => {
  const [isLoaded, setIsLoaded] = useState(false);
  const { metrics } = usePerformanceMonitoring();

  // Skip background image on slow connections
  if (metrics.isSlowConnection) {
    return (
      <div className={cn('bg-gradient-to-br from-purple-100 to-blue-100', className)}>
        {overlay && <div className="absolute inset-0 bg-black/20" />}
        {children}
      </div>
    );
  }

  return (
    <div className={cn('relative', className)}>
      {/* Background image */}
      <OptimizedImage
        src={src}
        alt="Background"
        className="absolute inset-0 w-full h-full object-cover"
        quality="low"
        priority={false}
        onLoad={() => setIsLoaded(true)}
      />
      
      {/* Fallback gradient while loading */}
      {!isLoaded && (
        <div className="absolute inset-0 bg-gradient-to-br from-purple-100 to-blue-100" />
      )}
      
      {/* Overlay */}
      {overlay && <div className="absolute inset-0 bg-black/20" />}
      
      {/* Content */}
      <div className="relative z-10">
        {children}
      </div>
    </div>
  );
};

export default OptimizedImage; 