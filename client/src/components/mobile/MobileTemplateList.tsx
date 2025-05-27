import React, { useState, useCallback, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { SessionTemplate, TemplateType } from '../../types/sessionTemplate';
import { cn } from '../../lib/utils';
import {
  Plus,
  Search,
  MoreVertical,
  Edit,
  Copy,
  Trash2,
  Clock,
  Users,
  Tag,
  Repeat,
  FileText,
  Settings,
  RefreshCw,
  X
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

interface MobileTemplateListProps {
  templates: SessionTemplate[];
  loading: boolean;
  error?: string | null;
  onCreateTemplate: () => void;
  onEditTemplate: (template: SessionTemplate) => void;
  onCloneTemplate: (template: SessionTemplate) => void;
  onDeleteTemplate: (template: SessionTemplate) => void;
  onCreateSessionFromTemplate?: (template: SessionTemplate) => void;
  onRefresh: () => void;
  searchQuery: string;
  onSearchChange: (query: string) => void;
  onSearch: () => void;
}

// Template type configuration for mobile display
const typeConfig = {
  standard: {
    icon: <FileText className="w-4 h-4" />,
    color: 'bg-gray-100 text-gray-800',
    label: 'Standard',
  },
  recurring: {
    icon: <Repeat className="w-4 h-4" />,
    color: 'bg-blue-100 text-blue-800',
    label: 'Recurring',
  },
  assessment: {
    icon: <Settings className="w-4 h-4" />,
    color: 'bg-purple-100 text-purple-800',
    label: 'Assessment',
  },
  'follow-up': {
    icon: <Users className="w-4 h-4" />,
    color: 'bg-green-100 text-green-800',
    label: 'Follow-up',
  },
  custom: {
    icon: <FileText className="w-4 h-4" />,
    color: 'bg-orange-100 text-orange-800',
    label: 'Custom',
  },
};

// Swipe gesture hook for template actions
const useSwipeGesture = (
  onSwipeLeft?: () => void,
  onSwipeRight?: () => void,
  threshold = 50
) => {
  const startX = useRef<number>(0);
  const startY = useRef<number>(0);
  const isDragging = useRef<boolean>(false);

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    startX.current = e.touches[0].clientX;
    startY.current = e.touches[0].clientY;
    isDragging.current = true;
  }, []);

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    if (!isDragging.current) return;
    
    const deltaX = Math.abs(e.touches[0].clientX - startX.current);
    const deltaY = Math.abs(e.touches[0].clientY - startY.current);
    
    if (deltaX > deltaY && deltaX > 10) {
      e.preventDefault();
    }
  }, []);

  const handleTouchEnd = useCallback((e: React.TouchEvent) => {
    if (!isDragging.current) return;
    
    const endX = e.changedTouches[0].clientX;
    const endY = e.changedTouches[0].clientY;
    const deltaX = endX - startX.current;
    const deltaY = endY - startY.current;
    
    if (Math.abs(deltaX) > Math.abs(deltaY) && Math.abs(deltaX) > threshold) {
      if (deltaX > 0) {
        onSwipeRight?.();
      } else {
        onSwipeLeft?.();
      }
    }
    
    isDragging.current = false;
  }, [onSwipeLeft, onSwipeRight, threshold]);

  return {
    onTouchStart: handleTouchStart,
    onTouchMove: handleTouchMove,
    onTouchEnd: handleTouchEnd,
  };
};

// Mobile Template Type Badge
const MobileTypeBadge: React.FC<{ type: TemplateType }> = ({ type }) => {
  const config = typeConfig[type];
  
  return (
    <div className={cn(
      'inline-flex items-center px-2 py-1 rounded-full text-xs font-medium gap-1',
      config.color
    )}>
      {config.icon}
      {config.label}
    </div>
  );
};

// Mobile Template Card
const MobileTemplateCard: React.FC<{
  template: SessionTemplate;
  onEdit: () => void;
  onClone: () => void;
  onDelete: () => void;
  onCreateSession?: () => void;
}> = ({ template, onEdit, onClone, onDelete, onCreateSession }) => {
  const { t } = useTranslation();
  const [showActions, setShowActions] = useState(false);
  
  const swipeGesture = useSwipeGesture(
    () => setShowActions(true), // Swipe left to show actions
    () => setShowActions(false) // Swipe right to hide actions
  );

  const quickActions = [
    {
      label: t('templates.createSession'),
      icon: <Plus className="w-4 h-4" />,
      action: onCreateSession,
      color: 'bg-lumea-primary text-white',
      primary: true,
    },
    {
      label: t('common.edit'),
      icon: <Edit className="w-4 h-4" />,
      action: onEdit,
      color: 'bg-blue-500 text-white',
    },
    {
      label: t('templates.clone'),
      icon: <Copy className="w-4 h-4" />,
      action: onClone,
      color: 'bg-green-500 text-white',
    },
    {
      label: t('common.delete'),
      icon: <Trash2 className="w-4 h-4" />,
      action: onDelete,
      color: 'bg-red-500 text-white',
    },
  ];

  return (
    <div className="relative">
      <div
        className={cn(
          'bg-white border rounded-lg p-4 transition-transform duration-200 active:scale-95',
          showActions && 'transform translate-x-[-80px]'
        )}
        {...swipeGesture}
      >
        {/* Template Header */}
        <div className="flex items-start justify-between mb-3">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <MobileTypeBadge type={template.type} />
              {template.isRecurring && (
                <div className="inline-flex items-center px-2 py-1 rounded-full text-xs bg-blue-50 text-blue-600">
                  <Repeat className="w-3 h-3 mr-1" />
                  {t('templates.recurring')}
                </div>
              )}
            </div>
            <h3 className="font-medium text-gray-900 truncate text-sm">
              {template.name}
            </h3>
            {template.description && (
              <p className="text-xs text-gray-600 mt-1 line-clamp-2">
                {template.description}
              </p>
            )}
          </div>
          
          <button
            onClick={() => setShowActions(!showActions)}
            className="p-2 hover:bg-gray-100 rounded-lg ml-2"
          >
            <MoreVertical className="w-4 h-4 text-gray-500" />
          </button>
        </div>

        {/* Template Stats */}
        <div className="flex items-center justify-between text-xs text-gray-600 mb-3">
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1">
              <Clock className="w-3 h-3" />
              {template.defaultDuration}m
            </div>
            <div className="flex items-center gap-1">
              <Users className="w-3 h-3" />
              {template.usageCount}
            </div>
          </div>
          {template.lastUsed && (
            <span>
              {formatDistanceToNow(new Date(template.lastUsed), { addSuffix: true })}
            </span>
          )}
        </div>

        {/* Tags */}
        {template.tags.length > 0 && (
          <div className="flex flex-wrap gap-1 mb-3">
            {template.tags.slice(0, 2).map((tag, index) => (
              <span
                key={index}
                className="inline-flex items-center px-2 py-1 rounded-full text-xs bg-gray-100 text-gray-600"
              >
                {tag}
              </span>
            ))}
            {template.tags.length > 2 && (
              <span className="inline-flex items-center px-2 py-1 rounded-full text-xs bg-gray-100 text-gray-600">
                +{template.tags.length - 2}
              </span>
            )}
          </div>
        )}

        {/* Category */}
        {template.category && (
          <div className="flex items-center gap-1 text-xs text-gray-500">
            <Tag className="w-3 h-3" />
            {template.category}
          </div>
        )}

        {/* Primary Action (Create Session) */}
        {onCreateSession && (
          <div className="mt-3 pt-3 border-t">
            <button
              onClick={onCreateSession}
              className="w-full bg-lumea-primary text-white py-2 px-4 rounded-lg text-sm font-medium flex items-center justify-center gap-2 active:bg-lumea-primary/90"
            >
              <Plus className="w-4 h-4" />
              {t('templates.createSession')}
            </button>
          </div>
        )}
      </div>

      {/* Swipe Actions */}
      {showActions && (
        <div className="absolute right-0 top-0 bottom-0 flex">
          {quickActions.slice(1).map((action, index) => (
            <button
              key={index}
              onClick={action.action}
              className={cn(
                'w-16 flex flex-col items-center justify-center text-xs font-medium',
                action.color
              )}
            >
              {action.icon}
              <span className="mt-1">{action.label}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

// Pull to Refresh Component
const PullToRefresh: React.FC<{ 
  onRefresh: () => void; 
  isRefreshing: boolean;
  children: React.ReactNode;
  t: (key: string) => string;
}> = ({ onRefresh, isRefreshing, children, t }) => {
  const [pullDistance, setPullDistance] = useState(0);
  const [isPulling, setIsPulling] = useState(false);
  const touchStartY = useRef(0);

  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartY.current = e.touches[0].clientY;
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    const touchY = e.touches[0].clientY;
    const distance = touchY - touchStartY.current;
    
    if (distance > 0 && window.scrollY === 0) {
      setIsPulling(true);
      setPullDistance(Math.min(distance * 0.5, 80));
      
      if (distance > 80) {
        e.preventDefault();
      }
    }
  };

  const handleTouchEnd = () => {
    if (pullDistance > 60) {
      onRefresh();
    }
    setIsPulling(false);
    setPullDistance(0);
  };

  return (
    <div
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      className="relative"
    >
      {/* Pull to refresh indicator */}
      {isPulling && (
        <div 
          className="absolute top-0 left-0 right-0 flex items-center justify-center bg-lumea-primary/10 transition-all duration-200"
          style={{ height: pullDistance }}
        >
          <div className="flex items-center gap-2 text-lumea-primary text-sm">
            <RefreshCw className={cn('w-4 h-4', isRefreshing && 'animate-spin')} />
            {pullDistance > 60 ? t('common.release') : t('common.pullToRefresh')}
          </div>
        </div>
      )}
      
      <div style={{ paddingTop: isPulling ? pullDistance : 0 }}>
        {children}
      </div>
    </div>
  );
};

// Main Mobile Template List Component
export const MobileTemplateList: React.FC<MobileTemplateListProps> = ({
  templates,
  loading,
  error,
  onCreateTemplate,
  onEditTemplate,
  onCloneTemplate,
  onDeleteTemplate,
  onCreateSessionFromTemplate,
  onRefresh,
  searchQuery,
  onSearchChange,
  onSearch,
}) => {
  const { t } = useTranslation();
  const [showSearch, setShowSearch] = useState(false);

  const handleRefresh = () => {
    onRefresh();
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Mobile Header */}
      <div className="bg-white border-b px-4 py-3 sticky top-0 z-10">
        <div className="flex items-center justify-between">
          <h1 className="text-lg font-semibold text-gray-900">
            {t('templates.sessionTemplates')}
          </h1>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowSearch(!showSearch)}
              className="p-2 hover:bg-gray-100 rounded-lg"
            >
              <Search className="w-5 h-5 text-gray-600" />
            </button>
            <button
              onClick={onCreateTemplate}
              className="bg-lumea-primary text-white p-2 rounded-lg"
            >
              <Plus className="w-5 h-5" />
            </button>
          </div>
        </div>
        
        {/* Search Bar */}
        {showSearch && (
          <div className="mt-3">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                placeholder={t('templates.searchPlaceholder')}
                value={searchQuery}
                onChange={(e) => onSearchChange(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && onSearch()}
                className="w-full pl-10 pr-10 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-lumea-primary focus:border-transparent"
              />
              {searchQuery && (
                <button
                  onClick={() => onSearchChange('')}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2"
                >
                  <X className="w-4 h-4 text-gray-400" />
                </button>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Content */}
      <PullToRefresh onRefresh={handleRefresh} isRefreshing={loading} t={t}>
        <div className="p-4">
          {/* Error State */}
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-4">
              <p className="text-red-800 text-sm">{error}</p>
              <button
                onClick={onRefresh}
                className="mt-2 text-red-600 text-sm font-medium"
              >
                {t('common.retry')}
              </button>
            </div>
          )}

          {/* Loading State */}
          {loading && templates.length === 0 && (
            <div className="space-y-4">
              {[...Array(3)].map((_, i) => (
                <div key={i} className="bg-white rounded-lg p-4 animate-pulse">
                  <div className="flex items-center gap-2 mb-2">
                    <div className="w-16 h-6 bg-gray-200 rounded-full"></div>
                    <div className="w-12 h-6 bg-gray-200 rounded-full"></div>
                  </div>
                  <div className="w-3/4 h-4 bg-gray-200 rounded mb-2"></div>
                  <div className="w-full h-3 bg-gray-200 rounded mb-3"></div>
                  <div className="flex justify-between">
                    <div className="w-16 h-3 bg-gray-200 rounded"></div>
                    <div className="w-20 h-3 bg-gray-200 rounded"></div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Templates List */}
          {!loading && templates.length > 0 && (
            <div className="space-y-3">
              {templates.map((template) => (
                <MobileTemplateCard
                  key={template.id}
                  template={template}
                  onEdit={() => onEditTemplate(template)}
                  onClone={() => onCloneTemplate(template)}
                  onDelete={() => onDeleteTemplate(template)}
                  onCreateSession={() => onCreateSessionFromTemplate?.(template)}
                />
              ))}
            </div>
          )}

          {/* Empty State */}
          {!loading && templates.length === 0 && (
            <div className="text-center py-12">
              <FileText className="w-16 h-16 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                {searchQuery 
                  ? t('templates.noTemplatesMatchSearch')
                  : t('templates.noTemplatesFound')
                }
              </h3>
              <p className="text-gray-600 mb-6 px-4">
                {searchQuery 
                  ? t('templates.tryDifferentSearch')
                  : t('templates.createFirstTemplateDescription')
                }
              </p>
              {!searchQuery && (
                <button
                  onClick={onCreateTemplate}
                  className="bg-lumea-primary text-white px-6 py-3 rounded-lg font-medium flex items-center gap-2 mx-auto"
                >
                  <Plus className="w-5 h-5" />
                  {t('templates.createTemplate')}
                </button>
              )}
            </div>
          )}

          {/* Template Count */}
          {!loading && templates.length > 0 && (
            <div className="text-center text-sm text-gray-500 mt-8 pb-8">
              {templates.length} {t('templates.templates')}
            </div>
          )}
        </div>
      </PullToRefresh>
    </div>
  );
}; 