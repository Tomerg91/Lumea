import React from 'react';
import { Plus } from 'lucide-react';
import { cn } from '../../lib/utils';
import { useMobileDetection } from '../../hooks/useMobileDetection';

interface MobileFloatingActionButtonProps {
  onClick: () => void;
  icon?: React.ReactNode;
  label?: string;
  className?: string;
  disabled?: boolean;
}

const MobileFloatingActionButton: React.FC<MobileFloatingActionButtonProps> = ({
  onClick,
  icon = <Plus className="w-6 h-6" />,
  label = '',
  className = '',
  disabled = false,
}) => {
  const { isMobile } = useMobileDetection();

  if (!isMobile) {
    return null;
  }

  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={cn(
        'fixed bottom-6 right-6 z-50',
        'w-14 h-14 rounded-2xl',
        'bg-gradient-purple text-white',
        'shadow-lumea-strong hover:shadow-lumea-glow',
        'flex items-center justify-center',
        'transition-all duration-300 ease-out',
        'hover:scale-105 active:scale-95',
        'disabled:opacity-50 disabled:cursor-not-allowed',
        'touch-manipulation',
        className
      )}
      aria-label={label}
    >
      {icon}
    </button>
  );
};

export default MobileFloatingActionButton; 