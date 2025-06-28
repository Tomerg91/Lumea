import React, { useState, useMemo, useCallback, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useLanguage } from '../contexts/LanguageContext';
import {
  Calendar,
  Clock,
  Users,
  Search,
  Plus,
  CheckCircle,
  XCircle,
  AlertCircle,
  Phone,
  Video,
  MapPin,
  Sparkles,
  BarChart3,
  List,
  Grid,
  Filter,
  SortAsc,
  SortDesc,
  Check,
  Trash2,
  Archive,
  MoreHorizontal,
  Keyboard,
  FileText,
  Download,
  Upload,
  RefreshCw,
} from 'lucide-react';
import SessionList, { SessionStatus, Session as ComponentSession } from '../components/SessionList';
import SessionsCalendar from '../components/SessionsCalendar';
import MobileSessionList from '../components/mobile/MobileSessionList';
import MobileFloatingActionButton, { SessionsFAB } from '../components/mobile/MobileFloatingActionButton';
import SessionModal from '../components/SessionModal';
import { useSessions, useCreateSession, useUpdateSession } from '../hooks/useSessions';
import { useDebounce } from '../hooks/useDebounce';
import { SessionWithUsers } from '../types/session';
import useClientsData from '../hooks/useClientsData';
import { useAuth } from '../contexts/AuthContext';
import { useMobileDetection } from '../hooks/useMobileDetection';
import { cn } from '../lib/utils';
import { NoSearchResultsEmptyState } from '../components/SessionLoadingStates';
import { CancelSessionModal } from '../components/ui/CancelSessionModal';
import { RescheduleSessionModal } from '../components/ui/RescheduleSessionModal';
import { format, startOfWeek, endOfWeek, startOfMonth, endOfMonth } from 'date-fns';

type ViewMode = 'list' | 'calendar';
type SortField = 'date' | 'client' | 'status' | 'created';
type SortDirection = 'asc' | 'desc';
type DateRange = 'all' | 'today' | 'week' | 'month' | 'custom';

interface BulkAction {
  id: string;
  label: string;
  icon: React.ReactNode;
  action: (sessionIds: string[]) => void;
  requiresConfirmation?: boolean;
  destructive?: boolean;
}

interface SessionTemplate {
  id: string;
  name: string;
  type: 'video' | 'phone' | 'in-person';
  duration: number; // in minutes
  notes: string;
  description: string;
}

// Move these outside the component to prevent recreation on every render
const STATUS_MAP: { [key: string]: SessionStatus } = {
  'Upcoming': 'pending',
  'Completed': 'completed',
  'Cancelled': 'cancelled',
  'Rescheduled': 'pending'
};

const STATUS_TO_SUPABASE_MAP: { [key in SessionStatus]: 'Upcoming' | 'Completed' | 'Cancelled' | 'Rescheduled' } = {
  'pending': 'Upcoming',
  'in-progress': 'Upcoming',
  'completed': 'Completed',
  'cancelled': 'Cancelled'
};

const getStatusColor = (status: SessionStatus) => {
  switch (status) {
    case 'completed': return 'text-green-600 bg-green-50';
    case 'pending': return 'text-blue-600 bg-blue-50';
    case 'cancelled': return 'text-red-600 bg-red-50';
    default: return 'text-gray-600 bg-gray-50';
  }
};

const getStatusIcon = (status: SessionStatus) => {
  switch (status) {
    case 'completed': return CheckCircle;
    case 'pending': return Clock;
    case 'cancelled': return XCircle;
    default: return AlertCircle;
  }
};

// Default session templates
const DEFAULT_TEMPLATES: SessionTemplate[] = [
  {
    id: 'initial-consultation',
    name: 'Initial Consultation',
    type: 'video',
    duration: 60,
    notes: 'First session to understand client goals and expectations',
    description: 'Comprehensive initial session to establish coaching relationship'
  },
  {
    id: 'follow-up',
    name: 'Follow-up Session',
    type: 'video',
    duration: 45,
    notes: 'Regular follow-up session to track progress',
    description: 'Standard coaching session to review progress and set next steps'
  },
  {
    id: 'check-in',
    name: 'Quick Check-in',
    type: 'phone',
    duration: 30,
    notes: 'Brief check-in to address immediate concerns',
    description: 'Short session for quick updates and support'
  }
];

const SessionsPage: React.FC = () => {
  const { t } = useTranslation();
  const { isRTL } = useLanguage();
  const { profile } = useAuth();
  const { isMobile } = useMobileDetection();
  
  // State management
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [viewMode, setViewMode] = useState<ViewMode>('list');
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | SessionStatus>('all');
  const [typeFilter, setTypeFilter] = useState<'all' | 'video' | 'phone' | 'in-person'>('all');
  const [sessionToCancel, setSessionToCancel] = useState<ComponentSession | null>(null);
  const [sessionToReschedule, setSessionToReschedule] = useState<ComponentSession | null>(null);
  const [rescheduleModalOpen, setRescheduleModalOpen] = useState(false);
  
  // Advanced UX features state
  const [selectedSessions, setSelectedSessions] = useState<Set<string>>(new Set());
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);
  const [sortField, setSortField] = useState<SortField>('date');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');
  const [dateRange, setDateRange] = useState<DateRange>('all');
  const [customDateStart, setCustomDateStart] = useState<Date | null>(null);
  const [customDateEnd, setCustomDateEnd] = useState<Date | null>(null);
  const [selectedClients, setSelectedClients] = useState<Set<string>>(new Set());
  const [showTemplates, setShowTemplates] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState<SessionTemplate | null>(null);
  const [showKeyboardShortcuts, setShowKeyboardShortcuts] = useState(false);
  
  // Debounce search term to optimize filtering performance
  const debouncedSearchTerm = useDebounce(searchTerm, 300);
  
  // Use optimized Supabase sessions hook with background refetch
  const { data: supabaseSessions = [], isLoading, error, refetch } = useSessions({ live: true });
  const createSessionMutation = useCreateSession();
  const updateSessionMutation = useUpdateSession();
  const { clients } = useClientsData(1, 100);

  // Keyboard shortcuts handler
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      // Only handle shortcuts when not in input fields
      if (event.target instanceof HTMLInputElement || event.target instanceof HTMLTextAreaElement) {
        return;
      }

      switch (event.key) {
        case 'n':
        case 'N':
          if (event.ctrlKey || event.metaKey) {
            event.preventDefault();
            setIsModalOpen(true);
          }
          break;
        case 'f':
        case 'F':
          if (event.ctrlKey || event.metaKey) {
            event.preventDefault();
            setShowAdvancedFilters(!showAdvancedFilters);
          }
          break;
        case 'r':
        case 'R':
          if (event.ctrlKey || event.metaKey) {
            event.preventDefault();
            handleRefresh();
          }
          break;
        case 'a':
        case 'A':
          if (event.ctrlKey || event.metaKey) {
            event.preventDefault();
            handleSelectAll();
          }
          break;
        case 'Escape':
          setSelectedSessions(new Set());
          setShowAdvancedFilters(false);
          setShowTemplates(false);
          setShowKeyboardShortcuts(false);
          break;
        case '?':
          if (event.shiftKey) {
            event.preventDefault();
            setShowKeyboardShortcuts(!showKeyboardShortcuts);
          }
          break;
        case 'v':
        case 'V':
          if (!event.ctrlKey && !event.metaKey) {
            setViewMode(viewMode === 'list' ? 'calendar' : 'list');
          }
          break;
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [showAdvancedFilters, showTemplates, showKeyboardShortcuts, viewMode]);

  // Memoized session transformation - only recalculate when supabaseSessions changes
  const sessions = useMemo(() => {
    return supabaseSessions.map((session: SessionWithUsers): ComponentSession => {
      return {
        _id: session.id,
        coachId: session.coach_id,
        clientId: session.client_id,
        client: session.client ? {
          _id: session.client.id,
          firstName: session.client.name?.split(' ')[0] || 'Unknown',
          lastName: session.client.name?.split(' ').slice(1).join(' ') || 'Client',
          email: session.client.email,
          createdAt: session.created_at
        } : {
          _id: session.client_id,
          firstName: 'Unknown',
          lastName: 'Client',
          email: '',
          createdAt: session.created_at
        },
        date: session.date,
        status: STATUS_MAP[session.status] || 'pending',
        notes: session.notes || '',
        createdAt: session.created_at,
        updatedAt: session.updated_at,
        title: t('sessions.defaultTitle', 'Coaching Session'),
        type: 'video',
        time: session.date,
        clientName: session.client 
          ? session.client.name || t('sessions.unknownClient', 'Unknown Client')
          : t('sessions.unknownClient', 'Unknown Client')
      };
    });
  }, [supabaseSessions, t]);

  // Advanced filtering and sorting
  const filteredAndSortedSessions = useMemo(() => {
    let filtered = sessions.filter(session => {
      // Basic filters
      const matchesSearch = debouncedSearchTerm === '' || 
        session.clientName.toLowerCase().includes(debouncedSearchTerm.toLowerCase()) ||
        session.title.toLowerCase().includes(debouncedSearchTerm.toLowerCase());
      
      const matchesStatus = statusFilter === 'all' || session.status === statusFilter;
      const matchesType = typeFilter === 'all' || session.type === typeFilter;
      
      // Date range filter
      let matchesDateRange = true;
      const sessionDate = new Date(session.date);
      const now = new Date();
      
      switch (dateRange) {
        case 'today':
          matchesDateRange = sessionDate.toDateString() === now.toDateString();
          break;
        case 'week': {
          const weekStart = startOfWeek(now);
          const weekEnd = endOfWeek(now);
          matchesDateRange = sessionDate >= weekStart && sessionDate <= weekEnd;
          break;
        }
        case 'month': {
          const monthStart = startOfMonth(now);
          const monthEnd = endOfMonth(now);
          matchesDateRange = sessionDate >= monthStart && sessionDate <= monthEnd;
          break;
        }
        case 'custom':
          if (customDateStart && customDateEnd) {
            matchesDateRange = sessionDate >= customDateStart && sessionDate <= customDateEnd;
          }
          break;
        default:
          matchesDateRange = true;
      }
      
      // Client filter
      const matchesClient = selectedClients.size === 0 || selectedClients.has(session.clientId);
      
      return matchesSearch && matchesStatus && matchesType && matchesDateRange && matchesClient;
    });

    // Sorting
    filtered.sort((a, b) => {
      let aValue: any, bValue: any;
      
      switch (sortField) {
        case 'date':
          aValue = new Date(a.date);
          bValue = new Date(b.date);
          break;
        case 'client':
          aValue = a.clientName.toLowerCase();
          bValue = b.clientName.toLowerCase();
          break;
        case 'status':
          aValue = a.status;
          bValue = b.status;
          break;
        case 'created':
          aValue = new Date(a.createdAt);
          bValue = new Date(b.createdAt);
          break;
        default:
          return 0;
      }
      
      if (aValue < bValue) return sortDirection === 'asc' ? -1 : 1;
      if (aValue > bValue) return sortDirection === 'asc' ? 1 : -1;
      return 0;
    });

    return filtered;
  }, [sessions, debouncedSearchTerm, statusFilter, typeFilter, dateRange, customDateStart, customDateEnd, selectedClients, sortField, sortDirection]);

  // Calculate session statistics
  const stats = useMemo(() => {
    const total = filteredAndSortedSessions.length;
    const completed = filteredAndSortedSessions.filter(s => s.status === 'completed').length;
    const upcoming = filteredAndSortedSessions.filter(s => s.status === 'pending').length;
    const cancelled = filteredAndSortedSessions.filter(s => s.status === 'cancelled').length;
    
    return { total, completed, upcoming, cancelled };
  }, [filteredAndSortedSessions]);

  // Bulk actions
  const bulkActions: BulkAction[] = useMemo(() => [
    {
      id: 'complete',
      label: t('sessions.bulk.complete', 'Mark as Completed'),
      icon: <CheckCircle className="w-4 h-4" />,
      action: (sessionIds) => {
        sessionIds.forEach(id => handleStatusChange(id, 'completed'));
        setSelectedSessions(new Set());
      },
    },
    {
      id: 'cancel',
      label: t('sessions.bulk.cancel', 'Cancel Sessions'),
      icon: <XCircle className="w-4 h-4" />,
      action: (sessionIds) => {
        sessionIds.forEach(id => handleStatusChange(id, 'cancelled'));
        setSelectedSessions(new Set());
      },
      requiresConfirmation: true,
      destructive: true,
    },
    {
      id: 'archive',
      label: t('sessions.bulk.archive', 'Archive Sessions'),
      icon: <Archive className="w-4 h-4" />,
      action: (sessionIds) => {
        // Archive functionality would be implemented here
        console.log('Archive sessions:', sessionIds);
        setSelectedSessions(new Set());
      },
      requiresConfirmation: true,
    },
  ], [t]);

  // Event handlers
  const handleCreateSession = useCallback((data: { clientId: string; date: string; notes: string; }) => {
    if (!profile?.id) {
      console.error('No coach ID available for session creation');
      return;
    }
    
    createSessionMutation.mutate({
      client_id: data.clientId,
      coach_id: profile.id as string,
      date: data.date,
      notes: data.notes,
    }, {
      onSuccess: () => {
        setIsModalOpen(false);
        setSelectedDate(null);
        setSelectedTemplate(null);
      },
    });
  }, [profile?.id, createSessionMutation]);

  const handleStatusChange = useCallback((sessionId: string, newStatus: SessionStatus) => {
    updateSessionMutation.mutate({
      sessionId,
      data: { status: STATUS_TO_SUPABASE_MAP[newStatus] || 'Upcoming' }
    });
  }, [updateSessionMutation]);

  const handleDeleteSession = useCallback((sessionId: string) => {
    // Implementation would go here - for now just a placeholder
    console.log('Delete session:', sessionId);
  }, []);

  const handleRefresh = useCallback(() => {
    refetch();
  }, [refetch]);

  const handleSelectAll = useCallback(() => {
    if (selectedSessions.size === filteredAndSortedSessions.length) {
      setSelectedSessions(new Set());
    } else {
      setSelectedSessions(new Set(filteredAndSortedSessions.map(s => s._id)));
    }
  }, [selectedSessions, filteredAndSortedSessions]);

  const handleCalendarCreateSession = useCallback((date: Date) => {
    setSelectedDate(date);
    setIsModalOpen(true);
  }, []);

  const handleCalendarSessionClick = useCallback((session: ComponentSession) => {
    console.log('Session clicked:', session);
  }, []);

  const handleRescheduleSession = useCallback((session: ComponentSession) => {
    setSessionToReschedule(session);
    setRescheduleModalOpen(true);
  }, []);

  const handleCancelSession = useCallback((session: ComponentSession) => {
    setSessionToCancel(session);
  }, []);

  const handleRescheduleSuccess = useCallback((rescheduledSession: ComponentSession) => {
    handleStatusChange(rescheduledSession._id, 'pending');
    setRescheduleModalOpen(false);
    setSessionToReschedule(null);
  }, [handleStatusChange]);

  const handleCancelSuccess = useCallback((cancelledSession: ComponentSession) => {
    handleStatusChange(cancelledSession._id, 'cancelled');
    setSessionToCancel(null);
  }, [handleStatusChange]);

  // Session selection handlers
  const handleSessionSelect = useCallback((sessionId: string, selected: boolean) => {
    const newSelected = new Set(selectedSessions);
    if (selected) {
      newSelected.add(sessionId);
    } else {
      newSelected.delete(sessionId);
    }
    setSelectedSessions(newSelected);
  }, [selectedSessions]);

  const handleBulkAction = useCallback((action: BulkAction) => {
    const sessionIds = Array.from(selectedSessions);
    if (sessionIds.length === 0) return;
    
    if (action.requiresConfirmation) {
      const confirmed = window.confirm(
        t('sessions.bulk.confirmAction', 'Are you sure you want to {{action}} {{count}} sessions?', {
          action: action.label.toLowerCase(),
          count: sessionIds.length
        })
      );
      if (!confirmed) return;
    }
    
    action.action(sessionIds);
  }, [selectedSessions, t]);

  // Sort handlers
  const handleSort = useCallback((field: SortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  }, [sortField, sortDirection]);

  // Template handlers
  const handleTemplateSelect = useCallback((template: SessionTemplate) => {
    setSelectedTemplate(template);
    setIsModalOpen(true);
  }, []);

  const handleCreateFromTemplate = useCallback((data: { clientId: string; date: string; }) => {
    if (!profile?.id || !selectedTemplate) return;
    
    createSessionMutation.mutate({
      client_id: data.clientId,
      coach_id: profile.id as string,
      date: data.date,
      notes: selectedTemplate.notes,
    }, {
      onSuccess: () => {
        setIsModalOpen(false);
        setSelectedDate(null);
        setSelectedTemplate(null);
      },
    });
  }, [profile?.id, selectedTemplate, createSessionMutation]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 flex items-center justify-center">
        <div 
          className="bg-white/80 backdrop-blur-sm rounded-2xl p-8 text-center shadow-lg hover:shadow-xl transition-all duration-300"
          role="status"
          aria-live="polite"
          aria-label={t('sessions.loadingMessage', 'Loading sessions, please wait')}
        >
          <div 
            className="w-12 h-12 bg-gradient-to-r from-teal-500 to-blue-500 rounded-2xl flex items-center justify-center mx-auto mb-4 animate-pulse"
            role="img"
            aria-hidden="true"
          >
            <div className="w-6 h-6 bg-white rounded-full animate-bounce"></div>
          </div>
          <div className="flex items-center justify-center gap-2 mb-2" aria-hidden="true">
            <div className="w-2 h-2 bg-gradient-to-r from-teal-500 to-blue-500 rounded-full animate-bounce"></div>
            <div className="w-2 h-2 bg-gradient-to-r from-teal-500 to-blue-500 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
            <div className="w-2 h-2 bg-gradient-to-r from-teal-500 to-blue-500 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
          </div>
          <p className="text-lg font-medium text-gray-700 animate-pulse">
            {isRTL ? 'טוען מפגשים...' : 'Loading sessions...'}
          </p>
          <span className="sr-only">
            {t('sessions.loadingDescription', 'Please wait while we load your sessions data')}
          </span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <AlertCircle className="mx-auto h-12 w-12 text-red-500 mb-4" />
          <h2 className="text-lg font-semibold text-gray-900 mb-2">
            {t('sessions.errorTitle', 'Error Loading Sessions')}
          </h2>
          <p className="text-gray-600 mb-4">
            {t('sessions.errorMessage', 'There was an error loading your sessions. Please try again.')}
          </p>
          <button
            onClick={handleRefresh}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            {t('common.retry', 'Retry')}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
      {/* Skip Link for Accessibility */}
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 z-50 bg-purple-600 text-white px-4 py-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-400 focus:ring-offset-2"
      >
        {t('sessions.skipToContent', 'Skip to main content')}
      </a>
      
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
        {/* Header Section */}
        <header className="mb-6 sm:mb-8">
          <div className={cn(
            'flex items-center gap-3 sm:gap-4 mb-4 sm:mb-6 group',
            isRTL && 'flex-row-reverse'
          )}>
            <div 
              className="w-10 h-10 sm:w-12 sm:h-12 bg-gradient-to-r from-purple-500 to-blue-500 rounded-xl sm:rounded-2xl flex items-center justify-center group-hover:scale-110 group-hover:rotate-3 transition-all duration-300 shadow-lg group-hover:shadow-xl"
              role="img"
              aria-label={t('sessions.headerIcon', 'Sessions page icon')}
            >
              <Calendar className="w-5 h-5 sm:w-6 sm:h-6 text-white group-hover:scale-110 transition-transform duration-300" />
            </div>
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold bg-gradient-to-r from-purple-600 to-blue-600 bg-clip-text text-transparent group-hover:from-purple-700 group-hover:to-blue-700 transition-all duration-300">
                {t('sessions.title', 'My Sessions')}
              </h1>
              <p className="text-gray-600 mt-1 group-hover:text-gray-700 transition-colors duration-300 text-sm sm:text-base">
                {t('sessions.subtitle', 'Manage and track your coaching sessions')}
              </p>
            </div>
          </div>

          {/* Statistics Cards */}
          <section 
            className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 mb-6"
            aria-label={t('sessions.statisticsSection', 'Session statistics overview')}
          >
            <div 
              className="bg-white/90 backdrop-blur-sm rounded-xl p-3 sm:p-4 shadow-lg border border-white/20 hover:shadow-xl hover:scale-105 transition-all duration-300 group cursor-pointer"
              role="button"
              tabIndex={0}
              aria-label={t('sessions.totalSessionsCard', `Total sessions: ${stats.total}`)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  // Could trigger detailed view or analytics
                }
              }}
            >
              <div className={cn(
                'flex items-center gap-2 sm:gap-3',
                isRTL && 'flex-row-reverse'
              )}>
                <div className="w-8 h-8 sm:w-10 sm:h-10 bg-gradient-to-r from-blue-500 to-purple-500 rounded-lg flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
                  <BarChart3 className="w-4 h-4 sm:w-5 sm:h-5 text-white group-hover:rotate-12 transition-transform duration-300" />
                </div>
                <div>
                  <p className="text-lg sm:text-2xl font-bold text-gray-800 group-hover:text-blue-600 transition-colors duration-300" aria-live="polite">{stats.total}</p>
                  <p className="text-xs sm:text-sm text-gray-600 group-hover:text-gray-700 transition-colors duration-300 leading-tight">
                    {t('sessions.totalSessions', 'Total Sessions')}
                  </p>
                </div>
              </div>
            </div>

            <div 
              className="bg-white/90 backdrop-blur-sm rounded-xl p-3 sm:p-4 shadow-lg border border-white/20 hover:shadow-xl hover:scale-105 transition-all duration-300 group cursor-pointer"
              role="button"
              tabIndex={0}
              aria-label={t('sessions.completedSessionsCard', `Completed sessions: ${stats.completed}`)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  // Could filter to show only completed sessions
                  setStatusFilter('completed');
                }
              }}
            >
              <div className={cn(
                'flex items-center gap-2 sm:gap-3',
                isRTL && 'flex-row-reverse'
              )}>
                <div className="w-8 h-8 sm:w-10 sm:h-10 bg-gradient-to-r from-green-500 to-emerald-500 rounded-lg flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
                  <CheckCircle className="w-4 h-4 sm:w-5 sm:h-5 text-white group-hover:rotate-12 transition-transform duration-300" />
                </div>
                <div>
                  <p className="text-lg sm:text-2xl font-bold text-gray-800 group-hover:text-green-600 transition-colors duration-300" aria-live="polite">{stats.completed}</p>
                  <p className="text-xs sm:text-sm text-gray-600 group-hover:text-gray-700 transition-colors duration-300 leading-tight">
                    {t('sessions.completedSessions', 'Completed')}
                  </p>
                </div>
              </div>
            </div>

            <div 
              className="bg-white/90 backdrop-blur-sm rounded-xl p-3 sm:p-4 shadow-lg border border-white/20 hover:shadow-xl hover:scale-105 transition-all duration-300 group cursor-pointer"
              role="button"
              tabIndex={0}
              aria-label={t('sessions.upcomingSessionsCard', `Upcoming sessions: ${stats.upcoming}`)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  // Could filter to show only pending sessions
                  setStatusFilter('pending');
                }
              }}
            >
              <div className={cn(
                'flex items-center gap-2 sm:gap-3',
                isRTL && 'flex-row-reverse'
              )}>
                <div className="w-8 h-8 sm:w-10 sm:h-10 bg-gradient-to-r from-amber-500 to-orange-500 rounded-lg flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
                  <Clock className="w-4 h-4 sm:w-5 sm:h-5 text-white group-hover:rotate-12 transition-transform duration-300" />
                </div>
                <div>
                  <p className="text-lg sm:text-2xl font-bold text-gray-800 group-hover:text-amber-600 transition-colors duration-300" aria-live="polite">{stats.upcoming}</p>
                  <p className="text-xs sm:text-sm text-gray-600 group-hover:text-gray-700 transition-colors duration-300 leading-tight">
                    {t('sessions.upcomingSessions', 'Upcoming')}
                  </p>
                </div>
              </div>
            </div>

            <div 
              className="bg-white/90 backdrop-blur-sm rounded-xl p-3 sm:p-4 shadow-lg border border-white/20 hover:shadow-xl hover:scale-105 transition-all duration-300 group cursor-pointer"
              role="button"
              tabIndex={0}
              aria-label={t('sessions.cancelledSessionsCard', `Cancelled sessions: ${stats.cancelled}`)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  // Could filter to show only cancelled sessions
                  setStatusFilter('cancelled');
                }
              }}
            >
              <div className={cn(
                'flex items-center gap-2 sm:gap-3',
                isRTL && 'flex-row-reverse'
              )}>
                <div className="w-8 h-8 sm:w-10 sm:h-10 bg-gradient-to-r from-red-500 to-pink-500 rounded-lg flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
                  <XCircle className="w-4 h-4 sm:w-5 sm:h-5 text-white group-hover:rotate-12 transition-transform duration-300" />
                </div>
                <div>
                  <p className="text-lg sm:text-2xl font-bold text-gray-800 group-hover:text-red-600 transition-colors duration-300" aria-live="polite">{stats.cancelled}</p>
                  <p className="text-xs sm:text-sm text-gray-600 group-hover:text-gray-700 transition-colors duration-300 leading-tight">
                    {t('sessions.cancelledSessions', 'Cancelled')}
                  </p>
                </div>
              </div>
            </div>
          </section>

          {/* Search and Filters */}
          <section 
            className="bg-white/90 backdrop-blur-sm rounded-xl p-4 sm:p-6 shadow-lg border border-white/20 mb-6 hover:shadow-xl transition-all duration-300"
            aria-label={t('sessions.filtersSection', 'Search and filter sessions')}
          >
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 sm:gap-4">
              {/* Search */}
              <div className="relative group sm:col-span-2 lg:col-span-1">
                <label htmlFor="session-search" className="sr-only">
                  {t('sessions.searchLabel', 'Search sessions by client name or title')}
                </label>
                <Search className={cn(
                  'absolute top-1/2 transform -translate-y-1/2 w-4 h-4 sm:w-5 sm:h-5 text-gray-400 group-focus-within:text-purple-500 transition-colors duration-200 pointer-events-none',
                  isRTL ? 'right-3' : 'left-3'
                )} aria-hidden="true" />
                <input
                  id="session-search"
                  type="text"
                  placeholder={t('sessions.searchPlaceholder', 'Search sessions...')}
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className={cn(
                    'w-full h-10 sm:h-11 bg-gray-50 border border-gray-200 rounded-lg focus:ring-2 focus:ring-purple-400 focus:border-transparent transition-all duration-200 hover:bg-gray-100 hover:border-gray-300 text-sm sm:text-base focus:outline-none',
                    isRTL ? 'pr-9 sm:pr-10 pl-3 sm:pl-4' : 'pl-9 sm:pl-10 pr-3 sm:pr-4'
                  )}
                  dir={isRTL ? 'rtl' : 'ltr'}
                  aria-describedby="search-help"
                />
                <div id="search-help" className="sr-only">
                  {t('sessions.searchHelp', 'Type to search sessions by client name or session title')}
                </div>
              </div>

              {/* Status Filter */}
              <div>
                <label htmlFor="status-filter" className="sr-only">
                  {t('sessions.statusFilterLabel', 'Filter sessions by status')}
                </label>
                <select
                  id="status-filter"
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value as 'all' | SessionStatus)}
                  className="w-full h-10 sm:h-11 bg-gray-50 border border-gray-200 rounded-lg focus:ring-2 focus:ring-purple-400 focus:border-transparent transition-all duration-200 hover:bg-gray-100 hover:border-gray-300 cursor-pointer text-sm sm:text-base focus:outline-none"
                  dir={isRTL ? 'rtl' : 'ltr'}
                  aria-describedby="status-filter-help"
                >
                  <option value="all">{t('sessions.allStatuses', 'All Statuses')}</option>
                  <option value="pending">{t('sessions.pending', 'Upcoming')}</option>
                  <option value="completed">{t('sessions.completed', 'Completed')}</option>
                  <option value="cancelled">{t('sessions.cancelled', 'Cancelled')}</option>
                </select>
                <div id="status-filter-help" className="sr-only">
                  {t('sessions.statusFilterHelp', 'Filter sessions by their current status')}
                </div>
              </div>

              {/* Type Filter */}
              <div>
                <label htmlFor="type-filter" className="sr-only">
                  {t('sessions.typeFilterLabel', 'Filter sessions by type')}
                </label>
                <select
                  id="type-filter"
                  value={typeFilter}
                  onChange={(e) => setTypeFilter(e.target.value as 'all' | 'video' | 'phone' | 'in-person')}
                  className="w-full h-10 sm:h-11 bg-gray-50 border border-gray-200 rounded-lg focus:ring-2 focus:ring-purple-400 focus:border-transparent transition-all duration-200 hover:bg-gray-100 hover:border-gray-300 cursor-pointer text-sm sm:text-base focus:outline-none"
                  dir={isRTL ? 'rtl' : 'ltr'}
                  aria-describedby="type-filter-help"
                >
                  <option value="all">{t('sessions.allTypes', 'All Types')}</option>
                  <option value="video">{t('sessions.videoCall', 'Video Call')}</option>
                  <option value="phone">{t('sessions.phoneCall', 'Phone Call')}</option>
                  <option value="in-person">{t('sessions.inPerson', 'In Person')}</option>
                </select>
                <div id="type-filter-help" className="sr-only">
                  {t('sessions.typeFilterHelp', 'Filter sessions by their meeting type')}
                </div>
              </div>

              {/* View Toggle */}
              <fieldset className="flex bg-gray-100 rounded-lg p-1 hover:bg-gray-200 transition-colors duration-200">
                <legend className="sr-only">{t('sessions.viewModeLabel', 'Choose view mode')}</legend>
                <button
                  type="button"
                  onClick={() => setViewMode('list')}
                  className={cn(
                    'flex-1 flex items-center justify-center gap-1 sm:gap-2 px-2 sm:px-3 py-2 rounded-md text-xs sm:text-sm font-medium transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-purple-400 focus:ring-inset',
                    viewMode === 'list'
                      ? 'bg-white text-purple-700 shadow-sm transform scale-105'
                      : 'text-gray-600 hover:text-gray-800 hover:bg-white/50'
                  )}
                  aria-pressed={viewMode === 'list'}
                  aria-label={t('sessions.listViewLabel', 'Switch to list view')}
                >
                  <List className={cn(
                    'w-3 h-3 sm:w-4 sm:h-4 transition-transform duration-200',
                    viewMode === 'list' ? 'scale-110' : ''
                  )} aria-hidden="true" />
                  <span className="hidden sm:inline">{t('sessions.listView', 'List')}</span>
                </button>
                <button
                  type="button"
                  onClick={() => setViewMode('calendar')}
                  className={cn(
                    'flex-1 flex items-center justify-center gap-1 sm:gap-2 px-2 sm:px-3 py-2 rounded-md text-xs sm:text-sm font-medium transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-purple-400 focus:ring-inset',
                    viewMode === 'calendar'
                      ? 'bg-white text-purple-700 shadow-sm transform scale-105'
                      : 'text-gray-600 hover:text-gray-800 hover:bg-white/50'
                  )}
                  aria-pressed={viewMode === 'calendar'}
                  aria-label={t('sessions.calendarViewLabel', 'Switch to calendar view')}
                >
                  <Grid className={cn(
                    'w-3 h-3 sm:w-4 sm:h-4 transition-transform duration-200',
                    viewMode === 'calendar' ? 'scale-110' : ''
                  )} aria-hidden="true" />
                  <span className="hidden sm:inline">{t('sessions.calendarView', 'Calendar')}</span>
                </button>
              </fieldset>

              {/* Create Session Button */}
              <button
                type="button"
                onClick={() => setIsModalOpen(true)}
                className="h-10 sm:h-11 bg-gradient-to-r from-purple-600 to-blue-600 text-white rounded-lg hover:shadow-lg hover:shadow-purple-500/25 transform hover:-translate-y-0.5 hover:scale-105 transition-all duration-200 flex items-center justify-center gap-1 sm:gap-2 font-medium group text-sm sm:text-base focus:outline-none focus:ring-2 focus:ring-purple-400 focus:ring-offset-2"
                aria-label={t('sessions.createSessionLabel', 'Create a new coaching session')}
              >
                <Plus className="w-4 h-4 sm:w-5 sm:h-5 group-hover:rotate-90 transition-transform duration-300" aria-hidden="true" />
                <span className="group-hover:tracking-wide transition-all duration-200">
                  <span className="hidden sm:inline">{t('sessions.createSession', 'New Session')}</span>
                  <span className="sm:hidden">{t('sessions.new', 'New')}</span>
                </span>
              </button>
            </div>
          </section>
        </header>

        {/* Sessions Content */}
        <main id="main-content" aria-label={t('sessions.contentArea', 'Sessions content')}>
          {viewMode === 'calendar' ? (
            <div className="transform transition-all duration-500 ease-in-out">
              <SessionsCalendar
                sessions={filteredAndSortedSessions}
                isLoading={isLoading}
                onCreateSession={handleCalendarCreateSession}
                onSessionClick={handleCalendarSessionClick}
                userRole={profile?.role}
              />
            </div>
          ) : (
            <div className="bg-white/90 backdrop-blur-sm rounded-xl shadow-lg border border-white/20 overflow-hidden hover:shadow-xl transition-all duration-300 transform hover:scale-[1.02]">
              {isMobile ? (
                <MobileSessionList
                  sessions={filteredAndSortedSessions}
                  isLoading={isLoading}
                  onCreateClick={() => setIsModalOpen(true)}
                  onStatusChange={handleStatusChange}
                  isUpdatingStatus={updateSessionMutation.isPending}
                  userRole={profile?.role}
                  onRefresh={handleRefresh}
                  searchTerm={searchTerm}
                  onSearchChange={setSearchTerm}
                  statusFilter={statusFilter}
                  onStatusFilterChange={setStatusFilter}
                  typeFilter={typeFilter}
                  onTypeFilterChange={setTypeFilter}
                />
              ) : (
                <SessionList
                  sessions={filteredAndSortedSessions}
                  isLoading={isLoading}
                  onCreateClick={() => setIsModalOpen(true)}
                  onStatusChange={handleStatusChange}
                  isUpdatingStatus={updateSessionMutation.isPending}
                  userRole={profile?.role}
                  onReschedule={handleRescheduleSession}
                  onCancel={handleCancelSession}
                />
              )}

              {/* Enhanced Empty State for Desktop */}
              {!isLoading && !isMobile && filteredAndSortedSessions.length === 0 && (
                <div className="p-6 sm:p-12 animate-fade-in" role="region" aria-label={t('sessions.emptyState', 'No sessions found')}>
                  {searchTerm || statusFilter !== 'all' || typeFilter !== 'all' ? (
                    <NoSearchResultsEmptyState
                      searchTerm={searchTerm}
                      onClearFilters={() => {
                        setSearchTerm('');
                        setStatusFilter('all');
                        setTypeFilter('all');
                      }}
                      onCreateClick={() => setIsModalOpen(true)}
                    />
                  ) : (
                    <div className="text-center group">
                      <div 
                        className="w-16 h-16 sm:w-20 sm:h-20 bg-gradient-to-r from-purple-500 to-blue-500 rounded-2xl sm:rounded-3xl flex items-center justify-center mx-auto mb-4 sm:mb-6 group-hover:scale-110 group-hover:rotate-3 transition-all duration-300 shadow-lg group-hover:shadow-xl"
                        role="img"
                        aria-label={t('sessions.emptyStateIcon', 'No sessions illustration')}
                      >
                        <Calendar className="w-8 h-8 sm:w-10 sm:h-10 text-white group-hover:scale-110 transition-transform duration-300" />
                      </div>
                      <h3 className="text-lg sm:text-xl font-semibold text-gray-800 mb-2 group-hover:text-purple-600 transition-colors duration-300">
                        {t('sessions.noSessions', 'No sessions yet')}
                      </h3>
                      <p className="text-gray-600 mb-4 sm:mb-6 max-w-md mx-auto group-hover:text-gray-700 transition-colors duration-300 text-sm sm:text-base px-4">
                        {t('sessions.createFirstSession', 'Create your first session to get started')}
                      </p>
                      <button
                        type="button"
                        onClick={() => setIsModalOpen(true)}
                        className="bg-gradient-to-r from-purple-600 to-blue-600 text-white px-4 sm:px-6 py-2 sm:py-3 rounded-lg hover:shadow-lg hover:shadow-purple-500/25 transform hover:-translate-y-0.5 hover:scale-105 transition-all duration-200 inline-flex items-center gap-2 group text-sm sm:text-base focus:outline-none focus:ring-2 focus:ring-purple-400 focus:ring-offset-2"
                        aria-label={t('sessions.createFirstSessionLabel', 'Create your first coaching session')}
                      >
                        <Plus className="w-4 h-4 sm:w-5 sm:h-5 group-hover:rotate-90 transition-transform duration-300" aria-hidden="true" />
                        <span className="group-hover:tracking-wide transition-all duration-200">
                          {t('sessions.createSession', 'Create Session')}
                        </span>
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </main>

        {/* Session Modal */}
        <SessionModal
          isOpen={isModalOpen}
          onClose={() => {
            setIsModalOpen(false);
            setSelectedDate(null);
          }}
          onSubmit={selectedTemplate ? handleCreateFromTemplate : handleCreateSession}
          selectedDate={selectedDate}
                  clients={clients.map(client => ({
          id: client._id,
          name: `${client.firstName} ${client.lastName}`,
          email: client.email
        }))}
          template={selectedTemplate}
        />

        {/* Cancel Session Modal */}
        <CancelSessionModal
          session={sessionToCancel}
          isOpen={!!sessionToCancel}
          onClose={() => setSessionToCancel(null)}
          onCancelSuccess={handleCancelSuccess}
        />

        {/* Reschedule Session Modal */}
        <RescheduleSessionModal
          session={sessionToReschedule}
          isOpen={rescheduleModalOpen}
          onClose={() => {
            setRescheduleModalOpen(false);
            setSessionToReschedule(null);
          }}
          onReschedule={handleRescheduleSuccess}
        />

        {/* Enhanced Mobile FAB */}
        <SessionsFAB
          onCreateSession={() => setIsModalOpen(true)}
          onViewCalendar={() => setViewMode('calendar')}
          userRole={profile?.role}
        />
      </div>
    </div>
  );
};

export default SessionsPage;
