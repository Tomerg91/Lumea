
import React from 'react';

interface LogoProps {
  size?: 'sm' | 'md' | 'lg';
  withText?: boolean;
}

const Logo: React.FC<LogoProps> = ({ size = 'md', withText = true }) => {
  const sizeClasses = {
    sm: 'h-8 w-8',
    md: 'h-12 w-12',
    lg: 'h-16 w-16',
  };
  
  const textSizes = {
    sm: 'text-lg',
    md: 'text-2xl',
    lg: 'text-3xl',
  };
  
  return (
    <div className="flex items-center gap-3">
      <div className={`rounded-full bg-gradient-to-br from-lumea-sage to-lumea-beige p-1 ${sizeClasses[size]}`}>
        <div className="h-full w-full rounded-full bg-gradient-to-br from-lumea-taupe to-lumea-stone flex items-center justify-center">
          <span className={`font-playfair font-semibold text-white ${size === 'sm' ? 'text-sm' : size === 'md' ? 'text-lg' : 'text-xl'}`}>L</span>
        </div>
      </div>
      
      {withText && (
        <h1 className={`font-playfair font-medium ${textSizes[size]}`}>
          <span>Lumea</span>
        </h1>
      )}
    </div>
  );
};

export default Logo;
