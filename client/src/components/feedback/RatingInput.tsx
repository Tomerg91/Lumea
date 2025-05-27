import React, { useState } from 'react';
import { Star } from 'lucide-react';
import { cn } from '../../lib/utils';
import { RatingInputProps } from '../../types/feedback';

export const RatingInput: React.FC<RatingInputProps> = ({
  label,
  value,
  onChange,
  min = 1,
  max = 5,
  required = false,
  disabled = false,
  error,
  description,
  showLabels = true,
  size = 'md',
}) => {
  const [hoverValue, setHoverValue] = useState<number | null>(null);

  const sizeClasses = {
    sm: 'w-4 h-4',
    md: 'w-6 h-6',
    lg: 'w-8 h-8',
  };

  const handleStarClick = (rating: number) => {
    if (!disabled) {
      onChange(rating);
    }
  };

  const handleStarHover = (rating: number) => {
    if (!disabled) {
      setHoverValue(rating);
    }
  };

  const handleMouseLeave = () => {
    setHoverValue(null);
  };

  const getStarFill = (starIndex: number) => {
    const currentValue = hoverValue !== null ? hoverValue : value;
    return starIndex <= currentValue;
  };

  const getLabelText = (rating: number) => {
    if (!showLabels) return '';
    
    const labels = {
      1: 'Poor',
      2: 'Fair',
      3: 'Good',
      4: 'Very Good',
      5: 'Excellent',
    };
    
    return labels[rating as keyof typeof labels] || '';
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        <label className={cn(
          "text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70",
          error && "text-destructive"
        )}>
          {label}
          {required && <span className="text-destructive ml-1">*</span>}
        </label>
      </div>
      
      {description && (
        <p className="text-sm text-muted-foreground">
          {description}
        </p>
      )}
      
      <div className="flex items-center gap-1">
        <div 
          className="flex items-center gap-1"
          onMouseLeave={handleMouseLeave}
          role="radiogroup"
          aria-label={label}
          aria-required={required}
          aria-invalid={!!error}
        >
          {Array.from({ length: max - min + 1 }, (_, index) => {
            const rating = min + index;
            const isFilled = getStarFill(rating);
            
            return (
              <button
                key={rating}
                type="button"
                className={cn(
                  "transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 rounded",
                  disabled ? "cursor-not-allowed opacity-50" : "cursor-pointer hover:scale-110"
                )}
                onClick={() => handleStarClick(rating)}
                onMouseEnter={() => handleStarHover(rating)}
                disabled={disabled}
                role="radio"
                aria-checked={value === rating}
                aria-label={`${rating} star${rating !== 1 ? 's' : ''} - ${getLabelText(rating)}`}
              >
                <Star
                  className={cn(
                    sizeClasses[size],
                    "transition-colors duration-200",
                    isFilled
                      ? "fill-yellow-400 text-yellow-400"
                      : "fill-none text-gray-300 hover:text-yellow-300"
                  )}
                />
              </button>
            );
          })}
        </div>
        
        {showLabels && (hoverValue !== null || value > 0) && (
          <span className="text-sm text-muted-foreground ml-2 min-w-[80px]">
            {getLabelText(hoverValue !== null ? hoverValue : value)}
          </span>
        )}
      </div>
      
      {error && (
        <p className="text-sm font-medium text-destructive">
          {error}
        </p>
      )}
    </div>
  );
}; 