import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import { Switch } from '@/components/ui/switch';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  Smartphone, 
  Download, 
  Wifi, 
  WifiOff, 
  Battery, 
  Settings, 
  Bell, 
  RefreshCw,
  CheckCircle,
  AlertCircle,
  Info,
  Share2,
  Home,
  Calendar,
  MessageSquare,
  FileText,
  BarChart3,
  Camera,
  Mic,
  Video,
  Activity
} from 'lucide-react';
import { useMobileDetection } from '@/hooks/useMobileDetection';
import { usePWA } from '@/hooks/usePWA';
import { useNetworkStatus } from '@/hooks/useNetworkStatus';

const MobileAppPage: React.FC = () => {
  const { t } = useTranslation();
  const mobileDetection = useMobileDetection();
  const { 
    isInstalled, 
    isInstallable, 
    isOffline, 
    install, 
    requestNotificationPermission,
    subscribeToNotifications 
  } = usePWA();
  const networkStatus = useNetworkStatus();
  const navigate = useNavigate();

  const [features, setFeatures] = useState([
    {
      id: 'notifications',
      name: 'Push Notifications',
      description: 'Receive session reminders and updates',
      icon: <Bell className="w-5 h-5" />,
      enabled: false,
      available: 'Notification' in window,
      status: 'pending'
    },
    {
      id: 'offline',
      name: 'Offline Mode',
      description: 'Access content without internet',
      icon: <WifiOff className="w-5 h-5" />,
      enabled: true,
      available: 'serviceWorker' in navigator,
      status: 'active'
    },
    {
      id: 'sync',
      name: 'Background Sync',
      description: 'Sync data when connection returns',
      icon: <RefreshCw className="w-5 h-5" />,
      enabled: true,
      available: 'serviceWorker' in navigator,
      status: 'active'
    },
    {
      id: 'share',
      name: 'Native Sharing',
      description: 'Share content with other apps',
      icon: <Share2 className="w-5 h-5" />,
      enabled: true,
      available: 'share' in navigator,
      status: 'active'
    }
  ]);

  const [capabilities] = useState([
    {
      name: 'Coach Dashboard',
      description: 'Full coaching dashboard access',
      icon: <Home className="w-5 h-5" />,
      supported: true,
      enabled: true
    },
    {
      name: 'Session Management',
      description: 'Create and manage coaching sessions',
      icon: <Calendar className="w-5 h-5" />,
      supported: true,
      enabled: true
    },
    {
      name: 'Communication Tools',
      description: 'Messaging, video calls, and emails',
      icon: <MessageSquare className="w-5 h-5" />,
      supported: true,
      enabled: true
    },
    {
      name: 'Coach Notes',
      description: 'Take and manage client notes',
      icon: <FileText className="w-5 h-5" />,
      supported: true,
      enabled: true
    },
    {
      name: 'Analytics Dashboard',
      description: 'View performance metrics and reports',
      icon: <BarChart3 className="w-5 h-5" />,
      supported: true,
      enabled: true
    },
    {
      name: 'Camera Access',
      description: 'Take photos for documentation',
      icon: <Camera className="w-5 h-5" />,
      supported: 'mediaDevices' in navigator,
      enabled: true
    },
    {
      name: 'Audio Recording',
      description: 'Record voice notes and reflections',
      icon: <Mic className="w-5 h-5" />,
      supported: 'mediaDevices' in navigator,
      enabled: true
    },
    {
      name: 'Video Calling',
      description: 'Conduct video coaching sessions',
      icon: <Video className="w-5 h-5" />,
      supported: 'mediaDevices' in navigator,
      enabled: true
    }
  ]);

  const [installProgress, setInstallProgress] = useState(0);
  const [isInstalling, setIsInstalling] = useState(false);

  useEffect(() => {
    // Check notification permission status
    if ('Notification' in window) {
      const permission = Notification.permission;
      setFeatures(prev => prev.map(feature => 
        feature.id === 'notifications' 
          ? { ...feature, enabled: permission === 'granted', status: permission === 'granted' ? 'active' : 'pending' }
          : feature
      ));
    }
  }, []);

  const handleInstallApp = async () => {
    if (!isInstallable) return;
    
    setIsInstalling(true);
    setInstallProgress(0);

    // Simulate installation progress
    const progressInterval = setInterval(() => {
      setInstallProgress(prev => {
        if (prev >= 90) {
          clearInterval(progressInterval);
          return 90;
        }
        return prev + 10;
      });
    }, 200);

    try {
      const success = await install();
      setInstallProgress(100);
      
      if (success) {
        setTimeout(() => {
          setIsInstalling(false);
          setInstallProgress(0);
        }, 1000);
      }
    } catch (error) {
      console.error('Installation failed:', error);
      setIsInstalling(false);
      setInstallProgress(0);
    }
  };

  const handleEnableNotifications = async () => {
    try {
      const permission = await requestNotificationPermission();
      
      if (permission === 'granted') {
        await subscribeToNotifications();
        setFeatures(prev => prev.map(feature => 
          feature.id === 'notifications' 
            ? { ...feature, enabled: true, status: 'active' }
            : feature
        ));
      }
    } catch (error) {
      console.error('Failed to enable notifications:', error);
      setFeatures(prev => prev.map(feature => 
        feature.id === 'notifications' 
          ? { ...feature, status: 'error' }
          : feature
      ));
    }
  };

  const toggleFeature = (featureId: string) => {
    if (featureId === 'notifications') {
      handleEnableNotifications();
      return;
    }

    setFeatures(prev => prev.map(feature => 
      feature.id === featureId 
        ? { ...feature, enabled: !feature.enabled, status: !feature.enabled ? 'active' : 'disabled' }
        : feature
    ));
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'bg-green-500';
      case 'pending': return 'bg-yellow-500';
      case 'disabled': return 'bg-gray-500';
      case 'error': return 'bg-red-500';
      default: return 'bg-gray-500';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'active': return <CheckCircle className="w-4 h-4 text-green-600" />;
      case 'pending': return <AlertCircle className="w-4 h-4 text-yellow-600" />;
      case 'error': return <AlertCircle className="w-4 h-4 text-red-600" />;
      default: return <Info className="w-4 h-4 text-gray-600" />;
    }
  };

  return (
    <div className="container mx-auto p-4 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Mobile App</h1>
          <p className="text-muted-foreground">
            Manage your mobile coaching experience
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant={mobileDetection.isMobile ? 'default' : 'secondary'}>
            <Smartphone className="w-3 h-3 mr-1" />
            {mobileDetection.isMobile ? 'Mobile' : 'Desktop'}
          </Badge>
          <Badge variant={networkStatus ? 'default' : 'destructive'}>
            {networkStatus ? <Wifi className="w-3 h-3 mr-1" /> : <WifiOff className="w-3 h-3 mr-1" />}
            {networkStatus ? 'Online' : 'Offline'}
          </Badge>
        </div>
      </div>

      {/* Installation Section */}
      {!isInstalled && isInstallable && (
        <Alert>
          <Download className="h-4 w-4" />
          <AlertDescription className="flex items-center justify-between">
            <span>Install the Lumea app for the best mobile experience</span>
            <Button 
              onClick={handleInstallApp} 
              disabled={isInstalling}
              size="sm"
            >
              {isInstalling ? 'Installing...' : 'Install App'}
            </Button>
          </AlertDescription>
          {isInstalling && (
            <div className="mt-2">
              <Progress value={installProgress} className="w-full" />
            </div>
          )}
        </Alert>
      )}

      {isInstalled && (
        <Alert>
          <CheckCircle className="h-4 w-4" />
          <AlertDescription>
            ✅ App is installed! You can access it from your home screen.
          </AlertDescription>
        </Alert>
      )}

      <Tabs defaultValue="overview" className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="features">Features</TabsTrigger>
          <TabsTrigger value="capabilities">Capabilities</TabsTrigger>
          <TabsTrigger value="settings">Settings</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {/* Device Info */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2">
                  <Smartphone className="w-5 h-5" />
                  Device Info
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">Type:</span>
                  <span className="text-sm font-medium">
                    {mobileDetection.isMobile ? 'Mobile' : 
                     mobileDetection.isTablet ? 'Tablet' : 
                     'Desktop'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">Platform:</span>
                  <span className="text-sm font-medium">
                    {mobileDetection.isIOS ? 'iOS' : 
                     mobileDetection.isAndroid ? 'Android' : 
                     'Web'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">Screen:</span>
                  <span className="text-sm font-medium">
                    {mobileDetection.screenWidth} × {mobileDetection.screenHeight}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">Orientation:</span>
                  <span className="text-sm font-medium">
                    {mobileDetection.isPortrait ? 'Portrait' : 'Landscape'}
                  </span>
                </div>
              </CardContent>
            </Card>

            {/* Network Status */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2">
                  {networkStatus ? <Wifi className="w-5 h-5" /> : <WifiOff className="w-5 h-5" />}
                  Network Status
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">Status:</span>
                  <Badge variant={networkStatus ? 'default' : 'destructive'}>
                    {networkStatus ? 'Online' : 'Offline'}
                  </Badge>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">Offline Mode:</span>
                  <span className="text-sm font-medium">
                    {isOffline ? 'Enabled' : 'Disabled'}
                  </span>
                </div>
                <div className="text-xs text-muted-foreground mt-2">
                  {networkStatus 
                    ? 'All features available'
                    : 'Limited features available offline'
                  }
                </div>
              </CardContent>
            </Card>

            {/* App Status */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2">
                  <Settings className="w-5 h-5" />
                  App Status
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">Installed:</span>
                  <Badge variant={isInstalled ? 'default' : 'secondary'}>
                    {isInstalled ? 'Yes' : 'No'}
                  </Badge>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">Installable:</span>
                  <Badge variant={isInstallable ? 'default' : 'secondary'}>
                    {isInstallable ? 'Yes' : 'No'}
                  </Badge>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">Version:</span>
                  <span className="text-sm font-medium">v2.0.0</span>
                </div>
                <div className="text-xs text-muted-foreground mt-2">
                  Progressive Web App with native features
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="features" className="space-y-4">
          <div className="grid gap-4">
            {features.map((feature) => (
              <Card key={feature.id}>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="p-2 rounded-lg bg-muted">
                        {feature.icon}
                      </div>
                      <div>
                        <h3 className="font-semibold">{feature.name}</h3>
                        <p className="text-sm text-muted-foreground">{feature.description}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="flex items-center gap-2">
                        {getStatusIcon(feature.status)}
                        <div className={`w-2 h-2 rounded-full ${getStatusColor(feature.status)}`} />
                      </div>
                      <Switch
                        checked={feature.enabled}
                        disabled={!feature.available}
                        onCheckedChange={() => toggleFeature(feature.id)}
                      />
                    </div>
                  </div>
                  {!feature.available && (
                    <div className="mt-2 text-xs text-muted-foreground">
                      This feature is not available on your device
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="capabilities" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {capabilities.map((capability, index) => (
              <Card key={index}>
                <CardContent className="p-4">
                  <div className="flex items-start gap-3">
                    <div className="p-2 rounded-lg bg-muted">
                      {capability.icon}
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center justify-between">
                        <h3 className="font-semibold">{capability.name}</h3>
                        <Badge variant={capability.supported ? 'default' : 'secondary'}>
                          {capability.supported ? 'Supported' : 'Unsupported'}
                        </Badge>
                      </div>
                      <p className="text-sm text-muted-foreground mt-1">{capability.description}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="settings" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Mobile Settings</CardTitle>
              <CardDescription>
                Configure your mobile app experience
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="font-medium">Offline Mode</h4>
                  <p className="text-sm text-muted-foreground">
                    Cache content for offline access
                  </p>
                </div>
                <Switch defaultChecked />
              </div>
              
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="font-medium">Auto Sync</h4>
                  <p className="text-sm text-muted-foreground">
                    Automatically sync when online
                  </p>
                </div>
                <Switch defaultChecked />
              </div>
              
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="font-medium">Haptic Feedback</h4>
                  <p className="text-sm text-muted-foreground">
                    Vibration feedback for interactions
                  </p>
                </div>
                <Switch defaultChecked={mobileDetection.isMobile} />
              </div>
              
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="font-medium">Auto Dark Mode</h4>
                  <p className="text-sm text-muted-foreground">
                    Follow system dark mode setting
                  </p>
                </div>
                <Switch />
              </div>
              
              {/* Advanced Settings Button */}
              <div className="pt-4 border-t">
                <Button 
                  variant="outline" 
                  onClick={() => navigate('/coach/mobile-settings')}
                  className="w-full flex items-center gap-2 mb-3"
                >
                  <Settings className="w-4 h-4" />
                  Advanced Mobile Settings
                </Button>
                
                <Button 
                  variant="outline" 
                  onClick={() => navigate('/coach/mobile-performance')}
                  className="w-full flex items-center gap-2"
                >
                  <Activity className="w-4 h-4" />
                  Performance Monitoring
                </Button>
                
                <Button 
                  variant="outline" 
                  onClick={() => navigate('/coach/mobile-dashboard')}
                  className="w-full flex items-center gap-2 mt-3"
                >
                  <BarChart3 className="w-4 h-4" />
                  Mobile Dashboard
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default MobileAppPage; 