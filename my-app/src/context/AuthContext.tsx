// src/context/AuthContext.tsx
'use client';

import { createContext, useContext, useEffect, useState, useCallback } from 'react'; // Added useCallback
import { createClient } from '@/utils/supabase/client';
import { User, AuthError, Session, AuthChangeEvent } from '@supabase/supabase-js'; // Import Session & AuthChangeEvent

interface AuthContextType {
  user: User | null;
  loading: boolean;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);
export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true); // Start loading until first check is done
  const supabase = createClient();

  // Function to fetch and verify the user with the server
  const fetchAndSetUser = useCallback(async () => {
    console.log("AuthContext: Running fetchAndSetUser...");
    // Don't set loading true here, only on initial mount
    try {
      const { data: { user: currentUser }, error } = await supabase.auth.getUser();

      if (error) {
        if (error.message === "Auth session missing!") {
          console.log("AuthContext: No active session found via getUser.");
        } else {
          console.error("AuthContext: Error fetching user via getUser:", error.message);
        }
        setUser(null);
      } else {
        console.log("AuthContext: User fetched via getUser:", currentUser?.id || 'null');
        setUser(currentUser || null);
      }
    } catch (e) {
      console.error("AuthContext: Exception fetching user via getUser:", e);
      setUser(null);
    } finally {
      // Set loading to false ONLY after the *initial* check completes.
      // Subsequent calls triggered by the listener don't need to set loading.
      if (loading) {
          setLoading(false);
          console.log("AuthContext: Initial load check complete, loading set to false.");
      }
    }
  }, [supabase, loading]); // Include loading in dependencies for the initial check logic

  useEffect(() => {
    // Fetch the user on initial mount
    fetchAndSetUser();

    const { data: authListener } = supabase.auth.onAuthStateChange(
        async (event: AuthChangeEvent, session: Session | null) => {
        console.log("AuthContext: Auth State Changed Event:", event, "Session:", session?.user?.id || 'null');

        // ** MODIFIED LOGIC **
        if (event === 'SIGNED_OUT') {
            console.log("AuthContext: SIGNED_OUT event detected, setting user state to null.");
            setUser(null);
            // Ensure loading is false after a direct sign out event
            if (loading) setLoading(false);
        } else if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED' || event === 'USER_UPDATED') {
             // For these events, the session object should be reliable
             console.log(`AuthContext: ${event} event detected, setting user from session object.`);
             setUser(session?.user ?? null);
             if (loading) setLoading(false); // Ensure loading is false
        } else if (event === 'INITIAL_SESSION') {
            // INITIAL_SESSION might provide a session, but let's still verify with getUser
            console.log("AuthContext: INITIAL_SESSION event, verifying with fetchAndSetUser.");
            await fetchAndSetUser(); // fetchAndSetUser handles setting loading to false initially
        }
        // Other events like PASSWORD_RECOVERY might not need immediate user state changes here
        // Let fetchAndSetUser handle verification if needed elsewhere or rely on subsequent events.
    });

    return () => {
      console.log("AuthContext: Unsubscribing auth listener.");
      authListener.subscription.unsubscribe();
    };
    // fetchAndSetUser is memoized with useCallback, supabase is stable
  }, [supabase, fetchAndSetUser, loading]);

  const logout = async () => {
    console.log("AuthContext: Logout called.");
    // setLoading(true); // Optionally set loading during logout process
    await supabase.auth.signOut();
    // State update (setUser(null)) is handled by the 'SIGNED_OUT' event in the listener
    console.log("AuthContext: supabase.auth.signOut() completed.");
    // setLoading(false); // Loading is set to false by the listener/fetchAndSetUser
  };

  return (
    <AuthContext.Provider value={{ user, loading, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

// Hook to use the auth context
export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};