import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { 
  Calendar, 
  Clock, 
  Users, 
  TrendingUp, 
  Plus, 
  Settings,
  CheckCircle,
  XCircle,
  AlertCircle,
  RefreshCw,
  Filter,
  Download,
  Eye,
  Edit,
  Trash2
} from 'lucide-react';
import { format, startOfWeek, endOfWeek, addDays, isSameDay, isToday, isTomorrow } from 'date-fns';
import { useSessions } from '@/hooks/useSessions';
import { useTranslation } from 'react-i18next';

interface UpcomingAppointment {
  id: string;
  clientName: string;
  clientEmail: string;
  date: Date;
  duration: number;
  type: string;
  status: 'confirmed' | 'pending' | 'cancelled';
  notes?: string;
  isRecurring: boolean;
  meetingLink?: string;
}

interface BookingRequest {
  id: string;
  clientName: string;
  clientEmail: string;
  requestedDate: Date;
  duration: number;
  message: string;
  status: 'pending' | 'approved' | 'declined';
  createdAt: Date;
}

interface SchedulingStats {
  totalAppointments: number;
  upcomingAppointments: number;
  pendingRequests: number;
  completedThisWeek: number;
  cancellationRate: number;
  averageBookingLead: number;
  popularTimeSlots: string[];
  busyDays: string[];
}

export const SchedulingDashboard: React.FC = () => {
  const { t } = useTranslation();
  const { toast } = useToast();
  const { user } = useAuth();
  const { data: sessions = [], isLoading } = useSessions();

  const [activeTab, setActiveTab] = useState<'overview' | 'appointments' | 'requests' | 'analytics'>('overview');
  const [selectedWeek, setSelectedWeek] = useState(new Date());
  const [upcomingAppointments, setUpcomingAppointments] = useState<UpcomingAppointment[]>([]);
  const [bookingRequests, setBookingRequests] = useState<BookingRequest[]>([]);
  const [schedulingStats, setSchedulingStats] = useState<SchedulingStats>({
    totalAppointments: 0,
    upcomingAppointments: 0,
    pendingRequests: 0,
    completedThisWeek: 0,
    cancellationRate: 0,
    averageBookingLead: 0,
    popularTimeSlots: [],
    busyDays: []
  });
  const [isLoadingData, setIsLoadingData] = useState(true);

  // Load scheduling data
  useEffect(() => {
    loadSchedulingData();
  }, [selectedWeek, sessions]);

  const loadSchedulingData = async () => {
    try {
      setIsLoadingData(true);
      
      // Transform sessions data into appointments
      const appointments: UpcomingAppointment[] = sessions
        .filter(session => new Date(session.date) > new Date())
        .map(session => ({
          id: session.id,
          clientName: `${session.client?.firstName || 'Unknown'} ${session.client?.lastName || 'Client'}`,
          clientEmail: session.client?.email || '',
          date: new Date(session.date),
          duration: session.duration || 60,
          type: session.type || 'Coaching Session',
          status: session.status === 'scheduled' ? 'confirmed' : 'pending',
          notes: session.notes,
          isRecurring: false,
          meetingLink: session.meetingLink
        }));

      setUpcomingAppointments(appointments);

      // Mock booking requests data
      const mockRequests: BookingRequest[] = [
        {
          id: '1',
          clientName: 'David Miller',
          clientEmail: 'david@example.com',
          requestedDate: addDays(new Date(), 3),
          duration: 60,
          message: 'Looking for help with career transition planning.',
          status: 'pending',
          createdAt: new Date()
        },
        {
          id: '2',
          clientName: 'Sarah Johnson',
          clientEmail: 'sarah@example.com',
          requestedDate: addDays(new Date(), 5),
          duration: 90,
          message: 'Need support with relationship challenges.',
          status: 'pending',
          createdAt: new Date()
        }
      ];

      setBookingRequests(mockRequests);

      // Calculate scheduling stats
      const weekStart = startOfWeek(selectedWeek);
      const weekEnd = endOfWeek(selectedWeek);
      const weekSessions = sessions.filter(session => {
        const sessionDate = new Date(session.date);
        return sessionDate >= weekStart && sessionDate <= weekEnd;
      });

      const stats: SchedulingStats = {
        totalAppointments: sessions.length,
        upcomingAppointments: appointments.length,
        pendingRequests: mockRequests.filter(req => req.status === 'pending').length,
        completedThisWeek: weekSessions.filter(session => session.status === 'completed').length,
        cancellationRate: sessions.length > 0 ? (sessions.filter(s => s.status === 'cancelled').length / sessions.length) * 100 : 0,
        averageBookingLead: 5, // Mock data
        popularTimeSlots: ['10:00 AM', '2:00 PM', '4:00 PM'],
        busyDays: ['Monday', 'Wednesday', 'Friday']
      };

      setSchedulingStats(stats);
    } catch (error) {
      console.error('Error loading scheduling data:', error);
      toast({
        title: 'Error',
        description: 'Failed to load scheduling data',
        variant: 'destructive'
      });
    } finally {
      setIsLoadingData(false);
    }
  };

  const handleApproveRequest = async (requestId: string) => {
    try {
      // Mock API call
      setBookingRequests(prev => 
        prev.map(req => 
          req.id === requestId 
            ? { ...req, status: 'approved' as const }
            : req
        )
      );

      toast({
        title: 'Request Approved',
        description: 'Booking request has been approved and session scheduled.',
      });
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to approve booking request',
        variant: 'destructive'
      });
    }
  };

  const handleDeclineRequest = async (requestId: string) => {
    try {
      // Mock API call
      setBookingRequests(prev => 
        prev.map(req => 
          req.id === requestId 
            ? { ...req, status: 'declined' as const }
            : req
        )
      );

      toast({
        title: 'Request Declined',
        description: 'Booking request has been declined.',
      });
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to decline booking request',
        variant: 'destructive'
      });
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'confirmed':
        return <CheckCircle className="h-4 w-4 text-green-600" />;
      case 'pending':
        return <AlertCircle className="h-4 w-4 text-yellow-600" />;
      case 'cancelled':
        return <XCircle className="h-4 w-4 text-red-600" />;
      default:
        return <Clock className="h-4 w-4 text-gray-400" />;
    }
  };

  const getStatusBadge = (status: string) => {
    const variants = {
      confirmed: 'bg-green-100 text-green-800',
      pending: 'bg-yellow-100 text-yellow-800',
      cancelled: 'bg-red-100 text-red-800',
      approved: 'bg-blue-100 text-blue-800',
      declined: 'bg-gray-100 text-gray-800'
    };

    return (
      <Badge className={variants[status as keyof typeof variants] || 'bg-gray-100 text-gray-800'}>
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </Badge>
    );
  };

  const formatTimeUntil = (date: Date) => {
    if (isToday(date)) return 'Today';
    if (isTomorrow(date)) return 'Tomorrow';
    return format(date, 'MMM d');
  };

  if (isLoading || isLoadingData) {
    return (
      <div className="space-y-6">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-1/4 mb-4"></div>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-6">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="h-32 bg-gray-200 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-playfair mb-2">Scheduling Dashboard</h1>
          <p className="text-muted-foreground">Manage your appointments and booking requests</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm">
            <Settings className="h-4 w-4 mr-2" />
            Settings
          </Button>
          <Button size="sm">
            <Plus className="h-4 w-4 mr-2" />
            New Appointment
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Upcoming</p>
                <p className="text-2xl font-bold">{schedulingStats.upcomingAppointments}</p>
              </div>
              <Calendar className="h-8 w-8 text-blue-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Pending Requests</p>
                <p className="text-2xl font-bold">{schedulingStats.pendingRequests}</p>
              </div>
              <Clock className="h-8 w-8 text-yellow-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">This Week</p>
                <p className="text-2xl font-bold">{schedulingStats.completedThisWeek}</p>
              </div>
              <TrendingUp className="h-8 w-8 text-green-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Total Sessions</p>
                <p className="text-2xl font-bold">{schedulingStats.totalAppointments}</p>
              </div>
              <Users className="h-8 w-8 text-purple-600" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Content */}
      <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as any)} className="space-y-6">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="appointments">Appointments</TabsTrigger>
          <TabsTrigger value="requests">Requests</TabsTrigger>
          <TabsTrigger value="analytics">Analytics</TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Upcoming Appointments */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Calendar className="h-5 w-5" />
                  Upcoming Appointments
                </CardTitle>
                <CardDescription>Next 7 days</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {upcomingAppointments.slice(0, 5).map((appointment) => (
                    <div key={appointment.id} className="flex items-center justify-between p-3 border rounded-lg">
                      <div className="flex items-center gap-3">
                        {getStatusIcon(appointment.status)}
                        <div>
                          <p className="font-medium">{appointment.clientName}</p>
                          <p className="text-sm text-muted-foreground">
                            {formatTimeUntil(appointment.date)} at {format(appointment.date, 'h:mm a')}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {getStatusBadge(appointment.status)}
                        <Button variant="ghost" size="sm">
                          <Eye className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                  {upcomingAppointments.length === 0 && (
                    <div className="text-center py-8 text-muted-foreground">
                      <Calendar className="h-12 w-12 mx-auto mb-4 opacity-50" />
                      <p>No upcoming appointments</p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Booking Requests */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <AlertCircle className="h-5 w-5" />
                  Pending Requests
                </CardTitle>
                <CardDescription>Require your attention</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {bookingRequests.filter(req => req.status === 'pending').map((request) => (
                    <div key={request.id} className="p-3 border rounded-lg">
                      <div className="flex items-start justify-between mb-2">
                        <div>
                          <p className="font-medium">{request.clientName}</p>
                          <p className="text-sm text-muted-foreground">
                            {format(request.requestedDate, 'MMM d, yyyy')} at {format(request.requestedDate, 'h:mm a')}
                          </p>
                        </div>
                        <Badge variant="outline">{request.duration} min</Badge>
                      </div>
                      <p className="text-sm text-muted-foreground mb-3">{request.message}</p>
                      <div className="flex gap-2">
                        <Button 
                          size="sm" 
                          onClick={() => handleApproveRequest(request.id)}
                          className="bg-green-600 hover:bg-green-700"
                        >
                          <CheckCircle className="h-4 w-4 mr-1" />
                          Approve
                        </Button>
                        <Button 
                          size="sm" 
                          variant="outline"
                          onClick={() => handleDeclineRequest(request.id)}
                        >
                          <XCircle className="h-4 w-4 mr-1" />
                          Decline
                        </Button>
                      </div>
                    </div>
                  ))}
                  {bookingRequests.filter(req => req.status === 'pending').length === 0 && (
                    <div className="text-center py-8 text-muted-foreground">
                      <CheckCircle className="h-12 w-12 mx-auto mb-4 opacity-50" />
                      <p>No pending requests</p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Appointments Tab */}
        <TabsContent value="appointments">
          <Card>
            <CardHeader>
              <CardTitle>All Appointments</CardTitle>
              <CardDescription>Manage your scheduled appointments</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {upcomingAppointments.map((appointment) => (
                  <div key={appointment.id} className="flex items-center justify-between p-4 border rounded-lg">
                    <div className="flex items-center gap-4">
                      {getStatusIcon(appointment.status)}
                      <div>
                        <p className="font-medium">{appointment.clientName}</p>
                        <p className="text-sm text-muted-foreground">{appointment.clientEmail}</p>
                        <p className="text-sm text-muted-foreground">
                          {format(appointment.date, 'MMM d, yyyy')} at {format(appointment.date, 'h:mm a')} ({appointment.duration} min)
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {getStatusBadge(appointment.status)}
                      <Button variant="ghost" size="sm">
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="sm">
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Requests Tab */}
        <TabsContent value="requests">
          <Card>
            <CardHeader>
              <CardTitle>Booking Requests</CardTitle>
              <CardDescription>Review and manage booking requests</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {bookingRequests.map((request) => (
                  <div key={request.id} className="p-4 border rounded-lg">
                    <div className="flex items-start justify-between mb-3">
                      <div>
                        <p className="font-medium">{request.clientName}</p>
                        <p className="text-sm text-muted-foreground">{request.clientEmail}</p>
                        <p className="text-sm text-muted-foreground">
                          Requested: {format(request.requestedDate, 'MMM d, yyyy')} at {format(request.requestedDate, 'h:mm a')}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        {getStatusBadge(request.status)}
                        <Badge variant="outline">{request.duration} min</Badge>
                      </div>
                    </div>
                    <p className="text-sm mb-3">{request.message}</p>
                    {request.status === 'pending' && (
                      <div className="flex gap-2">
                        <Button 
                          size="sm" 
                          onClick={() => handleApproveRequest(request.id)}
                          className="bg-green-600 hover:bg-green-700"
                        >
                          <CheckCircle className="h-4 w-4 mr-1" />
                          Approve
                        </Button>
                        <Button 
                          size="sm" 
                          variant="outline"
                          onClick={() => handleDeclineRequest(request.id)}
                        >
                          <XCircle className="h-4 w-4 mr-1" />
                          Decline
                        </Button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Analytics Tab */}
        <TabsContent value="analytics">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Scheduling Statistics</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex justify-between">
                    <span>Cancellation Rate</span>
                    <span className="font-medium">{schedulingStats.cancellationRate.toFixed(1)}%</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Average Booking Lead</span>
                    <span className="font-medium">{schedulingStats.averageBookingLead} days</span>
                  </div>
                  <div>
                    <p className="font-medium mb-2">Popular Time Slots</p>
                    <div className="flex flex-wrap gap-2">
                      {schedulingStats.popularTimeSlots.map((slot, index) => (
                        <Badge key={index} variant="secondary">{slot}</Badge>
                      ))}
                    </div>
                  </div>
                  <div>
                    <p className="font-medium mb-2">Busy Days</p>
                    <div className="flex flex-wrap gap-2">
                      {schedulingStats.busyDays.map((day, index) => (
                        <Badge key={index} variant="outline">{day}</Badge>
                      ))}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Quick Actions</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <Button className="w-full justify-start" variant="outline">
                    <Download className="h-4 w-4 mr-2" />
                    Export Schedule
                  </Button>
                  <Button className="w-full justify-start" variant="outline">
                    <RefreshCw className="h-4 w-4 mr-2" />
                    Sync Calendars
                  </Button>
                  <Button className="w-full justify-start" variant="outline">
                    <Settings className="h-4 w-4 mr-2" />
                    Availability Settings
                  </Button>
                  <Button className="w-full justify-start" variant="outline">
                    <Filter className="h-4 w-4 mr-2" />
                    Booking Preferences
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}; 