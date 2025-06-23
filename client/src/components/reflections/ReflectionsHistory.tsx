import React, { useState, useEffect, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { 
  Search, 
  Filter, 
  MessageSquare, 
  Heart, 
  Meh, 
  Frown, 
  Smile,
  ChevronDown,
  ChevronUp,
  Clock,
  FileText,
  Eye,
  EyeOff,
  RefreshCw
} from 'lucide-react';
import { format, parseISO, isValid } from 'date-fns';
import { enUS, he } from 'date-fns/locale';
import { useAuth } from '../../contexts/AuthContext';
import { SimpleReflectionService } from '../../services/reflectionService.simple';
import { Reflection, MoodType } from '../../../../shared/types/database';
import { useRealtimeTable } from '../../hooks/useRealtime';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useToast } from '../../hooks/use-toast';

interface ReflectionsHistoryProps {
  clientId?: string;
  compact?: boolean;
  maxHeight?: string;
}

interface FilterOptions {
  search: string;
  mood: MoodType | 'all';
  dateFrom: string;
  dateTo: string;
  sessionId: string;
  sortBy: 'created_at' | 'updated_at';
  sortOrder: 'asc' | 'desc';
}

const ITEMS_PER_PAGE = 10;

const moodIcons = {
  positive: <Smile className="w-4 h-4 text-green-500" />,
  neutral: <Meh className="w-4 h-4 text-gray-500" />,
  negative: <Frown className="w-4 h-4 text-red-500" />,
  mixed: <Heart className="w-4 h-4 text-purple-500" />
};

const moodColors = {
  positive: 'bg-green-50 border-green-200 text-green-800',
  neutral: 'bg-gray-50 border-gray-200 text-gray-800',
  negative: 'bg-red-50 border-red-200 text-red-800',
  mixed: 'bg-purple-50 border-purple-200 text-purple-800'
};

export const ReflectionsHistory: React.FC<ReflectionsHistoryProps> = ({
  clientId,
  compact = false,
  maxHeight = 'max-h-[600px]'
}) => {
  const { t, i18n } = useTranslation();
  const { user } = useAuth();
  const { toast } = useToast();
  
  const [showFilters, setShowFilters] = useState(false);
  const [expandedReflections, setExpandedReflections] = useState<Set<string>>(new Set());
  const [currentPage, setCurrentPage] = useState(1);
  const queryClient = useQueryClient();

  const [filters, setFilters] = useState<FilterOptions>({
    search: '',
    mood: 'all',
    dateFrom: '',
    dateTo: '',
    sessionId: '',
    sortBy: 'created_at',
    sortOrder: 'desc'
  });

  const isCoachView = user?.role === 'coach' && clientId && clientId !== user.id;
  const isClientView = user?.role === 'client' && (!clientId || clientId === user.id);
  const canViewReflections = isClientView || isCoachView || user?.role === 'admin';

  // Real-time reflections query
  const { 
    data: reflectionsData, 
    isLoading: loading, 
    error: queryError,
    refetch: refetchReflections 
  } = useQuery({
    queryKey: ['reflections', currentPage, filters, clientId],
    queryFn: async () => {
      if (!canViewReflections) {
        throw new Error(t('reflections.accessDenied', 'Access denied'));
      }

      const offset = (currentPage - 1) * ITEMS_PER_PAGE;
      const options = {
        limit: ITEMS_PER_PAGE,
        offset,
        session_id: filters.sessionId || undefined,
        mood: filters.mood !== 'all' ? filters.mood : undefined,
      };

      const result = await SimpleReflectionService.getUserReflections(options);
      
      let filteredReflections = result.reflections;
      
      if (filters.search) {
        const searchLower = filters.search.toLowerCase();
        filteredReflections = filteredReflections.filter(reflection =>
          reflection.content.toLowerCase().includes(searchLower)
        );
      }

      if (filters.dateFrom) {
        filteredReflections = filteredReflections.filter(reflection =>
          new Date(reflection.created_at) >= new Date(filters.dateFrom)
        );
      }

      if (filters.dateTo) {
        filteredReflections = filteredReflections.filter(reflection =>
          new Date(reflection.created_at) <= new Date(filters.dateTo + 'T23:59:59')
        );
      }

      filteredReflections.sort((a, b) => {
        const aDate = new Date(a[filters.sortBy]);
        const bDate = new Date(b[filters.sortBy]);
        return filters.sortOrder === 'desc' 
          ? bDate.getTime() - aDate.getTime()
          : aDate.getTime() - bDate.getTime();
      });

      return {
        reflections: filteredReflections,
        count: result.count
      };
    },
    enabled: !!user && canViewReflections,
  });

  // Real-time sessions query
  const { data: sessions = [] } = useQuery({
    queryKey: ['sessions', 'for-reflections'],
    queryFn: () => SimpleReflectionService.getUserSessions(),
    enabled: !!user && canViewReflections,
  });

  // Set up real-time subscription for reflections
  useRealtimeTable(
    'reflections',
    user?.id ? `user_id=eq.${user.id}` : null,
    () => {
      // Invalidate reflections queries on real-time updates
      queryClient.invalidateQueries({ queryKey: ['reflections'] });
    }
  );

  const reflections = reflectionsData?.reflections || [];
  const totalCount = reflectionsData?.count || 0;
  const error = queryError ? (queryError as Error).message : null;

  const handleFilterChange = (key: keyof FilterOptions, value: string) => {
    setFilters(prev => ({ ...prev, [key]: value }));
    setCurrentPage(1);
  };

  const toggleExpansion = (reflectionId: string) => {
    setExpandedReflections(prev => {
      const newSet = new Set(prev);
      if (newSet.has(reflectionId)) {
        newSet.delete(reflectionId);
      } else {
        newSet.add(reflectionId);
      }
      return newSet;
    });
  };

  const formatDate = (dateString: string) => {
    try {
      const date = parseISO(dateString);
      if (!isValid(date)) return dateString;
      
      const locale = i18n.language === 'he' ? he : enUS;
      return format(date, 'PPp', { locale });
    } catch {
      return dateString;
    }
  };

  const getMoodDisplay = (mood: MoodType | null) => {
    if (!mood) return null;
    
    return (
      <div className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs border ${moodColors[mood]}`}>
        {moodIcons[mood]}
        <span>{t(`reflections.mood.${mood}`, mood)}</span>
      </div>
    );
  };

  const totalPages = Math.ceil(totalCount / ITEMS_PER_PAGE);
  const hasNextPage = currentPage < totalPages;
  const hasPrevPage = currentPage > 1;

  if (!canViewReflections) {
    return (
      <div className="flex items-center justify-center p-8 text-gray-500">
        <div className="text-center">
          <EyeOff className="w-12 h-12 mx-auto mb-4 text-gray-400" />
          <p>{t('reflections.accessDenied', 'Access denied')}</p>
        </div>
      </div>
    );
  }

  if (loading && reflections.length === 0) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="text-center">
          <RefreshCw className="w-8 h-8 mx-auto mb-4 animate-spin text-gray-400" />
          <p className="text-gray-500">{t('common.loading', 'Loading...')}</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center p-8 text-red-500">
        <div className="text-center">
          <MessageSquare className="w-12 h-12 mx-auto mb-4 text-red-400" />
          <p>{error}</p>
          <button
            onClick={() => refetchReflections()}
            className="mt-4 px-4 py-2 bg-red-100 text-red-700 rounded-lg hover:bg-red-200 transition-colors"
          >
            {t('common.retry', 'Retry')}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className={`bg-white rounded-lg shadow-sm border ${compact ? 'p-4' : 'p-6'}`}>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className={`font-semibold text-gray-900 ${compact ? 'text-lg' : 'text-xl'}`}>
            {isCoachView 
              ? t('reflections.clientReflections', 'Client Reflections')
              : t('reflections.title', 'Reflections')
            }
          </h2>
          <p className="text-sm text-gray-600 mt-1">
            {isCoachView 
              ? t('reflections.coachSubtitle', 'View and manage client reflections')
              : t('reflections.clientSubtitle', 'Your personal reflections and insights')
            }
          </p>
        </div>
        
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowFilters(!showFilters)}
            className="flex items-center gap-2 px-3 py-2 text-sm border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
          >
            <Filter className="w-4 h-4" />
            {t('reflections.filters', 'Filters')}
            {showFilters ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </button>
          
          <button
            onClick={() => refetchReflections()}
            disabled={loading}
            className="flex items-center gap-2 px-3 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            {t('common.refresh', 'Refresh')}
          </button>
        </div>
      </div>

      {showFilters && (
        <div className="mb-6 p-4 bg-gray-50 rounded-lg border">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                {t('reflections.search', 'Search')}
              </label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="text"
                  value={filters.search}
                  onChange={(e) => handleFilterChange('search', e.target.value)}
                  placeholder={t('reflections.searchPlaceholder', 'Search reflections...')}
                  className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                {t('reflections.mood.label', 'Mood')}
              </label>
              <select
                value={filters.mood}
                onChange={(e) => handleFilterChange('mood', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="all">{t('reflections.mood.all', 'All Moods')}</option>
                <option value="positive">{t('reflections.mood.positive', 'Positive')}</option>
                <option value="neutral">{t('reflections.mood.neutral', 'Neutral')}</option>
                <option value="negative">{t('reflections.mood.negative', 'Negative')}</option>
                <option value="mixed">{t('reflections.mood.mixed', 'Mixed')}</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                {t('reflections.session', 'Session')}
              </label>
              <select
                value={filters.sessionId}
                onChange={(e) => handleFilterChange('sessionId', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="">{t('reflections.allSessions', 'All Sessions')}</option>
                {sessions.map(session => (
                  <option key={session.id} value={session.id}>
                    {formatDate(session.date)} - {session.status}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                {t('reflections.dateFrom', 'From Date')}
              </label>
              <input
                type="date"
                value={filters.dateFrom}
                onChange={(e) => handleFilterChange('dateFrom', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                {t('reflections.dateTo', 'To Date')}
              </label>
              <input
                type="date"
                value={filters.dateTo}
                onChange={(e) => handleFilterChange('dateTo', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                {t('reflections.sortBy', 'Sort By')}
              </label>
              <div className="flex gap-2">
                <select
                  value={filters.sortBy}
                  onChange={(e) => handleFilterChange('sortBy', e.target.value)}
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="created_at">{t('reflections.sortBy.created', 'Created Date')}</option>
                  <option value="updated_at">{t('reflections.sortBy.updated', 'Updated Date')}</option>
                </select>
                <select
                  value={filters.sortOrder}
                  onChange={(e) => handleFilterChange('sortOrder', e.target.value)}
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="desc">{t('reflections.sortOrder.desc', 'Newest First')}</option>
                  <option value="asc">{t('reflections.sortOrder.asc', 'Oldest First')}</option>
                </select>
              </div>
            </div>
          </div>
        </div>
      )}

      <div className={`space-y-4 ${compact ? maxHeight : 'max-h-[800px]'} overflow-y-auto`}>
        {reflections.length === 0 ? (
          <div className="text-center py-12">
            <MessageSquare className="w-12 h-12 mx-auto mb-4 text-gray-400" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              {t('reflections.noReflections', 'No reflections found')}
            </h3>
            <p className="text-gray-600">
              {filters.search || filters.mood !== 'all' || filters.sessionId || filters.dateFrom || filters.dateTo
                ? t('reflections.noSearchResults', 'Try adjusting your search terms')
                : t('reflections.noReflectionsSubtitle', 'Start creating reflections to track your progress')
              }
            </p>
          </div>
        ) : (
          reflections.map((reflection) => {
            const isExpanded = expandedReflections.has(reflection.id);
            const contentPreview = reflection.content.length > 200 
              ? reflection.content.substring(0, 200) + '...'
              : reflection.content;

            return (
              <div
                key={reflection.id}
                className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow"
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <div className="flex items-center gap-2 text-sm text-gray-600">
                      <Clock className="w-4 h-4" />
                      <span>{formatDate(reflection.created_at)}</span>
                    </div>
                    {reflection.mood && getMoodDisplay(reflection.mood)}
                  </div>
                  
                  {reflection.content.length > 200 && (
                    <button
                      onClick={() => toggleExpansion(reflection.id)}
                      className="flex items-center gap-1 text-sm text-blue-600 hover:text-blue-800 transition-colors"
                    >
                      {isExpanded ? (
                        <>
                          <EyeOff className="w-4 h-4" />
                          {t('reflections.showLess', 'Show Less')}
                        </>
                      ) : (
                        <>
                          <Eye className="w-4 h-4" />
                          {t('reflections.showMore', 'Show More')}
                        </>
                      )}
                    </button>
                  )}
                </div>

                <div className="prose prose-sm max-w-none">
                  <p className="text-gray-700 whitespace-pre-wrap">
                    {isExpanded ? reflection.content : contentPreview}
                  </p>
                </div>

                {reflection.session_id && (
                  <div className="mt-3 pt-3 border-t border-gray-100">
                    <div className="flex items-center gap-2 text-sm text-gray-600">
                      <FileText className="w-4 h-4" />
                      <span>{t('reflections.linkedToSession', 'Linked to session')}</span>
                    </div>
                  </div>
                )}

                {reflection.updated_at !== reflection.created_at && (
                  <div className="mt-2 text-xs text-gray-500">
                    {t('reflections.lastUpdated', 'Last updated')}: {formatDate(reflection.updated_at)}
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      {totalPages > 1 && (
        <div className="flex items-center justify-between mt-6 pt-4 border-t border-gray-200">
          <div className="text-sm text-gray-600">
            {t('reflections.showingResults', 'Showing {{start}} - {{end}} of {{total}} reflections', {
              start: ((currentPage - 1) * ITEMS_PER_PAGE) + 1,
              end: Math.min(currentPage * ITEMS_PER_PAGE, totalCount),
              total: totalCount
            })}
          </div>
          
          <div className="flex items-center gap-2">
            <button
              onClick={() => setCurrentPage(prev => prev - 1)}
              disabled={!hasPrevPage}
              className="px-3 py-2 text-sm border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {t('reflections.previous', 'Previous')}
            </button>
            
            <div className="flex items-center gap-1">
              {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                const page = i + 1;
                const isCurrentPage = page === currentPage;
                
                return (
                  <button
                    key={page}
                    onClick={() => setCurrentPage(page)}
                    className={`px-3 py-2 text-sm rounded-lg transition-colors ${
                      isCurrentPage
                        ? 'bg-blue-600 text-white'
                        : 'border border-gray-300 hover:bg-gray-50'
                    }`}
                  >
                    {page}
                  </button>
                );
              })}
            </div>
            
            <button
              onClick={() => setCurrentPage(prev => prev + 1)}
              disabled={!hasNextPage}
              className="px-3 py-2 text-sm border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {t('reflections.next', 'Next')}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}; 