/* eslint-disable react/no-unescaped-entities */ // Disabled due to persistent issue with i18next t() function default value
import * as React from 'react';
import { useNavigate } from 'react-router-dom';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import * as z from 'zod';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { supabase, checkSupabaseConnection } from '@/lib/supabase';
import { useToast } from '@/components/ui/use-toast';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import ThemeToggle from '@/components/ThemeToggle';
import LanguageSwitcher from '@/components/LanguageSwitcher';
import Logo from '@/components/Logo';
import BackgroundPattern from '@/components/BackgroundPattern';
import type { TFunction } from 'i18next';
import { AuthError } from '@supabase/supabase-js';
import { useState } from 'react';
import { Sparkles, UserCheck, Shield, Heart, Loader2, Eye, EyeOff } from 'lucide-react';
import { cn } from '@/lib/utils';

const createLoginSchema = (t: TFunction) =>
  z.object({
    email: z.string().email({ message: t('validation.emailInvalid') }),
    password: z.string().min(6, { message: t('validation.passwordMinLength', { length: 6 }) }),
  });

const createSignupSchema = (t: TFunction) =>
  createLoginSchema(t)
    .extend({
      name: z.string().min(2, { message: t('validation.nameMinLength', { length: 2 }) }),
      confirmPassword: z.string().min(6, { message: t('validation.confirmPasswordRequired') }),
      role: z.enum(['client', 'coach'], {
        required_error: t('validation.roleRequired', 'Please select your account type'),
        invalid_type_error: t('validation.roleInvalid', 'Invalid role selected'),
      }),
    })
    .refine((data) => data.password === data.confirmPassword, {
      message: t('validation.passwordsDontMatch'),
      path: ['confirmPassword'],
    });

const placeholderT = (key: string) => key;
type LoginFormValues = z.infer<ReturnType<typeof createLoginSchema>>;
type SignupFormValues = z.infer<ReturnType<typeof createSignupSchema>>;

const Auth = () => {
  const { t } = useTranslation();
  const { isRTL } = useLanguage();
  const { signIn, signUp } = useAuth();
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [name, setName] = useState('');
  const [role, setRole] = useState<'client' | 'coach'>('client');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      if (isLogin) {
        const result = await signIn({ email, password });
        if (result.error) {
          throw new Error(result.error.message);
        }
      } else {
        if (password !== confirmPassword) {
          throw new Error(t('validation.passwordsDontMatch'));
        }
        
        const result = await signUp({ 
          email, 
          password, 
          options: { 
            data: { 
              name, 
              role 
            } 
          } 
        });
        if (result.error) {
          throw new Error(result.error.message);
        }
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const togglePasswordVisibility = () => setShowPassword(!showPassword);
  const toggleConfirmPasswordVisibility = () => setShowConfirmPassword(!showConfirmPassword);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 flex items-center justify-center p-4">
      {/* Language Switcher - Fixed position */}
      <div className="fixed top-4 right-4 z-50">
        <LanguageSwitcher />
      </div>

      {/* Main Auth Container */}
      <div className="w-full max-w-lg">
        {/* Logo and Welcome Section */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-r from-teal-500 to-blue-500 rounded-2xl mb-6 shadow-lg">
            <Sparkles className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-3xl font-bold bg-gradient-to-r from-purple-600 to-blue-600 bg-clip-text text-transparent mb-2">
            {t('auth.tagline', 'Your Soulful Coaching Partner')}
          </h1>
          <p className="text-gray-600 text-lg">
            {isLogin 
              ? t('auth.loginDescription', 'Enter your details to access your account')
              : t('auth.signupDescription', 'Join Lumea to start your transformation journey')
            }
          </p>
        </div>

        {/* Auth Card */}
        <div className="bg-white/90 backdrop-blur-sm rounded-2xl shadow-xl border border-white/20 overflow-hidden">
          {/* Header */}
          <div className="bg-gradient-to-r from-purple-600 to-blue-600 px-8 py-6">
            <h2 className="text-2xl font-bold text-white text-center">
              {isLogin ? t('auth.loginTitle', 'Welcome Back') : t('auth.signupTitle', 'Create Account')}
            </h2>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="p-8 space-y-6">
            {/* Development Mode Notice */}
            {process.env.NODE_ENV === 'development' && (
              <div className="bg-gradient-to-r from-amber-50 to-orange-50 border-2 border-amber-200 rounded-xl p-4 mb-6">
                <div className={cn(
                  'flex items-center gap-3',
                  isRTL && 'flex-row-reverse'
                )}>
                  <Shield className="w-5 h-5 text-amber-600" />
                  <div>
                    <h4 className="font-medium text-amber-800">
                      {isRTL ? 'מצב פיתוח' : 'Development Mode'}
                    </h4>
                    <p className="text-sm text-amber-700 mt-1">
                      {isRTL 
                        ? 'השתמש באחד מחשבונות הבדיקה למטה:'
                        : 'Use one of these test accounts:'
                      }
                    </p>
                    <div className="text-xs text-amber-600 mt-2 space-y-1">
                      <p>📧 coach@test.com / password123</p>
                      <p>📧 client@test.com / password123</p>
                      <p>📧 admin@test.com / password123</p>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Error Display */}
            {error && (
              <div className="bg-gradient-to-r from-red-50 to-pink-50 border-2 border-red-200 rounded-xl p-4">
                <p className="text-red-700 text-sm text-center font-medium">{error}</p>
              </div>
            )}

            {/* Name Field (Sign Up Only) */}
            {!isLogin && (
              <div className="space-y-2">
                <Label htmlFor="name" className="text-gray-700 font-medium">
                  {t('auth.nameLabel', 'Full Name')}
                </Label>
                <Input
                  id="name"
                  name="name"
                  type="text"
                  required={!isLogin}
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="h-12 bg-white/50 border-gray-200 focus:border-purple-400 focus:ring-purple-400 rounded-lg transition-all duration-200"
                  placeholder={t('auth.namePlaceholder', 'Your Name')}
                  dir={isRTL ? 'rtl' : 'ltr'}
                />
              </div>
            )}

            {/* Role Selection (Sign Up Only) */}
            {!isLogin && (
              <div className="space-y-2">
                <Label htmlFor="role" className="text-gray-700 font-medium">
                  {isRTL ? 'אני...' : 'I am a...'}
                </Label>
                <select
                  id="role"
                  name="role"
                  value={role}
                  onChange={(e) => setRole(e.target.value as 'client' | 'coach')}
                  className={cn(
                    'w-full h-12 px-4 bg-white/50 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-400 focus:border-purple-400 transition-all duration-200',
                    isRTL && 'text-right'
                  )}
                  dir={isRTL ? 'rtl' : 'ltr'}
                >
                  <option value="client">
                    {isRTL ? 'לקוח' : 'Client'}
                  </option>
                  <option value="coach">
                    {isRTL ? 'מאמן/ת' : 'Coach'}
                  </option>
                </select>
              </div>
            )}

            {/* Email Field */}
            <div className="space-y-2">
              <Label htmlFor="email" className="text-gray-700 font-medium">
                {t('auth.emailLabel', 'Email')}
              </Label>
              <Input
                id="email"
                name="email"
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="h-12 bg-white/50 border-gray-200 focus:border-purple-400 focus:ring-purple-400 rounded-lg transition-all duration-200"
                placeholder={t('auth.emailPlaceholder', 'your.email@example.com')}
                dir={isRTL ? 'rtl' : 'ltr'}
              />
            </div>

            {/* Password Field */}
            <div className="space-y-2">
              <Label htmlFor="password" className="text-gray-700 font-medium">
                {t('auth.passwordLabel', 'Password')}
              </Label>
              <div className="relative">
                <Input
                  id="password"
                  name="password"
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className={cn(
                    'h-12 bg-white/50 border-gray-200 focus:border-purple-400 focus:ring-purple-400 rounded-lg transition-all duration-200',
                    isRTL ? 'pr-12' : 'pl-12'
                  )}
                  placeholder="••••••••"
                  dir={isRTL ? 'rtl' : 'ltr'}
                />
                <button
                  type="button"
                  onClick={togglePasswordVisibility}
                  className={cn(
                    'absolute top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors',
                    isRTL ? 'left-3' : 'right-3'
                  )}
                >
                  {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
            </div>

            {/* Confirm Password Field (Sign Up Only) */}
            {!isLogin && (
              <div className="space-y-2">
                <Label htmlFor="confirmPassword" className="text-gray-700 font-medium">
                  {t('auth.confirmPasswordLabel', 'Confirm Password')}
                </Label>
                <div className="relative">
                  <Input
                    id="confirmPassword"
                    name="confirmPassword"
                    type={showConfirmPassword ? 'text' : 'password'}
                    required={!isLogin}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className={cn(
                      'h-12 bg-white/50 border-gray-200 focus:border-purple-400 focus:ring-purple-400 rounded-lg transition-all duration-200',
                      isRTL ? 'pr-12' : 'pl-12'
                    )}
                    placeholder="••••••••"
                    dir={isRTL ? 'rtl' : 'ltr'}
                  />
                  <button
                    type="button"
                    onClick={toggleConfirmPasswordVisibility}
                    className={cn(
                      'absolute top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors',
                      isRTL ? 'left-3' : 'right-3'
                    )}
                  >
                    {showConfirmPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                  </button>
                </div>
              </div>
            )}

            {/* Forgot Password Link (Login Only) */}
            {isLogin && (
              <div className={cn('text-center', isRTL && 'text-right')}>
                <button
                  type="button"
                  className="text-purple-600 hover:text-purple-700 text-sm font-medium transition-colors duration-200 hover:underline"
                >
                  {t('auth.forgotPasswordLink', 'Forgot Password?')}
                </button>
              </div>
            )}

            {/* Submit Button */}
            <Button
              type="submit"
              disabled={loading}
              className="w-full h-12 bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white font-semibold rounded-lg transition-all duration-200 transform hover:scale-[1.02] hover:shadow-lg"
            >
              {loading ? (
                <div className={cn(
                  'flex items-center gap-2',
                  isRTL && 'flex-row-reverse'
                )}>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  <span>
                    {isLogin 
                      ? (isRTL ? 'מתחבר...' : 'Signing in...')
                      : (isRTL ? 'יוצר חשבון...' : 'Creating account...')
                    }
                  </span>
                </div>
              ) : (
                isLogin 
                  ? t('auth.signInButton', 'Sign In')
                  : t('auth.createAccountButton', 'Create Account')
              )}
            </Button>

            {/* Switch Mode */}
            <div className="text-center space-y-2">
              <p className="text-gray-600">
                {isLogin 
                  ? t('auth.promptSignup', "Don't have an account?")
                  : t('auth.promptLogin', 'Already have an account?')
                }
              </p>
              <button
                type="button"
                onClick={() => setIsLogin(!isLogin)}
                className="text-purple-600 hover:text-purple-700 font-semibold transition-colors duration-200 hover:underline"
              >
                {isLogin 
                  ? t('auth.signUpLink', 'Sign Up')
                  : t('auth.signInLink', 'Sign In')
                }
              </button>
            </div>
          </form>

          {/* Footer */}
          <div className="bg-gradient-to-r from-gray-50 to-slate-50 px-8 py-6 border-t border-gray-100">
            <div className={cn(
              'flex items-center justify-center gap-8 text-sm text-gray-600',
              isRTL && 'flex-row-reverse'
            )}>
              <div className={cn(
                'flex items-center gap-2',
                isRTL && 'flex-row-reverse'
              )}>
                <Shield className="w-4 h-4 text-purple-600" />
                <span>{isRTL ? 'מאובטח' : 'Secure'}</span>
              </div>
              <div className={cn(
                'flex items-center gap-2',
                isRTL && 'flex-row-reverse'
              )}>
                <Heart className="w-4 h-4 text-pink-500" />
                <span>{isRTL ? 'אמפתי' : 'Empathetic'}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Auth;
