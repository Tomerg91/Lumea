import React, { createContext, useState, useEffect, useContext, ReactNode } from 'react';
import { supabase } from '../supabaseClient';
import type { AuthError, Session, User } from '@supabase/supabase-js';

// Define the shape of the context value
interface AuthContextType {
  session: Session | null;
  user: User | null;
  profile: Record<string, any> | null; // Or define a specific Profile type
  loading: boolean;
  authError: AuthError | null;
  signIn: (credentials: { email?: string; password?: string; provider?: any; options?: any }) => Promise<{ data: any; error: AuthError | null }>;
  signUp: (credentials: { email?: string; password?: string; options?: any }) => Promise<{ data: any; error: AuthError | null }>;
  signOut: () => Promise<void>;
}

// Create the context with an explicit type (or null initially)
const AuthContext = createContext<AuthContextType | null>(null);

// Define props for the provider
interface AuthProviderProps {
  children: ReactNode;
}

// Create the provider component
export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Record<string, any> | null>(null); // To store role, name, etc.
  const [loading, setLoading] = useState<boolean>(true);
  const [authError, setAuthError] = useState<AuthError | null>(null); // Add state for auth errors

  useEffect(() => {
    let ignore = false;
    console.log('[AuthContext] useEffect mounting...');
    setLoading(true);
    setAuthError(null);

    async function getSessionAndProfile() {
      console.log('[AuthContext] Attempting to get initial session...');
      try {
        const { data: { session }, error: sessionError } = await supabase.auth.getSession();
        if (sessionError) {
           console.error('[AuthContext] Error getting session:', sessionError);
           throw sessionError;
        }
        if (ignore) return;
        console.log('[AuthContext] Initial session fetched:', session ? 'Exists' : 'null');

        setSession(session);
        setUser(session?.user ?? null);

        if (session?.user) {
          console.log(`[AuthContext] Session exists, calling fetchProfile for user: ${session.user.id}`);
          await fetchProfile(session.user.id);
          console.log('[AuthContext] Initial fetchProfile call completed.');
        } else {
          console.log('[AuthContext] No initial session, skipping profile fetch.');
        }
      } catch (err) {
        console.error("[AuthContext] Error in getSessionAndProfile:", err);
        if (!ignore) setAuthError(err as AuthError);
      } finally {
        console.log('[AuthContext] getSessionAndProfile finally block. Setting loading to false.');
        if (!ignore) setLoading(false);
      }
    }

    getSessionAndProfile();

    console.log('[AuthContext] Setting up onAuthStateChange listener...');
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (_event, session) => {
        console.log('[AuthContext] onAuthStateChange triggered. Event:', _event, 'Session:', session ? 'Exists' : 'null');
        setSession(session);
        setUser(session?.user ?? null);
        setProfile(null); 
        setAuthError(null);
        if (session?.user) {
          console.log(`[AuthContext] onAuthStateChange: Calling fetchProfile for user: ${session.user.id}`);
          setLoading(true); 
          await fetchProfile(session.user.id);
          console.log('[AuthContext] onAuthStateChange: fetchProfile call completed.');
          if (!ignore) setLoading(false); 
           console.log('[AuthContext] onAuthStateChange: Profile fetch complete, loading set to false.');
        } else {
           console.log('[AuthContext] onAuthStateChange: No session, loading set to false.');
           if (!ignore) setLoading(false); 
        }
      }
    );

    return () => {
      console.log('[AuthContext] useEffect cleanup. Unsubscribing listener.');
      ignore = true;
      subscription?.unsubscribe();
    };
  }, []);

  // Function to fetch user profile data
  const fetchProfile = async (userId: string) => {
    console.log(`[AuthContext] fetchProfile called for user: ${userId}`);
    try {
      const { data, error, status } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();
      
      console.log(`[AuthContext] Profile fetch API call returned - Status: ${status}, Error: ${JSON.stringify(error)}, Data: ${JSON.stringify(data)}`); 

      if (error && status !== 406) {
        console.error('[AuthContext] Error identified in profile fetch result (and status != 406):', error);
        setProfile(null);
      } else {
        console.log('[AuthContext] Profile fetched successfully or status 406. Setting profile state.', data);
        setProfile(data);
      }
    } catch (caughtError) {
      // Log more details about the caught error
      console.error('[AuthContext] Catch block error in fetchProfile:', caughtError);
      if (caughtError instanceof Error) {
         console.error('[AuthContext] Error Name:', caughtError.name);
         console.error('[AuthContext] Error Message:', caughtError.message);
         console.error('[AuthContext] Error Stack:', caughtError.stack);
      }
      setProfile(null);
    }
     console.log(`[AuthContext] fetchProfile finished for user: ${userId}`); 
  };

  // Explicitly type the signIn function
  const signIn: AuthContextType['signIn'] = async ({ email, password }) => {
    setLoading(true);
    setAuthError(null);
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: email!, // Add non-null assertion or handle undefined
        password: password!, // Add non-null assertion or handle undefined
      });
      if (error) throw error;
      return { data, error: null };
    } catch (error) {
      console.error('Login failed:', error as AuthError);
      setAuthError(error as AuthError);
      setLoading(false);
      return { data: null, error: error as AuthError };
    } 
  };
  
  // Explicitly type the signUp function
  const signUp: AuthContextType['signUp'] = async ({ email, password, options }) => {
    setLoading(true);
    setAuthError(null);
    try {
      // options can include { data: { name: 'Full Name' } } for metadata
      const { data, error } = await supabase.auth.signUp({
        email: email!,
        password: password!,
        options,
      });
      if (error) throw error;
      // If successful, onAuthStateChange will trigger profile creation via the trigger
      // If email verification is required, user object might be returned but session will be null initially
      return { data, error: null }; 
    } catch (error) {
       console.error('Signup failed:', error as AuthError);
       setAuthError(error as AuthError);
       setLoading(false);
       return { data: null, error: error as AuthError };
    }
    // setLoading will be set to false by the onAuthStateChange listener if successful without verification
    // or potentially needs manual reset if verification email is sent.
  };

  // Explicitly type the signOut function
   const signOut: AuthContextType['signOut'] = async () => {
    setLoading(true);
    setAuthError(null);
    try {
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
    } catch (error) {
       console.error('Sign out failed:', error as AuthError);
       setAuthError(error as AuthError);
    } finally {
      setLoading(false);
    }
  };

  // Ensure the provided value matches AuthContextType
  const value: AuthContextType = {
    session,
    user,
    profile,
    loading,
    authError,
    signIn,    
    signUp,    // Provide signUp function
    signOut,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

// Custom hook to use the auth context
export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  // Check if context is null (meaning useAuth is used outside of AuthProvider)
  if (context === null) { 
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}; 