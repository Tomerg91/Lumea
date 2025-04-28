import React, { useState } from 'react';
import { z } from 'zod';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import Logo from '@/components/Logo';
import BackgroundPattern from '@/components/BackgroundPattern';
import { useNavigate } from 'react-router-dom';
import ThemeToggle from '@/components/ThemeToggle';
import { useTranslation } from 'react-i18next';
import type { TFunction } from 'i18next';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../supabaseClient';

const createLoginSchema = (t: TFunction) => z.object({
  email: z.string().email({ message: t('validation.emailInvalid') }),
  password: z.string().min(6, { message: t('validation.passwordMinLength', { length: 6 }) }),
});

const createSignupSchema = (t: TFunction) => createLoginSchema(t).extend({
  name: z.string().min(2, { message: t('validation.nameMinLength', { length: 2 }) }),
  confirmPassword: z.string().min(6, { message: t('validation.confirmPasswordRequired') }),
  role: z.string().optional(),
}).refine((data) => data.password === data.confirmPassword, {
  message: t('validation.passwordsDontMatch'),
  path: ["confirmPassword"],
});

const placeholderT = (key: string) => key;
type LoginFormValues = z.infer<ReturnType<typeof createLoginSchema>>;
type SignupFormValues = z.infer<ReturnType<typeof createSignupSchema>>;

const Auth = () => {
  const { t } = useTranslation();
  const { signIn, signUp, loading: authLoading, authError, session } = useAuth();
  const [isLogin, setIsLogin] = useState(true);
  const { toast } = useToast();
  const navigate = useNavigate();
  
  const loginSchema = createLoginSchema(t);
  const signupSchema = createSignupSchema(t);
  
  const loginForm = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: "",
      password: "",
    },
  });
  
  const signupForm = useForm<SignupFormValues>({
    resolver: zodResolver(signupSchema),
    defaultValues: {
      name: "",
      email: "",
      password: "",
      confirmPassword: "",
    },
  });
  
  const onLoginSubmit = async (data: LoginFormValues) => {
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
      navigate('/dashboard');
    }
  };
  
  const onSignupSubmit = async (data: SignupFormValues) => {
    const { confirmPassword, ...signupData } = data;
    
    const { error: signupError, data: signupResult } = await signUp({
      email: signupData.email!,
      password: signupData.password!,
      options: {
        data: {
          name: signupData.name,
        }
      }
    });

    if (signupError) {
      toast({
        title: t('toast.signupErrorTitle', 'Registration Failed'),
        description: signupError.message || t('toast.genericError', 'An unknown error occurred'),
        variant: 'destructive',
      });
    } else {
      const needsVerification = signupResult?.user && !signupResult.session;
      toast({
        title: needsVerification ? t('toast.signupVerificationTitle', 'Check your email') : t('toast.signupSuccessTitle'),
        description: needsVerification ? t('toast.signupVerificationDescription', 'Please click the link in the email we sent you.') : t('toast.signupSuccessDescription', 'Registration successful!')
      });
      setIsLogin(true);
      loginForm.reset();
      signupForm.reset();
    }
  };

  React.useEffect(() => {
    if (session) {
      navigate('/dashboard', { replace: true });
    }
  }, [session, navigate]);

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
                <CardTitle className="text-center">{isLogin ? t('auth.loginTitle') : t('auth.signupTitle')}</CardTitle>
                <CardDescription className="text-center">
                  {isLogin 
                    ? t('auth.loginDescription')
                    : t('auth.signupDescription')}
                </CardDescription>
              </CardHeader>
              
              <CardContent>
                {authError && (
                  <p className="text-sm text-red-600 mb-4 text-center">Error: {authError.message}</p>
                )}

                {isLogin ? (
                  <form onSubmit={loginForm.handleSubmit(onLoginSubmit)} className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="email">{t('auth.emailLabel')}</Label>
                      <Input 
                        id="email"
                        type="email"
                        placeholder={t('auth.emailPlaceholder')}
                        {...loginForm.register("email")}
                      />
                      {loginForm.formState.errors.email && (
                        <p className="text-sm text-red-500">{loginForm.formState.errors.email.message}</p>
                      )}
                    </div>
                    
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <Label htmlFor="password">{t('auth.passwordLabel')}</Label>
                        <a href="#" className="text-xs text-lumea-sage hover:text-lumea-stone dark:hover:text-lumea-beige transition-colors">
                          {t('auth.forgotPasswordLink')}
                        </a>
                      </div>
                      <Input 
                        id="password"
                        type="password"
                        placeholder="••••••••"
                        {...loginForm.register("password")}
                      />
                      {loginForm.formState.errors.password && (
                        <p className="text-sm text-red-500">{loginForm.formState.errors.password.message}</p>
                      )}
                    </div>
                    
                    <Button type="submit" className="w-full bg-lumea-stone hover:bg-lumea-stone/90 text-lumea-beige" disabled={authLoading}>
                      {authLoading ? t('common.loading', 'Loading...') : t('auth.signInButton')}
                    </Button>
                  </form>
                ) : (
                  <form onSubmit={signupForm.handleSubmit(onSignupSubmit)} className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="name">{t('auth.nameLabel')}</Label>
                      <Input 
                        id="name"
                        placeholder={t('auth.namePlaceholder')}
                        {...signupForm.register("name")}
                      />
                      {signupForm.formState.errors.name && (
                        <p className="text-sm text-red-500">{signupForm.formState.errors.name.message}</p>
                      )}
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="signup-email">{t('auth.emailLabel')}</Label>
                      <Input 
                        id="signup-email"
                        type="email"
                        placeholder={t('auth.emailPlaceholder')}
                        {...signupForm.register("email")}
                      />
                      {signupForm.formState.errors.email && (
                        <p className="text-sm text-red-500">{signupForm.formState.errors.email.message}</p>
                      )}
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="signup-password">{t('auth.passwordLabel')}</Label>
                      <Input 
                        id="signup-password"
                        type="password"
                        placeholder="••••••••"
                        {...signupForm.register("password")}
                      />
                      {signupForm.formState.errors.password && (
                        <p className="text-sm text-red-500">{signupForm.formState.errors.password.message}</p>
                      )}
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="confirm-password">{t('auth.confirmPasswordLabel')}</Label>
                      <Input 
                        id="confirm-password"
                        type="password"
                        placeholder="••••••••"
                        {...signupForm.register("confirmPassword")}
                      />
                      {signupForm.formState.errors.confirmPassword && (
                        <p className="text-sm text-red-500">{signupForm.formState.errors.confirmPassword.message}</p>
                      )}
                    </div>
                    
                    <Button type="submit" className="w-full bg-lumea-stone hover:bg-lumea-stone/90 text-lumea-beige" disabled={authLoading}>
                      {authLoading ? t('common.loading', 'Loading...') : t('auth.createAccountButton', 'Create Account')}
                    </Button>
                  </form>
                )}
              </CardContent>
              
              <CardFooter className="flex flex-col space-y-2">
                <div className="text-sm text-center">
                  {isLogin ? t('auth.promptSignup') : t('auth.promptLogin')}{" "}
                  <button
                    onClick={() => setIsLogin(!isLogin)}
                    className="text-lumea-sage hover:text-lumea-stone dark:hover:text-lumea-beige font-medium transition-colors"
                  >
                    {isLogin ? t('auth.signUpLink') : t('auth.signInLink')}
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
