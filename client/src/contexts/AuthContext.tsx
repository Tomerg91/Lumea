import * as React from 'react';
import { supabase, checkSupabaseConnection, isDevelopmentMode } from '@/lib/supabase';
import { AuthError, Session, User } from '@supabase/supabase-js';
import type { Session as TypeSession, User as TypeUser } from '@supabase/supabase-js';

// Define types for the user profile
interface UserProfile {
  id: string;
  created_at?: string;
  updated_at?: string;
  email?: string;
  name?: string;
  role?: 'client' | 'coach' | 'admin';
  [key: string]: unknown;
}

// Define the shape of the context value
interface AuthContextType {
  session: TypeSession | null;
  user: TypeUser | null;
  profile: Record<string, unknown> | null; // Or define a specific Profile type
  loading: boolean; // Combined loading state
  authError: AuthError | null;
  signIn: (credentials: {
    email?: string;
    password?: string;
    provider?: string;
    options?: Record<string, unknown>;
  }) => Promise<{ data: unknown; error: AuthError | null }>;
  signUp: (credentials: {
    email?: string;
    password?: string;
    options?: Record<string, unknown>;
  }) => Promise<{ data: unknown; error: AuthError | null }>;
  signOut: () => Promise<void>;
  updateProfile?: (
    updates: Partial<UserProfile>
  ) => Promise<{ data?: UserProfile | null; error: Error | null }>;
}

// Create the context with an explicit type (or null initially)
const AuthContext = React.createContext<AuthContextType | null>(null);

// Utility function for rate limit handling
const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

// Simple debounce implementation
const debounce = <T extends (...args: any[]) => Promise<any>>(
  fn: T,
  wait = 300
): ((...args: Parameters<T>) => Promise<ReturnType<T>>) => {
  let timer: ReturnType<typeof setTimeout> | null = null;
  let pendingPromise: Promise<ReturnType<T>> | null = null;

  return async (...args: Parameters<T>): Promise<ReturnType<T>> => {
    if (timer) clearTimeout(timer);

    // If we already have a pending promise for this call, return it
    if (pendingPromise) return pendingPromise;

    // Create a new promise that resolves after the debounce period
    const promise = new Promise<ReturnType<T>>((resolve) => {
      timer = setTimeout(async () => {
        const result = await fn(...args);
        pendingPromise = null;
        resolve(result);
      }, wait);
    });

    pendingPromise = promise;
    return promise;
  };
};

// Retry function with exponential backoff
const retryWithBackoff = async <T,>(
  fn: () => Promise<T>,
  maxRetries = 3,
  baseDelayMs = 300
): Promise<T> => {
  let retries = 0;

  while (retries < maxRetries) {
    try {
      return await fn();
    } catch (error) {
      retries++;

      // If it's not a rate limit error or we've exhausted retries, throw the error
      if (
        !(
          error instanceof Error &&
          (error.message.includes('rate limit') ||
            error.message.includes('429') ||
            error.message.includes('Too Many Requests'))
        ) ||
        retries >= maxRetries
      ) {
        throw error;
      }

      // Calculate exponential backoff delay
      const delay = baseDelayMs * Math.pow(2, retries);
      console.log(
        `[AuthContext] Rate limit hit. Retrying in ${delay}ms (attempt ${retries}/${maxRetries})`
      );
      await sleep(delay);
    }
  }

  // This will only be reached if all retries have failed
  throw new Error(`Max retries (${maxRetries}) exceeded`);
};

// Mock user for development
const createMockUser = (email: string, role: 'client' | 'coach' | 'admin' = 'client'): TypeUser => ({
  id: `mock-${role}-${Date.now()}`,
  email,
  user_metadata: { name: `Mock ${role.charAt(0).toUpperCase() + role.slice(1)}`, role },
  app_metadata: { role },
  aud: 'authenticated',
  created_at: new Date().toISOString(),
  role: 'authenticated',
  updated_at: new Date().toISOString()
});

const createMockSession = (user: TypeUser): TypeSession => ({
  access_token: 'mock-access-token',
  refresh_token: 'mock-refresh-token',
  expires_in: 3600,
  expires_at: Math.floor(Date.now() / 1000) + 3600,
  token_type: 'bearer',
  user
});

// Define props for the provider
interface AuthProviderProps {
  children: React.ReactNode;
}

// Create the provider component
export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [session, setSession] = React.useState<TypeSession | null>(null);
  const [user, setUser] = React.useState<TypeUser | null>(null);
  const [profile, setProfile] = React.useState<Record<string, unknown> | null>(null); // To store role, name, etc.
  const [loadingSession, setLoadingSession] = React.useState<boolean>(true); // Loading state for session check
  const [loadingProfile, setLoadingProfile] = React.useState<boolean>(false); // Loading state for profile fetch
  const [authError, setAuthError] = React.useState<AuthError | null>(null); // Add state for auth errors
  const [isUpdatingProfile, setIsUpdatingProfile] = React.useState<boolean>(false);
  const [loading, setLoading] = React.useState(true);

  // Add a ref to track ongoing profile fetch requests
  const profileFetchInProgress = React.useRef<string | null>(null);

  // Add refs to track session initialization state
  const isInitialized = React.useRef<boolean>(false);
  const initializedUser = React.useRef<string | null>(null);

  // Reset error state after 5 seconds
  React.useEffect(() => {
    if (authError) {
      const timer = setTimeout(() => {
        setAuthError(null);
      }, 5000);

      return () => {
        clearTimeout(timer);
      };
    }
  }, [authError]);

  // Effect for initializing session and setting up listener
  React.useEffect(() => {
    let ignore = false;
    console.log('[AuthContext] Session Effect mounting...');
    setLoadingSession(true);
    setLoading(true);
    setAuthError(null);

    async function getInitialSession() {
      console.log('[AuthContext] Attempting to get initial session...');
      try {
        // Check if we're in development mode and should use mock auth
        if (isDevelopmentMode && import.meta.env.DEV) {
          console.log('[AuthContext] Development mode - no initial session, allowing public access');
          if (!ignore) {
            setSession(null);
            setUser(null);
          }
          return;
        }
        
        const { data: { session } } = await supabase.auth.getSession();
        if (!ignore) {
          setSession(session);
          setUser(session?.user ?? null);
        }
      } catch (error) {
        console.error('Error getting session:', error);
        if (!ignore) {
          setAuthError(error as AuthError);
        }
      } finally {
        if (!ignore) {
          setLoadingSession(false);
          setLoading(false);
        }
      }
    }

    getInitialSession();

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (!ignore) {
          console.log('[AuthContext] Auth state changed:', event, session?.user?.id);
          setSession(session);
          setUser(session?.user ?? null);
          setLoadingSession(false);
          setLoading(false);
        }
      }
    );

    return () => {
      console.log('[AuthContext] Session Effect cleanup. Unsubscribing listener.');
      ignore = true;
      subscription?.unsubscribe();
    };
  }, []);

  // Debounced updateUser function to avoid rate limits
  const debouncedUpdateUser = React.useCallback(
    debounce(async (metadata: Record<string, any>) => {
      return retryWithBackoff(
        async () => {
          const client = supabase;
          const result = await client.auth.updateUser({ data: metadata });
          return result;
        },
        3,
        500
      ); // 3 retries with 500ms base delay
    }, 300), // 300ms debounce
    []
  );

  // Update the fetchProfile function to handle missing table
  const fetchProfile = async (userId: string) => {
    console.log('[AuthContext] fetchProfile called for user:', userId);

    if (!userId) {
      console.log('[AuthContext] No userId provided to fetchProfile, returning null');
      return null;
    }

    // Use the ref to track in-progress fetches
    // If we already have a fetch for this user in progress, don't start another
    if (profileFetchInProgress.current === userId) {
      console.log(
        `[AuthContext] fetchProfile for user ${userId} already in progress, returning null`
      );
      return null;
    }

    // Mark that we're starting a fetch for this user
    profileFetchInProgress.current = userId;
    setLoadingProfile(true);

    try {
      console.log('[AuthContext] Attempting to fetch profile for user:', userId);

      // Get current user from auth (this should always work if user is authenticated)
      const {
        data: { user: currentUser },
        error: userError
      } = await supabase.auth.getUser();

      if (userError || !currentUser) {
        console.error('[AuthContext] Error fetching current user:', userError);
        throw userError || new Error('No current user found');
      }

      console.log('[AuthContext] Current user from auth:', currentUser.id);

      // Try to fetch from profiles table, but handle RLS/permission errors gracefully
      let profileData = null;
      try {
        const { data, error } = await supabase
          .from('users')
          .select('id,name,email,role,created_at,updated_at')
          .eq('id', userId)
          .maybeSingle();

        // If we got a permission error (403/42501), fall back to user metadata
        if (error && (error.code === '42501' || error.message.includes('permission denied'))) {
          console.log('[AuthContext] RLS policy blocking access to profiles table, using user metadata');
          profileData = null; // Will fall back to metadata below
        } else if (error && error.code !== 'PGRST116') {
          // PGRST116 is "not found", which is okay - we'll create from metadata
          console.error('[AuthContext] Unexpected error fetching profile:', error);
          throw error;
        } else {
          profileData = data;
        }
      } catch (profileFetchError) {
        console.log('[AuthContext] Profile table access failed, falling back to user metadata:', profileFetchError);
        profileData = null;
      }

      // If we didn't get profile data (either not found or permission denied), create from user metadata
      if (!profileData) {
        console.log('[AuthContext] Creating profile from user metadata');

        // Create a virtual profile from the user metadata and auth info
        const profileFromMetadata = {
          id: currentUser.id,
          name: currentUser.user_metadata?.name || currentUser.user_metadata?.full_name || 'User',
          email: currentUser.email || '',
          role: currentUser.user_metadata?.role || 'client',
          created_at: currentUser.created_at || new Date().toISOString(),
          updated_at: new Date().toISOString(),
        };

        console.log('[AuthContext] Created virtual profile from metadata:', profileFromMetadata);

        // Set the profile state
        setProfile(profileFromMetadata);
        return profileFromMetadata;
      }

      // If we get here, we successfully fetched an existing profile
      console.log('[AuthContext] Profile successfully fetched from table:', profileData);
      setProfile(profileData);
      return profileData;
    } catch (error) {
      console.log('[AuthContext] Catch block error in fetchProfile:', error);
      if (error instanceof AuthError) {
        setAuthError(error);
      } else {
        console.log('[AuthContext] Non-AuthError during profile fetch:', error);
      }
      return null;
    } finally {
      console.log('[AuthContext] fetchProfile finally block for user:', userId);
      setLoadingProfile(false);
      console.log('[AuthContext] fetchProfile finished for user:', userId);
      // Clear the in-progress tracker
      profileFetchInProgress.current = null;
    }
  };

  // NEW Effect for fetching profile when user changes
  React.useEffect(() => {
    let ignore = false;
    console.log('[AuthContext] User Effect triggered. User:', user ? user.id : 'null');

    if (user) {
      console.log(`[AuthContext] User Effect: User found (${user.id}), attempting fetchProfile.`);
      fetchProfile(user.id).catch((err) => {
        // Catch errors specifically from the fetchProfile call initiated here
        // Avoid setting state if component unmounted
        if (!ignore) {
          console.error('[AuthContext] User Effect: fetchProfile promise rejected:', err);
          // Optionally set a specific error state here if needed
          setAuthError(err instanceof AuthError ? err : null);
          setLoadingProfile(false); // Ensure loading stops on error
          // Clear the in-progress tracker if there was an error
          profileFetchInProgress.current = null;
        }
      });
    } else {
      console.log(
        '[AuthContext] User Effect: No user, clearing profile and stopping profile loading.'
      );
      setProfile(null); // Clear profile if user logs out
      setLoadingProfile(false); // Ensure profile loading stops if there's no user
      // Clear the in-progress tracker if there's no user
      profileFetchInProgress.current = null;
    }

    return () => {
      console.log('[AuthContext] User Effect cleanup.');
      ignore = true;
    };
  }, [user]); // Dependency array includes user

  // Explicitly type the signIn function
  const signIn: AuthContextType['signIn'] = async ({ email, password }) => {
    setLoading(true);
    setAuthError(null);
    
    try {
      // Check if we should use mock authentication for development
      if (isDevelopmentMode && import.meta.env.DEV) {
        console.log('[AuthContext] Using mock authentication for development');
        
        // Create mock user based on email
        let role: 'client' | 'coach' | 'admin' = 'client';
        if (email?.includes('coach')) role = 'coach';
        if (email?.includes('admin')) role = 'admin';
        
        const mockUser = createMockUser(email || 'test@example.com', role);
        const mockSession = createMockSession(mockUser);
        
        // Set the mock session and user
        setSession(mockSession);
        setUser(mockUser);
        
        return { data: { user: mockUser, session: mockSession }, error: null };
      }
      
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      if (error) throw error;
      // onAuthStateChange will handle setting user and triggering profile fetch
      return { data, error: null };
    } catch (error: any) {
      console.error('Sign in error:', error);
      setAuthError(error as AuthError);
      return { data: null, error };
    } finally {
      setLoading(false);
    }
  };

  // Explicitly type the signUp function
  const signUp: AuthContextType['signUp'] = async ({ email, password, options }) => {
    setLoading(true);
    setAuthError(null);
    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options,
      });
      if (error) throw error;
      // If successful, onAuthStateChange handles setting user/session
      // If email verification is required, user object might be returned but session will be null initially
      return { data, error: null };
    } catch (error: any) {
      console.error('Sign up error:', error);
      setAuthError(error as AuthError);
      return { data: null, error };
    } finally {
      setLoading(false);
    }
  };

  // Explicitly type the signOut function
  const signOut: AuthContextType['signOut'] = async () => {
    setLoading(true);
    setAuthError(null);
    try {
      const { error } = await supabase.auth.signOut();
      if (error) throw error; // onAuthStateChange will handle clearing user/session/profile
    } catch (error) {
      console.error('Sign out error:', error);
      setAuthError(error as AuthError);
    } finally {
      setLoading(false);
    }
  };

  // Function to update user profile
  const updateProfile = async (updates: Partial<UserProfile>) => {
    if (!user) {
      return { error: new Error('No user logged in') };
    }

    setIsUpdatingProfile(true);

    try {
      // Use the appropriate client based on availability
      const client = supabase;

      const { data, error } = await client
        .from('users')
        .update(updates)
        .eq('id', user.id)
        .select('*')
        .single();

      if (error) {
        console.error('[AuthContext] Error updating profile:', error);
        return { error };
      }

      console.log('[AuthContext] Profile updated successfully', data);
      setProfile(data as UserProfile);
      return { data, error: null };
    } catch (error) {
      console.error('[AuthContext] Unexpected error updating profile:', error);
      return {
        error: error instanceof Error ? error : new Error('Unknown error updating profile'),
      };
    } finally {
      setIsUpdatingProfile(false);
    }
  };

  // Combine loading states for the context value
  const combinedLoading = loadingSession || loadingProfile;

  // Ensure the provided value matches AuthContextType
  const value: AuthContextType = {
    session,
    user,
    profile,
    loading: combinedLoading, // Use combined loading state
    authError,
    signIn,
    signUp,
    signOut,
    updateProfile,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

// Export the useAuth hook
export function useAuth(): AuthContextType {
  const context = React.useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
