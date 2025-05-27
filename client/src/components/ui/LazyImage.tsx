import React, { useState, useRef, useEffect } from 'react';

interface LazyImageProps {
  src: string;
  alt: string;
  className?: string;
  placeholder?: string;
  loadingClassName?: string;
  errorClassName?: string;
  threshold?: number; // Intersection observer threshold
  onLoad?: () => void;
  onError?: () => void;
  style?: React.CSSProperties;
}

export const LazyImage: React.FC<LazyImageProps> = ({
  src,
  alt,
  className = '',
  placeholder = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTAwIiBoZWlnaHQ9IjEwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMTAwIiBoZWlnaHQ9IjEwMCIgZmlsbD0iI2Y3ZjdmNyIvPjx0ZXh0IHg9IjUwJSIgeT0iNTAlIiBkb21pbmFudC1iYXNlbGluZT0ibWlkZGxlIiB0ZXh0LWFuY2hvcj0ibWlkZGxlIiBmb250LWZhbWlseT0iQXJpYWwiIGZvbnQtc2l6ZT0iMTIiIGZpbGw9IiNhYWEiPkxvYWRpbmcuLi48L3RleHQ+PC9zdmc+',
  loadingClassName = '',
  errorClassName = 'bg-gray-100 flex items-center justify-center text-gray-400',
  threshold = 0.1,
  onLoad,
  onError,
  style
}) => {
  const [imageSrc, setImageSrc] = useState<string>('');
  const [imageRef, setImageRef] = useState<HTMLImageElement | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);
  const [isInView, setIsInView] = useState(false);
  const imgRef = useRef<HTMLImageElement>(null);

  // Intersection Observer to detect when image is in viewport
  useEffect(() => {
    if (!imgRef.current) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsInView(true);
          observer.disconnect();
        }
      },
      {
        threshold,
        rootMargin: '50px' // Start loading 50px before the image enters viewport
      }
    );

    observer.observe(imgRef.current);

    return () => observer.disconnect();
  }, [threshold]);

  // Load image when it comes into view
  useEffect(() => {
    if (!isInView || imageSrc) return;

    const img = new Image();
    img.onload = () => {
      setImageSrc(src);
      setIsLoading(false);
      setHasError(false);
      onLoad?.();
    };

    img.onerror = () => {
      setIsLoading(false);
      setHasError(true);
      onError?.();
    };

    img.src = src;
    setImageRef(img);
  }, [isInView, src, imageSrc, onLoad, onError]);

  const getImageSource = () => {
    if (hasError) return '';
    if (!isInView || isLoading) return placeholder;
    return imageSrc;
  };

  const getClassName = () => {
    let classes = className;
    if (isLoading && !hasError) classes += ` ${loadingClassName}`;
    if (hasError) classes += ` ${errorClassName}`;
    return classes;
  };

  if (hasError) {
    return (
      <div
        ref={imgRef}
        className={getClassName()}
        style={style}
        title={`Failed to load: ${alt}`}
      >
        <span className="text-sm">📷</span>
      </div>
    );
  }

  return (
    <img
      ref={imgRef}
      src={getImageSource()}
      alt={alt}
      className={getClassName()}
      style={style}
      loading="lazy"
    />
  );
};

// Lazy loading component for file attachments
interface LazyAttachmentProps {
  fileId: string;
  fileName: string;
  fileSize?: number;
  mimeType?: string;
  className?: string;
  onLoad?: (url: string) => void;
  onError?: (error: Error) => void;
}

export const LazyAttachment: React.FC<LazyAttachmentProps> = ({
  fileId,
  fileName,
  fileSize,
  mimeType,
  className = '',
  onLoad,
  onError
}) => {
  const [url, setUrl] = useState<string>('');
  const [isLoading, setIsLoading] = useState(false);
  const [hasError, setHasError] = useState(false);
  const [isInView, setIsInView] = useState(false);
  const attachmentRef = useRef<HTMLDivElement>(null);

  // Intersection Observer
  useEffect(() => {
    if (!attachmentRef.current) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsInView(true);
          observer.disconnect();
        }
      },
      {
        threshold: 0.1,
        rootMargin: '100px'
      }
    );

    observer.observe(attachmentRef.current);

    return () => observer.disconnect();
  }, []);

  // Load attachment when in view
  useEffect(() => {
    if (!isInView || url || isLoading) return;

    const loadAttachment = async () => {
      setIsLoading(true);
      try {
        // This would be replaced with actual API call to get file URL
        const response = await fetch(`/api/files/${fileId}`);
        if (!response.ok) throw new Error('Failed to load attachment');
        
        const blob = await response.blob();
        const fileUrl = URL.createObjectURL(blob);
        setUrl(fileUrl);
        onLoad?.(fileUrl);
      } catch (error) {
        setHasError(true);
        onError?.(error instanceof Error ? error : new Error('Unknown error'));
      } finally {
        setIsLoading(false);
      }
    };

    loadAttachment();
  }, [isInView, fileId, url, isLoading, onLoad, onError]);

  // Cleanup URL when component unmounts
  useEffect(() => {
    return () => {
      if (url) {
        URL.revokeObjectURL(url);
      }
    };
  }, [url]);

  const formatFileSize = (bytes?: number): string => {
    if (!bytes) return '';
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    return `${(bytes / Math.pow(1024, i)).toFixed(1)} ${sizes[i]}`;
  };

  const getFileIcon = (mimeType?: string): string => {
    if (!mimeType) return '📄';
    if (mimeType.startsWith('image/')) return '🖼️';
    if (mimeType.startsWith('video/')) return '🎥';
    if (mimeType.startsWith('audio/')) return '🎵';
    if (mimeType.includes('pdf')) return '📕';
    if (mimeType.includes('word')) return '📝';
    if (mimeType.includes('excel') || mimeType.includes('spreadsheet')) return '📊';
    return '📄';
  };

  return (
    <div
      ref={attachmentRef}
      className={`border border-gray-200 rounded-lg p-3 ${className}`}
    >
      <div className="flex items-center space-x-3">
        <div className="flex-shrink-0 text-2xl">
          {getFileIcon(mimeType)}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-gray-900 truncate">
            {fileName}
          </p>
          {fileSize && (
            <p className="text-xs text-gray-500">
              {formatFileSize(fileSize)}
            </p>
          )}
        </div>
        <div className="flex-shrink-0">
          {isLoading && (
            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
          )}
          {hasError && (
            <span className="text-red-500 text-xs">Error</span>
          )}
          {url && !isLoading && !hasError && (
            <a
              href={url}
              download={fileName}
              className="text-blue-600 hover:text-blue-700 text-xs font-medium"
            >
              Download
            </a>
          )}
        </div>
      </div>
    </div>
  );
};

// Hook for lazy loading data
export function useLazyLoad<T>(
  loadFunction: () => Promise<T>,
  dependencies: any[] = []
) {
  const [data, setData] = useState<T | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [isInView, setIsInView] = useState(false);
  const elementRef = useRef<HTMLElement>(null);

  // Intersection Observer
  useEffect(() => {
    if (!elementRef.current) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsInView(true);
          observer.disconnect();
        }
      },
      { threshold: 0.1, rootMargin: '100px' }
    );

    observer.observe(elementRef.current);

    return () => observer.disconnect();
  }, []);

  // Load data when in view
  useEffect(() => {
    if (!isInView || data || isLoading) return;

    const load = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const result = await loadFunction();
        setData(result);
      } catch (err) {
        setError(err instanceof Error ? err : new Error('Unknown error'));
      } finally {
        setIsLoading(false);
      }
    };

    load();
  }, [isInView, loadFunction, data, isLoading, ...dependencies]);

  return {
    data,
    isLoading,
    error,
    elementRef,
    reload: () => {
      setData(null);
      setError(null);
      setIsInView(false);
    }
  };
} 