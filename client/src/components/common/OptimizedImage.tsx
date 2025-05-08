import React, { useState, useEffect } from 'react';

interface OptimizedImageProps {
  src: string;
  alt: string;
  className?: string;
  width?: number;
  height?: number;
  sizes?: string;
  loading?: 'lazy' | 'eager' | undefined;
  fallbackSrc?: string;
  onLoad?: () => void;
  onError?: () => void;
}

/**
 * Generates a responsive srcset from an image URL
 * Assumes a server that can handle width parameters like ?w=300
 */
const generateSrcSet = (src: string): string => {
  // Skip srcset generation for external URLs or SVGs
  if (src.startsWith('http') || src.startsWith('data:') || src.endsWith('.svg')) {
    return src;
  }

  // Generate srcset with multiple widths
  const widths = [300, 600, 900, 1200, 1600, 2000];
  const baseUrl = src.split('?')[0]; // Remove any existing query params

  return widths.map((width) => `${baseUrl}?w=${width} ${width}w`).join(', ');
};

/**
 * Optimized image component with:
 * - Lazy loading
 * - Responsive srcset
 * - Image fallback handling
 * - Loading animation
 */
const OptimizedImage: React.FC<OptimizedImageProps> = ({
  src,
  alt,
  className = '',
  width,
  height,
  sizes = '100vw',
  loading = 'lazy',
  fallbackSrc = '/images/placeholder.jpg',
  onLoad,
  onError,
}) => {
  const [isLoading, setIsLoading] = useState(true);
  const [imgSrc, setImgSrc] = useState(src);
  const [srcSet, setSrcSet] = useState<string | undefined>(undefined);

  useEffect(() => {
    // Reset loading state when src changes
    setIsLoading(true);
    setImgSrc(src);

    // Generate srcset if appropriate
    if (!src.includes('base64') && !src.endsWith('.svg')) {
      setSrcSet(generateSrcSet(src));
    } else {
      setSrcSet(undefined);
    }
  }, [src]);

  const handleLoad = () => {
    setIsLoading(false);
    onLoad?.();
  };

  const handleError = () => {
    if (imgSrc !== fallbackSrc) {
      setImgSrc(fallbackSrc);
    }
    setIsLoading(false);
    onError?.();
  };

  return (
    <div className={`relative ${className}`} style={{ width, height }}>
      {isLoading && (
        <div className="absolute inset-0 flex items-center justify-center bg-gray-100 dark:bg-gray-800 animate-pulse rounded">
          <span className="sr-only">Loading image...</span>
        </div>
      )}
      <img
        src={imgSrc}
        srcSet={srcSet}
        sizes={sizes}
        alt={alt}
        loading={loading as 'lazy' | 'eager'}
        onLoad={handleLoad}
        onError={handleError}
        className={`w-full h-full object-cover transition-opacity duration-300 ${isLoading ? 'opacity-0' : 'opacity-100'}`}
        width={width}
        height={height}
      />
    </div>
  );
};

export default OptimizedImage;
