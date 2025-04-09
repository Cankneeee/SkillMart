"use client"

import { createContext, useState, useEffect, useContext, ReactNode, Dispatch, SetStateAction } from "react";
import { createClient } from "@/utils/supabase/client";
import { getUserProfile } from "@/lib/database";
// *** ADD THIS IMPORT ***
import { useAuth } from "./AuthContext"; // Import useAuth to access the auth state

// Define the UserContext Type
interface UserContextType {
  userId: string | null;
  username: string | null;
  setUsername: Dispatch<SetStateAction<string | null>>;
  profilePicture: string | null;
  setProfilePicture: Dispatch<SetStateAction<string | null>>;
  // Add loading state for profile fetching
  loadingProfile: boolean;
}

// Create Context with a default null value
// Provide default functions for setters to satisfy the type initially
const UserContext = createContext<UserContextType>({
    userId: null,
    username: null,
    setUsername: () => {},
    profilePicture: null,
    setProfilePicture: () => {},
    loadingProfile: true, // Start in loading state
});

interface UserProviderProps {
  children: ReactNode;
}

// UserProvider component
export function UserProvider({ children }: UserProviderProps) {
  const [userId, setUserId] = useState<string | null>(null);
  const [username, setUsername] = useState<string | null>(null);
  const [profilePicture, setProfilePicture] = useState<string | null>(null);
  const [loadingProfile, setLoadingProfile] = useState(true); // Loading state for profile

  const supabase = createClient();
  // *** USE AUTH CONTEXT ***
  const auth = useAuth(); // Get user and loading state from AuthContext

  // *** UPDATE useEffect TO REACT TO AUTH CHANGES ***
  useEffect(() => {
    // Function to fetch profile based on authenticated user
    const fetchUserProfile = async (currentUserId: string) => {
        setLoadingProfile(true); // Start loading profile
        try {
            console.log("UserContext: Fetching profile for user ID:", currentUserId);
            const profile = await getUserProfile(currentUserId);
            if (profile) {
              setUsername(profile.username);
              setProfilePicture(profile.profile_picture);
              console.log("UserContext: Profile loaded:", profile.username);
            } else {
              // Handle case where profile might not exist yet after signup
              console.warn("UserContext: Profile not found for user ID:", currentUserId);
              setUsername(null); // Or a default value like "New User"
              setProfilePicture(null);
            }
        } catch (error) {
            console.error("UserContext: Error fetching profile:", error);
            // Clear profile on error
            setUsername(null);
            setProfilePicture(null);
        } finally {
            setLoadingProfile(false); // Finish loading profile
        }
    };

    // Clear profile data
    const clearUserProfile = () => {
        console.log("UserContext: Clearing user profile data.");
        setUserId(null);
        setUsername(null);
        setProfilePicture(null);
        setLoadingProfile(false); // Not loading if logged out
    };

    // Check the user state from AuthContext
    if (auth.user) {
      // User is logged in according to AuthContext
      setUserId(auth.user.id);
      // Fetch profile only if the userId has changed or was null
      if (userId !== auth.user.id) {
          fetchUserProfile(auth.user.id);
      } else {
          // If userId is the same, we might not need to refetch, assume data is current
          // unless profile loading is still true (e.g., initial load)
          if (loadingProfile) {
              setLoadingProfile(false);
          }
      }
    } else if (!auth.loading) {
      // User is logged out and AuthContext is not loading
      clearUserProfile();
    }
    // This effect depends on the user object from AuthContext and its loading state
  }, [auth.user, auth.loading, userId, loadingProfile]); // Add loadingProfile to dependencies

  // Value provided to context consumers
  const value = {
      userId,
      username,
      setUsername, // Keep setters if needed externally, though profile updates should primarily happen here
      profilePicture,
      setProfilePicture,
      loadingProfile // Provide loading state
  };

  return (
    <UserContext.Provider value={value}>
      {children}
    </UserContext.Provider>
  );
}

// Hook to use UserContext
export function useUser() {
  const context = useContext(UserContext);
  if (!context) {
    throw new Error("useUser must be used within a UserProvider");
  }
  return context;
}
