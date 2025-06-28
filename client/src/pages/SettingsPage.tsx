import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useTranslation } from 'react-i18next';
import { useLanguage } from '../contexts/LanguageContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { 
  User, 
  Settings, 
  Bell, 
  Lock, 
  Globe, 
  Moon, 
  Sun, 
  Save,
  Camera,
  Mail,
  Phone,
  MapPin,
  Calendar,
  Shield,
  Palette,
  Languages,
  Loader2,
  Check,
  Sparkles
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { CalendarIntegration } from '../components/calendar/CalendarIntegration';
import NotificationPreferences from '../components/notifications/NotificationPreferences';
import { cn } from '@/lib/utils';

interface UserProfile {
  fullName: string;
  email: string;
  phone: string;
  location: string;
  bio: string;
  avatar?: string;
  role: string;
  joinedDate: string;
}

interface NotificationSettings {
  emailNotifications: boolean;
  pushNotifications: boolean;
  sessionReminders: boolean;
  weeklyReports: boolean;
}

interface PrivacySettings {
  profileVisibility: 'public' | 'private' | 'connections';
  showEmail: boolean;
  showPhone: boolean;
  dataSharing: boolean;
}

const SettingsPage = () => {
  const { profile, session } = useAuth();
  const { t } = useTranslation();
  const { language, isRTL, setLanguage, isChangingLanguage } = useLanguage();
  const { toast } = useToast();
  
  const [activeTab, setActiveTab] = useState<'profile' | 'notifications' | 'privacy' | 'appearance' | 'calendar'>('profile');
  const [loading, setLoading] = useState(false);
  const [saveMessage, setSaveMessage] = useState('');

  const [userProfile, setUserProfile] = useState<UserProfile>({
    fullName: (profile?.full_name || profile?.name || '') as string,
    email: (profile?.email || '') as string,
    phone: '',
    location: '',
    bio: '',
    role: (profile?.role || '') as string,
    joinedDate: '2024-01-01'
  });

  const [notifications, setNotifications] = useState<NotificationSettings>({
    emailNotifications: true,
    pushNotifications: true,
    sessionReminders: true,
    weeklyReports: false
  });

  const [privacy, setPrivacy] = useState<PrivacySettings>({
    profileVisibility: 'private',
    showEmail: false,
    showPhone: false,
    dataSharing: false
  });

  const [darkMode, setDarkMode] = useState(false);

  const handleSaveProfile = async () => {
    setLoading(true);
    // Simulate API call
    setTimeout(() => {
      setSaveMessage(t('settings.profileSaved'));
      setLoading(false);
      setTimeout(() => setSaveMessage(''), 3000);
      toast({
        title: t('settings.success'),
        description: t('settings.profileSaved'),
      });
    }, 1000);
  };

  const handleSaveNotifications = async () => {
    setLoading(true);
    // Simulate API call
    setTimeout(() => {
      setSaveMessage(t('settings.notificationsSaved'));
      setLoading(false);
      setTimeout(() => setSaveMessage(''), 3000);
      toast({
        title: t('settings.success'),
        description: t('settings.notificationsSaved'),
      });
    }, 1000);
  };

  const handleSavePrivacy = async () => {
    setLoading(true);
    // Simulate API call
    setTimeout(() => {
      setSaveMessage(t('settings.privacySaved'));
      setLoading(false);
      setTimeout(() => setSaveMessage(''), 3000);
      toast({
        title: t('settings.success'),
        description: t('settings.privacySaved'),
      });
    }, 1000);
  };

  const handleLanguageChange = async (newLanguage: 'he' | 'en') => {
    try {
      await setLanguage(newLanguage);
      toast({
        title: t('settings.success'),
        description: t('settings.languageChanged'),
      });
    } catch (error) {
      toast({
        title: t('settings.error'),
        description: t('settings.languageChangeFailed'),
        variant: 'destructive',
      });
    }
  };

  const tabs = [
    { id: 'profile', label: t('settings.profile'), icon: <User className="w-4 h-4" /> },
    { id: 'notifications', label: t('settings.notifications'), icon: <Bell className="w-4 h-4" /> },
    { id: 'privacy', label: t('settings.privacy'), icon: <Lock className="w-4 h-4" /> },
    { id: 'calendar', label: 'Calendar Integration', icon: <Calendar className="w-4 h-4" /> },
    { id: 'appearance', label: t('settings.appearance'), icon: <Settings className="w-4 h-4" /> }
  ];

  // Check URL params for tab selection
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const tab = urlParams.get('tab');
    if (tab && ['profile', 'notifications', 'privacy', 'calendar', 'appearance'].includes(tab)) {
      setActiveTab(tab as any);
    }
  }, []);

  return (
    <div className={cn(
      "min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 py-8",
      isRTL && "rtl"
    )}>
      <div className="container mx-auto px-4 max-w-6xl">
        {/* Header */}
        <div className="mb-8 text-center">
          <div className="flex items-center justify-center gap-3 mb-4">
            <div className="p-3 bg-gradient-to-r from-purple-600 to-blue-600 rounded-2xl">
              <Settings className="w-8 h-8 text-white" />
            </div>
            <h1 className="text-4xl font-bold bg-gradient-to-r from-purple-600 to-blue-600 bg-clip-text text-transparent">
              {t('settings.title')}
            </h1>
          </div>
          <p className="text-lg text-gray-600 max-w-2xl mx-auto">
            {t('settings.subtitle')}
          </p>
        </div>

        {/* Save Message */}
        {saveMessage && (
          <div className="mb-6 p-4 bg-green-100/80 backdrop-blur-sm border border-green-300 rounded-2xl text-green-800 text-center">
            <div className="flex items-center justify-center gap-2">
              <Check className="w-5 h-5" />
              {saveMessage}
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
          {/* Sidebar Tabs */}
          <div className="lg:col-span-1">
            <div className="bg-white/90 backdrop-blur-sm rounded-2xl shadow-lg border border-white/20 p-6 sticky top-8">
              <div className="space-y-2">
                {tabs.map((tab) => (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id as any)}
                    className={cn(
                      "w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all duration-300",
                      activeTab === tab.id
                        ? 'bg-gradient-to-r from-purple-600 to-blue-600 text-white shadow-lg'
                        : 'hover:bg-gray-50/80 text-gray-700',
                      isRTL && "flex-row-reverse"
                    )}
                  >
                    {tab.icon}
                    <span>{tab.label}</span>
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Content Area */}
          <div className="lg:col-span-3">
            <div className="bg-white/90 backdrop-blur-sm rounded-2xl shadow-lg border border-white/20 p-8">
              
              {/* Profile Tab */}
              {activeTab === 'profile' && (
                <div className="space-y-8">
                  <div className="flex items-center gap-3 mb-6">
                    <User className="w-6 h-6 text-purple-600" />
                    <h2 className="text-2xl font-bold bg-gradient-to-r from-purple-600 to-blue-600 bg-clip-text text-transparent">
                      {t('settings.profile')}
                    </h2>
                  </div>
                  
                  {/* Avatar Section */}
                  <div className={cn(
                    "flex items-center gap-6 p-6 bg-gradient-to-r from-purple-50 to-blue-50 rounded-2xl",
                    isRTL && "flex-row-reverse"
                  )}>
                    <div className="relative">
                      <div className="w-24 h-24 rounded-2xl bg-gradient-to-r from-purple-600 to-blue-600 flex items-center justify-center shadow-lg">
                        <User className="w-12 h-12 text-white" />
                      </div>
                      <button className="absolute -bottom-2 -right-2 w-10 h-10 bg-white rounded-full shadow-lg flex items-center justify-center hover:shadow-xl transition-shadow">
                        <Camera className="w-5 h-5 text-gray-600" />
                      </button>
                    </div>
                    <div className={cn("flex-1", isRTL && "text-right")}>
                      <h3 className="text-xl font-bold text-gray-900">{userProfile.fullName || t('settings.noName')}</h3>
                      <p className="text-purple-600 font-medium capitalize">{userProfile.role}</p>
                      <p className="text-sm text-gray-500">{t('settings.memberSince')} {new Date(userProfile.joinedDate).getFullYear()}</p>
                    </div>
                  </div>

                  {/* Profile Form */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <Label className="text-sm font-medium text-gray-700">{t('settings.fullName')}</Label>
                      <Input
                        type="text"
                        value={userProfile.fullName}
                        onChange={(e) => setUserProfile({...userProfile, fullName: e.target.value})}
                        className={cn(
                          "bg-white/80 border-gray-200 focus:border-purple-500 focus:ring-purple-500/20",
                          isRTL && "text-right"
                        )}
                        placeholder={t('settings.enterFullName')}
                      />
                    </div>
                    
                    <div className="space-y-2">
                      <Label className="text-sm font-medium text-gray-700">{t('settings.email')}</Label>
                      <Input
                        type="email"
                        value={userProfile.email}
                        onChange={(e) => setUserProfile({...userProfile, email: e.target.value})}
                        className={cn(
                          "bg-white/80 border-gray-200 focus:border-purple-500 focus:ring-purple-500/20",
                          isRTL && "text-right"
                        )}
                        placeholder={t('settings.enterEmail')}
                      />
                    </div>

                    <div className="space-y-2">
                      <Label className="text-sm font-medium text-gray-700">{t('settings.phone')}</Label>
                      <Input
                        type="tel"
                        value={userProfile.phone}
                        onChange={(e) => setUserProfile({...userProfile, phone: e.target.value})}
                        className={cn(
                          "bg-white/80 border-gray-200 focus:border-purple-500 focus:ring-purple-500/20",
                          isRTL && "text-right"
                        )}
                        placeholder={t('settings.enterPhone')}
                      />
                    </div>

                    <div className="space-y-2">
                      <Label className="text-sm font-medium text-gray-700">{t('settings.location')}</Label>
                      <Input
                        type="text"
                        value={userProfile.location}
                        onChange={(e) => setUserProfile({...userProfile, location: e.target.value})}
                        className={cn(
                          "bg-white/80 border-gray-200 focus:border-purple-500 focus:ring-purple-500/20",
                          isRTL && "text-right"
                        )}
                        placeholder={t('settings.enterLocation')}
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label className="text-sm font-medium text-gray-700">{t('settings.bio')}</Label>
                    <textarea
                      value={userProfile.bio}
                      onChange={(e) => setUserProfile({...userProfile, bio: e.target.value})}
                      rows={4}
                      className={cn(
                        "w-full px-3 py-2 bg-white/80 border border-gray-200 rounded-xl focus:border-purple-500 focus:ring-2 focus:ring-purple-500/20 resize-none",
                        isRTL && "text-right"
                      )}
                      placeholder={t('settings.enterBio')}
                    />
                  </div>

                  <Button 
                    onClick={handleSaveProfile}
                    disabled={loading}
                    className="w-full bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white font-medium py-3 rounded-xl shadow-lg hover:shadow-xl transition-all duration-300"
                  >
                    {loading ? (
                      <div className="flex items-center gap-2">
                        <Loader2 className="w-4 h-4 animate-spin" />
                        {t('settings.saving')}
                      </div>
                    ) : (
                      <div className="flex items-center gap-2">
                        <Save className="w-4 h-4" />
                        {t('settings.saveProfile')}
                      </div>
                    )}
                  </Button>
                </div>
              )}

              {/* Appearance Tab */}
              {activeTab === 'appearance' && (
                <div className="space-y-8">
                  <div className="flex items-center gap-3 mb-6">
                    <Palette className="w-6 h-6 text-purple-600" />
                    <h2 className="text-2xl font-bold bg-gradient-to-r from-purple-600 to-blue-600 bg-clip-text text-transparent">
                      {t('settings.appearance')}
                    </h2>
                  </div>

                  {/* Language Settings */}
                  <Card className="bg-white/80 border-gray-200 shadow-lg">
                    <CardHeader>
                      <CardTitle className="flex items-center gap-3">
                        <Languages className="h-5 w-5 text-purple-600" />
                        <span className="bg-gradient-to-r from-purple-600 to-blue-600 bg-clip-text text-transparent">
                          {t('settings.language')}
                        </span>
                      </CardTitle>
                      <CardDescription className="text-gray-600">
                        {t('settings.languageDesc')}
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-6">
                      <div className="flex items-center justify-between">
                        <Label htmlFor="language-select" className="text-base font-medium text-gray-700">
                          {t('settings.selectLanguage')}
                        </Label>
                        {isChangingLanguage && (
                          <div className="flex items-center gap-2 text-sm text-purple-600">
                            <Loader2 className="h-4 w-4 animate-spin" />
                            {t('settings.changingLanguage')}
                          </div>
                        )}
                      </div>
                      
                      <Select 
                        value={language} 
                        onValueChange={handleLanguageChange}
                        disabled={isChangingLanguage}
                      >
                        <SelectTrigger id="language-select" className="w-full bg-white/80 border-gray-200 focus:border-purple-500">
                          <SelectValue placeholder={t('settings.selectLanguage')} />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="he">
                            <div className="flex items-center gap-3">
                              <span className="text-lg">🇮🇱</span>
                              <span>עברית</span>
                              <Badge variant="secondary" className="text-xs bg-purple-100 text-purple-700">עברית</Badge>
                            </div>
                          </SelectItem>
                          <SelectItem value="en">
                            <div className="flex items-center gap-3">
                              <span className="text-lg">🇺🇸</span>
                              <span>English</span>
                              <Badge variant="secondary" className="text-xs bg-blue-100 text-blue-700">EN</Badge>
                            </div>
                          </SelectItem>
                        </SelectContent>
                      </Select>

                      <Alert className="bg-gradient-to-r from-purple-50 to-blue-50 border-purple-200">
                        <Globe className="h-4 w-4 text-purple-600" />
                        <AlertDescription className="text-purple-800">
                          {t('settings.languageNote')}
                        </AlertDescription>
                      </Alert>
                    </CardContent>
                  </Card>

                  {/* Dark Mode Toggle */}
                  <Card className="bg-white/80 border-gray-200 shadow-lg">
                    <CardHeader>
                      <CardTitle className="flex items-center gap-3">
                        <Moon className="h-5 w-5 text-purple-600" />
                        <span className="bg-gradient-to-r from-purple-600 to-blue-600 bg-clip-text text-transparent">
                          {t('settings.darkMode')}
                        </span>
                      </CardTitle>
                      <CardDescription className="text-gray-600">
                        {t('settings.darkModeDesc')}
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="flex items-center justify-between p-4 bg-gradient-to-r from-purple-50 to-blue-50 rounded-xl">
                        <div className="flex items-center gap-3">
                          {darkMode ? <Moon className="w-5 h-5 text-purple-600" /> : <Sun className="w-5 h-5 text-yellow-500" />}
                          <Label htmlFor="dark-mode" className="text-base font-medium text-gray-700">
                            {t('settings.enableDarkMode')}
                          </Label>
                        </div>
                        <Switch 
                          id="dark-mode"
                          checked={darkMode}
                          onCheckedChange={setDarkMode}
                          className="data-[state=checked]:bg-purple-600"
                        />
                      </div>
                    </CardContent>
                  </Card>
                </div>
              )}

              {/* Notifications Tab */}
              {activeTab === 'notifications' && (
                <div className="space-y-8">
                  <div className="flex items-center gap-3 mb-6">
                    <Bell className="w-6 h-6 text-purple-600" />
                    <h2 className="text-2xl font-bold bg-gradient-to-r from-purple-600 to-blue-600 bg-clip-text text-transparent">
                      {t('settings.notifications')}
                    </h2>
                  </div>

                  <div className="space-y-6">
                    {/* Email Notifications */}
                    <Card className="bg-white/80 border-gray-200 shadow-lg">
                      <CardContent className="p-6">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <Mail className="w-5 h-5 text-purple-600" />
                            <div>
                              <Label className="text-base font-medium text-gray-700">
                                {t('settings.emailNotifications')}
                              </Label>
                              <p className="text-sm text-gray-500">{t('settings.emailNotificationsDesc')}</p>
                            </div>
                          </div>
                          <Switch 
                            checked={notifications.emailNotifications}
                            onCheckedChange={(checked) => setNotifications({...notifications, emailNotifications: checked})}
                            className="data-[state=checked]:bg-purple-600"
                          />
                        </div>
                      </CardContent>
                    </Card>

                    {/* Push Notifications */}
                    <Card className="bg-white/80 border-gray-200 shadow-lg">
                      <CardContent className="p-6">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <Bell className="w-5 h-5 text-purple-600" />
                            <div>
                              <Label className="text-base font-medium text-gray-700">
                                {t('settings.pushNotifications')}
                              </Label>
                              <p className="text-sm text-gray-500">{t('settings.pushNotificationsDesc')}</p>
                            </div>
                          </div>
                          <Switch 
                            checked={notifications.pushNotifications}
                            onCheckedChange={(checked) => setNotifications({...notifications, pushNotifications: checked})}
                            className="data-[state=checked]:bg-purple-600"
                          />
                        </div>
                      </CardContent>
                    </Card>

                    {/* Session Reminders */}
                    <Card className="bg-white/80 border-gray-200 shadow-lg">
                      <CardContent className="p-6">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <Calendar className="w-5 h-5 text-purple-600" />
                            <div>
                              <Label className="text-base font-medium text-gray-700">
                                {t('settings.sessionReminders')}
                              </Label>
                              <p className="text-sm text-gray-500">{t('settings.sessionRemindersDesc')}</p>
                            </div>
                          </div>
                          <Switch 
                            checked={notifications.sessionReminders}
                            onCheckedChange={(checked) => setNotifications({...notifications, sessionReminders: checked})}
                            className="data-[state=checked]:bg-purple-600"
                          />
                        </div>
                      </CardContent>
                    </Card>

                    <Button 
                      onClick={handleSaveNotifications}
                      disabled={loading}
                      className="w-full bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white font-medium py-3 rounded-xl shadow-lg hover:shadow-xl transition-all duration-300"
                    >
                      {loading ? (
                        <div className="flex items-center gap-2">
                          <Loader2 className="w-4 h-4 animate-spin" />
                          {t('settings.saving')}
                        </div>
                      ) : (
                        <div className="flex items-center gap-2">
                          <Save className="w-4 h-4" />
                          {t('settings.saveNotifications')}
                        </div>
                      )}
                    </Button>
                  </div>
                </div>
              )}

              {/* Privacy Tab */}
              {activeTab === 'privacy' && (
                <div className="space-y-8">
                  <div className="flex items-center gap-3 mb-6">
                    <Shield className="w-6 h-6 text-purple-600" />
                    <h2 className="text-2xl font-bold bg-gradient-to-r from-purple-600 to-blue-600 bg-clip-text text-transparent">
                      {t('settings.privacy')}
                    </h2>
                  </div>

                  <div className="space-y-6">
                    {/* Profile Visibility */}
                    <Card className="bg-white/80 border-gray-200 shadow-lg">
                      <CardHeader>
                        <CardTitle className="flex items-center gap-3">
                          <User className="h-5 w-5 text-purple-600" />
                          {t('settings.profileVisibility')}
                        </CardTitle>
                        <CardDescription>
                          {t('settings.profileVisibilityDesc')}
                        </CardDescription>
                      </CardHeader>
                      <CardContent>
                        <Select 
                          value={privacy.profileVisibility} 
                          onValueChange={(value: 'public' | 'private' | 'connections') => 
                            setPrivacy({...privacy, profileVisibility: value})
                          }
                        >
                          <SelectTrigger className="w-full bg-white/80 border-gray-200 focus:border-purple-500">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="public">{t('settings.public')}</SelectItem>
                            <SelectItem value="private">{t('settings.private')}</SelectItem>
                            <SelectItem value="connections">{t('settings.connectionsOnly')}</SelectItem>
                          </SelectContent>
                        </Select>
                      </CardContent>
                    </Card>

                    {/* Contact Information Visibility */}
                    <Card className="bg-white/80 border-gray-200 shadow-lg">
                      <CardHeader>
                        <CardTitle>{t('settings.contactVisibility')}</CardTitle>
                        <CardDescription>
                          {t('settings.contactVisibilityDesc')}
                        </CardDescription>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        <div className="flex items-center justify-between p-4 bg-gradient-to-r from-purple-50 to-blue-50 rounded-xl">
                          <div className="flex items-center gap-3">
                            <Mail className="w-5 h-5 text-purple-600" />
                            <Label className="text-base font-medium text-gray-700">
                              {t('settings.showEmail')}
                            </Label>
                          </div>
                          <Switch 
                            checked={privacy.showEmail}
                            onCheckedChange={(checked) => setPrivacy({...privacy, showEmail: checked})}
                            className="data-[state=checked]:bg-purple-600"
                          />
                        </div>

                        <div className="flex items-center justify-between p-4 bg-gradient-to-r from-purple-50 to-blue-50 rounded-xl">
                          <div className="flex items-center gap-3">
                            <Phone className="w-5 h-5 text-purple-600" />
                            <Label className="text-base font-medium text-gray-700">
                              {t('settings.showPhone')}
                            </Label>
                          </div>
                          <Switch 
                            checked={privacy.showPhone}
                            onCheckedChange={(checked) => setPrivacy({...privacy, showPhone: checked})}
                            className="data-[state=checked]:bg-purple-600"
                          />
                        </div>
                      </CardContent>
                    </Card>

                    <Button 
                      onClick={handleSavePrivacy}
                      disabled={loading}
                      className="w-full bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white font-medium py-3 rounded-xl shadow-lg hover:shadow-xl transition-all duration-300"
                    >
                      {loading ? (
                        <div className="flex items-center gap-2">
                          <Loader2 className="w-4 h-4 animate-spin" />
                          {t('settings.saving')}
                        </div>
                      ) : (
                        <div className="flex items-center gap-2">
                          <Save className="w-4 h-4" />
                          {t('settings.savePrivacy')}
                        </div>
                      )}
                    </Button>
                  </div>
                </div>
              )}

              {/* Calendar Integration Tab */}
              {activeTab === 'calendar' && (
                <div className="space-y-8">
                  <div className="flex items-center gap-3 mb-6">
                    <Calendar className="w-6 h-6 text-purple-600" />
                    <h2 className="text-2xl font-bold bg-gradient-to-r from-purple-600 to-blue-600 bg-clip-text text-transparent">
                      Calendar Integration
                    </h2>
                  </div>

                  <div className="bg-gradient-to-r from-purple-50 to-blue-50 rounded-2xl p-8">
                    <CalendarIntegration />
                  </div>
                </div>
              )}

            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="mt-12 text-center">
          <div className="flex items-center justify-center gap-2 text-sm text-gray-500">
            <Sparkles className="w-4 h-4" />
            <span>{t('settings.footerText')}</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SettingsPage; 