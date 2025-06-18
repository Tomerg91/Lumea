import React, { useState, useEffect } from 'react';
import { 
  Activity, 
  Smartphone, 
  Battery, 
  Wifi, 
  MemoryStick,
  HardDrive,
  Signal,
  Gauge,
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  RefreshCw,
  Download,
  Upload,
  Timer,
  BarChart3
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';
import { Progress } from '../components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import { Alert, AlertDescription } from '../components/ui/alert';
import { useLanguage } from '../contexts/LanguageContext';
import { useAuth } from '../contexts/AuthContext';
import { useNativeFeatures } from '../hooks/useNativeFeatures';
import { useNetworkStatus } from '../hooks/useNetworkStatus';
import { useToast } from '../hooks/use-toast';

interface PerformanceMetrics {
  score: number;
  memoryUsage: number;
  storageUsed: number;
  networkSpeed: number;
  loadTime: number;
  frameRate: number;
  cacheHitRate: number;
  apiResponseTime: number;
  errorRate: number;
}

const MobilePerformancePage: React.FC = () => {
  const { t, isRTL } = useLanguage();
  const { user } = useAuth();
  const { toast } = useToast();
  const { deviceInfo, isNative, platform } = useNativeFeatures();
  const networkStatus = useNetworkStatus();
  
  const [metrics, setMetrics] = useState<PerformanceMetrics>({
    score: 85,
    memoryUsage: 65,
    storageUsed: 42,
    networkSpeed: 25.6,
    loadTime: 1.2,
    frameRate: 60,
    cacheHitRate: 92,
    apiResponseTime: 250,
    errorRate: 0.5
  });

  const [isRefreshing, setIsRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState('overview');

  useEffect(() => {
    loadPerformanceMetrics();
    const interval = setInterval(loadPerformanceMetrics, 30000);
    return () => clearInterval(interval);
  }, []);

  const loadPerformanceMetrics = async () => {
    try {
      // Mock performance data with some randomization
      setMetrics(prev => ({
        ...prev,
        score: Math.max(60, Math.min(100, prev.score + (Math.random() - 0.5) * 10)),
        memoryUsage: Math.max(30, Math.min(90, prev.memoryUsage + (Math.random() - 0.5) * 10)),
        networkSpeed: Math.max(5, Math.min(50, prev.networkSpeed + (Math.random() - 0.5) * 5)),
        loadTime: Math.max(0.5, Math.min(3, prev.loadTime + (Math.random() - 0.5) * 0.3)),
        apiResponseTime: Math.max(100, Math.min(500, prev.apiResponseTime + (Math.random() - 0.5) * 50))
      }));
    } catch (error) {
      console.error('Error loading performance metrics:', error);
    }
  };

  const refreshMetrics = async () => {
    setIsRefreshing(true);
    await loadPerformanceMetrics();
    setTimeout(() => setIsRefreshing(false), 1000);
    
    toast({
      title: 'Metrics Refreshed',
      description: 'Performance data has been updated',
    });
  };

  const getScoreBadgeVariant = (score: number): "default" | "secondary" | "destructive" | "outline" => {
    if (score >= 80) return 'default';
    if (score >= 60) return 'secondary';
    return 'destructive';
  };

  const formatBytes = (bytes: number) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  };

  const formatSpeed = (mbps: number) => {
    return `${mbps.toFixed(1)} Mbps`;
  };

  return (
    <div className={`min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800 ${isRTL ? 'rtl' : 'ltr'}`}>
      <div className="container mx-auto px-4 py-6">
        {/* Header */}
        <div className="mb-6">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-100 dark:bg-blue-900 rounded-lg">
                <Activity className="h-6 w-6 text-blue-600 dark:text-blue-400" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
                  Mobile Performance
                </h1>
                <p className="text-gray-600 dark:text-gray-400">
                  Monitor your app's performance and optimize for better experience
                </p>
              </div>
            </div>
            
            <Button
              onClick={refreshMetrics}
              disabled={isRefreshing}
              variant="outline"
              size="sm"
              className="flex items-center gap-2"
            >
              <RefreshCw className={`h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
          </div>
          
          {/* Device Info */}
          <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400">
            <Smartphone className="h-4 w-4" />
            <span>{deviceInfo?.platform || platform} • {deviceInfo?.model || 'Unknown Device'}</span>
            <Badge variant={networkStatus ? 'default' : 'destructive'}>
              {networkStatus ? 'Online' : 'Offline'}
            </Badge>
          </div>
        </div>

        {/* Performance Score Overview */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span>Overall Performance Score</span>
              <Badge variant={getScoreBadgeVariant(metrics.score)} className="text-lg px-3 py-1">
                {Math.round(metrics.score)}/100
              </Badge>
            </CardTitle>
            <CardDescription>
              Real-time performance assessment of your mobile app
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <Progress value={metrics.score} className="h-3" />
              
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="text-center">
                  <div className="text-2xl font-bold text-green-600">{metrics.frameRate}</div>
                  <div className="text-sm text-muted-foreground">FPS</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-blue-600">{metrics.loadTime}s</div>
                  <div className="text-sm text-muted-foreground">Load Time</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-purple-600">{metrics.cacheHitRate}%</div>
                  <div className="text-sm text-muted-foreground">Cache Hit</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-orange-600">{Math.round(metrics.apiResponseTime)}ms</div>
                  <div className="text-sm text-muted-foreground">API Response</div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="overview" className="flex items-center gap-2">
              <BarChart3 className="h-4 w-4" />
              <span className="hidden sm:inline">Overview</span>
            </TabsTrigger>
            <TabsTrigger value="network" className="flex items-center gap-2">
              <Wifi className="h-4 w-4" />
              <span className="hidden sm:inline">Network</span>
            </TabsTrigger>
            <TabsTrigger value="resources" className="flex items-center gap-2">
              <MemoryStick className="h-4 w-4" />
              <span className="hidden sm:inline">Resources</span>
            </TabsTrigger>
          </TabsList>

          {/* Overview Tab */}
          <TabsContent value="overview" className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {/* Memory Usage */}
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="flex items-center gap-2">
                    <MemoryStick className="h-5 w-5" />
                    Memory Usage
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <div className="flex justify-between items-center">
                      <span className="text-sm">Used</span>
                      <span className="font-medium">{Math.round(metrics.memoryUsage)}%</span>
                    </div>
                    <Progress value={metrics.memoryUsage} />
                    <div className="text-xs text-muted-foreground">
                      {metrics.memoryUsage < 70 ? 'Optimal' : metrics.memoryUsage < 85 ? 'High' : 'Critical'}
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Storage Usage */}
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="flex items-center gap-2">
                    <HardDrive className="h-5 w-5" />
                    Storage Usage
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <div className="flex justify-between items-center">
                      <span className="text-sm">Used</span>
                      <span className="font-medium">{Math.round(metrics.storageUsed)}%</span>
                    </div>
                    <Progress value={metrics.storageUsed} />
                    <div className="text-xs text-muted-foreground">
                      {formatBytes(metrics.storageUsed * 10 * 1024 * 1024)} of {formatBytes(1024 * 1024 * 1024)}
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Network Speed */}
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="flex items-center gap-2">
                    <Signal className="h-5 w-5" />
                    Network Speed
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <div className="text-2xl font-bold">{formatSpeed(metrics.networkSpeed)}</div>
                    <div className="flex items-center gap-2">
                      {metrics.networkSpeed > 20 ? (
                        <TrendingUp className="h-4 w-4 text-green-500" />
                      ) : (
                        <TrendingDown className="h-4 w-4 text-red-500" />
                      )}
                      <span className="text-sm text-muted-foreground">
                        {metrics.networkSpeed > 20 ? 'Fast' : 'Slow'} connection
                      </span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Performance Alerts */}
            {(metrics.memoryUsage > 85 || metrics.loadTime > 2 || metrics.errorRate > 1) && (
              <Alert>
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>
                  <div className="font-medium mb-2">Performance Issues Detected</div>
                  <ul className="space-y-1 text-sm">
                    {metrics.memoryUsage > 85 && <li>• High memory usage ({Math.round(metrics.memoryUsage)}%)</li>}
                    {metrics.loadTime > 2 && <li>• Slow load times ({metrics.loadTime}s)</li>}
                    {metrics.errorRate > 1 && <li>• High error rate ({metrics.errorRate}%)</li>}
                  </ul>
                </AlertDescription>
              </Alert>
            )}
          </TabsContent>

          {/* Network Tab */}
          <TabsContent value="network" className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Wifi className="h-5 w-5" />
                    Connection Details
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex justify-between">
                    <span className="text-sm text-muted-foreground">Type:</span>
                    <Badge>4G</Badge>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-muted-foreground">Speed:</span>
                    <span className="font-medium">{formatSpeed(metrics.networkSpeed)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-muted-foreground">Latency:</span>
                    <span className="font-medium">45ms</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-muted-foreground">Signal:</span>
                    <span className="font-medium">85%</span>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Activity className="h-5 w-5" />
                    Data Usage
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex justify-between items-center">
                    <div className="flex items-center gap-2">
                      <Download className="h-4 w-4" />
                      <span className="text-sm">Download</span>
                    </div>
                    <span className="font-medium">{formatSpeed(28.4)}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <div className="flex items-center gap-2">
                      <Upload className="h-4 w-4" />
                      <span className="text-sm">Upload</span>
                    </div>
                    <span className="font-medium">{formatSpeed(12.1)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-muted-foreground">Total Usage:</span>
                    <span className="font-medium">{formatBytes(156.7 * 1024 * 1024)}</span>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Resources Tab */}
          <TabsContent value="resources" className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Gauge className="h-5 w-5" />
                    Performance Metrics
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex justify-between">
                    <span className="text-sm text-muted-foreground">Frame Rate:</span>
                    <span className="font-medium">{metrics.frameRate} FPS</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-muted-foreground">Load Time:</span>
                    <span className="font-medium">{metrics.loadTime}s</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-muted-foreground">Cache Hit Rate:</span>
                    <span className="font-medium">{metrics.cacheHitRate}%</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-muted-foreground">Error Rate:</span>
                    <span className="font-medium">{metrics.errorRate}%</span>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Timer className="h-5 w-5" />
                    Response Times
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex justify-between">
                    <span className="text-sm text-muted-foreground">API Response:</span>
                    <span className="font-medium">{Math.round(metrics.apiResponseTime)}ms</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-muted-foreground">Page Load:</span>
                    <span className="font-medium">{Math.round(metrics.loadTime * 1000)}ms</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-muted-foreground">Network Latency:</span>
                    <span className="font-medium">45ms</span>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default MobilePerformancePage; 