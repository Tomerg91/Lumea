import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Progress } from '@/components/ui/progress';
import { useToast } from '@/hooks/use-toast';
import { 
  BarChart3, 
  TrendingUp, 
  TrendingDown, 
  Users, 
  Calendar, 
  Clock, 
  Target,
  DollarSign,
  Star,
  AlertCircle,
  CheckCircle,
  Download,
  Filter,
  RefreshCw,
  Eye,
  Zap,
  Activity,
  PieChart,
  LineChart
} from 'lucide-react';
import { format, subDays, subWeeks, subMonths, startOfWeek, endOfWeek } from 'date-fns';
import { useTranslation } from 'react-i18next';

interface BookingMetrics {
  totalBookings: number;
  confirmedBookings: number;
  cancelledBookings: number;
  noShowBookings: number;
  averageBookingLead: number;
  bookingConversionRate: number;
  averageSessionDuration: number;
  totalRevenue: number;
  averageRevenuePerBooking: number;
  clientRetentionRate: number;
}

interface BookingTrend {
  period: string;
  bookings: number;
  cancellations: number;
  revenue: number;
  conversionRate: number;
}

interface TimeSlotAnalytics {
  timeSlot: string;
  bookingCount: number;
  conversionRate: number;
  averageRating: number;
  revenue: number;
  popularityScore: number;
}

interface ClientBehavior {
  segment: string;
  clientCount: number;
  averageBookingsPerClient: number;
  preferredTimeSlots: string[];
  cancellationRate: number;
  averageSessionRating: number;
  lifetimeValue: number;
}

interface BookingSource {
  source: string;
  bookings: number;
  conversionRate: number;
  revenue: number;
  averageRating: number;
}

interface OptimizationRecommendation {
  id: string;
  type: 'time_slot' | 'pricing' | 'availability' | 'marketing' | 'client_experience';
  priority: 'high' | 'medium' | 'low';
  title: string;
  description: string;
  potentialImpact: string;
  estimatedRevenue: number;
  implementationEffort: 'low' | 'medium' | 'high';
  status: 'new' | 'in_progress' | 'completed' | 'dismissed';
}

export const BookingAnalyticsDashboard: React.FC = () => {
  const { t } = useTranslation();
  const { toast } = useToast();

  const [activeTab, setActiveTab] = useState<'overview' | 'trends' | 'performance' | 'clients' | 'optimization'>('overview');
  const [timeRange, setTimeRange] = useState<'7d' | '30d' | '90d' | '1y'>('30d');
  const [isLoading, setIsLoading] = useState(true);

  const [bookingMetrics, setBookingMetrics] = useState<BookingMetrics>({
    totalBookings: 0,
    confirmedBookings: 0,
    cancelledBookings: 0,
    noShowBookings: 0,
    averageBookingLead: 0,
    bookingConversionRate: 0,
    averageSessionDuration: 0,
    totalRevenue: 0,
    averageRevenuePerBooking: 0,
    clientRetentionRate: 0
  });

  const [bookingTrends, setBookingTrends] = useState<BookingTrend[]>([]);
  const [timeSlotAnalytics, setTimeSlotAnalytics] = useState<TimeSlotAnalytics[]>([]);
  const [clientBehavior, setClientBehavior] = useState<ClientBehavior[]>([]);
  const [bookingSources, setBookingSources] = useState<BookingSource[]>([]);
  const [recommendations, setRecommendations] = useState<OptimizationRecommendation[]>([]);

  useEffect(() => {
    loadAnalyticsData();
  }, [timeRange]);

  const loadAnalyticsData = async () => {
    try {
      setIsLoading(true);

      // Mock booking metrics
      const mockMetrics: BookingMetrics = {
        totalBookings: 347,
        confirmedBookings: 312,
        cancelledBookings: 28,
        noShowBookings: 7,
        averageBookingLead: 5.2,
        bookingConversionRate: 89.9,
        averageSessionDuration: 68,
        totalRevenue: 34700,
        averageRevenuePerBooking: 100,
        clientRetentionRate: 78.5
      };

      setBookingMetrics(mockMetrics);

      // Mock booking trends
      const mockTrends: BookingTrend[] = [
        { period: 'Week 1', bookings: 78, cancellations: 5, revenue: 7800, conversionRate: 93.6 },
        { period: 'Week 2', bookings: 82, cancellations: 7, revenue: 8200, conversionRate: 92.1 },
        { period: 'Week 3', bookings: 91, cancellations: 8, revenue: 9100, conversionRate: 91.9 },
        { period: 'Week 4', bookings: 96, cancellations: 8, revenue: 9600, conversionRate: 92.3 }
      ];

      setBookingTrends(mockTrends);

      // Mock time slot analytics
      const mockTimeSlots: TimeSlotAnalytics[] = [
        { timeSlot: '9:00 AM', bookingCount: 45, conversionRate: 95.7, averageRating: 4.8, revenue: 4500, popularityScore: 8.9 },
        { timeSlot: '10:00 AM', bookingCount: 52, conversionRate: 94.2, averageRating: 4.9, revenue: 5200, popularityScore: 9.2 },
        { timeSlot: '11:00 AM', bookingCount: 48, conversionRate: 92.3, averageRating: 4.7, revenue: 4800, popularityScore: 8.7 },
        { timeSlot: '2:00 PM', bookingCount: 41, conversionRate: 89.1, averageRating: 4.6, revenue: 4100, popularityScore: 8.1 },
        { timeSlot: '3:00 PM', bookingCount: 38, conversionRate: 87.8, averageRating: 4.5, revenue: 3800, popularityScore: 7.8 },
        { timeSlot: '4:00 PM', bookingCount: 35, conversionRate: 85.2, averageRating: 4.4, revenue: 3500, popularityScore: 7.2 }
      ];

      setTimeSlotAnalytics(mockTimeSlots);

      // Mock client behavior
      const mockClientBehavior: ClientBehavior[] = [
        {
          segment: 'VIP Clients',
          clientCount: 23,
          averageBookingsPerClient: 8.4,
          preferredTimeSlots: ['10:00 AM', '11:00 AM'],
          cancellationRate: 3.2,
          averageSessionRating: 4.9,
          lifetimeValue: 1250
        },
        {
          segment: 'Regular Clients',
          clientCount: 89,
          averageBookingsPerClient: 4.2,
          preferredTimeSlots: ['9:00 AM', '2:00 PM'],
          cancellationRate: 8.1,
          averageSessionRating: 4.6,
          lifetimeValue: 420
        },
        {
          segment: 'New Clients',
          clientCount: 45,
          averageBookingsPerClient: 1.8,
          preferredTimeSlots: ['3:00 PM', '4:00 PM'],
          cancellationRate: 12.5,
          averageSessionRating: 4.3,
          lifetimeValue: 180
        }
      ];

      setClientBehavior(mockClientBehavior);

      // Mock booking sources
      const mockSources: BookingSource[] = [
        { source: 'Direct Website', bookings: 156, conversionRate: 94.2, revenue: 15600, averageRating: 4.7 },
        { source: 'Referrals', bookings: 89, conversionRate: 96.8, revenue: 8900, averageRating: 4.9 },
        { source: 'Social Media', bookings: 67, conversionRate: 87.3, revenue: 6700, averageRating: 4.5 },
        { source: 'Email Campaign', bookings: 35, conversionRate: 91.4, revenue: 3500, averageRating: 4.6 }
      ];

      setBookingSources(mockSources);

      // Mock optimization recommendations
      const mockRecommendations: OptimizationRecommendation[] = [
        {
          id: '1',
          type: 'time_slot',
          priority: 'high',
          title: 'Optimize 10:00 AM Time Slot',
          description: 'Your 10:00 AM slot has the highest conversion rate and client satisfaction. Consider adding more availability.',
          potentialImpact: '+15% bookings',
          estimatedRevenue: 2340,
          implementationEffort: 'low',
          status: 'new'
        },
        {
          id: '2',
          type: 'client_experience',
          priority: 'high',
          title: 'Reduce New Client Cancellation Rate',
          description: 'New clients have a 12.5% cancellation rate. Implement better onboarding and reminder systems.',
          potentialImpact: '-40% cancellations',
          estimatedRevenue: 1200,
          implementationEffort: 'medium',
          status: 'new'
        },
        {
          id: '3',
          type: 'pricing',
          priority: 'medium',
          title: 'Premium Pricing for Peak Hours',
          description: 'Morning slots (9-11 AM) have high demand. Consider premium pricing for these time slots.',
          potentialImpact: '+8% revenue',
          estimatedRevenue: 2780,
          implementationEffort: 'low',
          status: 'new'
        },
        {
          id: '4',
          type: 'marketing',
          priority: 'medium',
          title: 'Increase Referral Program',
          description: 'Referrals have the highest conversion rate (96.8%). Expand your referral incentive program.',
          potentialImpact: '+25% referrals',
          estimatedRevenue: 2225,
          implementationEffort: 'medium',
          status: 'in_progress'
        }
      ];

      setRecommendations(mockRecommendations);

    } catch (error) {
      console.error('Error loading analytics data:', error);
      toast({
        title: 'Error',
        description: 'Failed to load booking analytics',
        variant: 'destructive'
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleImplementRecommendation = async (recommendationId: string) => {
    try {
      setRecommendations(prev => 
        prev.map(rec => 
          rec.id === recommendationId 
            ? { ...rec, status: 'in_progress' }
            : rec
        )
      );

      toast({
        title: 'Recommendation Implemented',
        description: 'Optimization recommendation has been marked as in progress',
      });
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to implement recommendation',
        variant: 'destructive'
      });
    }
  };

  const getPriorityBadge = (priority: string) => {
    const variants = {
      high: 'bg-red-100 text-red-800',
      medium: 'bg-yellow-100 text-yellow-800',
      low: 'bg-blue-100 text-blue-800'
    };

    return (
      <Badge className={variants[priority as keyof typeof variants]}>
        {priority.toUpperCase()}
      </Badge>
    );
  };

  const getTypeIcon = (type: string) => {
    const icons = {
      time_slot: <Clock className="h-4 w-4" />,
      pricing: <DollarSign className="h-4 w-4" />,
      availability: <Calendar className="h-4 w-4" />,
      marketing: <Target className="h-4 w-4" />,
      client_experience: <Users className="h-4 w-4" />
    };

    return icons[type as keyof typeof icons] || <Activity className="h-4 w-4" />;
  };

  const getEffortBadge = (effort: string) => {
    const variants = {
      low: 'bg-green-100 text-green-800',
      medium: 'bg-yellow-100 text-yellow-800',
      high: 'bg-red-100 text-red-800'
    };

    return (
      <Badge variant="outline" className={variants[effort as keyof typeof variants]}>
        {effort} effort
      </Badge>
    );
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount);
  };

  const formatPercentage = (value: number) => {
    return `${value.toFixed(1)}%`;
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-1/3 mb-4"></div>
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
          <h1 className="text-3xl font-playfair mb-2">Booking Analytics</h1>
          <p className="text-muted-foreground">Insights and optimization recommendations for your scheduling</p>
        </div>
        <div className="flex gap-2">
          <Select value={timeRange} onValueChange={(value) => setTimeRange(value as any)}>
            <SelectTrigger className="w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="7d">Last 7 days</SelectItem>
              <SelectItem value="30d">Last 30 days</SelectItem>
              <SelectItem value="90d">Last 90 days</SelectItem>
              <SelectItem value="1y">Last year</SelectItem>
            </SelectContent>
          </Select>
          <Button variant="outline" size="sm">
            <Download className="h-4 w-4 mr-2" />
            Export
          </Button>
          <Button variant="outline" size="sm" onClick={loadAnalyticsData}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
        </div>
      </div>

      {/* Key Metrics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Total Bookings</p>
                <p className="text-2xl font-bold">{bookingMetrics.totalBookings}</p>
                <p className="text-xs text-green-600 flex items-center gap-1">
                  <TrendingUp className="h-3 w-3" />
                  +12% vs last period
                </p>
              </div>
              <Calendar className="h-8 w-8 text-blue-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Conversion Rate</p>
                <p className="text-2xl font-bold">{formatPercentage(bookingMetrics.bookingConversionRate)}</p>
                <p className="text-xs text-green-600 flex items-center gap-1">
                  <TrendingUp className="h-3 w-3" />
                  +2.3% vs last period
                </p>
              </div>
              <Target className="h-8 w-8 text-green-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Total Revenue</p>
                <p className="text-2xl font-bold">{formatCurrency(bookingMetrics.totalRevenue)}</p>
                <p className="text-xs text-green-600 flex items-center gap-1">
                  <TrendingUp className="h-3 w-3" />
                  +18% vs last period
                </p>
              </div>
              <DollarSign className="h-8 w-8 text-purple-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Client Retention</p>
                <p className="text-2xl font-bold">{formatPercentage(bookingMetrics.clientRetentionRate)}</p>
                <p className="text-xs text-red-600 flex items-center gap-1">
                  <TrendingDown className="h-3 w-3" />
                  -1.2% vs last period
                </p>
              </div>
              <Users className="h-8 w-8 text-orange-600" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Content */}
      <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as any)} className="space-y-6">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="trends">Trends</TabsTrigger>
          <TabsTrigger value="performance">Performance</TabsTrigger>
          <TabsTrigger value="clients">Clients</TabsTrigger>
          <TabsTrigger value="optimization">Optimization</TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Booking Status Breakdown */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <PieChart className="h-5 w-5" />
                  Booking Status Breakdown
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                      <span>Confirmed</span>
                    </div>
                    <div className="text-right">
                      <p className="font-medium">{bookingMetrics.confirmedBookings}</p>
                      <p className="text-sm text-muted-foreground">
                        {formatPercentage((bookingMetrics.confirmedBookings / bookingMetrics.totalBookings) * 100)}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 bg-red-500 rounded-full"></div>
                      <span>Cancelled</span>
                    </div>
                    <div className="text-right">
                      <p className="font-medium">{bookingMetrics.cancelledBookings}</p>
                      <p className="text-sm text-muted-foreground">
                        {formatPercentage((bookingMetrics.cancelledBookings / bookingMetrics.totalBookings) * 100)}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 bg-yellow-500 rounded-full"></div>
                      <span>No Show</span>
                    </div>
                    <div className="text-right">
                      <p className="font-medium">{bookingMetrics.noShowBookings}</p>
                      <p className="text-sm text-muted-foreground">
                        {formatPercentage((bookingMetrics.noShowBookings / bookingMetrics.totalBookings) * 100)}
                      </p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Key Performance Indicators */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <BarChart3 className="h-5 w-5" />
                  Key Performance Indicators
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div>
                    <div className="flex justify-between mb-2">
                      <span className="text-sm font-medium">Average Booking Lead Time</span>
                      <span className="text-sm">{bookingMetrics.averageBookingLead} days</span>
                    </div>
                    <Progress value={(bookingMetrics.averageBookingLead / 14) * 100} className="h-2" />
                  </div>

                  <div>
                    <div className="flex justify-between mb-2">
                      <span className="text-sm font-medium">Session Duration</span>
                      <span className="text-sm">{bookingMetrics.averageSessionDuration} min</span>
                    </div>
                    <Progress value={(bookingMetrics.averageSessionDuration / 120) * 100} className="h-2" />
                  </div>

                  <div>
                    <div className="flex justify-between mb-2">
                      <span className="text-sm font-medium">Revenue per Booking</span>
                      <span className="text-sm">{formatCurrency(bookingMetrics.averageRevenuePerBooking)}</span>
                    </div>
                    <Progress value={(bookingMetrics.averageRevenuePerBooking / 200) * 100} className="h-2" />
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Trends Tab */}
        <TabsContent value="trends" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <LineChart className="h-5 w-5" />
                Booking Trends Over Time
              </CardTitle>
              <CardDescription>Weekly booking and revenue trends</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {bookingTrends.map((trend, index) => (
                  <div key={index} className="grid grid-cols-4 gap-4 p-3 border rounded-lg">
                    <div>
                      <p className="text-sm font-medium">{trend.period}</p>
                      <p className="text-xs text-muted-foreground">Period</p>
                    </div>
                    <div>
                      <p className="text-sm font-medium">{trend.bookings}</p>
                      <p className="text-xs text-muted-foreground">Bookings</p>
                    </div>
                    <div>
                      <p className="text-sm font-medium">{formatCurrency(trend.revenue)}</p>
                      <p className="text-xs text-muted-foreground">Revenue</p>
                    </div>
                    <div>
                      <p className="text-sm font-medium">{formatPercentage(trend.conversionRate)}</p>
                      <p className="text-xs text-muted-foreground">Conversion</p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Performance Tab */}
        <TabsContent value="performance" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Time Slot Performance */}
            <Card>
              <CardHeader>
                <CardTitle>Time Slot Performance</CardTitle>
                <CardDescription>Most popular and effective time slots</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {timeSlotAnalytics.map((slot, index) => (
                    <div key={index} className="flex items-center justify-between p-3 border rounded-lg">
                      <div>
                        <p className="font-medium">{slot.timeSlot}</p>
                        <p className="text-sm text-muted-foreground">
                          {slot.bookingCount} bookings • {formatPercentage(slot.conversionRate)} conversion
                        </p>
                      </div>
                      <div className="text-right">
                        <div className="flex items-center gap-1 mb-1">
                          <Star className="h-4 w-4 text-yellow-500" />
                          <span className="text-sm">{slot.averageRating}</span>
                        </div>
                        <p className="text-sm text-muted-foreground">{formatCurrency(slot.revenue)}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Booking Sources */}
            <Card>
              <CardHeader>
                <CardTitle>Booking Sources</CardTitle>
                <CardDescription>Where your bookings come from</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {bookingSources.map((source, index) => (
                    <div key={index} className="flex items-center justify-between p-3 border rounded-lg">
                      <div>
                        <p className="font-medium">{source.source}</p>
                        <p className="text-sm text-muted-foreground">
                          {source.bookings} bookings • {formatPercentage(source.conversionRate)} conversion
                        </p>
                      </div>
                      <div className="text-right">
                        <div className="flex items-center gap-1 mb-1">
                          <Star className="h-4 w-4 text-yellow-500" />
                          <span className="text-sm">{source.averageRating}</span>
                        </div>
                        <p className="text-sm text-muted-foreground">{formatCurrency(source.revenue)}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Clients Tab */}
        <TabsContent value="clients" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Client Behavior Analysis</CardTitle>
              <CardDescription>Understanding your client segments</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {clientBehavior.map((segment, index) => (
                  <div key={index} className="p-4 border rounded-lg">
                    <div className="flex items-center justify-between mb-3">
                      <h4 className="font-medium">{segment.segment}</h4>
                      <Badge variant="outline">{segment.clientCount} clients</Badge>
                    </div>
                    
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                      <div>
                        <p className="font-medium">Avg Bookings</p>
                        <p className="text-muted-foreground">{segment.averageBookingsPerClient}</p>
                      </div>
                      <div>
                        <p className="font-medium">Cancellation Rate</p>
                        <p className="text-muted-foreground">{formatPercentage(segment.cancellationRate)}</p>
                      </div>
                      <div>
                        <p className="font-medium">Avg Rating</p>
                        <p className="text-muted-foreground">{segment.averageSessionRating}</p>
                      </div>
                      <div>
                        <p className="font-medium">Lifetime Value</p>
                        <p className="text-muted-foreground">{formatCurrency(segment.lifetimeValue)}</p>
                      </div>
                    </div>

                    <div className="mt-3">
                      <p className="text-sm font-medium mb-2">Preferred Time Slots</p>
                      <div className="flex gap-2">
                        {segment.preferredTimeSlots.map((slot, slotIndex) => (
                          <Badge key={slotIndex} variant="secondary">{slot}</Badge>
                        ))}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Optimization Tab */}
        <TabsContent value="optimization" className="space-y-6">
          <div className="grid gap-6">
            {recommendations.map((recommendation) => (
              <Card key={recommendation.id}>
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div>
                      <CardTitle className="flex items-center gap-2">
                        {getTypeIcon(recommendation.type)}
                        {recommendation.title}
                        {getPriorityBadge(recommendation.priority)}
                      </CardTitle>
                      <CardDescription>{recommendation.description}</CardDescription>
                    </div>
                    <Badge variant={recommendation.status === 'new' ? 'default' : 'secondary'}>
                      {recommendation.status.replace('_', ' ')}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-sm">
                      <div>
                        <p className="font-medium">Potential Impact</p>
                        <p className="text-green-600">{recommendation.potentialImpact}</p>
                      </div>
                      <div>
                        <p className="font-medium">Est. Revenue</p>
                        <p className="text-purple-600">{formatCurrency(recommendation.estimatedRevenue)}</p>
                      </div>
                      <div>
                        <p className="font-medium">Implementation</p>
                        <div>{getEffortBadge(recommendation.implementationEffort)}</div>
                      </div>
                    </div>

                    {recommendation.status === 'new' && (
                      <div className="flex gap-2 pt-2">
                        <Button 
                          size="sm"
                          onClick={() => handleImplementRecommendation(recommendation.id)}
                        >
                          <Zap className="h-4 w-4 mr-1" />
                          Implement
                        </Button>
                        <Button size="sm" variant="outline">
                          <Eye className="h-4 w-4 mr-1" />
                          Learn More
                        </Button>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}; 