import React from 'react';

type LoadingSpinnerProps = {
  size?: 'small' | 'medium' | 'large';
  className?: string;
};

const LoadingSpinner: React.FC<LoadingSpinnerProps> = ({ size = 'medium', className = '' }) => {
  const sizeClasses = {
    small: 'w-4 h-4',
    medium: 'w-8 h-8',
    large: 'w-12 h-12',
  };

  return (
    <div className={`flex justify-center items-center ${className}`}>
      <div className={`animate-spin rounded-full border-t-2 border-b-2 border-lumea-primary ${sizeClasses[size]}`}></div>
    </div>
  );
};

export default LoadingSpinner; 