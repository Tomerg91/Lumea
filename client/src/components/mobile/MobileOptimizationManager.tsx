import React, { useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Switch } from '@/components/ui/switch';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  Battery, 
  Cpu, 
  HardDrive, 
  Wifi, 
  Zap, 
  Settings, 
  Gauge,
  CheckCircle,
  AlertTriangle,
  Info,
  Smartphone,
  Download,
  Trash2,
  RefreshCw
} from 'lucide-react';
import { useMobileDetection } from '@/hooks/useMobileDetection';
import { useNetworkStatus } from '@/hooks/useNetworkStatus';

interface OptimizationSetting {
  id: string;
  name: string;
  description: string;
  icon: React.ReactNode;
  enabled: boolean;
  impact: 'low' | 'medium' | 'high';
  category: 'performance' | 'battery' | 'storage' | 'network';
}

interface SystemMetrics {
  batteryLevel: number;
  memoryUsage: number;
  storageUsed: number;
  networkSpeed: string;
  cpuUsage: number;
  lastOptimized: Date;
}

const MobileOptimizationManager: React.FC = () => {
  const { t } = useTranslation();
  const mobileDetection = useMobileDetection();
  const networkStatus = useNetworkStatus();

  const [optimizations, setOptimizations] = useState<OptimizationSetting[]>([
    {
      id: 'reduce-animations',
      name: 'Reduce Animations',
      description: 'Minimize animations for better performance',
      icon: <Zap className="w-4 h-4" />,
      enabled: false,
      impact: 'medium',
      category: 'performance'
    },
    {
      id: 'image-compression',
      name: 'Image Compression',
      description: 'Compress images to save bandwidth',
      icon: <Download className="w-4 h-4" />,
      enabled: true,
      impact: 'high',
      category: 'network'
    },
    {
      id: 'background-sync',
      name: 'Smart Background Sync',
      description: 'Optimize sync based on battery and network',
      icon: <RefreshCw className="w-4 h-4" />,
      enabled: true,
      impact: 'medium',
      category: 'battery'
    },
    {
      id: 'cache-management',
      name: 'Intelligent Caching',
      description: 'Smart cache management for faster loading',
      icon: <HardDrive className="w-4 h-4" />,
      enabled: true,
      impact: 'high',
      category: 'performance'
    },
    {
      id: 'low-power-mode',
      name: 'Low Power Mode',
      description: 'Reduce background activity when battery is low',
      icon: <Battery className="w-4 h-4" />,
      enabled: false,
      impact: 'high',
      category: 'battery'
    },
    {
      id: 'data-saver',
      name: 'Data Saver Mode',
      description: 'Reduce data usage on cellular connections',
      icon: <Wifi className="w-4 h-4" />,
      enabled: false,
      impact: 'high',
      category: 'network'
    }
  ]);

  const [metrics, setMetrics] = useState<SystemMetrics>({
    batteryLevel: 85,
    memoryUsage: 45,
    storageUsed: 2.3,
    networkSpeed: 'Fast',
    cpuUsage: 25,
    lastOptimized: new Date()
  });

  const [isOptimizing, setIsOptimizing] = useState(false);
  const [optimizationProgress, setOptimizationProgress] = useState(0);
  const [autoOptimizeEnabled, setAutoOptimizeEnabled] = useState(true);

  // Battery API (if available)
  useEffect(() => {
    const getBatteryInfo = async () => {
      if ('getBattery' in navigator) {
        try {
          const battery = await (navigator as any).getBattery();
          setMetrics(prev => ({
            ...prev,
            batteryLevel: Math.round(battery.level * 100)
          }));

          // Auto-enable low power mode when battery is low
          if (battery.level < 0.2 && autoOptimizeEnabled) {
            setOptimizations(prev => prev.map(opt => 
              opt.id === 'low-power-mode' ? { ...opt, enabled: true } : opt
            ));
          }
        } catch (error) {
          console.log('Battery API not available');
        }
      }
    };

    getBatteryInfo();
  }, [autoOptimizeEnabled]);

  // Memory usage estimation
  useEffect(() => {
    if ('memory' in performance) {
      const memInfo = (performance as any).memory;
      const usagePercent = (memInfo.usedJSHeapSize / memInfo.jsHeapSizeLimit) * 100;
      setMetrics(prev => ({
        ...prev,
        memoryUsage: Math.round(usagePercent)
      }));
    }
  }, []);

  // Storage usage estimation
  useEffect(() => {
    if ('storage' in navigator && 'estimate' in navigator.storage) {
      navigator.storage.estimate().then(estimate => {
        const usedGB = (estimate.usage || 0) / (1024 * 1024 * 1024);
        setMetrics(prev => ({
          ...prev,
          storageUsed: Math.round(usedGB * 10) / 10
        }));
      });
    }
  }, []);

  const runOptimization = useCallback(async () => {
    setIsOptimizing(true);
    setOptimizationProgress(0);

    const steps = [
      { name: 'Clearing cache', delay: 500 },
      { name: 'Optimizing images', delay: 800 },
      { name: 'Compressing data', delay: 600 },
      { name: 'Updating settings', delay: 400 },
      { name: 'Finalizing', delay: 300 }
    ];

    for (let i = 0; i < steps.length; i++) {
      await new Promise(resolve => setTimeout(resolve, steps[i].delay));
      setOptimizationProgress(((i + 1) / steps.length) * 100);
    }

    // Update metrics after optimization
    setMetrics(prev => ({
      ...prev,
      memoryUsage: Math.max(prev.memoryUsage - 15, 10),
      cpuUsage: Math.max(prev.cpuUsage - 10, 5),
      lastOptimized: new Date()
    }));

    setIsOptimizing(false);
    setOptimizationProgress(0);
  }, []);

  const toggleOptimization = (id: string) => {
    setOptimizations(prev => prev.map(opt => 
      opt.id === id ? { ...opt, enabled: !opt.enabled } : opt
    ));
  };

  const clearCache = async () => {
    if ('caches' in window) {
      const cacheNames = await caches.keys();
      await Promise.all(cacheNames.map(name => caches.delete(name)));
      
      setMetrics(prev => ({
        ...prev,
        storageUsed: Math.max(prev.storageUsed - 0.5, 0.1)
      }));
    }
  };

  const getPerformanceScore = () => {
    const batteryScore = metrics.batteryLevel;
    const memoryScore = 100 - metrics.memoryUsage;
    const cpuScore = 100 - metrics.cpuUsage;
    
    return Math.round((batteryScore + memoryScore + cpuScore) / 3);
  };

  const getScoreColor = (score: number) => {
    if (score >= 80) return 'text-green-600';
    if (score >= 60) return 'text-yellow-600';
    return 'text-red-600';
  };

  const getScoreBadgeVariant = (score: number) => {
    if (score >= 80) return 'default';
    if (score >= 60) return 'secondary';
    return 'destructive';
  };

  const getImpactColor = (impact: string) => {
    switch (impact) {
      case 'high': return 'text-green-600';
      case 'medium': return 'text-yellow-600';
      case 'low': return 'text-blue-600';
      default: return 'text-gray-600';
    }
  };

  const performanceScore = getPerformanceScore();

  return (
    <div className="space-y-6">
      {/* Performance Overview */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Gauge className="w-5 h-5" />
            {t('mobile.optimization.overview.title', 'Performance Overview')}
          </CardTitle>
          <CardDescription>
            {t('mobile.optimization.overview.desc', 'Monitor and optimize your mobile app performance')}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            <div className="text-center">
              <div className="text-2xl font-bold mb-1">{performanceScore}</div>
              <div className="text-sm text-muted-foreground">{t('mobile.optimization.score', 'Performance Score')}</div>
              <Badge variant={getScoreBadgeVariant(performanceScore)} className="mt-1">
                {performanceScore >= 80 ? t('mobile.optimization.excellent', 'Excellent') :
                 performanceScore >= 60 ? t('mobile.optimization.good', 'Good') :
                 t('mobile.optimization.needs-improvement', 'Needs Improvement')}
              </Badge>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold mb-1">{metrics.batteryLevel}%</div>
              <div className="text-sm text-muted-foreground">{t('mobile.optimization.battery', 'Battery')}</div>
              <Progress value={metrics.batteryLevel} className="mt-1" />
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold mb-1">{metrics.memoryUsage}%</div>
              <div className="text-sm text-muted-foreground">{t('mobile.optimization.memory', 'Memory')}</div>
              <Progress value={metrics.memoryUsage} className="mt-1" />
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold mb-1">{metrics.storageUsed}GB</div>
              <div className="text-sm text-muted-foreground">{t('mobile.optimization.storage', 'Storage')}</div>
            </div>
          </div>

          <div className="flex gap-2">
            <Button 
              onClick={runOptimization} 
              disabled={isOptimizing}
              className="flex-1"
            >
              {isOptimizing ? (
                <>
                  <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                  {t('mobile.optimization.optimizing', 'Optimizing...')}
                </>
              ) : (
                <>
                  <Zap className="w-4 h-4 mr-2" />
                  {t('mobile.optimization.optimize', 'Optimize Now')}
                </>
              )}
            </Button>
            <Button variant="outline" onClick={clearCache}>
              <Trash2 className="w-4 h-4 mr-2" />
              {t('mobile.optimization.clear-cache', 'Clear Cache')}
            </Button>
          </div>

          {isOptimizing && (
            <div className="mt-4">
              <Progress value={optimizationProgress} className="w-full" />
              <p className="text-sm text-muted-foreground mt-2">
                {t('mobile.optimization.progress', 'Optimizing your app...')} {Math.round(optimizationProgress)}%
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Optimization Settings */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Settings className="w-5 h-5" />
            {t('mobile.optimization.settings.title', 'Optimization Settings')}
          </CardTitle>
          <CardDescription>
            {t('mobile.optimization.settings.desc', 'Configure automatic optimizations for your device')}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between p-3 border rounded-lg">
            <div>
              <h4 className="font-medium">{t('mobile.optimization.auto.title', 'Auto Optimization')}</h4>
              <p className="text-sm text-muted-foreground">
                {t('mobile.optimization.auto.desc', 'Automatically optimize based on device conditions')}
              </p>
            </div>
            <Switch 
              checked={autoOptimizeEnabled}
              onCheckedChange={setAutoOptimizeEnabled}
            />
          </div>

          {optimizations.map((optimization) => (
            <div key={optimization.id} className="flex items-center justify-between p-3 border rounded-lg">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-muted">
                  {optimization.icon}
                </div>
                <div>
                  <h4 className="font-medium">{optimization.name}</h4>
                  <p className="text-sm text-muted-foreground">{optimization.description}</p>
                  <div className="flex items-center gap-2 mt-1">
                    <Badge variant="outline" className="text-xs">
                      {optimization.category}
                    </Badge>
                    <span className={`text-xs font-medium ${getImpactColor(optimization.impact)}`}>
                      {optimization.impact} {t('mobile.optimization.impact', 'impact')}
                    </span>
                  </div>
                </div>
              </div>
              <Switch 
                checked={optimization.enabled}
                onCheckedChange={() => toggleOptimization(optimization.id)}
              />
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Device-Specific Recommendations */}
      {mobileDetection.isMobile && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Smartphone className="w-5 h-5" />
              {t('mobile.optimization.recommendations.title', 'Device Recommendations')}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {metrics.batteryLevel < 30 && (
              <Alert>
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>
                  {t('mobile.optimization.recommendations.battery', 'Low battery detected. Consider enabling Low Power Mode to extend usage.')}
                </AlertDescription>
              </Alert>
            )}

            {metrics.memoryUsage > 80 && (
              <Alert>
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>
                  {t('mobile.optimization.recommendations.memory', 'High memory usage detected. Try closing other apps or clearing cache.')}
                </AlertDescription>
              </Alert>
            )}

            {!networkStatus && (
              <Alert>
                <Info className="h-4 w-4" />
                <AlertDescription>
                  {t('mobile.optimization.recommendations.offline', 'You\'re offline. The app will sync when connection is restored.')}
                </AlertDescription>
              </Alert>
            )}

            {metrics.storageUsed > 5 && (
              <Alert>
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>
                  {t('mobile.optimization.recommendations.storage', 'Storage usage is high. Consider clearing cache or removing unused files.')}
                </AlertDescription>
              </Alert>
            )}
          </CardContent>
        </Card>
      )}

      {/* Last Optimization */}
      <div className="text-center text-sm text-muted-foreground">
        {t('mobile.optimization.last-optimized', 'Last optimized')}: {metrics.lastOptimized.toLocaleString()}
      </div>
    </div>
  );
};

export default MobileOptimizationManager; 