import { createClient } from '@/utils/supabase/client';

interface Router {
  push: (url: string) => void;
  replace: (url: string) => void;
}

/**
 * Get the currently authenticated user
 * @returns The authenticated user or null
 */
export const getUser = async () => {
  const supabase = createClient();
  const { data, error } = await supabase.auth.getUser();

  if (error) {
    console.error('Error fetching user:', error);
    return null;
  }
  return data.user;
};

/**
 * Get the current session
 * @returns The current session or null
 */
export const getSession = async () => {
  const supabase = createClient();
  const { data, error } = await supabase.auth.getSession();

  if (error) {
    console.error('Error fetching session:', error);
    return null;
  }
  return data.session;
};

/**
 * Get the current user session and ID with optional redirect
 * Combines functionality from both auth utility files
 * @param redirectToLogin Whether to redirect to login if no session (default: true)
 * @returns Object containing the user ID and the session
 */
export const getCurrentUser = async (redirectToLogin = true) => {
  const supabase = createClient();
  // Get the current user session
  const { data: { session } } = await supabase.auth.getSession();
  if (!session && redirectToLogin) {
    // Use window.location for client-side navigation to login
    // Note: This line remains as it's for a different scenario (initial load check)
    window.location.href = '/login';
    return { userId: null, session: null };
  }

  return {
    userId: session?.user.id || null,
    session
  };
};

/**
 * Sign in a user with email and password
 * @param email User email
 * @param password User password
 * @returns Auth data and error
 */
export const signInWithEmail = async (email: string, password: string) => {
  const supabase = createClient();
  const { data, error } = await supabase.auth.signInWithPassword({
    email: email.trim().toLowerCase(),
    password,
  });
  return { data, error };
};

/**
 * Sign up a new user with email and password
 * @param email User email
 * @param password User password
 * @returns Auth data and error
 */
export const signUpWithEmail = async (email: string, password: string) => {
  const supabase = createClient();
  const { data, error } = await supabase.auth.signUp({
    email: email.trim().toLowerCase(),
    password,
  });
  return { data, error };
};

/**
 * Sign out the current user
 * This function now only signs the user out via Supabase.
 * Redirection should be handled in the component calling this function.
 */
export const signOut = async () => { // Removed redirectPath parameter
  const supabase = createClient();
  await supabase.auth.signOut();
  // REMOVED: window.location.href = redirectPath;
  // Redirection will be handled by the calling component (e.g., NavigationBar)
};

/**
 * Send password reset request
 * @param email User email
 * @param redirectTo Redirect URL after password reset
 * @returns Error if any
 */
export const resetPassword = async (email: string, redirectTo: string) => {
  const supabase = createClient();
  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo
  });
  return { error };
};

/**
 * Update user password
 * @param newPassword New password
 * @returns Auth data and error
 */
export const updatePassword = async (newPassword: string) => {
  const supabase = createClient();
  const { data, error } = await supabase.auth.updateUser({
    password: newPassword
  });
  return { data, error };
};

/**
 * Redirect if user is authenticated
 * @param router Next.js router
 * @param redirectPath Path to redirect to
 * @returns True if redirection happened
 */
export const redirectIfAuthenticated = async (
  router: Router,
  redirectPath = '/browse'
) => {
  const session = await getSession();
  if (session) {
    router.push(redirectPath);
    return true;
  }
  return false;
};

/**
 * Redirect if user is not authenticated
 * @param router Next.js router
 * @param redirectPath Path to redirect to
 * @returns True if redirection happened
 */
export const redirectIfUnauthenticated = async (
  router: Router,
  redirectPath = '/login'
) => {
  const session = await getSession();
  if (!session) {
    router.push(redirectPath);
    return true;
  }
  return false;
};

/**
 * Check if an email is registered
 * @param email Email to check
 * @returns True if email is registered
 */
export const isEmailRegistered = async (email: string) => {
  const supabase = createClient();
  try {
    // First check in profiles table
    const { data: profileData } = await supabase
      .from('profiles')
      .select('email')
      .eq('email', email.trim().toLowerCase())
      .maybeSingle();
    if (profileData) {
      return true;
    }

    // If admin capabilities are available, also check auth.users
    const { data, error } = await supabase.auth.admin.listUsers();
    if (error) {
      console.error(`Error checking email existence: ${error.message}`);
      return false;
    }

    return data.users.some((user) => user.email === email.trim().toLowerCase());
  } catch (error) {
    console.error('Error checking if email exists:', error);
    return false;
  }
};

/**
 * Check if user is authenticated
 * @returns True if authenticated
 */
export const isAuthenticated = async () => {
  const session = await getSession();
  return session !== null;
};

/**
 * Check if current user is the owner of a resource
 * @param resourceUserId Resource owner ID
 * @returns True if current user is the owner
 */
export const isResourceOwner = async (resourceUserId: string) => {
  const user = await getUser();
  return user?.id === resourceUserId;
};