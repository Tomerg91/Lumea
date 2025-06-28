import React, { useState, useRef, useEffect } from 'react';
import { Plus, X, Calendar, Users, MessageSquare, BarChart3 } from 'lucide-react';
import { cn } from '../../lib/utils';
import { useMobileDetection } from '../../hooks/useMobileDetection';
import { useLanguage } from '../../contexts/LanguageContext';

interface QuickAction {
  id: string;
  label: string;
  icon: React.ReactNode;
  action: () => void;
  color: string;
  disabled?: boolean;
}

interface MobileFloatingActionButtonProps {
  onClick: () => void;
  icon?: React.ReactNode;
  label?: string;
  className?: string;
  disabled?: boolean;
  // Enhanced props for multi-action support
  quickActions?: QuickAction[];
  expandOnLongPress?: boolean;
  showLabels?: boolean;
}

const MobileFloatingActionButton: React.FC<MobileFloatingActionButtonProps> = ({
  onClick,
  icon = <Plus className="w-6 h-6" />,
  label = '',
  className = '',
  disabled = false,
  quickActions = [],
  expandOnLongPress = false,
  showLabels = false,
}) => {
  const { isMobile, isTouchDevice } = useMobileDetection();
  const { isRTL } = useLanguage();
  const [isExpanded, setIsExpanded] = useState(false);
  const [isPressed, setIsPressed] = useState(false);
  const longPressTimer = useRef<NodeJS.Timeout>();
  const expandTimer = useRef<NodeJS.Timeout>();

  // Auto-collapse after delay
  useEffect(() => {
    if (isExpanded) {
      expandTimer.current = setTimeout(() => {
        setIsExpanded(false);
      }, 5000);
    }
    return () => {
      if (expandTimer.current) {
        clearTimeout(expandTimer.current);
      }
    };
  }, [isExpanded]);

  if (!isMobile) {
    return null;
  }

  const handleTouchStart = () => {
    if (disabled) return;
    
    setIsPressed(true);
    
    if (expandOnLongPress && quickActions.length > 0) {
      longPressTimer.current = setTimeout(() => {
        setIsExpanded(true);
        if ('vibrate' in navigator) {
          navigator.vibrate(50);
        }
      }, 500);
    }
  };

  const handleTouchEnd = () => {
    setIsPressed(false);
    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current);
    }
  };

  const handleClick = () => {
    if (disabled) return;
    
    if (quickActions.length > 0 && !expandOnLongPress) {
      setIsExpanded(!isExpanded);
    } else {
      onClick();
    }
  };

  const handleActionClick = (action: QuickAction) => {
    if (action.disabled) return;
    
    action.action();
    setIsExpanded(false);
    
    // Haptic feedback
    if ('vibrate' in navigator) {
      navigator.vibrate(20);
    }
  };

  return (
    <div className={cn(
      'fixed bottom-6 z-50 flex flex-col items-end gap-3',
      isRTL ? 'left-6' : 'right-6'
    )}>
      {/* Quick Actions */}
      {quickActions.length > 0 && isExpanded && (
        <div className="flex flex-col gap-3 animate-in slide-in-from-bottom-2 duration-300">
          {quickActions.map((action, index) => (
            <div
              key={action.id}
              className="flex items-center gap-3"
              style={{
                animationDelay: `${index * 50}ms`,
              }}
            >
              {/* Action Label */}
              {showLabels && (
                <div className={cn(
                  'bg-black/80 text-white px-3 py-2 rounded-lg text-sm font-medium backdrop-blur-sm',
                  'animate-in fade-in-50 slide-in-from-right-2 duration-200',
                  isRTL && 'slide-in-from-left-2'
                )}
                style={{
                  animationDelay: `${index * 50 + 100}ms`,
                }}
                >
                  {action.label}
                </div>
              )}
              
              {/* Action Button */}
              <button
                onClick={() => handleActionClick(action)}
                disabled={action.disabled}
                className={cn(
                  'w-12 h-12 rounded-2xl text-white shadow-lg',
                  'flex items-center justify-center',
                  'transition-all duration-200',
                  'hover:scale-110 active:scale-95',
                  'disabled:opacity-50 disabled:cursor-not-allowed',
                  'animate-in zoom-in-50 duration-200',
                  action.color
                )}
                style={{
                  animationDelay: `${index * 50}ms`,
                }}
                aria-label={action.label}
              >
                {action.icon}
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Main FAB */}
      <button
        onClick={handleClick}
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
        onTouchCancel={handleTouchEnd}
        disabled={disabled}
        className={cn(
          'w-16 h-16 rounded-2xl',
          'bg-gradient-to-r from-purple-600 to-blue-600',
          'text-white shadow-xl',
          'flex items-center justify-center',
          'transition-all duration-300 ease-out',
          'hover:shadow-2xl',
          'disabled:opacity-50 disabled:cursor-not-allowed',
          'touch-manipulation',
          // Press animation
          isPressed && isTouchDevice ? 'scale-95' : 'scale-100',
          // Expansion animation
          isExpanded ? 'rotate-45' : 'rotate-0',
          className
        )}
        aria-label={label}
        aria-expanded={isExpanded}
      >
        {isExpanded && quickActions.length > 0 ? (
          <X className="w-6 h-6 transition-transform duration-200" />
        ) : (
          <div className="transition-transform duration-200">
            {icon}
          </div>
        )}
      </button>

      {/* Backdrop for closing expanded state */}
      {isExpanded && (
        <div
          className="fixed inset-0 bg-black/20 backdrop-blur-sm -z-10"
          onClick={() => setIsExpanded(false)}
          style={{ bottom: 0, top: 0, left: 0, right: 0 }}
        />
      )}
    </div>
  );
};

// Enhanced FAB with common quick actions for sessions
export const SessionsFAB: React.FC<{
  onCreateSession: () => void;
  onViewCalendar?: () => void;
  onViewClients?: () => void;
  onViewAnalytics?: () => void;
  userRole?: string;
}> = ({
  onCreateSession,
  onViewCalendar,
  onViewClients,
  onViewAnalytics,
  userRole
}) => {
  const quickActions: QuickAction[] = [
    {
      id: 'create-session',
      label: 'New Session',
      icon: <Plus className="w-5 h-5" />,
      action: onCreateSession,
      color: 'bg-green-500',
    },
    ...(onViewCalendar ? [{
      id: 'calendar',
      label: 'Calendar',
      icon: <Calendar className="w-5 h-5" />,
      action: onViewCalendar,
      color: 'bg-blue-500',
    }] : []),
    ...(onViewClients && userRole === 'coach' ? [{
      id: 'clients',
      label: 'Clients',
      icon: <Users className="w-5 h-5" />,
      action: onViewClients,
      color: 'bg-purple-500',
    }] : []),
    ...(onViewAnalytics && userRole === 'coach' ? [{
      id: 'analytics',
      label: 'Analytics',
      icon: <BarChart3 className="w-5 h-5" />,
      action: onViewAnalytics,
      color: 'bg-orange-500',
    }] : []),
  ];

  return (
    <MobileFloatingActionButton
      onClick={onCreateSession}
      icon={<Plus className="w-6 h-6" />}
      label="Session Actions"
      quickActions={quickActions}
      expandOnLongPress={true}
      showLabels={true}
    />
  );
};

export default MobileFloatingActionButton; 