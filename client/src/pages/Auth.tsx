/* eslint-disable react/no-unescaped-entities */ // Disabled due to persistent issue with i18next t() function default value
import React from 'react';
import { z } from 'zod';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { AuthError } from '@supabase/supabase-js';
import { useAuth } from '@/contexts/AuthContext';
import { getSupabaseClient, checkSupabaseConnection } from '@/lib/supabase';
import { useTranslation } from 'react-i18next';
import type { TFunction } from 'i18next';
import { useNavigate } from 'react-router-dom';
import { useToast } from '@/components/ui/use-toast';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import Logo from '@/components/Logo';
import BackgroundPattern from '@/components/BackgroundPattern';
import ThemeToggle from '@/components/ThemeToggle';

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
  const { signIn, signUp, loading: authLoading, authError, session, profile } = useAuth();
  const [mode, setMode] = React.useState<'login' | 'register'>('login');
  const { toast } = useToast();
  const navigate = useNavigate();
  const [connectionChecking, setConnectionChecking] = React.useState(false);
  const [connectionError, setConnectionError] = React.useState<string | null>(null);
  const [usingDevMode, setUsingDevMode] = React.useState(false);

  const loginSchema = createLoginSchema(t);
  const signupSchema = createSignupSchema(t);

  const loginForm = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: '',
      password: '',
    },
  });

  const signupForm = useForm<SignupFormValues>({
    resolver: zodResolver(signupSchema),
    defaultValues: {
      name: '',
      email: '',
      password: '',
      confirmPassword: '',
      role: 'client',
    },
  });

  // Effect to check Supabase connection on component mount
  React.useEffect(() => {
    const checkConnection = async () => {
      setConnectionChecking(true);
      try {
        // Check if we can connect to Supabase
        const isConnected = await checkSupabaseConnection();
        if (!isConnected) {
          setConnectionError(
            "We're having trouble connecting to our database. Please check your internet connection."
          );

          // If we're in development, check if we're using the dev client
          if (process.env.NODE_ENV === 'development') {
            // We can check if it's dev mode by checking if we're connecting to the dev URL
            const clientUrl = await getSupabaseClient()
              .auth.getSession()
              .then(
                () => true, // Session call succeeded
                () => false // Session call failed
              );
            // If we're in development and the connection check failed, assume dev mode
            setUsingDevMode(!isConnected && process.env.NODE_ENV === 'development');
          }
        } else {
          setConnectionError(null);
          setUsingDevMode(false);
        }
      } catch (error) {
        console.error('Connection check error:', error);
        setConnectionError(
          'An error occurred while checking connectivity. Please try again later.'
        );
      } finally {
        setConnectionChecking(false);
      }
    };

    checkConnection();
  }, []);

  const onLoginSubmit = async (data: LoginFormValues) => {
    // Check connection before attempting login
    setConnectionChecking(true);
    const isConnected = await checkSupabaseConnection();
    setConnectionChecking(false);

    if (!isConnected) {
      toast({
        title: t('toast.connectionErrorTitle', 'Connection Error'),
        description: t(
          'toast.connectionErrorDescription',
          'Cannot connect to the authentication service. Please check your internet connection.'
        ),
        variant: 'destructive',
      });
      setConnectionError(
        'Cannot connect to authentication service. Please check your internet connection.'
      );
      return;
    }

    // Clear any connection errors
    setConnectionError(null);

    // Proceed with login
    const { error } = await signIn({ email: data.email, password: data.password });

    if (error) {
      toast({
        title: t('toast.loginErrorTitle', 'Login Failed'),
        description: error.message || t('toast.genericError', 'An unknown error occurred'),
        variant: 'destructive',
      });
    } else {
      toast({
        title: t('toast.loginSuccessTitle'),
        description: t('toast.loginSuccessDescription'),
      });
    }
  };

  const onSignupSubmit = async (data: SignupFormValues) => {
    // Check connection before attempting signup
    setConnectionChecking(true);
    const isConnected = await checkSupabaseConnection();
    setConnectionChecking(false);

    if (!isConnected) {
      toast({
        title: t('toast.connectionErrorTitle', 'Connection Error'),
        description: t(
          'toast.connectionErrorDescription',
          'Cannot connect to the authentication service. Please check your internet connection.'
        ),
        variant: 'destructive',
      });
      setConnectionError(
        'Cannot connect to authentication service. Please check your internet connection.'
      );
      return;
    }

    // Clear any connection errors
    setConnectionError(null);

    const { confirmPassword, ...signupData } = data;

    try {
      // Include role in the signup options
      const { error } = await signUp({
        email: signupData.email,
        password: signupData.password,
        options: {
          data: {
            name: signupData.name,
            role: signupData.role,
          },
        },
      });

      if (error) throw error;

      // Signup successful
      toast({
        title: t('toast.signupSuccessTitle', 'Signup Successful'),
        description: t(
          'toast.signupSuccessDescription',
          'Please check your email to confirm your account.'
        ),
      });

      // Optionally switch to login mode
      setMode('login');
    } catch (error) {
      console.error('[Auth] Signup error:', error);
      // Handle specific error cases
      if (error instanceof AuthError) {
        if (error.message.includes('already registered')) {
          toast({
            title: t('toast.signupErrorTitle', 'Signup Failed'),
            description: t(
              'toast.emailAlreadyRegistered',
              'This email is already registered. Please log in.'
            ),
            variant: 'destructive',
          });
        } else {
          toast({
            title: t('toast.signupErrorTitle', 'Signup Failed'),
            description: error.message,
            variant: 'destructive',
          });
        }
      } else {
        toast({
          title: t('toast.signupErrorTitle', 'Signup Error'),
          description: t(
            'toast.signupUnexpectedError',
            'An unexpected error occurred. Please try again.'
          ),
          variant: 'destructive',
        });
      }
    }
  };

  // Effect to check for connection issues and display appropriate message
  React.useEffect(() => {
    console.log('[Auth] useEffect - checking session and profile');
    console.log('[Auth] Session:', session);
    console.log('[Auth] Profile:', profile);

    // If loading is complete and we're still seeing auth errors, likely a connection issue
    if (!authLoading && authError && !session) {
      // Check if the error is related to network connectivity
      if (
        authError.message?.includes('Failed to fetch') ||
        authError.message?.includes('Network Error') ||
        authError.message?.includes('network request failed')
      ) {
        setConnectionError(true);
      }
    } else {
      setConnectionError(false);
    }
  }, [authLoading, session, profile, authError]);

  React.useEffect(() => {
    console.log('[Auth] useEffect - checking session and profile');
    console.log('[Auth] Session:', session);
    console.log('[Auth] Profile:', profile);

    if (session && profile) {
      console.log('[Auth] Both session and profile exist, checking role for redirect');
      if (profile.role === 'coach') {
        console.log('[Auth] Redirecting coach to /coach/dashboard');
        navigate('/coach/dashboard', { replace: true });
      } else if (profile.role === 'client') {
        console.log('[Auth] Redirecting client to /client/dashboard');
        navigate('/client/dashboard', { replace: true });
      } else {
        console.log('[Auth] Unknown role:', profile.role, 'redirecting to home');
        navigate('/', { replace: true });
      }
    } else if (session && !profile) {
      console.log('[Auth] Session exists but no profile yet, waiting for profile to load');
    }
  }, [session, profile, navigate]);

  // Display development mode notice when applicable
  const DevModeNotice = () => {
    if (!usingDevMode) return null;

    return (
      <div className="bg-amber-100 dark:bg-amber-900 p-3 mb-4 rounded-md text-amber-800 dark:text-amber-200 text-sm">
        <strong>Development Mode:</strong> Using a fallback database because the production database
        is unreachable.
        <br />
        <span className="text-xs">
          To fix this in production: Create a new Supabase project and update the credentials in
          your environment variables.
        </span>
      </div>
    );
  };

  return (
    <BackgroundPattern>
      <div className="min-h-screen flex flex-col">
        <div className="absolute top-4 right-4">
          <ThemeToggle />
        </div>
        <div className="flex-1 flex flex-col items-center justify-center p-4 relative z-10">
          <div className="w-full max-w-md animate-fade-in">
            <div className="mb-8 text-center">
              <div className="flex justify-center mb-4">
                <Logo size="lg" />
              </div>
              <h2 className="text-lg text-lumea-stone/80 dark:text-lumea-beige/80">
                {t('auth.tagline')}
              </h2>
            </div>

            <Card className="backdrop-blur-sm border-lumea-beige dark:border-lumea-stone/30 bg-white/90 dark:bg-lumea-stone/20">
              <CardHeader>
                <CardTitle className="text-center">
                  {mode === 'login' ? t('auth.loginTitle') : t('auth.signupTitle')}
                </CardTitle>
                <CardDescription className="text-center">
                  {mode === 'login' ? t('auth.loginDescription') : t('auth.signupDescription')}
                </CardDescription>
              </CardHeader>

              <CardContent>
                {connectionError && (
                  <div className="bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 rounded p-3 mb-4 text-sm text-red-600 dark:text-red-300">
                    <p className="font-medium">Supabase Connection Error</p>
                    <p>{connectionError}</p>
                    <p className="mt-2">Possible solutions:</p>
                    <ul className="list-disc list-inside mt-1">
                      <li>Check your internet connection</li>
                      <li>
                        Verify the Supabase project is still active in your Supabase dashboard
                      </li>
                      <li>Confirm the Supabase URL and API key are correct</li>
                      <li>Try using a different network or device</li>
                      <li>If you're using a VPN or firewall, try disabling it temporarily</li>
                      <li>If the problem persists, contact support at help@satyacoaching.com</li>
                    </ul>
                    <div className="mt-3 pt-2 border-t border-red-200 dark:border-red-800">
                      <button
                        onClick={() => window.location.reload()}
                        className="text-lumea-sage hover:text-lumea-stone dark:hover:text-lumea-beige text-sm font-medium"
                      >
                        Refresh Page
                      </button>
                      <span className="px-2 text-red-400">•</span>
                      <button
                        onClick={async () => {
                          setConnectionChecking(true);
                          try {
                            const isConnected = await checkSupabaseConnection();
                            if (isConnected) {
                              setConnectionError(null);
                              toast({
                                title: 'Connection Restored',
                                description:
                                  'Successfully connected to the authentication service.',
                              });
                            } else {
                              toast({
                                title: 'Still Disconnected',
                                description:
                                  'Could not connect to the Supabase service. Please contact support if this persists.',
                                variant: 'destructive',
                              });
                            }
                          } catch (error) {
                            console.error('[Auth] Retry connection error:', error);
                          } finally {
                            setConnectionChecking(false);
                          }
                        }}
                        className="text-lumea-sage hover:text-lumea-stone dark:hover:text-lumea-beige text-sm font-medium"
                        disabled={connectionChecking}
                      >
                        {connectionChecking ? 'Checking...' : 'Try Again'}
                      </button>
                    </div>
                  </div>
                )}

                {usingDevMode && !connectionError && (
                  <div className="bg-blue-50 dark:bg-blue-900/30 border border-blue-200 dark:border-blue-800 rounded p-3 mb-4 text-sm text-blue-600 dark:text-blue-300">
                    <p className="font-medium">Development Mode Active</p>
                    <p>
                      Using a development Supabase project for authentication. Your credentials will
                      work in this environment, but not in production.
                    </p>
                    <p className="mt-2">To fix the production environment:</p>
                    <ol className="list-decimal list-inside mt-1">
                      <li>
                        Create a new Supabase project at{' '}
                        <a
                          href="https://app.supabase.com"
                          target="_blank"
                          rel="noopener noreferrer"
                          className="underline"
                        >
                          app.supabase.com
                        </a>
                      </li>
                      <li>
                        Update the Supabase URL and anon key in your environment configuration
                      </li>
                      <li>Restart the application</li>
                    </ol>
                  </div>
                )}

                {authError && !connectionError && (
                  <p className="text-sm text-red-600 mb-4 text-center">
                    Error: {authError.message}
                  </p>
                )}

                {mode === 'login' ? (
                  <form onSubmit={loginForm.handleSubmit(onLoginSubmit)} className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="email">{t('auth.emailLabel')}</Label>
                      <Input
                        id="email"
                        type="email"
                        placeholder={t('auth.emailPlaceholder')}
                        {...loginForm.register('email')}
                      />
                      {loginForm.formState.errors.email && (
                        <p className="text-sm text-red-500">
                          {loginForm.formState.errors.email.message}
                        </p>
                      )}
                    </div>

                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <Label htmlFor="password">{t('auth.passwordLabel')}</Label>
                        <a
                          href="#"
                          className="text-xs text-lumea-sage hover:text-lumea-stone dark:hover:text-lumea-beige transition-colors"
                        >
                          {t('auth.forgotPasswordLink')}
                        </a>
                      </div>
                      <Input
                        id="password"
                        type="password"
                        placeholder="••••••••"
                        {...loginForm.register('password')}
                      />
                      {loginForm.formState.errors.password && (
                        <p className="text-sm text-red-500">
                          {loginForm.formState.errors.password.message}
                        </p>
                      )}
                    </div>

                    <Button
                      type="submit"
                      className="w-full bg-lumea-stone hover:bg-lumea-stone/90 text-lumea-beige"
                      disabled={authLoading || connectionChecking}
                    >
                      {authLoading || connectionChecking
                        ? t('common.loading', 'Loading...')
                        : t('auth.signInButton')}
                    </Button>
                  </form>
                ) : (
                  <form onSubmit={signupForm.handleSubmit(onSignupSubmit)} className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="name">{t('auth.nameLabel')}</Label>
                      <Input
                        id="name"
                        placeholder={t('auth.namePlaceholder')}
                        {...signupForm.register('name')}
                      />
                      {signupForm.formState.errors.name && (
                        <p className="text-sm text-red-500">
                          {signupForm.formState.errors.name.message}
                        </p>
                      )}
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="role">{t('auth.roleLabel', 'I am a')}</Label>
                      <select
                        id="role"
                        {...signupForm.register('role')}
                        className="flex h-10 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        {['client', 'coach'].map((roleOption) => (
                          <option key={roleOption} value={roleOption} className="capitalize">
                            {t(`auth.${roleOption}Option`, { defaultValue: `Role: ${roleOption}` })}
                          </option>
                        ))}
                      </select>
                      {signupForm.formState.errors.role && (
                        <p className="text-sm text-red-500">
                          {signupForm.formState.errors.role.message}
                        </p>
                      )}
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="signup-email">{t('auth.emailLabel')}</Label>
                      <Input
                        id="signup-email"
                        type="email"
                        placeholder={t('auth.emailPlaceholder')}
                        {...signupForm.register('email')}
                      />
                      {signupForm.formState.errors.email && (
                        <p className="text-sm text-red-500">
                          {signupForm.formState.errors.email.message}
                        </p>
                      )}
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="signup-password">{t('auth.passwordLabel')}</Label>
                      <Input
                        id="signup-password"
                        type="password"
                        placeholder="••••••••"
                        {...signupForm.register('password')}
                      />
                      {signupForm.formState.errors.password && (
                        <p className="text-sm text-red-500">
                          {signupForm.formState.errors.password.message}
                        </p>
                      )}
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="confirm-password">{t('auth.confirmPasswordLabel')}</Label>
                      <Input
                        id="confirm-password"
                        type="password"
                        placeholder="••••••••"
                        {...signupForm.register('confirmPassword')}
                      />
                      {signupForm.formState.errors.confirmPassword && (
                        <p className="text-sm text-red-500">
                          {signupForm.formState.errors.confirmPassword.message}
                        </p>
                      )}
                    </div>

                    <Button
                      type="submit"
                      className="w-full bg-lumea-stone hover:bg-lumea-stone/90 text-lumea-beige"
                      disabled={authLoading || connectionChecking}
                    >
                      {authLoading || connectionChecking
                        ? t('common.loading', 'Loading...')
                        : t('auth.createAccountButton', 'Create Account')}
                    </Button>
                  </form>
                )}
              </CardContent>

              <CardFooter className="flex flex-col space-y-2">
                <div className="text-sm text-center">
                  {mode === 'login' ? t('auth.promptSignup') : t('auth.promptLogin')}{' '}
                  <button
                    onClick={() => setMode('register')}
                    className="text-lumea-sage hover:text-lumea-stone dark:hover:text-lumea-beige font-medium transition-colors"
                  >
                    {mode === 'login' ? t('auth.signUpLink') : t('auth.signInLink')}
                  </button>
                </div>
              </CardFooter>
            </Card>
          </div>
        </div>

        <footer className="py-4 text-center text-sm text-lumea-stone/60 dark:text-lumea-beige/60">
          &copy; {new Date().getFullYear()} {t('footer.copyright')}
        </footer>
      </div>
    </BackgroundPattern>
  );
};

export default Auth;
