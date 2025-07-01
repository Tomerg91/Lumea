import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { format } from 'date-fns';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { useTranslation } from 'react-i18next';
import { useToast } from '@/components/ui/use-toast';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Calendar, Clock, Users, Plus, Search, Video, MapPin, User, Eye, Edit, Trash2, CheckCircle, XCircle, Loader2, Phone, Sparkles } from 'lucide-react';
import { cn } from '@/lib/utils';
import LanguageSwitcher from '@/components/LanguageSwitcher';
import { 
  LoadingSkeleton,
  LoadingSpinner,
  StatsCardSkeleton,
  FormFieldSkeleton,
  StatusIndicator
} from '@/components/LoadingSystem';
import { useRealtimeSessions, useCreateSession, useDeleteSession, Session, CreateSessionData } from '@/hooks/useSessions';
import { useAvailableCoaches } from '@/hooks/useCoaches';
import { CancelSessionModal } from '@/components/ui/CancelSessionModal';
import { RescheduleSessionModal } from '@/components/ui/RescheduleSessionModal';
import { toUIStatus } from '@/utils/status';

// Local interface for the new session form data
interface NewSessionFormData {
  date: Date;
  time: string;
  coach: string;
  type: 'video' | 'phone' | 'in-person'; // Updated to match Session type
  notes: string;
  title: string; // Added
  description: string; // Added
}

const Sessions = () => {
  const { t } = useTranslation();
  const { isRTL } = useLanguage();
  const navigate = useNavigate();
  const { user, profile } = useAuth();
  const { toast } = useToast();
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(new Date());
  const [view, setView] = useState<'calendar' | 'list'>('calendar');

  // Use the Supabase real-time sessions hooks
  const { 
    data: sessions = [], 
    isLoading, 
    error
  } = useRealtimeSessions();

  const createSessionMutation = useCreateSession();
  
  // Get available coaches
  const { data: availableCoaches = [], isLoading: coachesLoading } = useAvailableCoaches();

  const [newSessionData, setNewSessionData] = useState<NewSessionFormData>({
    date: new Date(),
    time: '',
    coach: '',
    type: 'video', // Default to video
    notes: '',
    title: '',
    description: '',
  });

  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [cancelModalOpen, setCancelModalOpen] = useState(false);
  const [sessionToCancel, setSessionToCancel] = useState<Session | null>(null);
  const [rescheduleModalOpen, setRescheduleModalOpen] = useState(false);
  const [sessionToReschedule, setSessionToReschedule] = useState<Session | null>(null);
  
  // Filter and search state
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [typeFilter, setTypeFilter] = useState('all');

  const handleCancelSession = (session: Session) => {
    setSessionToCancel(session);
    setCancelModalOpen(true);
  };

  const handleCancelSuccess = (cancelledSession: Session) => {
    // The hook will automatically update the cache
    setCancelModalOpen(false);
    setSessionToCancel(null);
  };

  const handleRescheduleSession = (session: Session) => {
    setSessionToReschedule(session);
    setRescheduleModalOpen(true);
  };

  const handleRescheduleSuccess = (rescheduledSession: Session) => {
    // The hook will automatically update the cache
    setRescheduleModalOpen(false);
    setSessionToReschedule(null);
  };

  const handleCreateSession = async () => {
    if (!user?.id) {
      toast({
        title: t('common.error'),
        description: t('sessions.toast.loginRequired'),
        variant: 'destructive',
      });
      return;
    }

    if (!newSessionData.time || !newSessionData.coach || !newSessionData.type) {
      toast({
        title: t('common.error'),
        description: t('sessions.toast.fillRequiredFields'),
        variant: 'destructive',
      });
      return;
    }

    try {
      // Combine date and time into a proper ISO string
      const [hours, minutes] = newSessionData.time.split(':');
      const sessionDateTime = new Date(newSessionData.date);
      sessionDateTime.setHours(parseInt(hours), parseInt(minutes), 0, 0);
      
      // Transform form data to match CreateSessionData interface
      const createSessionPayload: CreateSessionData = {
        client_id: user.id,
        coach_id: newSessionData.coach,
        date: sessionDateTime.toISOString(),
        notes: newSessionData.notes,
        title: newSessionData.title, // Added
        type: newSessionData.type,   // Added
      };

      await createSessionMutation.mutateAsync(createSessionPayload);
      setIsDialogOpen(false);
      setNewSessionData({
        date: new Date(),
        time: '',
        coach: '',
        type: '',
        notes: '',
      });
      toast({
        title: t('common.success'),
        description: t('sessions.toast.sessionScheduled'),
      });
    } catch (err) {
      toast({
        title: t('common.error'),
        description: err instanceof Error ? err.message : t('sessions.toast.createError'),
        variant: 'destructive',
      });
    }
  };

  const sessionsByDate = sessions.reduce<Record<string, Session[]>>((acc, session) => {
    const dateStr = format(new Date(session.date), 'yyyy-MM-dd');
    if (!acc[dateStr]) {
      acc[dateStr] = [];
    }
    acc[dateStr].push(session);
    return acc;
  }, {});

  const selectedDateStr = selectedDate ? format(selectedDate, 'yyyy-MM-dd') : '';
  const selectedSessions = selectedDateStr ? sessionsByDate[selectedDateStr] || [] : [];

  // Filter sessions based on search term and filters
  const filteredSessions = sessions.filter(session => {
    const matchesSearch = searchTerm === '' || 
      session.title?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      session.notes?.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesStatus = statusFilter === 'all' || session.status === statusFilter;
    const matchesType = typeFilter === 'all' || session.type === typeFilter;
    
    return matchesSearch && matchesStatus && matchesType;
  });

  const deleteSessionMutation = useDeleteSession();

  // Add delete session handler
  const handleDeleteSession = async (sessionId: string) => {
    if (window.confirm(t('sessions.confirmDelete', 'Are you sure you want to delete this session?'))) {
      try {
        await deleteSessionMutation.mutateAsync(sessionId);
        toast({
          title: t('common.success'),
          description: t('sessions.toast.sessionDeleted', 'Session deleted successfully'),
        });
      } catch (err) {
        toast({
          title: t('common.error'),
          description: err instanceof Error ? err.message : t('sessions.toast.deleteError', 'Failed to delete session'),
          variant: 'destructive',
        });
      }
    }
  };

  if (isLoading && !sessions.length) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
        {/* Language Switcher - Fixed position */}
        <div className="fixed top-4 right-4 z-50">
          <LanguageSwitcher />
        </div>

        <div className={cn(
          "max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8",
          isRTL && "direction-rtl"
        )}>
          {/* Header Section Skeleton */}
          <div className="bg-white/90 backdrop-blur-sm rounded-2xl p-8 shadow-lg mb-8">
            <div className={cn(
              "flex items-center justify-between",
              isRTL && "flex-row-reverse"
            )}>
              <div className="flex-1">
                <LoadingSkeleton width="180px" height="36px" className="mb-2" />
                <LoadingSkeleton width="300px" height="20px" />
              </div>
              <div className="flex items-center gap-4">
                <div className="hidden md:block">
                  <LoadingSkeleton width="64px" height="64px" variant="rounded" />
                </div>
                <LoadingSkeleton width="120px" height="40px" variant="button" />
              </div>
            </div>
          </div>

          {/* Stats Cards Skeleton */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            {Array.from({ length: 4 }).map((_, index) => (
              <StatsCardSkeleton key={index} delay={index * 100} />
            ))}
          </div>

          {/* Filters and Search Skeleton */}
          <div className="bg-white/90 backdrop-blur-sm rounded-2xl p-6 shadow-lg mb-8">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <FormFieldSkeleton />
              <FormFieldSkeleton />
              <FormFieldSkeleton />
            </div>
          </div>

          {/* Sessions Content Skeleton */}
          <div className="bg-white/90 backdrop-blur-sm rounded-2xl p-6 shadow-lg">
            {/* View toggle skeleton */}
            <div className="flex justify-between items-center mb-6">
              <LoadingSkeleton width="140px" height="24px" />
              <LoadingSkeleton width="120px" height="36px" variant="button" />
            </div>
            
            {/* Calendar/List view skeleton */}
            <div className="space-y-4">
              {Array.from({ length: 3 }).map((_, index) => (
                <div key={index} className="border border-gray-200 rounded-xl p-4">
                  <div className="flex justify-between items-start mb-3">
                    <div className="flex-1">
                      <LoadingSkeleton width="200px" height="20px" className="mb-2" />
                      <LoadingSkeleton width="150px" height="16px" />
                    </div>
                    <LoadingSkeleton width="80px" height="24px" variant="badge" />
                  </div>
                  <div className="flex gap-4">
                    <LoadingSkeleton width="100px" height="14px" />
                    <LoadingSkeleton width="80px" height="14px" />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Loading Status Indicator */}
          <div className="fixed bottom-4 right-4">
            <StatusIndicator 
              status="loading" 
              message={t('sessions.loading', 'Loading sessions...')}
              className="bg-white/90 backdrop-blur-sm shadow-lg" 
            />
          </div>
        </div>
      </div>
    );
  }

  if (error && !sessions.length) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 flex items-center justify-center">
        <div className="bg-white/90 backdrop-blur-sm rounded-2xl p-8 shadow-lg">
          <div className="flex flex-col items-center">
            <p className="text-red-500 text-xl mb-4">{t('common.error')}: {error?.message || t('sessions.error')}</p>
            <p className="text-gray-600 text-lg">{t('sessions.errorDescription')}</p>
            <Button 
              onClick={() => navigate('/sessions/new')}
              className="bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white shadow-lg hover:shadow-xl transition-all duration-200"
            >
              <Plus className="w-4 h-4 mr-2" />
              {t('sessions.createNew', 'New Session')}
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
      {/* Language Switcher - Fixed position */}
      <div className="fixed top-4 right-4 z-50">
        <LanguageSwitcher />
      </div>

      <div className={cn(
        "max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8",
        isRTL && "direction-rtl"
      )}>
        {/* Header Section */}
        <div className="bg-white/90 backdrop-blur-sm rounded-2xl p-8 shadow-lg mb-8">
          <div className={cn(
            "flex items-center justify-between",
            isRTL && "flex-row-reverse"
          )}>
            <div>
              <h1 className="text-3xl font-bold bg-gradient-to-r from-purple-600 to-blue-600 bg-clip-text text-transparent mb-2">
                {t('sessions.title', 'Sessions')}
              </h1>
              <p className="text-gray-600 text-lg">
                {t('sessions.subtitle', 'Manage your coaching sessions and appointments')}
              </p>
            </div>
            <div className="flex items-center gap-4">
              <div className="hidden md:block">
                <div className="w-16 h-16 bg-gradient-to-r from-teal-500 to-blue-500 rounded-2xl flex items-center justify-center">
                  <Calendar className="w-8 h-8 text-white" />
                </div>
              </div>
              <Button 
                onClick={() => navigate('/sessions/new')}
                className="bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white shadow-lg hover:shadow-xl transition-all duration-200"
              >
                <Plus className="w-4 h-4 mr-2" />
                {t('sessions.createNew', 'New Session')}
              </Button>
            </div>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <div className="bg-white/90 backdrop-blur-sm rounded-2xl p-6 shadow-lg">
            <div className={cn(
              "flex items-center justify-between",
              isRTL && "flex-row-reverse"
            )}>
              <div>
                <p className="text-sm font-medium text-gray-600">
                  {t('sessions.stats.total', 'Total Sessions')}
                </p>
                <p className="text-2xl font-bold text-gray-900">{sessions.length}</p>
              </div>
              <div className="w-12 h-12 bg-gradient-to-r from-blue-500 to-cyan-500 rounded-xl flex items-center justify-center">
                <Users className="w-6 h-6 text-white" />
              </div>
            </div>
          </div>

          <div className="bg-white/90 backdrop-blur-sm rounded-2xl p-6 shadow-lg">
            <div className={cn(
              "flex items-center justify-between",
              isRTL && "flex-row-reverse"
            )}>
              <div>
                <p className="text-sm font-medium text-gray-600">
                  {t('sessions.stats.upcoming', 'Upcoming')}
                </p>
                <p className="text-2xl font-bold text-gray-900">
                  {sessions.filter(s => toUIStatus(s.status) === 'pending').length}
                </p>
              </div>
              <div className="w-12 h-12 bg-gradient-to-r from-green-500 to-emerald-500 rounded-xl flex items-center justify-center">
                <Calendar className="w-6 h-6 text-white" />
              </div>
            </div>
          </div>

          <div className="bg-white/90 backdrop-blur-sm rounded-2xl p-6 shadow-lg">
            <div className={cn(
              "flex items-center justify-between",
              isRTL && "flex-row-reverse"
            )}>
              <div>
                <p className="text-sm font-medium text-gray-600">
                  {t('sessions.stats.completed', 'Completed')}
                </p>
                <p className="text-2xl font-bold text-gray-900">
                  {sessions.filter(s => toUIStatus(s.status) === 'completed').length}
                </p>
              </div>
              <div className="w-12 h-12 bg-gradient-to-r from-orange-500 to-amber-500 rounded-xl flex items-center justify-center">
                <CheckCircle className="w-6 h-6 text-white" />
              </div>
            </div>
          </div>

          <div className="bg-white/90 backdrop-blur-sm rounded-2xl p-6 shadow-lg">
            <div className={cn(
              "flex items-center justify-between",
              isRTL && "flex-row-reverse"
            )}>
              <div>
                <p className="text-sm font-medium text-gray-600">
                  {t('sessions.stats.thisMonth', 'This Month')}
                </p>
                <p className="text-2xl font-bold text-gray-900">
                  {sessions.filter(s => new Date(s.date).getMonth() === new Date().getMonth()).length}
                </p>
              </div>
              <div className="w-12 h-12 bg-gradient-to-r from-purple-500 to-pink-500 rounded-xl flex items-center justify-center">
                <Sparkles className="w-6 h-6 text-white" />
              </div>
            </div>
          </div>
        </div>

        {/* Filters and Search */}
        <div className="bg-white/90 backdrop-blur-sm rounded-2xl p-6 shadow-lg mb-8">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="search" className="text-gray-700 font-medium">
                {t('sessions.search.placeholder', 'Search sessions...')}
              </Label>
              <div className="relative">
                <Search className={cn(
                  "absolute top-3 w-4 h-4 text-gray-400",
                  isRTL ? "right-3" : "left-3"
                )} />
                <Input
                  id="search"
                  placeholder={t('sessions.search.placeholder', 'Search sessions...')}
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className={cn(
                    "h-12 bg-white/50 border-gray-200 focus:border-purple-400 focus:ring-purple-400 rounded-lg transition-all duration-200",
                    isRTL ? "pr-10" : "pl-10"
                  )}
                  dir={isRTL ? 'rtl' : 'ltr'}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label className="text-gray-700 font-medium">
                {t('sessions.filter.status', 'Status')}
              </Label>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="h-12 bg-white/50 border-gray-200 focus:border-purple-400 rounded-lg">
                  <SelectValue placeholder={t('sessions.filter.allStatuses', 'All statuses')} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{t('sessions.filter.allStatuses', 'All statuses')}</SelectItem>
                  <SelectItem value="scheduled">{t('sessions.status.scheduled', 'Scheduled')}</SelectItem>
                  <SelectItem value="completed">{t('sessions.status.completed', 'Completed')}</SelectItem>
                  <SelectItem value="cancelled">{t('sessions.status.cancelled', 'Cancelled')}</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label className="text-gray-700 font-medium">
                {t('sessions.filter.type', 'Type')}
              </Label>
              <Select value={typeFilter} onValueChange={setTypeFilter}>
                <SelectTrigger className="h-12 bg-white/50 border-gray-200 focus:border-purple-400 rounded-lg">
                  <SelectValue placeholder={t('sessions.filter.allTypes', 'All types')} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{t('sessions.filter.allTypes', 'All types')}</SelectItem>
                  <SelectItem value="video">{t('sessions.type.video', 'Video Call')}</SelectItem>
                  <SelectItem value="phone">{t('sessions.type.phone', 'Phone Call')}</SelectItem>
                  <SelectItem value="in-person">{t('sessions.type.inPerson', 'In Person')}</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>

        {/* Sessions List */}
        <div className="space-y-6">
          {filteredSessions.length > 0 ? (
            filteredSessions.map((session) => (
              <div key={session.id} className="bg-white/90 backdrop-blur-sm rounded-2xl p-6 shadow-lg hover:shadow-xl transition-all duration-200">
                <div className={cn(
                  "flex items-center justify-between",
                  isRTL && "flex-row-reverse"
                )}>
                  <div className="flex-1">
                    <div className={cn(
                      "flex items-center gap-4 mb-4",
                      isRTL && "flex-row-reverse"
                    )}>
                      <div className="w-12 h-12 bg-gradient-to-r from-purple-500 to-blue-500 rounded-xl flex items-center justify-center">
                        {session.type === 'video' && <Video className="w-6 h-6 text-white" />}
                        {session.type === 'phone' && <Phone className="w-6 h-6 text-white" />}
                        {session.type === 'in-person' && <MapPin className="w-6 h-6 text-white" />}
                      </div>
                      <div className="flex-1">
                        <h3 className="text-xl font-semibold text-gray-900 mb-1">
                          {session.title}
                        </h3>
                        <div className={cn(
                          "flex items-center gap-4 text-sm text-gray-600",
                          isRTL && "flex-row-reverse"
                        )}>
                          <span className="flex items-center gap-1">
                            <Calendar className="w-4 h-4" />
                            {new Date(session.date).toLocaleDateString(isRTL ? 'he-IL' : 'en-US')}
                          </span>
                          <span className="flex items-center gap-1">
                            <Clock className="w-4 h-4" />
                            {session.time}
                          </span>
                          <span className="flex items-center gap-1">
                            <User className="w-4 h-4" />
                            {session.clientName || session.coachName}
                          </span>
                        </div>
                      </div>
                    </div>

                    {session.description && (
                      <p className="text-gray-600 mb-4 line-clamp-2">
                        {session.description}
                      </p>
                    )}

                    <div className={cn(
                      "flex items-center gap-3",
                      isRTL && "flex-row-reverse"
                    )}>
                      <Badge 
                        variant={toUIStatus(session.status) === 'completed' ? 'default' : toUIStatus(session.status) === 'pending' ? 'secondary' : 'destructive'}
                        className="px-3 py-1"
                      >
                        {t(`sessions.status.${session.status}`, session.status)}
                      </Badge>
                      <Badge variant="outline" className="px-3 py-1">
                        {t(`sessions.type.${session.type}`, session.type)}
                      </Badge>
                    </div>
                  </div>

                  <div className={cn(
                    "flex items-center gap-2 ml-6",
                    isRTL && "flex-row-reverse mr-6 ml-0"
                  )}>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => navigate(`/sessions/${session.id}`)}
                      className="h-10 px-3 hover:bg-purple-50 hover:text-purple-600"
                    >
                      <Eye className="w-4 h-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => navigate(`/sessions/${session.id}/edit`)}
                      className="h-10 px-3 hover:bg-blue-50 hover:text-blue-600"
                    >
                      <Edit className="w-4 h-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDeleteSession(session.id)}
                      className="h-10 px-3 hover:bg-red-50 hover:text-red-600"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => navigate(`/sessions/${session.id}`)}
                      className="h-10 px-3 hover:bg-gray-50 hover:text-gray-600"
                    >
                      <ChevronRight className={cn(
                        "w-4 h-4",
                        isRTL && "rotate-180"
                      )} />
                    </Button>
                  </div>
                </div>
              </div>
            ))
          ) : (
            <div className="bg-white/90 backdrop-blur-sm rounded-2xl p-12 shadow-lg text-center">
              <div className="w-16 h-16 bg-gradient-to-r from-gray-400 to-gray-500 rounded-2xl flex items-center justify-center mx-auto mb-6">
                <Calendar className="w-8 h-8 text-white" />
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-2">
                {t('sessions.empty.title', 'No sessions found')}
              </h3>
              <p className="text-gray-600 mb-6">
                {t('sessions.empty.description', 'Start by creating your first session or adjust your filters.')}
              </p>
              <Button 
                onClick={() => navigate('/sessions/new')}
                className="bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white shadow-lg hover:shadow-xl transition-all duration-200"
              >
                <Plus className="w-4 h-4 mr-2" />
                {t('sessions.createNew', 'New Session')}
              </Button>
            </div>
          )}
        </div>
      </div>

      <CancelSessionModal
        session={sessionToCancel}
        isOpen={cancelModalOpen}
        onClose={() => {
          setCancelModalOpen(false);
          setSessionToCancel(null);
        }}
        onCancelSuccess={handleCancelSuccess}
      />

      <RescheduleSessionModal
        session={sessionToReschedule}
        isOpen={rescheduleModalOpen}
        onClose={() => {
          setRescheduleModalOpen(false);
          setSessionToReschedule(null);
        }}
        onRescheduleSuccess={handleRescheduleSuccess}
      />
    </div>
  );
};

export default Sessions;
