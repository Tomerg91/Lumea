import React, { createContext, useState, useEffect, useContext, ReactNode, useRef } from 'react';
import { supabase } from '../lib/supabase';
import { AuthError, Session, User } from '@supabase/supabase-js';
import type { Session as TypeSession, User as TypeUser } from '@supabase/supabase-js';

// Define the shape of the context value
interface AuthContextType {
  session: TypeSession | null;
  user: TypeUser | null;
  profile: Record<string, any> | null; // Or define a specific Profile type
  loading: boolean; // Combined loading state
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
  const [session, setSession] = useState<TypeSession | null>(null);
  const [user, setUser] = useState<TypeUser | null>(null);
  const [profile, setProfile] = useState<Record<string, any> | null>(null); // To store role, name, etc.
  const [loadingSession, setLoadingSession] = useState<boolean>(true); // Loading state for session check
  const [loadingProfile, setLoadingProfile] = useState<boolean>(false); // Loading state for profile fetch
  const [authError, setAuthError] = useState<AuthError | null>(null); // Add state for auth errors

  // Add a ref to track ongoing profile fetch requests
  const profileFetchInProgress = useRef<string | null>(null);
  
  // Add refs to track session initialization state
  const isInitialized = useRef<boolean>(false);
  const initializedUser = useRef<string | null>(null);

  // Effect for initializing session and setting up listener
  useEffect(() => {
    let ignore = false;
    console.log('[AuthContext] Session Effect mounting...');
    setLoadingSession(true);
    setAuthError(null);

    async function getInitialSession() {
      console.log('[AuthContext] Attempting to get initial session...');
      try {
        const { data: { session }, error: sessionError } = await supabase.auth.getSession();
        if (sessionError) {
           console.error('[AuthContext] Error getting session:', sessionError);
           throw sessionError;
        }
        if (ignore) return;
        console.log('[AuthContext] Initial session fetched:', session ? 'Exists' : 'null');
        
        // Set initial session and user, profile fetch handled by separate effect
        setSession(session);
        
        // Only update user state if it's different to avoid triggering unnecessary effects
        const newUser = session?.user ?? null;
        if (newUser?.id !== initializedUser.current) {
          setUser(newUser);
          if (newUser) {
            initializedUser.current = newUser.id;
          } else {
            initializedUser.current = null;
          }
        }
        
        isInitialized.current = true;
      } catch (err) {
        console.error("[AuthContext] Error in getInitialSession catch block:", err);
        if (!ignore) setAuthError(err instanceof AuthError ? err : null);
      } finally {
        console.log('[AuthContext] Initial Session: >>> Reached finally block. Attempting setLoadingSession(false).');
        if (!ignore) setLoadingSession(false);
        console.log('[AuthContext] Initial Session: <<< setLoadingSession(false) executed.');
      }
    }

    getInitialSession();

    console.log('[AuthContext] Setting up onAuthStateChange listener...');
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        if (ignore) return; // Prevent updates after unmount
        console.log('[AuthContext] onAuthStateChange triggered. Event:', _event, 'Session:', session ? 'Exists' : 'null');
        
        // Update session
        setSession(session);
        
        // Only update user if it's different to avoid triggering effects unnecessarily
        const newUser = session?.user ?? null;
        const newUserId = newUser?.id ?? null;
        const currentUserId = user?.id ?? null;
        
        // Skip state update if this is an INITIAL_SESSION event and we're already initialized with the same user
        if (_event === 'INITIAL_SESSION' && isInitialized.current && newUserId === initializedUser.current) {
          console.log('[AuthContext] Skipping redundant user update for INITIAL_SESSION event');
          return;
        }
        
        // Otherwise, update user if it's a real change
        if (newUserId !== currentUserId) {
          console.log(`[AuthContext] Updating user state from ${currentUserId} to ${newUserId}`);
          setUser(newUser);
          
          // If this is a signout, clear profile immediately
          if (!newUser) {
            setProfile(null);
          }
          
          // Track initialized user
          initializedUser.current = newUserId;
        }
        
        setAuthError(null); // Clear error on auth change
        setLoadingSession(false); // Session state is now known
      }
    );

    return () => {
      console.log('[AuthContext] Session Effect cleanup. Unsubscribing listener.');
      ignore = true;
      subscription?.unsubscribe();
    };
  }, []); // Runs only once on mount

  // Function to fetch user profile data (keep separate)
  const fetchProfile = async (userId: string) => {
    console.log(`[AuthContext] fetchProfile called for user: ${userId}`);
    
    // Skip if a fetch is already in progress for this user
    if (profileFetchInProgress.current === userId) {
      console.log(`[AuthContext] fetchProfile: Skipping duplicate request for user: ${userId}`);
      return;
    }
    
    // Skip if we already have a profile for this user
    if (profile?.id === userId) {
      console.log(`[AuthContext] fetchProfile: Profile already loaded for user: ${userId}`);
      return;
    }
    
    // Set the current fetch in progress
    profileFetchInProgress.current = userId;
    
    let tempProfileData = null;
    // Reset profile-specific loading/error before fetch
    setLoadingProfile(true);
    // Do NOT clear global authError here, only profile fetch errors

    try {
      // --- Temporarily Comment Out DEBUGGING STEP ---
      /*
      console.log(`[AuthContext] fetchProfile (DEBUG): >>> Attempting supabase.auth.getUser() for user: ${userId}`);
      const { data: { user: authUser }, error: getUserError } = await supabase.auth.getUser();
      if (getUserError) {
         console.error(`[AuthContext] fetchProfile (DEBUG): Error during supabase.auth.getUser():`, getUserError);
      } else {
        console.log(`[AuthContext] fetchProfile (DEBUG): <<< supabase.auth.getUser() completed successfully for user: ${userId}`, authUser);
      }
      */
      // --- END Temporarily Comment Out DEBUGGING STEP ---

      // --- PROFILE FETCH LOGIC ---
      console.log(`[AuthContext] fetchProfile: >>> Preparing to call supabase.from('profiles').select()`);
      console.log('[AuthContext] fetchProfile: Inspecting supabase client object:', supabase);
      console.log(`[AuthContext] fetchProfile: >>> Attempting Supabase query for profile of user: ${userId}`);
      const { data, error, status } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId);
      console.log(`[AuthContext] fetchProfile: <<< Supabase query completed for user: ${userId}. Status: ${status}`);
      
      console.log(`[AuthContext] Profile fetch API call returned - Status: ${status}, Error: ${JSON.stringify(error)}, Data: ${JSON.stringify(data)}`); 

      if (error && status !== 406) {
        console.error('[AuthContext] Error identified in profile fetch result (and status != 406):', error);
        throw error; // Throw error to be caught below
      } else if (data && data.length > 0) {
        console.log('[AuthContext] Profile array fetched successfully. Setting profile state.', data[0]);
        tempProfileData = data[0];
      } else {
        console.log('[AuthContext] Profile fetch returned no data or status 406. Setting profile to null.', data);
        tempProfileData = null;
      }
      // --- END PROFILE FETCH LOGIC ---

    } catch (caughtError) {
      console.error('[AuthContext] Catch block error in fetchProfile:', caughtError);
      // Set specific profile fetch error if needed, or handle globally
      // For now, we let the main authError state handle it if it's an AuthError
      if (!(caughtError instanceof AuthError)) {
        console.error('[AuthContext] Non-AuthError during profile fetch:', caughtError);
      }
       tempProfileData = null; // Ensure profile is null on error
    } finally {
       console.log(`[AuthContext] fetchProfile finally block for user: ${userId}. Setting profile to:`, tempProfileData);
       setProfile(tempProfileData);
       setLoadingProfile(false); // Profile fetch attempt is complete
       // Clear the in-progress tracker
       profileFetchInProgress.current = null;
       console.log(`[AuthContext] fetchProfile finished for user: ${userId}`); 
    }
  };

  // NEW Effect for fetching profile when user changes
  useEffect(() => {
    let ignore = false;
    console.log('[AuthContext] User Effect triggered. User:', user ? user.id : 'null');

    if (user) {
      console.log(`[AuthContext] User Effect: User found (${user.id}), attempting fetchProfile.`);
      fetchProfile(user.id).catch(err => {
        // Catch errors specifically from the fetchProfile call initiated here
        // Avoid setting state if component unmounted
        if (!ignore) {
            console.error("[AuthContext] User Effect: fetchProfile promise rejected:", err);
            // Optionally set a specific error state here if needed
            setAuthError(err instanceof AuthError ? err : null);
            setLoadingProfile(false); // Ensure loading stops on error
            // Clear the in-progress tracker if there was an error
            profileFetchInProgress.current = null;
        }
      });
    } else {
      console.log('[AuthContext] User Effect: No user, clearing profile and stopping profile loading.');
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
    // setLoading(true); // Handled by listener/user effect
    setAuthError(null);
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: email!, // Add non-null assertion or handle undefined
        password: password!, // Add non-null assertion or handle undefined
      });
      if (error) throw error;
       // onAuthStateChange will handle setting user and triggering profile fetch
      return { data, error: null };
    } catch (error) {
      console.error('Login failed:', error as AuthError);
      setAuthError(error as AuthError);
      // setLoading(false); // Handled by listener/user effect
      return { data: null, error: error as AuthError };
    } 
  };
  
  // Explicitly type the signUp function
  const signUp: AuthContextType['signUp'] = async ({ email, password, options }) => {
    // setLoading(true); // Handled by listener/user effect
    setAuthError(null);
    try {
      // options can include { data: { name: 'Full Name' } } for metadata
      const { data, error } = await supabase.auth.signUp({
        email: email!,
        password: password!,
        options,
      });
      if (error) throw error;
      // If successful, onAuthStateChange handles setting user/session
      // If email verification is required, user object might be returned but session will be null initially
      return { data, error: null }; 
    } catch (error) {
       console.error('Signup failed:', error as AuthError);
       setAuthError(error as AuthError);
       // setLoading(false); // Handled by listener/user effect
       return { data: null, error: error as AuthError };
    }
  };

  // Explicitly type the signOut function
   const signOut: AuthContextType['signOut'] = async () => {
    // setLoading(true); // Handled by listener/user effect
    setAuthError(null);
    try {
      const { error } = await supabase.auth.signOut();
      if (error) throw error; // onAuthStateChange will handle clearing user/session/profile
    } catch (error) {
       console.error('Sign out failed:', error as AuthError);
       setAuthError(error as AuthError);
       // setLoading(false); // Handled by listener/user effect
    }
  };

  // Combine loading states for the context value
  const loading = loadingSession || loadingProfile;

  // Ensure the provided value matches AuthContextType
  const value: AuthContextType = {
    session,
    user,
    profile,
    loading, // Use combined loading state
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
const useAuthHook = (): AuthContextType => {
  const context = useContext(AuthContext);
  // Check if context is null (meaning useAuth is used outside of AuthProvider)
  if (context === null) { 
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const useAuth = useAuthHook; 