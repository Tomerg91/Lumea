import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { 
  RotateCcw, 
  Calendar, 
  Clock, 
  Users, 
  Plus, 
  Edit, 
  Trash2, 
  Play, 
  Pause, 
  Copy,
  Settings,
  CheckCircle,
  XCircle,
  AlertTriangle,
  Eye,
  Download,
  Upload,
  Filter,
  MoreHorizontal,
  CalendarDays,
  Repeat,
  Zap
} from 'lucide-react';
import { format, addDays, addWeeks, addMonths, startOfWeek, endOfWeek, isSameDay } from 'date-fns';
import { useTranslation } from 'react-i18next';

interface RecurrencePattern {
  type: 'daily' | 'weekly' | 'biweekly' | 'monthly' | 'custom';
  interval: number;
  daysOfWeek?: number[]; // 0 = Sunday, 1 = Monday, etc.
  dayOfMonth?: number;
  endType: 'never' | 'after_sessions' | 'on_date';
  endAfterSessions?: number;
  endDate?: Date;
  skipHolidays: boolean;
  skipWeekends: boolean;
}

interface RecurringSessionSeries {
  id: string;
  templateId: string;
  clientId: string;
  clientName: string;
  clientEmail: string;
  title: string;
  description: string;
  duration: number;
  sessionType: string;
  recurrencePattern: RecurrencePattern;
  startDate: Date;
  timeSlot: string;
  isActive: boolean;
  totalSessions: number;
  completedSessions: number;
  upcomingSessions: number;
  cancelledSessions: number;
  lastSessionDate?: Date;
  nextSessionDate?: Date;
  createdAt: Date;
  updatedAt: Date;
  notes?: string;
  pricing: {
    sessionPrice: number;
    packageDiscount: number;
    totalValue: number;
  };
}

interface SessionTemplate {
  id: string;
  name: string;
  description: string;
  duration: number;
  sessionType: string;
  defaultRecurrence: RecurrencePattern;
  pricing: {
    sessionPrice: number;
    packageDiscount: number;
  };
  isActive: boolean;
  usageCount: number;
}

interface BulkOperation {
  type: 'reschedule' | 'cancel' | 'update_notes' | 'change_duration' | 'pause' | 'resume';
  seriesIds: string[];
  parameters: Record<string, any>;
  status: 'pending' | 'in_progress' | 'completed' | 'failed';
  affectedSessions: number;
  createdAt: Date;
}

export const RecurringSessionManager: React.FC = () => {
  const { t } = useTranslation();
  const { toast } = useToast();

  const [activeTab, setActiveTab] = useState<'series' | 'templates' | 'calendar' | 'bulk'>('series');
  const [recurringSeries, setRecurringSeries] = useState<RecurringSessionSeries[]>([]);
  const [sessionTemplates, setSessionTemplates] = useState<SessionTemplate[]>([]);
  const [bulkOperations, setBulkOperations] = useState<BulkOperation[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedSeries, setSelectedSeries] = useState<string[]>([]);
  const [isCreateSeriesModalOpen, setIsCreateSeriesModalOpen] = useState(false);
  const [isCreateTemplateModalOpen, setIsCreateTemplateModalOpen] = useState(false);

  const [newSeries, setNewSeries] = useState<Partial<RecurringSessionSeries>>({
    title: '',
    description: '',
    duration: 60,
    sessionType: 'coaching',
    timeSlot: '10:00',
    recurrencePattern: {
      type: 'weekly',
      interval: 1,
      daysOfWeek: [1], // Monday
      endType: 'after_sessions',
      endAfterSessions: 8,
      skipHolidays: true,
      skipWeekends: false
    }
  });

  const [newTemplate, setNewTemplate] = useState<Partial<SessionTemplate>>({
    name: '',
    description: '',
    duration: 60,
    sessionType: 'coaching',
    defaultRecurrence: {
      type: 'weekly',
      interval: 1,
      daysOfWeek: [1],
      endType: 'after_sessions',
      endAfterSessions: 8,
      skipHolidays: true,
      skipWeekends: false
    },
    pricing: {
      sessionPrice: 100,
      packageDiscount: 10
    }
  });

  useEffect(() => {
    loadRecurringData();
  }, []);

  const loadRecurringData = async () => {
    try {
      setIsLoading(true);

      // Mock recurring series data
      const mockSeries: RecurringSessionSeries[] = [
        {
          id: '1',
          templateId: 'template_1',
          clientId: 'client_1',
          clientName: 'Sarah Johnson',
          clientEmail: 'sarah@example.com',
          title: 'Weekly Life Coaching',
          description: 'Regular life coaching sessions focusing on career development',
          duration: 60,
          sessionType: 'Life Coaching',
          recurrencePattern: {
            type: 'weekly',
            interval: 1,
            daysOfWeek: [1], // Monday
            endType: 'after_sessions',
            endAfterSessions: 12,
            skipHolidays: true,
            skipWeekends: false
          },
          startDate: new Date('2024-01-15'),
          timeSlot: '10:00 AM',
          isActive: true,
          totalSessions: 12,
          completedSessions: 6,
          upcomingSessions: 6,
          cancelledSessions: 0,
          lastSessionDate: new Date('2024-01-29'),
          nextSessionDate: new Date('2024-02-05'),
          createdAt: new Date('2024-01-10'),
          updatedAt: new Date('2024-01-29'),
          notes: 'Client is making excellent progress with goal setting',
          pricing: {
            sessionPrice: 120,
            packageDiscount: 15,
            totalValue: 1224
          }
        },
        {
          id: '2',
          templateId: 'template_2',
          clientId: 'client_2',
          clientName: 'Michael Chen',
          clientEmail: 'michael@example.com',
          title: 'Bi-weekly Business Coaching',
          description: 'Strategic business coaching for startup founders',
          duration: 90,
          sessionType: 'Business Coaching',
          recurrencePattern: {
            type: 'biweekly',
            interval: 2,
            daysOfWeek: [3], // Wednesday
            endType: 'on_date',
            endDate: new Date('2024-06-30'),
            skipHolidays: true,
            skipWeekends: false
          },
          startDate: new Date('2024-01-10'),
          timeSlot: '2:00 PM',
          isActive: true,
          totalSessions: 12,
          completedSessions: 4,
          upcomingSessions: 8,
          cancelledSessions: 0,
          lastSessionDate: new Date('2024-01-24'),
          nextSessionDate: new Date('2024-02-07'),
          createdAt: new Date('2024-01-05'),
          updatedAt: new Date('2024-01-24'),
          pricing: {
            sessionPrice: 200,
            packageDiscount: 20,
            totalValue: 1920
          }
        },
        {
          id: '3',
          templateId: 'template_3',
          clientId: 'client_3',
          clientName: 'Emma Williams',
          clientEmail: 'emma@example.com',
          title: 'Monthly Check-in Sessions',
          description: 'Monthly progress review and goal adjustment sessions',
          duration: 45,
          sessionType: 'Progress Review',
          recurrencePattern: {
            type: 'monthly',
            interval: 1,
            dayOfMonth: 15,
            endType: 'never',
            skipHolidays: true,
            skipWeekends: true
          },
          startDate: new Date('2024-01-15'),
          timeSlot: '11:00 AM',
          isActive: false,
          totalSessions: 6,
          completedSessions: 2,
          upcomingSessions: 0,
          cancelledSessions: 1,
          lastSessionDate: new Date('2024-01-15'),
          nextSessionDate: undefined,
          createdAt: new Date('2024-01-01'),
          updatedAt: new Date('2024-01-20'),
          notes: 'Series paused at client request - will resume in March',
          pricing: {
            sessionPrice: 80,
            packageDiscount: 5,
            totalValue: 456
          }
        }
      ];

      setRecurringSeries(mockSeries);

      // Mock session templates
      const mockTemplates: SessionTemplate[] = [
        {
          id: 'template_1',
          name: 'Standard Life Coaching Package',
          description: 'Weekly life coaching sessions with goal setting and progress tracking',
          duration: 60,
          sessionType: 'Life Coaching',
          defaultRecurrence: {
            type: 'weekly',
            interval: 1,
            daysOfWeek: [1],
            endType: 'after_sessions',
            endAfterSessions: 12,
            skipHolidays: true,
            skipWeekends: false
          },
          pricing: {
            sessionPrice: 120,
            packageDiscount: 15
          },
          isActive: true,
          usageCount: 8
        },
        {
          id: 'template_2',
          name: 'Business Coaching Intensive',
          description: 'Bi-weekly strategic business coaching for entrepreneurs',
          duration: 90,
          sessionType: 'Business Coaching',
          defaultRecurrence: {
            type: 'biweekly',
            interval: 2,
            daysOfWeek: [3],
            endType: 'after_sessions',
            endAfterSessions: 8,
            skipHolidays: true,
            skipWeekends: false
          },
          pricing: {
            sessionPrice: 200,
            packageDiscount: 20
          },
          isActive: true,
          usageCount: 3
        },
        {
          id: 'template_3',
          name: 'Monthly Maintenance Package',
          description: 'Monthly check-in sessions for ongoing support',
          duration: 45,
          sessionType: 'Progress Review',
          defaultRecurrence: {
            type: 'monthly',
            interval: 1,
            dayOfMonth: 15,
            endType: 'never',
            skipHolidays: true,
            skipWeekends: true
          },
          pricing: {
            sessionPrice: 80,
            packageDiscount: 5
          },
          isActive: true,
          usageCount: 12
        }
      ];

      setSessionTemplates(mockTemplates);

      // Mock bulk operations
      const mockBulkOps: BulkOperation[] = [
        {
          type: 'reschedule',
          seriesIds: ['1', '2'],
          parameters: { newTimeSlot: '11:00 AM', reason: 'Schedule optimization' },
          status: 'completed',
          affectedSessions: 14,
          createdAt: new Date('2024-01-25')
        },
        {
          type: 'pause',
          seriesIds: ['3'],
          parameters: { reason: 'Client request', resumeDate: '2024-03-01' },
          status: 'completed',
          affectedSessions: 4,
          createdAt: new Date('2024-01-20')
        }
      ];

      setBulkOperations(mockBulkOps);

    } catch (error) {
      console.error('Error loading recurring data:', error);
      toast({
        title: 'Error',
        description: 'Failed to load recurring session data',
        variant: 'destructive'
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleToggleSeriesStatus = async (seriesId: string, isActive: boolean) => {
    try {
      setRecurringSeries(prev => 
        prev.map(series => 
          series.id === seriesId 
            ? { ...series, isActive, updatedAt: new Date() }
            : series
        )
      );

      toast({
        title: 'Series Updated',
        description: `Recurring series ${isActive ? 'activated' : 'paused'}`,
      });
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to update series status',
        variant: 'destructive'
      });
    }
  };

  const handleCreateSeries = async () => {
    try {
      if (!newSeries.title || !newSeries.clientName) {
        toast({
          title: 'Validation Error',
          description: 'Please fill in all required fields',
          variant: 'destructive'
        });
        return;
      }

      const series: RecurringSessionSeries = {
        id: `series_${Date.now()}`,
        templateId: 'custom',
        clientId: `client_${Date.now()}`,
        clientName: newSeries.clientName || '',
        clientEmail: newSeries.clientEmail || '',
        title: newSeries.title || '',
        description: newSeries.description || '',
        duration: newSeries.duration || 60,
        sessionType: newSeries.sessionType || 'coaching',
        recurrencePattern: newSeries.recurrencePattern!,
        startDate: newSeries.startDate || new Date(),
        timeSlot: newSeries.timeSlot || '10:00 AM',
        isActive: true,
        totalSessions: newSeries.recurrencePattern?.endAfterSessions || 0,
        completedSessions: 0,
        upcomingSessions: newSeries.recurrencePattern?.endAfterSessions || 0,
        cancelledSessions: 0,
        nextSessionDate: newSeries.startDate || new Date(),
        createdAt: new Date(),
        updatedAt: new Date(),
        notes: newSeries.notes,
        pricing: {
          sessionPrice: 100,
          packageDiscount: 10,
          totalValue: (newSeries.recurrencePattern?.endAfterSessions || 0) * 90
        }
      };

      setRecurringSeries(prev => [series, ...prev]);
      setIsCreateSeriesModalOpen(false);
      setNewSeries({
        title: '',
        description: '',
        duration: 60,
        sessionType: 'coaching',
        timeSlot: '10:00',
        recurrencePattern: {
          type: 'weekly',
          interval: 1,
          daysOfWeek: [1],
          endType: 'after_sessions',
          endAfterSessions: 8,
          skipHolidays: true,
          skipWeekends: false
        }
      });

      toast({
        title: 'Series Created',
        description: 'New recurring session series has been created',
      });
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to create series',
        variant: 'destructive'
      });
    }
  };

  const handleBulkOperation = async (operation: 'pause' | 'resume' | 'cancel') => {
    try {
      if (selectedSeries.length === 0) {
        toast({
          title: 'No Selection',
          description: 'Please select series to perform bulk operations',
          variant: 'destructive'
        });
        return;
      }

      const bulkOp: BulkOperation = {
        type: operation,
        seriesIds: selectedSeries,
        parameters: { reason: 'Bulk operation' },
        status: 'completed',
        affectedSessions: selectedSeries.length * 5, // Mock calculation
        createdAt: new Date()
      };

      setBulkOperations(prev => [bulkOp, ...prev]);

      // Update series status
      if (operation === 'pause') {
        setRecurringSeries(prev => 
          prev.map(series => 
            selectedSeries.includes(series.id) 
              ? { ...series, isActive: false, updatedAt: new Date() }
              : series
          )
        );
      } else if (operation === 'resume') {
        setRecurringSeries(prev => 
          prev.map(series => 
            selectedSeries.includes(series.id) 
              ? { ...series, isActive: true, updatedAt: new Date() }
              : series
          )
        );
      }

      setSelectedSeries([]);
      toast({
        title: 'Bulk Operation Complete',
        description: `${operation} operation applied to ${selectedSeries.length} series`,
      });
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to perform bulk operation',
        variant: 'destructive'
      });
    }
  };

  const getRecurrenceDescription = (pattern: RecurrencePattern) => {
    switch (pattern.type) {
      case 'daily':
        return `Every ${pattern.interval} day(s)`;
      case 'weekly': {
        const days = pattern.daysOfWeek?.map(day => 
          ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][day]
        ).join(', ');
        return `Every ${pattern.interval} week(s) on ${days}`;
      }
      case 'biweekly':
        return `Every 2 weeks`;
      case 'monthly':
        return `Every month on day ${pattern.dayOfMonth}`;
      default:
        return 'Custom pattern';
    }
  };

  const getStatusBadge = (series: RecurringSessionSeries) => {
    if (!series.isActive) {
      return <Badge variant="secondary">Paused</Badge>;
    }
    if (series.upcomingSessions === 0) {
      return <Badge variant="outline">Completed</Badge>;
    }
    return <Badge className="bg-green-100 text-green-800">Active</Badge>;
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount);
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-1/3 mb-4"></div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="h-32 bg-gray-200 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  const totalActiveSeries = recurringSeries.filter(s => s.isActive).length;
  const totalUpcomingSessions = recurringSeries.reduce((sum, s) => sum + s.upcomingSessions, 0);
  const totalRevenue = recurringSeries.reduce((sum, s) => sum + s.pricing.totalValue, 0);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-playfair mb-2">Recurring Session Manager</h1>
          <p className="text-muted-foreground">Manage recurring sessions and templates</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => setIsCreateTemplateModalOpen(true)}>
            <Plus className="h-4 w-4 mr-2" />
            New Template
          </Button>
          <Button size="sm" onClick={() => setIsCreateSeriesModalOpen(true)}>
            <Plus className="h-4 w-4 mr-2" />
            New Series
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Active Series</p>
                <p className="text-2xl font-bold">{totalActiveSeries}</p>
                <p className="text-xs text-muted-foreground">of {recurringSeries.length} total</p>
              </div>
              <RotateCcw className="h-8 w-8 text-blue-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Upcoming Sessions</p>
                <p className="text-2xl font-bold">{totalUpcomingSessions}</p>
                <p className="text-xs text-green-600">Next 30 days</p>
              </div>
              <Calendar className="h-8 w-8 text-green-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Total Value</p>
                <p className="text-2xl font-bold">{formatCurrency(totalRevenue)}</p>
                <p className="text-xs text-purple-600">All active series</p>
              </div>
              <Users className="h-8 w-8 text-purple-600" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Content */}
      <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as any)} className="space-y-6">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="series">Series</TabsTrigger>
          <TabsTrigger value="templates">Templates</TabsTrigger>
          <TabsTrigger value="calendar">Calendar</TabsTrigger>
          <TabsTrigger value="bulk">Bulk Operations</TabsTrigger>
        </TabsList>

        {/* Series Tab */}
        <TabsContent value="series" className="space-y-6">
          {/* Bulk Actions */}
          {selectedSeries.length > 0 && (
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">
                    {selectedSeries.length} series selected
                  </span>
                  <div className="flex gap-2">
                    <Button size="sm" variant="outline" onClick={() => handleBulkOperation('pause')}>
                      <Pause className="h-4 w-4 mr-1" />
                      Pause
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => handleBulkOperation('resume')}>
                      <Play className="h-4 w-4 mr-1" />
                      Resume
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => handleBulkOperation('cancel')}>
                      <XCircle className="h-4 w-4 mr-1" />
                      Cancel
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Series List */}
          <div className="grid gap-6">
            {recurringSeries.map((series) => (
              <Card key={series.id}>
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="flex items-start gap-3">
                      <input
                        type="checkbox"
                        checked={selectedSeries.includes(series.id)}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setSelectedSeries(prev => [...prev, series.id]);
                          } else {
                            setSelectedSeries(prev => prev.filter(id => id !== series.id));
                          }
                        }}
                        className="mt-1"
                      />
                      <div>
                        <CardTitle className="flex items-center gap-2">
                          <Repeat className="h-5 w-5" />
                          {series.title}
                          {getStatusBadge(series)}
                        </CardTitle>
                        <CardDescription>
                          {series.clientName} • {series.sessionType} • {series.duration} min
                        </CardDescription>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Switch
                        checked={series.isActive}
                        onCheckedChange={(checked) => handleToggleSeriesStatus(series.id, checked)}
                      />
                      <Button variant="ghost" size="sm">
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="sm">
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {/* Recurrence Info */}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                      <div>
                        <p className="font-medium">Pattern</p>
                        <p className="text-muted-foreground">
                          {getRecurrenceDescription(series.recurrencePattern)}
                        </p>
                      </div>
                      <div>
                        <p className="font-medium">Time Slot</p>
                        <p className="text-muted-foreground">{series.timeSlot}</p>
                      </div>
                      <div>
                        <p className="font-medium">Progress</p>
                        <p className="text-muted-foreground">
                          {series.completedSessions}/{series.totalSessions} completed
                        </p>
                      </div>
                      <div>
                        <p className="font-medium">Value</p>
                        <p className="text-muted-foreground">{formatCurrency(series.pricing.totalValue)}</p>
                      </div>
                    </div>

                    {/* Session Stats */}
                    <div className="flex items-center gap-6 text-sm pt-2 border-t">
                      <div className="flex items-center gap-2">
                        <CheckCircle className="h-4 w-4 text-green-600" />
                        <span>{series.completedSessions} completed</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Calendar className="h-4 w-4 text-blue-600" />
                        <span>{series.upcomingSessions} upcoming</span>
                      </div>
                      {series.cancelledSessions > 0 && (
                        <div className="flex items-center gap-2">
                          <XCircle className="h-4 w-4 text-red-600" />
                          <span>{series.cancelledSessions} cancelled</span>
                        </div>
                      )}
                      {series.nextSessionDate && (
                        <div className="flex items-center gap-2">
                          <Clock className="h-4 w-4 text-purple-600" />
                          <span>Next: {format(series.nextSessionDate, 'MMM d')}</span>
                        </div>
                      )}
                    </div>

                    {/* Notes */}
                    {series.notes && (
                      <Alert>
                        <AlertTriangle className="h-4 w-4" />
                        <AlertDescription>{series.notes}</AlertDescription>
                      </Alert>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        {/* Templates Tab */}
        <TabsContent value="templates" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {sessionTemplates.map((template) => (
              <Card key={template.id}>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <CalendarDays className="h-5 w-5" />
                    {template.name}
                    {template.isActive && (
                      <Badge className="bg-green-100 text-green-800">Active</Badge>
                    )}
                  </CardTitle>
                  <CardDescription>{template.description}</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <p className="font-medium">Duration</p>
                        <p className="text-muted-foreground">{template.duration} min</p>
                      </div>
                      <div>
                        <p className="font-medium">Type</p>
                        <p className="text-muted-foreground">{template.sessionType}</p>
                      </div>
                      <div>
                        <p className="font-medium">Price</p>
                        <p className="text-muted-foreground">{formatCurrency(template.pricing.sessionPrice)}</p>
                      </div>
                      <div>
                        <p className="font-medium">Used</p>
                        <p className="text-muted-foreground">{template.usageCount} times</p>
                      </div>
                    </div>

                    <div>
                      <p className="text-sm font-medium mb-1">Default Pattern</p>
                      <p className="text-sm text-muted-foreground">
                        {getRecurrenceDescription(template.defaultRecurrence)}
                      </p>
                    </div>

                    <div className="flex gap-2 pt-2">
                      <Button size="sm" variant="outline">
                        <Edit className="h-4 w-4 mr-1" />
                        Edit
                      </Button>
                      <Button size="sm" variant="outline">
                        <Copy className="h-4 w-4 mr-1" />
                        Use
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        {/* Calendar Tab */}
        <TabsContent value="calendar" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Recurring Sessions Calendar View</CardTitle>
              <CardDescription>Visual overview of all recurring sessions</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-center py-12">
                <Calendar className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                <h3 className="text-lg font-medium mb-2">Calendar Integration</h3>
                <p className="text-muted-foreground mb-4">
                  Visual calendar view for recurring sessions will be integrated here
                </p>
                <Button variant="outline">
                  <Eye className="h-4 w-4 mr-2" />
                  View Full Calendar
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Bulk Operations Tab */}
        <TabsContent value="bulk" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Bulk Operations History</CardTitle>
              <CardDescription>Recent bulk operations on recurring series</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {bulkOperations.map((operation, index) => (
                  <div key={index} className="flex items-center justify-between p-3 border rounded-lg">
                    <div>
                      <p className="font-medium capitalize">
                        {operation.type.replace('_', ' ')} Operation
                      </p>
                      <p className="text-sm text-muted-foreground">
                        {operation.affectedSessions} sessions affected • {format(operation.createdAt, 'MMM d, h:mm a')}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant={operation.status === 'completed' ? 'default' : 'secondary'}>
                        {operation.status}
                      </Badge>
                      <Button variant="ghost" size="sm">
                        <Eye className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ))}

                {bulkOperations.length === 0 && (
                  <div className="text-center py-8 text-muted-foreground">
                    <Zap className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>No bulk operations performed yet</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Create Series Modal */}
      <Dialog open={isCreateSeriesModalOpen} onOpenChange={setIsCreateSeriesModalOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Create Recurring Session Series</DialogTitle>
            <DialogDescription>
              Set up a new recurring session series for a client
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Series Title</Label>
                <Input
                  value={newSeries.title}
                  onChange={(e) => setNewSeries(prev => ({ ...prev, title: e.target.value }))}
                  placeholder="Weekly Life Coaching"
                />
              </div>
              <div>
                <Label>Client Name</Label>
                <Input
                  value={newSeries.clientName}
                  onChange={(e) => setNewSeries(prev => ({ ...prev, clientName: e.target.value }))}
                  placeholder="John Doe"
                />
              </div>
            </div>

            <div>
              <Label>Description</Label>
              <Textarea
                value={newSeries.description}
                onChange={(e) => setNewSeries(prev => ({ ...prev, description: e.target.value }))}
                placeholder="Describe the purpose and goals of this recurring series"
              />
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div>
                <Label>Duration (minutes)</Label>
                <Input
                  type="number"
                  value={newSeries.duration}
                  onChange={(e) => setNewSeries(prev => ({ ...prev, duration: parseInt(e.target.value) }))}
                />
              </div>
              <div>
                <Label>Session Type</Label>
                <Select
                  value={newSeries.sessionType}
                  onValueChange={(value) => setNewSeries(prev => ({ ...prev, sessionType: value }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="coaching">Life Coaching</SelectItem>
                    <SelectItem value="business">Business Coaching</SelectItem>
                    <SelectItem value="career">Career Coaching</SelectItem>
                    <SelectItem value="wellness">Wellness Coaching</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Time Slot</Label>
                <Input
                  value={newSeries.timeSlot}
                  onChange={(e) => setNewSeries(prev => ({ ...prev, timeSlot: e.target.value }))}
                  placeholder="10:00 AM"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-4">
              <Button variant="outline" onClick={() => setIsCreateSeriesModalOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleCreateSeries}>
                Create Series
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}; 