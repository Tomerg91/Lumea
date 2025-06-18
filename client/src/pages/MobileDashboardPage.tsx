import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Smartphone, 
  Activity, 
  Settings, 
  Bell, 
  Users, 
  Calendar,
  MessageSquare,
  BarChart3,
  BookOpen,
  Mic,
  Video,
  Clock,
  Battery,
  Wifi,
  WifiOff,
  Download,
  CheckCircle,
  AlertCircle,
  TrendingUp,
  Play,
  Pause,
  ArrowRight,
  RefreshCw
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';
import { Progress } from '../components/ui/progress';
import { Alert, AlertDescription } from '../components/ui/alert';
import { useLanguage } from '../contexts/LanguageContext';
import { useAuth } from '../contexts/AuthContext';
import { useMobileDetection } from '../hooks/useMobileDetection';
import { useNetworkStatus } from '../hooks/useNetworkStatus';
import { usePWA } from '../hooks/usePWA';
import { useToast } from '../hooks/use-toast';

interface QuickAction {
  id: string;
  title: string;
  description: string;
  icon: React.ReactNode;
  path: string;
  color: string;
  badge?: string;
}

interface MobileStats {
  sessionsToday: number;
  reflectionsWeek: number;
  clientsActive: number;
  performanceScore: number;
  storageUsed: number;
  batteryLevel: number;
}

const MobileDashboardPage: React.FC = () => {
  const { t, isRTL } = useLanguage();
  const { user, profile } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const mobileDetection = useMobileDetection();
  const networkStatus = useNetworkStatus();
  const { isInstalled, isInstallable, install } = usePWA();
  
  const [stats, setStats] = useState<MobileStats>({
    sessionsToday: 3,
    reflectionsWeek: 12,
    clientsActive: 8,
    performanceScore: 87,
    storageUsed: 34,
    batteryLevel: 78
  });
  
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [currentTime, setCurrentTime] = useState(new Date());

  // Quick Actions Configuration
  const quickActions: QuickAction[] = [
    {
      id: 'sessions',
      title: 'Sessions',
      description: 'View and manage sessions',
      icon: <Calendar className="w-5 h-5" />,
      path: '/coach/sessions',
      color: 'bg-blue-500',
      badge: stats.sessionsToday > 0 ? `${stats.sessionsToday} today` : undefined
    },
    {
      id: 'clients',
      title: 'Clients',
      description: 'Client management',
      icon: <Users className="w-5 h-5" />,
      path: '/coach/clients',
      color: 'bg-green-500',
      badge: `${stats.clientsActive} active`
    },
    {
      id: 'reflections',
      title: 'Reflections',
      description: 'Audio & text reflections',
      icon: <Mic className="w-5 h-5" />,
      path: '/reflections',
      color: 'bg-purple-500',
      badge: `${stats.reflectionsWeek} this week`
    },
    {
      id: 'communication',
      title: 'Communication',
      description: 'Messages & video calls',
      icon: <MessageSquare className="w-5 h-5" />,
      path: '/coach/communication',
      color: 'bg-orange-500'
    },
    {
      id: 'analytics',
      title: 'Analytics',
      description: 'Performance insights',
      icon: <BarChart3 className="w-5 h-5" />,
      path: '/coach/analytics',
      color: 'bg-indigo-500'
    },
    {
      id: 'resources',
      title: 'Resources',
      description: 'Learning materials',
      icon: <BookOpen className="w-5 h-5" />,
      path: '/resources',
      color: 'bg-teal-500'
    }
  ];

  // Mobile-specific actions
  const mobileActions: QuickAction[] = [
    {
      id: 'mobile-app',
      title: 'Mobile App',
      description: 'App management & features',
      icon: <Smartphone className="w-5 h-5" />,
      path: '/coach/mobile-app',
      color: 'bg-blue-600'
    },
    {
      id: 'mobile-performance',
      title: 'Performance',
      description: 'Monitor app performance',
      icon: <Activity className="w-5 h-5" />,
      path: '/coach/mobile-performance',
      color: 'bg-red-500',
      badge: `${stats.performanceScore}/100`
    },
    {
      id: 'mobile-settings',
      title: 'Mobile Settings',
      description: 'Customize mobile experience',
      icon: <Settings className="w-5 h-5" />,
      path: '/coach/mobile-settings',
      color: 'bg-gray-600'
    }
  ];

  useEffect(() => {
    // Update time every minute
    const timeInterval = setInterval(() => {
      setCurrentTime(new Date());
    }, 60000);

    // Load stats
    loadStats();

    return () => clearInterval(timeInterval);
  }, []);

  const loadStats = async () => {
    try {
      // Mock stats loading with some randomization
      setStats(prev => ({
        ...prev,
        performanceScore: Math.max(70, Math.min(100, prev.performanceScore + (Math.random() - 0.5) * 5)),
        storageUsed: Math.max(20, Math.min(80, prev.storageUsed + (Math.random() - 0.5) * 3)),
        batteryLevel: Math.max(20, Math.min(100, prev.batteryLevel + (Math.random() - 0.5) * 2))
      }));
    } catch (error) {
      console.error('Error loading stats:', error);
    }
  };

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await loadStats();
    setTimeout(() => setIsRefreshing(false), 1000);
    
    toast({
      title: 'Dashboard Refreshed',
      description: 'Latest data has been loaded',
    });
  };

  const handleInstallApp = async () => {
    if (!isInstallable) return;
    
    try {
      const success = await install();
      if (success) {
        toast({
          title: 'App Installed',
          description: 'Lumea app has been installed successfully',
        });
      }
    } catch (error) {
      console.error('Installation failed:', error);
      toast({
        title: 'Installation Failed',
        description: 'Could not install the app',
        variant: 'destructive',
      });
    }
  };

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const getGreeting = () => {
    const hour = currentTime.getHours();
    if (hour < 12) return 'Good Morning';
    if (hour < 17) return 'Good Afternoon';
    return 'Good Evening';
  };

  const getBatteryColor = (level: number) => {
    if (level > 50) return 'text-green-500';
    if (level > 20) return 'text-yellow-500';
    return 'text-red-500';
  };

  const getPerformanceColor = (score: number) => {
    if (score >= 80) return 'text-green-500';
    if (score >= 60) return 'text-yellow-500';
    return 'text-red-500';
  };

  return (
    <div className={`min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-gray-900 dark:to-gray-800 ${isRTL ? 'rtl' : 'ltr'}`}>
      <div className="container mx-auto px-4 py-6 max-w-4xl">
        {/* Header */}
        <div className="mb-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
                {getGreeting()}, {profile?.name || user?.email?.split('@')[0] || 'Coach'}!
              </h1>
              <p className="text-gray-600 dark:text-gray-400">
                {formatTime(currentTime)} • Mobile Dashboard
              </p>
            </div>
            
            <div className="flex items-center gap-2">
              <Badge variant={mobileDetection.isMobile ? 'default' : 'secondary'}>
                <Smartphone className="w-3 h-3 mr-1" />
                {mobileDetection.isMobile ? 'Mobile' : 'Desktop'}
              </Badge>
              <Button
                onClick={handleRefresh}
                disabled={isRefreshing}
                variant="outline"
                size="sm"
              >
                <RefreshCw className={`h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`} />
              </Button>
            </div>
          </div>

          {/* Status Bar */}
          <div className="flex items-center gap-4 text-sm text-gray-600 dark:text-gray-400">
            <div className="flex items-center gap-1">
              {networkStatus ? <Wifi className="w-4 h-4" /> : <WifiOff className="w-4 h-4" />}
              <span>{networkStatus ? 'Online' : 'Offline'}</span>
            </div>
            <div className={`flex items-center gap-1 ${getBatteryColor(stats.batteryLevel)}`}>
              <Battery className="w-4 h-4" />
              <span>{stats.batteryLevel}%</span>
            </div>
            <div className={`flex items-center gap-1 ${getPerformanceColor(stats.performanceScore)}`}>
              <Activity className="w-4 h-4" />
              <span>{stats.performanceScore}/100</span>
            </div>
          </div>
        </div>

        {/* PWA Install Prompt */}
        {!isInstalled && isInstallable && (
          <Alert className="mb-6">
            <Download className="h-4 w-4" />
            <AlertDescription className="flex items-center justify-between">
              <span>Install the Lumea app for the best mobile experience</span>
              <Button onClick={handleInstallApp} size="sm">
                Install App
              </Button>
            </AlertDescription>
          </Alert>
        )}

        {/* Quick Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <Card>
            <CardContent className="p-4 text-center">
              <div className="text-2xl font-bold text-blue-600">{stats.sessionsToday}</div>
              <div className="text-sm text-muted-foreground">Sessions Today</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <div className="text-2xl font-bold text-green-600">{stats.clientsActive}</div>
              <div className="text-sm text-muted-foreground">Active Clients</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <div className="text-2xl font-bold text-purple-600">{stats.reflectionsWeek}</div>
              <div className="text-sm text-muted-foreground">Reflections</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <div className="text-2xl font-bold text-orange-600">{stats.storageUsed}%</div>
              <div className="text-sm text-muted-foreground">Storage Used</div>
            </CardContent>
          </Card>
        </div>

        {/* Quick Actions */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Play className="w-5 h-5" />
              Quick Actions
            </CardTitle>
            <CardDescription>
              Access your most-used features quickly
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              {quickActions.map((action) => (
                <Button
                  key={action.id}
                  variant="outline"
                  onClick={() => navigate(action.path)}
                  className="h-auto p-4 flex flex-col items-center gap-2 hover:scale-105 transition-transform"
                >
                  <div className={`p-2 rounded-lg ${action.color} text-white`}>
                    {action.icon}
                  </div>
                  <div className="text-center">
                    <div className="font-medium text-sm">{action.title}</div>
                    {action.badge && (
                      <Badge variant="secondary" className="text-xs mt-1">
                        {action.badge}
                      </Badge>
                    )}
                  </div>
                </Button>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Mobile-Specific Features */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Smartphone className="w-5 h-5" />
              Mobile Features
            </CardTitle>
            <CardDescription>
              Mobile-optimized tools and settings
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {mobileActions.map((action) => (
                <Card key={action.id} className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => navigate(action.path)}>
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between mb-2">
                      <div className={`p-2 rounded-lg ${action.color} text-white`}>
                        {action.icon}
                      </div>
                      <ArrowRight className="w-4 h-4 text-muted-foreground" />
                    </div>
                    <h3 className="font-semibold mb-1">{action.title}</h3>
                    <p className="text-sm text-muted-foreground mb-2">{action.description}</p>
                    {action.badge && (
                      <Badge variant="outline" className="text-xs">
                        {action.badge}
                      </Badge>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Recent Activity */}
        <Card className="mt-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="w-5 h-5" />
              Recent Activity
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex items-center gap-3 p-2 rounded-lg bg-muted/50">
                <CheckCircle className="w-4 h-4 text-green-500" />
                <div className="flex-1">
                  <p className="text-sm font-medium">Session completed with Sarah</p>
                  <p className="text-xs text-muted-foreground">2 hours ago</p>
                </div>
              </div>
              <div className="flex items-center gap-3 p-2 rounded-lg bg-muted/50">
                <Mic className="w-4 h-4 text-purple-500" />
                <div className="flex-1">
                  <p className="text-sm font-medium">New reflection recorded</p>
                  <p className="text-xs text-muted-foreground">4 hours ago</p>
                </div>
              </div>
              <div className="flex items-center gap-3 p-2 rounded-lg bg-muted/50">
                <TrendingUp className="w-4 h-4 text-blue-500" />
                <div className="flex-1">
                  <p className="text-sm font-medium">Performance score improved</p>
                  <p className="text-xs text-muted-foreground">Yesterday</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default MobileDashboardPage; 