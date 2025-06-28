import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { useTranslation } from 'react-i18next';
import { useToast } from '@/components/ui/use-toast';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { User, Mail, Phone, MapPin, Edit, Save, X, Camera, Shield, Heart, Sparkles, Loader2, Lock, Bell, Globe, Palette } from 'lucide-react';
import { cn } from '@/lib/utils';
import LanguageSwitcher from '@/components/LanguageSwitcher';
import { UserProfile } from '@/contexts/AuthContext';
import { useImageStorage } from '@/hooks/useSupabaseStorage';

interface ProfileFormData {
  full_name: string;
  email: string;
  phone: string;
  bio: string;
  location: string;
  website: string;
  timezone: string;
}

const Profile = () => {
  const { t } = useTranslation();
  const { isRTL } = useLanguage();
  const navigate = useNavigate();
  const { user, profile, updateProfile } = useAuth();
  const { toast } = useToast();
  
  const [isEditing, setIsEditing] = useState(false);
  const [loading, setLoading] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({});
  const imageStorage = useImageStorage();
  const [formData, setFormData] = useState<ProfileFormData>({
    full_name: profile?.full_name || '',
    email: profile?.email || user?.email || '',
    phone: profile?.phone || '',
    bio: profile?.bio || '',
    location: profile?.location || '',
    website: profile?.website || '',
    timezone: profile?.timezone || '',
  });

  useEffect(() => {
    if (profile) {
      setFormData({
        full_name: (profile.full_name as string) || '',
        email: (profile.email as string) || user?.email || '',
        phone: (profile.phone as string) || '',
        bio: (profile.bio as string) || '',
        location: (profile.location as string) || '',
        website: (profile.website as string) || '',
        timezone: (profile.timezone as string) || '',
      });
    }
  }, [profile, user]);

  const validateForm = (data: ProfileFormData): Record<string, string> => {
    const errors: Record<string, string> = {};

    // Email validation
    if (data.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email)) {
      errors.email = t('profile.validation.invalidEmail', 'Please enter a valid email address');
    }

    // Phone validation (basic international format)
    if (data.phone && !/^[\+]?[1-9][\d]{0,15}$/.test(data.phone.replace(/[\s\-\(\)]/g, ''))) {
      errors.phone = t('profile.validation.invalidPhone', 'Please enter a valid phone number');
    }

    // Full name validation
    if (data.full_name && data.full_name.trim().length < 2) {
      errors.full_name = t('profile.validation.shortName', 'Name must be at least 2 characters long');
    }

    return errors;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validate form data
    const errors = validateForm(formData);
    setValidationErrors(errors);
    
    if (Object.keys(errors).length > 0) {
      toast({
        title: t('profile.error.title', 'Validation Error'),
        description: t('profile.error.validationDescription', 'Please fix the errors in the form before submitting.'),
        variant: 'destructive',
      });
      return;
    }

    setLoading(true);

    try {
      // Ensure updateProfile is defined before calling
      if (updateProfile) {
        const result = await updateProfile(formData);
        if (result.error) {
          throw result.error;
        }
      } else {
        throw new Error('updateProfile function is not available.');
      }
      setIsEditing(false);
      setValidationErrors({});
      toast({
        title: t('profile.success.title', 'Profile Updated'),
        description: t('profile.success.description', 'Your profile has been updated successfully.'),
      });
    } catch (error) {
      toast({
        title: t('profile.error.title', 'Update Failed'),
        description: error instanceof Error ? error.message : t('profile.error.description', 'Failed to update profile. Please try again.'),
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = () => {
    if (profile) {
      setFormData({
        full_name: (profile.full_name as string) || '',
        email: (profile.email as string) || user?.email || '',
        phone: (profile.phone as string) || '',
        bio: (profile.bio as string) || '',
        location: (profile.location as string) || '',
        website: (profile.website as string) || '',
        timezone: (profile.timezone as string) || '',
      });
    }
    setIsEditing(false);
  };

  const handleAvatarUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      toast({
        title: t('profile.error.title', 'Upload Failed'),
        description: t('profile.error.invalidFileType', 'Please select a valid image file.'),
        variant: 'destructive',
      });
      return;
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      toast({
        title: t('profile.error.title', 'Upload Failed'),
        description: t('profile.error.fileTooLarge', 'File size must be less than 5MB.'),
        variant: 'destructive',
      });
      return;
    }

    setUploadingAvatar(true);

    try {
      // Upload image using the existing image storage hook
      const uploadResult = await imageStorage.uploadImage(file, {
        folder: 'avatars',
        contentType: file.type,
      });

      // Update profile with new avatar URL
      if (updateProfile) {
        const result = await updateProfile({ avatar_url: uploadResult.publicUrl });
        if (result.error) {
          throw result.error;
        }
      }

      toast({
        title: t('profile.success.title', 'Avatar Updated'),
        description: t('profile.success.avatarDescription', 'Your profile picture has been updated successfully.'),
      });
    } catch (error) {
      console.error('Avatar upload error:', error);
      toast({
        title: t('profile.error.title', 'Upload Failed'),
        description: error instanceof Error ? error.message : t('profile.error.avatarDescription', 'Failed to update avatar. Please try again.'),
        variant: 'destructive',
      });
    } finally {
      setUploadingAvatar(false);
      // Clear the input value to allow re-uploading the same file
      event.target.value = '';
    }
  };

  if (loading && !profile) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 flex items-center justify-center">
        <div className="bg-white/90 backdrop-blur-sm rounded-2xl p-8 shadow-lg">
          <div className="flex items-center gap-3">
            <Loader2 className="w-6 h-6 animate-spin text-purple-600" />
            <span className="text-lg font-medium text-gray-700">
              {t('profile.loading', 'Loading profile...')}
            </span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
      {/* Language Switcher - Fixed position */}
      <div className="fixed top-4 right-4 z-50">
        <LanguageSwitcher />
      </div>

      <div className={cn(
        "max-w-4xl mx-auto px-3 sm:px-6 lg:px-8 py-4 sm:py-8",
        isRTL && "direction-rtl"
      )}>
        {/* Header Section */}
        <div className="bg-white/90 backdrop-blur-sm rounded-2xl p-4 sm:p-8 shadow-lg hover:shadow-xl mb-6 sm:mb-8 transition-all duration-300 border border-white/50">
          <div className={cn(
            "flex items-center justify-between",
            isRTL && "flex-row-reverse"
          )}>
            <div className={cn(
              "flex items-center gap-3 sm:gap-6",
              isRTL && "flex-row-reverse"
            )}>
              <div className="relative">
                <Avatar className="w-16 h-16 sm:w-20 sm:h-20 border-4 border-white shadow-lg">
                  <AvatarImage src={profile?.avatar_url} alt={profile?.full_name || t('profile.avatarAlt', 'User profile picture')} />
                  <AvatarFallback className="text-2xl font-semibold bg-gradient-to-r from-purple-500 to-blue-500 text-white">
                    {profile?.full_name?.split(' ').map(n => n[0]).join('').toUpperCase() || 'U'}
                  </AvatarFallback>
                </Avatar>
                <button 
                  onClick={() => document.getElementById('avatar-upload')?.click()}
                  disabled={uploadingAvatar}
                  className="absolute -bottom-1 -right-1 w-8 h-8 bg-gradient-to-r from-teal-500 to-blue-500 rounded-full flex items-center justify-center shadow-lg hover:shadow-xl hover:scale-110 transition-all duration-300 group disabled:opacity-50 disabled:cursor-not-allowed"
                  aria-label={t('profile.changeAvatar', 'Change profile picture')}
                  title={t('profile.changeAvatar', 'Change profile picture')}
                >
                  {uploadingAvatar ? (
                    <Loader2 className="w-4 h-4 text-white animate-spin" />
                  ) : (
                    <Camera className="w-4 h-4 text-white group-hover:rotate-12 transition-transform duration-300" />
                  )}
                </button>
                <input
                  id="avatar-upload"
                  type="file"
                  accept="image/*"
                  onChange={handleAvatarUpload}
                  className="hidden"
                />
              </div>
              <div>
                <h1 className="text-xl sm:text-3xl font-bold bg-gradient-to-r from-purple-600 to-blue-600 bg-clip-text text-transparent mb-2">
                  {profile?.full_name || t('profile.unnamed', 'Unnamed User')}
                </h1>
                <p className="text-gray-600 text-lg mb-2">
                  {profile?.email || user?.email}
                </p>
                <div className="flex items-center gap-2">
                  <Badge variant="secondary" className="px-3 py-1">
                    {profile?.role === 'coach' ? t('profile.role.coach', 'Coach') : t('profile.role.client', 'Client')}
                  </Badge>
                  {profile?.verified && (
                    <Badge variant="default" className="px-3 py-1 bg-green-100 text-green-800">
                      <Shield className="w-3 h-3 mr-1" />
                      {t('profile.verified', 'Verified')}
                    </Badge>
                  )}
                </div>
              </div>
            </div>
            <div className="hidden md:block">
              <div className="w-16 h-16 bg-gradient-to-r from-teal-500 to-blue-500 rounded-2xl flex items-center justify-center">
                <User className="w-8 h-8 text-white" />
              </div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Profile Form */}
          <div className="lg:col-span-2">
            <div className="bg-white/90 backdrop-blur-sm rounded-2xl p-4 sm:p-8 shadow-lg hover:shadow-xl transition-all duration-300 border border-white/50">
              <div className={cn(
                "flex items-center justify-between mb-6",
                isRTL && "flex-row-reverse"
              )}>
                <h2 className="text-2xl font-semibold text-gray-800 flex items-center gap-3">
                  <Edit className="w-6 h-6 text-purple-500" />
                  {t('profile.personalInfo', 'Personal Information')}
                </h2>
                {!isEditing ? (
                  <Button
                    onClick={() => setIsEditing(true)}
                    className="bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white shadow-lg hover:shadow-xl transition-all duration-200"
                  >
                    <Edit className="w-4 h-4 mr-2" />
                    {t('profile.edit', 'Edit Profile')}
                  </Button>
                ) : (
                  <div className="flex items-center gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={handleCancel}
                      className="hover:bg-gray-50"
                    >
                      <X className="w-4 h-4 mr-2" />
                      {t('common.cancel', 'Cancel')}
                    </Button>
                    <Button
                      onClick={handleSubmit}
                      disabled={loading}
                      className="bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white shadow-lg hover:shadow-xl transition-all duration-200"
                    >
                      {loading ? (
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      ) : (
                        <Save className="w-4 h-4 mr-2" />
                      )}
                      {t('common.save', 'Save')}
                    </Button>
                  </div>
                )}
              </div>

              <form onSubmit={handleSubmit} className="space-y-6">
                {/* Full Name */}
                <div className="space-y-2">
                  <Label htmlFor="full_name" className="text-gray-700 font-medium flex items-center gap-2">
                    <User className="w-4 h-4" />
                    {t('profile.fields.fullName', 'Full Name')}
                  </Label>
                  <Input
                    id="full_name"
                    value={formData.full_name}
                    onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                    disabled={!isEditing}
                    className="h-12 bg-white/50 border-gray-200 focus:border-purple-400 focus:ring-purple-400 rounded-lg transition-all duration-200"
                    placeholder={t('profile.placeholders.fullName', 'Enter your full name')}
                    dir={isRTL ? 'rtl' : 'ltr'}
                  />
                </div>

                {/* Email */}
                <div className="space-y-2">
                  <Label htmlFor="email" className="text-gray-700 font-medium flex items-center gap-2">
                    <Mail className="w-4 h-4" />
                    {t('profile.fields.email', 'Email')}
                    <span className="text-red-500" aria-hidden="true">*</span>
                  </Label>
                  <Input
                    id="email"
                    type="email"
                    value={formData.email}
                    onChange={(e) => {
                      setFormData({ ...formData, email: e.target.value });
                      if (validationErrors.email) {
                        setValidationErrors({ ...validationErrors, email: '' });
                      }
                    }}
                    disabled={!isEditing}
                    className={cn(
                      "h-12 bg-white/50 border-gray-200 focus:border-purple-400 focus:ring-purple-400 rounded-lg transition-all duration-200",
                      validationErrors.email && "border-red-400 focus:border-red-400 focus:ring-red-400"
                    )}
                    placeholder={t('profile.placeholders.email', 'Enter your email')}
                    dir={isRTL ? 'rtl' : 'ltr'}
                    aria-invalid={!!validationErrors.email}
                    aria-describedby={validationErrors.email ? 'email-error' : undefined}
                    required
                  />
                  {validationErrors.email && (
                    <p id="email-error" className="text-red-500 text-sm" role="alert">
                      {validationErrors.email}
                    </p>
                  )}
                </div>

                {/* Phone */}
                <div className="space-y-2">
                  <Label htmlFor="phone" className="text-gray-700 font-medium flex items-center gap-2">
                    <Phone className="w-4 h-4" />
                    {t('profile.fields.phone', 'Phone')}
                  </Label>
                  <Input
                    id="phone"
                    type="tel"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    disabled={!isEditing}
                    className="h-12 bg-white/50 border-gray-200 focus:border-purple-400 focus:ring-purple-400 rounded-lg transition-all duration-200"
                    placeholder={t('profile.placeholders.phone', 'Enter your phone number')}
                    dir={isRTL ? 'rtl' : 'ltr'}
                  />
                </div>

                {/* Location */}
                <div className="space-y-2">
                  <Label htmlFor="location" className="text-gray-700 font-medium flex items-center gap-2">
                    <MapPin className="w-4 h-4" />
                    {t('profile.fields.location', 'Location')}
                  </Label>
                  <Input
                    id="location"
                    value={formData.location}
                    onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                    disabled={!isEditing}
                    className="h-12 bg-white/50 border-gray-200 focus:border-purple-400 focus:ring-purple-400 rounded-lg transition-all duration-200"
                    placeholder={t('profile.placeholders.location', 'Enter your location')}
                    dir={isRTL ? 'rtl' : 'ltr'}
                  />
                </div>

                {/* Bio */}
                <div className="space-y-2">
                  <Label htmlFor="bio" className="text-gray-700 font-medium flex items-center gap-2">
                    <Heart className="w-4 h-4" />
                    {t('profile.fields.bio', 'Bio')}
                  </Label>
                  <Textarea
                    id="bio"
                    value={formData.bio}
                    onChange={(e) => setFormData({ ...formData, bio: e.target.value })}
                    disabled={!isEditing}
                    rows={4}
                    className="bg-white/50 border-gray-200 focus:border-purple-400 focus:ring-purple-400 rounded-lg transition-all duration-200 resize-none"
                    placeholder={t('profile.placeholders.bio', 'Tell us about yourself...')}
                    dir={isRTL ? 'rtl' : 'ltr'}
                  />
                </div>
              </form>
            </div>
          </div>

          {/* Sidebar */}
          <div className="space-y-4 sm:space-y-6">
            {/* Quick Stats */}
            <div className="bg-white/90 backdrop-blur-sm rounded-2xl p-4 sm:p-6 shadow-lg hover:shadow-xl transition-all duration-300 border border-white/50">
              <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-purple-500" />
                {t('profile.quickStats', 'Quick Stats')}
              </h3>
              <div className="space-y-4">
                <div className={cn(
                  "flex items-center justify-between",
                  isRTL && "flex-row-reverse"
                )}>
                  <span className="text-gray-600">
                    {t('profile.stats.memberSince', 'Member Since')}
                  </span>
                  <span className="font-semibold text-gray-900">
                    {profile?.created_at ? new Date(profile.created_at).toLocaleDateString(isRTL ? 'he-IL' : 'en-US') : 'N/A'}
                  </span>
                </div>
                <div className={cn(
                  "flex items-center justify-between",
                  isRTL && "flex-row-reverse"
                )}>
                  <span className="text-gray-600">
                    {t('profile.stats.profileViews', 'Profile Views')}
                  </span>
                  <span className="font-semibold text-gray-900">
                    {profile?.profile_views || 0}
                  </span>
                </div>
                <div className={cn(
                  "flex items-center justify-between",
                  isRTL && "flex-row-reverse"
                )}>
                  <span className="text-gray-600">
                    {t('profile.stats.completedSessions', 'Completed Sessions')}
                  </span>
                  <span className="font-semibold text-gray-900">
                    {profile?.completed_sessions || 0}
                  </span>
                </div>
              </div>
            </div>

            {/* Account Settings */}
            <div className="bg-white/90 backdrop-blur-sm rounded-2xl p-6 shadow-lg hover:shadow-xl transition-all duration-300 border border-white/50">
              <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
                <Lock className="w-5 h-5 text-purple-500" />
                {t('profile.accountSettings', 'Account Settings')}
              </h3>
              <div className="space-y-3">
                <Button
                  variant="outline"
                  className="w-full justify-start hover:bg-purple-50 hover:text-purple-600 hover:border-purple-300"
                  onClick={() => navigate('/settings/security')}
                >
                  <Shield className="w-4 h-4 mr-2" />
                  {t('profile.security', 'Security & Privacy')}
                </Button>
                <Button
                  variant="outline"
                  className="w-full justify-start hover:bg-blue-50 hover:text-blue-600 hover:border-blue-300"
                  onClick={() => navigate('/settings/notifications')}
                >
                  <Bell className="w-4 h-4 mr-2" />
                  {t('profile.notifications', 'Notifications')}
                </Button>
                <Button
                  variant="outline"
                  className="w-full justify-start hover:bg-green-50 hover:text-green-600 hover:border-green-300"
                  onClick={() => navigate('/settings/preferences')}
                >
                  <Palette className="w-4 h-4 mr-2" />
                  {t('profile.preferences', 'Preferences')}
                </Button>
              </div>
            </div>

            {/* Language & Region */}
            <div className="bg-white/90 backdrop-blur-sm rounded-2xl p-6 shadow-lg hover:shadow-xl transition-all duration-300 border border-white/50">
              <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
                <Globe className="w-5 h-5 text-purple-500" />
                {t('profile.languageRegion', 'Language & Region')}
              </h3>
              <div className="space-y-4">
                <div className={cn(
                  "flex items-center justify-between",
                  isRTL && "flex-row-reverse"
                )}>
                  <span className="text-gray-600">
                    {t('profile.language', 'Language')}
                  </span>
                  <LanguageSwitcher />
                </div>
                <div className={cn(
                  "flex items-center justify-between",
                  isRTL && "flex-row-reverse"
                )}>
                  <span className="text-gray-600">
                    {t('profile.timezone', 'Timezone')}
                  </span>
                  <span className="text-sm text-gray-900">
                    {Intl.DateTimeFormat().resolvedOptions().timeZone}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Profile;
