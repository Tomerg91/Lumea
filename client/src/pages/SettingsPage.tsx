import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useLanguage } from '../contexts/LanguageContext';
import { CalendarIntegration } from '../components/calendar/CalendarIntegration';
import NotificationPreferences from '../components/notifications/NotificationPreferences';
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
  Calendar
} from 'lucide-react';

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
  const { t, isRTL, language, setLanguage } = useLanguage();
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
    }, 1000);
  };

  const handleSaveNotifications = async () => {
    setLoading(true);
    // Simulate API call
    setTimeout(() => {
      setSaveMessage(t('settings.notificationsSaved'));
      setLoading(false);
      setTimeout(() => setSaveMessage(''), 3000);
    }, 1000);
  };

  const handleSavePrivacy = async () => {
    setLoading(true);
    // Simulate API call
    setTimeout(() => {
      setSaveMessage(t('settings.privacySaved'));
      setLoading(false);
      setTimeout(() => setSaveMessage(''), 3000);
    }, 1000);
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
    <div className={`min-h-screen bg-gradient-background py-8 ${isRTL ? 'rtl-layout' : ''}`}>
      <div className="container mx-auto px-4 max-w-4xl">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gradient-purple mb-2">
            {t('settings.title')}
          </h1>
          <p className="text-gray-600">
            {t('settings.subtitle')}
          </p>
        </div>

        {/* Save Message */}
        {saveMessage && (
          <div className="mb-6 p-4 bg-green-100 border border-green-300 rounded-xl text-green-800">
            {saveMessage}
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
          {/* Sidebar Tabs */}
          <div className="lg:col-span-1">
            <div className="card-lumea p-6">
              <div className="space-y-2">
                {tabs.map((tab) => (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id as any)}
                    className={`w-full flex items-center space-x-3 px-4 py-3 rounded-xl text-sm font-medium transition-all duration-300 ${
                      activeTab === tab.id
                        ? 'bg-gradient-teal text-white'
                        : 'hover:bg-gray-50/50'
                    } ${isRTL ? 'flex-row-reverse space-x-reverse' : ''}`}
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
            <div className="card-lumea p-6">
              {/* Profile Tab */}
              {activeTab === 'profile' && (
                <div className="space-y-6">
                  <h2 className="text-xl font-semibold mb-6">{t('settings.profile')}</h2>
                  
                  {/* Avatar */}
                  <div className={`flex items-center space-x-6 ${isRTL ? 'flex-row-reverse space-x-reverse' : ''}`}>
                    <div className="relative">
                      <div className="w-20 h-20 rounded-2xl bg-gradient-purple flex items-center justify-center">
                        <User className="w-10 h-10 text-white" />
                      </div>
                      <button className="absolute -bottom-2 -right-2 w-8 h-8 bg-white rounded-full shadow-md flex items-center justify-center">
                        <Camera className="w-4 h-4 text-gray-600" />
                      </button>
                    </div>
                    <div>
                      <h3 className="font-semibold">{userProfile.fullName || t('settings.noName')}</h3>
                      <p className="text-sm text-gray-600 capitalize">{userProfile.role}</p>
                      <p className="text-xs text-gray-500">{t('settings.memberSince')} {new Date(userProfile.joinedDate).getFullYear()}</p>
                    </div>
                  </div>

                  {/* Profile Form */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <label className="block text-sm font-medium mb-2">{t('settings.fullName')}</label>
                      <input
                        type="text"
                        value={userProfile.fullName}
                        onChange={(e) => setUserProfile({...userProfile, fullName: e.target.value})}
                        className="glass-input w-full"
                      />
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium mb-2">{t('settings.email')}</label>
                      <input
                        type="email"
                        value={userProfile.email}
                        onChange={(e) => setUserProfile({...userProfile, email: e.target.value})}
                        className="glass-input w-full"
                      />
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium mb-2">{t('settings.phone')}</label>
                      <input
                        type="tel"
                        value={userProfile.phone}
                        onChange={(e) => setUserProfile({...userProfile, phone: e.target.value})}
                        className="glass-input w-full"
                      />
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium mb-2">{t('settings.location')}</label>
                      <input
                        type="text"
                        value={userProfile.location}
                        onChange={(e) => setUserProfile({...userProfile, location: e.target.value})}
                        className="glass-input w-full"
                      />
                    </div>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium mb-2">{t('settings.bio')}</label>
                    <textarea
                      value={userProfile.bio}
                      onChange={(e) => setUserProfile({...userProfile, bio: e.target.value})}
                      rows={4}
                      className="glass-input w-full"
                      placeholder={t('settings.bioPlaceholder')}
                    />
                  </div>

                  <button
                    onClick={handleSaveProfile}
                    disabled={loading}
                    className="btn-primary flex items-center space-x-2"
                  >
                    <Save className="w-4 h-4" />
                    <span>{loading ? t('settings.saving') : t('settings.saveProfile')}</span>
                  </button>
                </div>
              )}

              {/* Notifications Tab */}
              {activeTab === 'notifications' && (
                <div className="space-y-6">
                  <NotificationPreferences />
                </div>
              )}

              {/* Privacy Tab */}
              {activeTab === 'privacy' && (
                <div className="space-y-6">
                  <h2 className="text-xl font-semibold mb-6">{t('settings.privacy')}</h2>
                  
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium mb-2">{t('settings.profileVisibility')}</label>
                      <select
                        value={privacy.profileVisibility}
                        onChange={(e) => setPrivacy({...privacy, profileVisibility: e.target.value as any})}
                        className="glass-input w-full"
                      >
                        <option value="public">{t('settings.public')}</option>
                        <option value="private">{t('settings.private')}</option>
                        <option value="connections">{t('settings.connectionsOnly')}</option>
                      </select>
                    </div>
                    
                    <div className={`flex items-center justify-between ${isRTL ? 'flex-row-reverse' : ''}`}>
                      <div>
                        <h3 className="font-medium">{t('settings.showEmail')}</h3>
                        <p className="text-sm text-gray-600">{t('settings.showEmailDesc')}</p>
                      </div>
                      <label className="switch">
                        <input
                          type="checkbox"
                          checked={privacy.showEmail}
                          onChange={(e) => setPrivacy({...privacy, showEmail: e.target.checked})}
                        />
                        <span className="slider"></span>
                      </label>
                    </div>
                    
                    <div className={`flex items-center justify-between ${isRTL ? 'flex-row-reverse' : ''}`}>
                      <div>
                        <h3 className="font-medium">{t('settings.showPhone')}</h3>
                        <p className="text-sm text-gray-600">{t('settings.showPhoneDesc')}</p>
                      </div>
                      <label className="switch">
                        <input
                          type="checkbox"
                          checked={privacy.showPhone}
                          onChange={(e) => setPrivacy({...privacy, showPhone: e.target.checked})}
                        />
                        <span className="slider"></span>
                      </label>
                    </div>
                    
                    <div className={`flex items-center justify-between ${isRTL ? 'flex-row-reverse' : ''}`}>
                      <div>
                        <h3 className="font-medium">{t('settings.dataSharing')}</h3>
                        <p className="text-sm text-gray-600">{t('settings.dataSharingDesc')}</p>
                      </div>
                      <label className="switch">
                        <input
                          type="checkbox"
                          checked={privacy.dataSharing}
                          onChange={(e) => setPrivacy({...privacy, dataSharing: e.target.checked})}
                        />
                        <span className="slider"></span>
                      </label>
                    </div>
                  </div>

                  <button
                    onClick={handleSavePrivacy}
                    disabled={loading}
                    className="btn-primary flex items-center space-x-2"
                  >
                    <Save className="w-4 h-4" />
                    <span>{loading ? t('settings.saving') : t('settings.savePrivacy')}</span>
                  </button>
                </div>
              )}

              {/* Calendar Tab */}
              {activeTab === 'calendar' && (
                <div className="space-y-6">
                  <h2 className="text-xl font-semibold mb-6">{t('settings.calendar')}</h2>
                  
                  <CalendarIntegration />
                </div>
              )}

              {/* Appearance Tab */}
              {activeTab === 'appearance' && (
                <div className="space-y-6">
                  <h2 className="text-xl font-semibold mb-6">{t('settings.appearance')}</h2>
                  
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium mb-2">{t('settings.language')}</label>
                      <select
                        value={language}
                        onChange={(e) => setLanguage(e.target.value as 'en' | 'he')}
                        className="glass-input w-full"
                      >
                        <option value="en">English</option>
                        <option value="he">עברית</option>
                      </select>
                    </div>
                    
                    <div className={`flex items-center justify-between ${isRTL ? 'flex-row-reverse' : ''}`}>
                      <div>
                        <h3 className="font-medium">{t('settings.darkMode')}</h3>
                        <p className="text-sm text-gray-600">{t('settings.darkModeDesc')}</p>
                      </div>
                      <label className="switch">
                        <input
                          type="checkbox"
                          checked={darkMode}
                          onChange={(e) => setDarkMode(e.target.checked)}
                        />
                        <span className="slider"></span>
                      </label>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SettingsPage; 