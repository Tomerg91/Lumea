import React, { useState, useEffect, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { format, parseISO, isValid } from 'date-fns';
import { he } from 'date-fns/locale';
import {
  Calendar,
  MessageSquare,
  FileText,
  Clock,
  TrendingUp,
  TrendingDown,
  Minus,
  Target,
  Award,
  Activity
} from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent } from '../ui/card';
import { Badge } from '../ui/badge';
import { Button } from '../ui/button';
import { useAuth } from '../../contexts/AuthContext';

// ====================== TYPES ======================

interface TimelineEvent {
  id: string;
  type: 'session' | 'reflection' | 'note' | 'milestone';
  date: string;
  title: string;
  description?: string;
  status?: string;
  metadata?: Record<string, any>;
  icon: React.ReactNode;
  color: string;
}

interface SessionData {
  _id: string;
  date: string;
  status: string;
  notes?: string;
  duration?: number;
  client: {
    firstName: string;
    lastName: string;
  };
}

interface ReflectionData {
  id: string;
  createdAt: string;
  submittedAt: string;
  text?: string;
  audioUrl?: string;
  sentiment?: 'positive' | 'neutral' | 'negative';
  completionTime?: number;
}

interface CoachNoteData {
  id: string;
  createdAt: string;
  content: string;
  sessionId?: string;
  category?: string;
  isPrivate: boolean;
}

interface MilestoneData {
  id: string;
  title: string;
  description: string;
  targetDate: string;
  completedDate?: string;
  status: 'pending' | 'in-progress' | 'completed' | 'overdue';
  category: string;
}

interface ClientProgressTimelineProps {
  clientId: string;
  clientName: string;
  className?: string;
  timeRange?: 'all' | '3months' | '6months' | '1year';
  showFilters?: boolean;
}

// ====================== COMPONENT ======================

export const ClientProgressTimeline: React.FC<ClientProgressTimelineProps> = ({
  clientId,
  clientName,
  className = '',
  timeRange = '6months',
  showFilters = true
}) => {
  const { t, i18n } = useTranslation();
  const { profile } = useAuth();
  const isRTL = i18n.language === 'he';
  const locale = isRTL ? he : undefined;

  // State
  const [sessions, setSessions] = useState<SessionData[]>([]);
  const [reflections, setReflections] = useState<ReflectionData[]>([]);
  const [coachNotes, setCoachNotes] = useState<CoachNoteData[]>([]);
  const [milestones, setMilestones] = useState<MilestoneData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedTypes, setSelectedTypes] = useState<string[]>(['session', 'reflection', 'note', 'milestone']);
  const [currentTimeRange, setCurrentTimeRange] = useState(timeRange);

  // Load data
  useEffect(() => {
    loadTimelineData();
  }, [clientId, currentTimeRange]);

  const loadTimelineData = async () => {
    try {
      setLoading(true);
      setError(null);

      // Calculate date range
      const now = new Date();
      let dateFrom: Date;
      switch (currentTimeRange) {
        case '3months':
          dateFrom = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
          break;
        case '6months':
          dateFrom = new Date(now.getTime() - 180 * 24 * 60 * 60 * 1000);
          break;
        case '1year':
          dateFrom = new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000);
          break;
        default:
          dateFrom = new Date(0); // All time
      }

      // Fetch data in parallel
      const [sessionsRes, reflectionsRes, notesRes, milestonesRes] = await Promise.all([
        fetch(`/api/clients/${clientId}/sessions?from=${dateFrom.toISOString()}`, { credentials: 'include' }),
        fetch(`/api/reflections?clientId=${clientId}&from=${dateFrom.toISOString()}`, { credentials: 'include' }),
        fetch(`/api/coach-notes?clientId=${clientId}&from=${dateFrom.toISOString()}`, { credentials: 'include' }),
        fetch(`/api/milestones?clientId=${clientId}`, { credentials: 'include' })
      ]);

      // Process responses
      const [sessionsData, reflectionsData, notesData, milestonesData] = await Promise.all([
        sessionsRes.ok ? sessionsRes.json() : [],
        reflectionsRes.ok ? reflectionsRes.json() : [],
        notesRes.ok ? notesRes.json() : [],
        milestonesRes.ok ? milestonesRes.json() : []
      ]);

      setSessions(sessionsData);
      setReflections(reflectionsData);
      setCoachNotes(notesData);
      setMilestones(milestonesData);
    } catch (err) {
      console.error('Error loading timeline data:', err);
      setError(err instanceof Error ? err.message : 'Failed to load timeline data');
    } finally {
      setLoading(false);
    }
  };

  // Generate timeline events
  const timelineEvents = useMemo(() => {
    const events: TimelineEvent[] = [];

    // Add session events
    if (selectedTypes.includes('session')) {
      sessions.forEach(session => {
        const statusColor = getSessionStatusColor(session.status);
        events.push({
          id: `session-${session._id}`,
          type: 'session',
          date: session.date,
          title: t('timeline.sessionWith', 'Session with {{name}}', { name: clientName }),
          description: session.notes || t('timeline.noSessionNotes'),
          status: session.status,
          metadata: { duration: session.duration, sessionId: session._id },
          icon: <Calendar className="w-4 h-4" />,
          color: statusColor
        });
      });
    }

    // Add reflection events
    if (selectedTypes.includes('reflection')) {
      reflections.forEach(reflection => {
        const sentimentColor = getSentimentColor(reflection.sentiment);
        events.push({
          id: `reflection-${reflection.id}`,
          type: 'reflection',
          date: reflection.submittedAt || reflection.createdAt,
          title: t('timeline.reflectionSubmitted', 'Reflection Submitted'),
          description: reflection.text ? 
            reflection.text.substring(0, 150) + (reflection.text.length > 150 ? '...' : '') :
            t('timeline.audioReflection', 'Audio reflection'),
          metadata: { 
            sentiment: reflection.sentiment, 
            completionTime: reflection.completionTime,
            hasAudio: !!reflection.audioUrl
          },
          icon: <MessageSquare className="w-4 h-4" />,
          color: sentimentColor
        });
      });
    }

    // Add coach note events
    if (selectedTypes.includes('note')) {
      coachNotes.forEach(note => {
        events.push({
          id: `note-${note.id}`,
          type: 'note',
          date: note.createdAt,
          title: t('timeline.coachNote', 'Coach Note'),
          description: note.content.substring(0, 150) + (note.content.length > 150 ? '...' : ''),
          metadata: { category: note.category, sessionId: note.sessionId },
          icon: <FileText className="w-4 h-4" />,
          color: 'bg-purple-100 text-purple-800 border-purple-200'
        });
      });
    }

    // Add milestone events
    if (selectedTypes.includes('milestone')) {
      milestones.forEach(milestone => {
        const milestoneColor = getMilestoneStatusColor(milestone.status);
        events.push({
          id: `milestone-${milestone.id}`,
          type: 'milestone',
          date: milestone.completedDate || milestone.targetDate,
          title: milestone.title,
          description: milestone.description,
          status: milestone.status,
          metadata: { category: milestone.category, targetDate: milestone.targetDate },
          icon: milestone.status === 'completed' ? <Award className="w-4 h-4" /> : <Target className="w-4 h-4" />,
          color: milestoneColor
        });
      });
    }

    // Sort by date (newest first)
    return events.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [sessions, reflections, coachNotes, milestones, selectedTypes, clientName, t]);

  // Helper functions
  const getSessionStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case 'completed':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'in-progress':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'cancelled':
        return 'bg-red-100 text-red-800 border-red-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getSentimentColor = (sentiment?: string) => {
    switch (sentiment) {
      case 'positive':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'negative':
        return 'bg-red-100 text-red-800 border-red-200';
      default:
        return 'bg-blue-100 text-blue-800 border-blue-200';
    }
  };

  const getMilestoneStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'in-progress':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'overdue':
        return 'bg-red-100 text-red-800 border-red-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const formatDate = (dateString: string) => {
    try {
      const date = parseISO(dateString);
      if (!isValid(date)) return t('timeline.invalidDate');
      return format(date, 'PPP p', { locale });
    } catch (error) {
      return t('timeline.invalidDate');
    }
  };

  const formatDateShort = (dateString: string) => {
    try {
      const date = parseISO(dateString);
      if (!isValid(date)) return t('timeline.invalidDate');
      return format(date, 'MMM d, yyyy', { locale });
    } catch (error) {
      return t('timeline.invalidDate');
    }
  };

  const toggleEventType = (type: string) => {
    setSelectedTypes(prev => 
      prev.includes(type) 
        ? prev.filter(t => t !== type)
        : [...prev, type]
    );
  };

  // Render loading state
  if (loading) {
    return (
      <Card className={className}>
        <CardContent className="p-6">
          <div className="flex items-center justify-center">
            <div className="animate-spin h-8 w-8 border-4 border-lumea-primary border-t-transparent rounded-full" />
            <span className="ml-3 text-gray-600">{t('timeline.loading', 'Loading timeline...')}</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Render error state
  if (error) {
    return (
      <Card className={className}>
        <CardContent className="p-6">
          <div className="text-center">
            <div className="text-red-600 mb-2">{t('timeline.error', 'Error loading timeline')}</div>
            <p className="text-gray-600 mb-4">{error}</p>
            <Button onClick={loadTimelineData} variant="outline">
              {t('timeline.retry', 'Retry')}
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={className}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center">
            <Activity className="w-5 h-5 mr-2 text-lumea-primary" />
            {t('timeline.title', 'Progress Timeline')}
          </CardTitle>
          <Badge variant="outline">
            {timelineEvents.length} {t('timeline.events', 'events')}
          </Badge>
        </div>

        {/* Filters */}
        {showFilters && (
          <div className="space-y-4">
            {/* Time Range Filter */}
            <div className="flex flex-wrap gap-2">
              <span className="text-sm font-medium text-gray-700 mr-2">{t('timeline.timeRange', 'Time Range')}:</span>
              {[
                { value: '3months', label: t('timeline.3months', '3 Months') },
                { value: '6months', label: t('timeline.6months', '6 Months') },
                { value: '1year', label: t('timeline.1year', '1 Year') },
                { value: 'all', label: t('timeline.all', 'All Time') }
              ].map(option => (
                <Button
                  key={option.value}
                  variant={currentTimeRange === option.value ? "default" : "outline"}
                  size="sm"
                  onClick={() => setCurrentTimeRange(option.value as any)}
                >
                  {option.label}
                </Button>
              ))}
            </div>

            {/* Event Type Filter */}
            <div className="flex flex-wrap gap-2">
              <span className="text-sm font-medium text-gray-700 mr-2">{t('timeline.showEvents', 'Show')}:</span>
              {[
                { value: 'session', label: t('timeline.sessions', 'Sessions'), icon: Calendar },
                { value: 'reflection', label: t('timeline.reflections', 'Reflections'), icon: MessageSquare },
                { value: 'note', label: t('timeline.notes', 'Notes'), icon: FileText },
                { value: 'milestone', label: t('timeline.milestones', 'Milestones'), icon: Target }
              ].map(option => {
                const Icon = option.icon;
                return (
                  <Button
                    key={option.value}
                    variant={selectedTypes.includes(option.value) ? "default" : "outline"}
                    size="sm"
                    onClick={() => toggleEventType(option.value)}
                    className="flex items-center"
                  >
                    <Icon className="w-3 h-3 mr-1" />
                    {option.label}
                  </Button>
                );
              })}
            </div>
          </div>
        )}
      </CardHeader>

      <CardContent>
        {timelineEvents.length === 0 ? (
          <div className="text-center py-8">
            <Activity className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <h4 className="text-lg font-medium text-gray-900 mb-2">
              {t('timeline.noEvents', 'No events found')}
            </h4>
            <p className="text-gray-600">
              {t('timeline.noEventsMessage', 'No events found for the selected time range and filters.')}
            </p>
          </div>
        ) : (
          <div className="space-y-6">
            {timelineEvents.map((event, index) => (
              <div key={event.id} className="relative">
                {/* Timeline line */}
                {index < timelineEvents.length - 1 && (
                  <div className="absolute left-6 top-12 bottom-0 w-0.5 bg-gray-200" />
                )}

                {/* Event */}
                <div className="flex items-start space-x-4">
                  {/* Icon */}
                  <div className={`flex-shrink-0 w-12 h-12 rounded-full border-2 flex items-center justify-center ${event.color}`}>
                    {event.icon}
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className="bg-white border border-gray-200 rounded-lg p-4 shadow-sm">
                      {/* Header */}
                      <div className="flex items-center justify-between mb-2">
                        <h4 className="font-medium text-gray-900">{event.title}</h4>
                        <div className="flex items-center space-x-2">
                          {event.status && (
                            <Badge variant="outline" className={event.color}>
                              {event.status}
                            </Badge>
                          )}
                          <span className="text-sm text-gray-500">
                            {formatDateShort(event.date)}
                          </span>
                        </div>
                      </div>

                      {/* Description */}
                      {event.description && (
                        <p className="text-gray-700 text-sm mb-3">{event.description}</p>
                      )}

                      {/* Metadata */}
                      {event.metadata && (
                        <div className="flex flex-wrap gap-2 text-xs">
                          {event.type === 'session' && event.metadata.duration && (
                            <Badge variant="outline">
                              <Clock className="w-3 h-3 mr-1" />
                              {event.metadata.duration}min
                            </Badge>
                          )}
                          {event.type === 'reflection' && event.metadata.sentiment && (
                            <Badge variant="outline">
                              {event.metadata.sentiment === 'positive' && <TrendingUp className="w-3 h-3 mr-1" />}
                              {event.metadata.sentiment === 'negative' && <TrendingDown className="w-3 h-3 mr-1" />}
                              {event.metadata.sentiment === 'neutral' && <Minus className="w-3 h-3 mr-1" />}
                              {event.metadata.sentiment}
                            </Badge>
                          )}
                          {event.metadata.category && (
                            <Badge variant="outline">
                              {event.metadata.category}
                            </Badge>
                          )}
                          {event.metadata.hasAudio && (
                            <Badge variant="outline">
                              Audio
                            </Badge>
                          )}
                        </div>
                      )}

                      {/* Full timestamp */}
                      <div className="mt-3 pt-3 border-t border-gray-100">
                        <span className="text-xs text-gray-500">
                          {formatDate(event.date)}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default ClientProgressTimeline; 