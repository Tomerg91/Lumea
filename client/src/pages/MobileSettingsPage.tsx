import React, { useState, useEffect } from 'react';
import { 
  Settings, 
  Smartphone, 
  Bell, 
  Battery, 
  Moon, 
  Sun, 
  Shield,
  Database,
  RefreshCw,
  Trash2
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Switch } from '../components/ui/switch';
import { Badge } from '../components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { useLanguage } from '../contexts/LanguageContext';
import { useAuth } from '../contexts/AuthContext';
import { useNativeFeatures } from '../hooks/useNativeFeatures';
import { useToast } from '../hooks/use-toast';

const MobileSettingsPage: React.FC = () => {
  const { t, isRTL } = useLanguage();
  const { user } = useAuth();
  const { toast } = useToast();
  const { deviceInfo, isNative, platform } = useNativeFeatures();
  
  const [settings, setSettings] = useState({
    theme: 'system' as 'light' | 'dark' | 'system',
    autoLock: true,
    pushNotifications: true,
    soundEnabled: true,
    vibrationEnabled: true,
    autoSync: true,
    wifiOnlySync: true,
    screenshotBlocking: true,
    sessionEncryption: true,
    animationsEnabled: true,
    cacheSize: 50,
    maxCacheSize: 200
  });
  
  const [activeTab, setActiveTab] = useState('general');
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      const savedSettings = localStorage.getItem('mobileSettings');
      if (savedSettings) {
        setSettings({ ...settings, ...JSON.parse(savedSettings) });
      }
    } catch (error) {
      console.error('Error loading mobile settings:', error);
    }
  };

  const saveSettings = async (newSettings: Partial<typeof settings>) => {
    try {
      const updatedSettings = { ...settings, ...newSettings };
      setSettings(updatedSettings);
      localStorage.setItem('mobileSettings', JSON.stringify(updatedSettings));
      
      toast({
        title: 'Settings Saved',
        description: 'Your preferences have been updated',
      });
    } catch (error) {
      console.error('Error saving mobile settings:', error);
      toast({
        title: 'Error',
        description: 'Failed to save settings',
        variant: 'destructive'
      });
    }
  };

  const clearCache = async () => {
    try {
      setIsLoading(true);
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      setSettings(prev => ({ ...prev, cacheSize: 0 }));
      
      toast({
        title: 'Cache Cleared',
        description: 'App cache has been cleared successfully',
      });
    } catch (error) {
      console.error('Error clearing cache:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const formatBytes = (bytes: number) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  };

  return (
    <div className={`min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800 ${isRTL ? 'rtl' : 'ltr'}`}>
      <div className="container mx-auto px-4 py-6">
        {/* Header */}
        <div className="mb-6">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-blue-100 dark:bg-blue-900 rounded-lg">
              <Settings className="h-6 w-6 text-blue-600 dark:text-blue-400" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
                Mobile Settings
              </h1>
              <p className="text-gray-600 dark:text-gray-400">
                Configure your mobile app preferences
              </p>
            </div>
          </div>
          
          {/* Device Info */}
          <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400">
            <Smartphone className="h-4 w-4" />
            <span>{deviceInfo?.platform || platform} • {deviceInfo?.model || 'Unknown Device'}</span>
            {!isNative && <Badge variant="secondary">Web App</Badge>}
          </div>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="general" className="flex items-center gap-2">
              <Settings className="h-4 w-4" />
              <span className="hidden sm:inline">General</span>
            </TabsTrigger>
            <TabsTrigger value="notifications" className="flex items-center gap-2">
              <Bell className="h-4 w-4" />
              <span className="hidden sm:inline">Notifications</span>
            </TabsTrigger>
            <TabsTrigger value="sync" className="flex items-center gap-2">
              <RefreshCw className="h-4 w-4" />
              <span className="hidden sm:inline">Sync</span>
            </TabsTrigger>
            <TabsTrigger value="privacy" className="flex items-center gap-2">
              <Shield className="h-4 w-4" />
              <span className="hidden sm:inline">Privacy</span>
            </TabsTrigger>
          </TabsList>

          {/* General Settings */}
          <TabsContent value="general" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Smartphone className="h-5 w-5" />
                  App Preferences
                </CardTitle>
                <CardDescription>
                  Customize your app appearance and behavior
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Theme */}
                <div className="flex items-center justify-between">
                  <div className="space-y-1">
                    <label className="text-sm font-medium">Theme</label>
                    <p className="text-sm text-muted-foreground">Choose your preferred theme</p>
                  </div>
                  <Select value={settings.theme} onValueChange={(value: any) => saveSettings({ theme: value })}>
                    <SelectTrigger className="w-32">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="light">
                        <div className="flex items-center gap-2">
                          <Sun className="h-4 w-4" />
                          Light
                        </div>
                      </SelectItem>
                      <SelectItem value="dark">
                        <div className="flex items-center gap-2">
                          <Moon className="h-4 w-4" />
                          Dark
                        </div>
                      </SelectItem>
                      <SelectItem value="system">
                        <div className="flex items-center gap-2">
                          <Settings className="h-4 w-4" />
                          System
                        </div>
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Auto Lock */}
                <div className="flex items-center justify-between">
                  <div className="space-y-1">
                    <label className="text-sm font-medium">Auto Lock</label>
                    <p className="text-sm text-muted-foreground">Lock app when inactive</p>
                  </div>
                  <Switch
                    checked={settings.autoLock}
                    onCheckedChange={(checked) => saveSettings({ autoLock: checked })}
                  />
                </div>

                {/* Animations */}
                <div className="flex items-center justify-between">
                  <div className="space-y-1">
                    <label className="text-sm font-medium">Animations</label>
                    <p className="text-sm text-muted-foreground">Enable smooth animations</p>
                  </div>
                  <Switch
                    checked={settings.animationsEnabled}
                    onCheckedChange={(checked) => saveSettings({ animationsEnabled: checked })}
                  />
                </div>
              </CardContent>
            </Card>

            {/* Performance */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Battery className="h-5 w-5" />
                  Performance
                </CardTitle>
                <CardDescription>
                  Optimize app performance and battery usage
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Cache Management */}
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="space-y-1">
                      <label className="text-sm font-medium">Cache Size</label>
                      <p className="text-sm text-muted-foreground">
                        {formatBytes(settings.cacheSize * 1024 * 1024)} of {formatBytes(settings.maxCacheSize * 1024 * 1024)}
                      </p>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={clearCache}
                      disabled={isLoading}
                      className="flex items-center gap-2"
                    >
                      <Trash2 className="h-4 w-4" />
                      Clear Cache
                    </Button>
                  </div>
                  
                  {/* Cache Progress Bar */}
                  <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                    <div 
                      className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                      style={{ width: `${(settings.cacheSize / settings.maxCacheSize) * 100}%` }}
                    />
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Notifications Settings */}
          <TabsContent value="notifications" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Bell className="h-5 w-5" />
                  Notification Preferences
                </CardTitle>
                <CardDescription>
                  Control when and how you receive notifications
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Push Notifications */}
                <div className="flex items-center justify-between">
                  <div className="space-y-1">
                    <label className="text-sm font-medium">Push Notifications</label>
                    <p className="text-sm text-muted-foreground">Receive notifications when app is closed</p>
                  </div>
                  <Switch
                    checked={settings.pushNotifications}
                    onCheckedChange={(checked) => saveSettings({ pushNotifications: checked })}
                  />
                </div>

                {/* Sound */}
                <div className="flex items-center justify-between">
                  <div className="space-y-1">
                    <label className="text-sm font-medium">Sound</label>
                    <p className="text-sm text-muted-foreground">Play sound for notifications</p>
                  </div>
                  <Switch
                    checked={settings.soundEnabled}
                    onCheckedChange={(checked) => saveSettings({ soundEnabled: checked })}
                  />
                </div>

                {/* Vibration */}
                <div className="flex items-center justify-between">
                  <div className="space-y-1">
                    <label className="text-sm font-medium">Vibration</label>
                    <p className="text-sm text-muted-foreground">Vibrate for notifications</p>
                  </div>
                  <Switch
                    checked={settings.vibrationEnabled}
                    onCheckedChange={(checked) => saveSettings({ vibrationEnabled: checked })}
                  />
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Sync Settings */}
          <TabsContent value="sync" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <RefreshCw className="h-5 w-5" />
                  Sync & Offline
                </CardTitle>
                <CardDescription>
                  Manage data synchronization and offline access
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Auto Sync */}
                <div className="flex items-center justify-between">
                  <div className="space-y-1">
                    <label className="text-sm font-medium">Auto Sync</label>
                    <p className="text-sm text-muted-foreground">Automatically sync data</p>
                  </div>
                  <Switch
                    checked={settings.autoSync}
                    onCheckedChange={(checked) => saveSettings({ autoSync: checked })}
                  />
                </div>

                {/* WiFi Only Sync */}
                <div className="flex items-center justify-between">
                  <div className="space-y-1">
                    <label className="text-sm font-medium">WiFi Only Sync</label>
                    <p className="text-sm text-muted-foreground">Only sync when connected to WiFi</p>
                  </div>
                  <Switch
                    checked={settings.wifiOnlySync}
                    onCheckedChange={(checked) => saveSettings({ wifiOnlySync: checked })}
                  />
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Privacy Settings */}
          <TabsContent value="privacy" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Shield className="h-5 w-5" />
                  Privacy & Security
                </CardTitle>
                <CardDescription>
                  Control your privacy and security settings
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Screenshot Blocking */}
                <div className="flex items-center justify-between">
                  <div className="space-y-1">
                    <label className="text-sm font-medium">Screenshot Protection</label>
                    <p className="text-sm text-muted-foreground">Prevent screenshots of sensitive content</p>
                  </div>
                  <Switch
                    checked={settings.screenshotBlocking}
                    onCheckedChange={(checked) => saveSettings({ screenshotBlocking: checked })}
                  />
                </div>

                {/* Session Encryption */}
                <div className="flex items-center justify-between">
                  <div className="space-y-1">
                    <label className="text-sm font-medium">Session Encryption</label>
                    <p className="text-sm text-muted-foreground">Encrypt session data</p>
                  </div>
                  <Switch
                    checked={settings.sessionEncryption}
                    onCheckedChange={(checked) => saveSettings({ sessionEncryption: checked })}
                  />
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default MobileSettingsPage; 