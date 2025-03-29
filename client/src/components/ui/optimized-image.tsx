import { useState, useEffect, ImgHTMLAttributes } from "react";
import { cn } from "@/lib/utils";
import { LoadingSpinner } from "@/components/loading-spinner";

interface OptimizedImageProps extends ImgHTMLAttributes<HTMLImageElement> {
  /**
   * Source URL of the image
   */
  src: string;
  
  /**
   * Alternative text for accessibility
   */
  alt: string;
  
  /**
   * Width of the image
   */
  width?: number | string;
  
  /**
   * Height of the image
   */
  height?: number | string;
  
  /**
   * Whether to lazy load the image
   */
  lazyLoad?: boolean;
  
  /**
   * Placeholder to show while loading
   */
  placeholder?: string;
  
  /**
   * CSS class names
   */
  className?: string;
  
  /**
   * Whether to blur the image while loading
   */
  blurEffect?: boolean;
  
  /**
   * Function to call when the image is loaded
   */
  onLoad?: () => void;
}

/**
 * Optimized image component with lazy loading, placeholders, and loading states
 */
export function OptimizedImage({
  src,
  alt,
  width,
  height,
  lazyLoad = true,
  placeholder,
  className,
  blurEffect = true,
  onLoad,
  ...props
}: OptimizedImageProps) {
  const [isLoaded, setIsLoaded] = useState(false);
  const [imageSrc, setImageSrc] = useState<string>(placeholder || '');
  const [error, setError] = useState(false);
  
  useEffect(() => {
    if (!lazyLoad) {
      setImageSrc(src);
      return;
    }
    
    // Check if the browser supports IntersectionObserver
    if ('IntersectionObserver' in window) {
      const imgElement = document.createElement('img');
      
      // Set up the observer
      const observer = new IntersectionObserver((entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setImageSrc(src);
            observer.disconnect();
          }
        });
      }, {
        rootMargin: '200px', // Start loading when within 200px of viewport
      });
      
      // Find the image reference and observe it
      const imageRef = document.getElementById(`img-${src.replace(/[^a-zA-Z0-9]/g, '-')}`);
      if (imageRef) {
        observer.observe(imageRef);
      }
      
      return () => {
        if (imageRef) {
          observer.unobserve(imageRef);
        }
        observer.disconnect();
      };
    } else {
      // Fallback for browsers that don't support IntersectionObserver
      setImageSrc(src);
    }
  }, [src, lazyLoad, placeholder]);
  
  const handleImageLoad = () => {
    setIsLoaded(true);
    if (onLoad) onLoad();
  };
  
  const handleImageError = () => {
    setError(true);
    setIsLoaded(true);
  };
  
  // Generate a unique ID for the image based on the source
  const imageId = `img-${src.replace(/[^a-zA-Z0-9]/g, '-')}`;
  
  return (
    <div 
      className={cn(
        "relative overflow-hidden",
        className
      )}
      style={{ width, height }}
      id={imageId}
    >
      {/* Show loading spinner while image is loading */}
      {!isLoaded && (
        <div className="absolute inset-0 flex items-center justify-center bg-gray-100">
          <LoadingSpinner size="sm" />
        </div>
      )}
      
      {/* Show error state if image fails to load */}
      {error && (
        <div className="absolute inset-0 flex items-center justify-center bg-gray-100 text-gray-500">
          <span className="text-sm">Failed to load image</span>
        </div>
      )}
      
      {/* The actual image */}
      {imageSrc && !error && (
        <img
          src={imageSrc}
          alt={alt}
          className={cn(
            "h-full w-full object-cover transition-opacity duration-300",
            isLoaded ? "opacity-100" : "opacity-0",
            blurEffect && !isLoaded ? "blur-sm" : ""
          )}
          width={typeof width === 'number' ? width : undefined}
          height={typeof height === 'number' ? height : undefined}
          onLoad={handleImageLoad}
          onError={handleImageError}
          loading={lazyLoad ? "lazy" : undefined}
          {...props}
        />
      )}
    </div>
  );
}