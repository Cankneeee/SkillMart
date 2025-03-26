"use client"

import { createContext, useState, useEffect, useContext, ReactNode, Dispatch, SetStateAction } from "react";
import { createClient } from "@/utils/supabase/client";
import { getUserProfile } from "@/lib/database";

// Define the UserContext Type
interface UserContextType {
  userId: string | null;
  username: string | null;
  setUsername: Dispatch<SetStateAction<string | null>>;
  profilePicture: string | null;
  setProfilePicture: Dispatch<SetStateAction<string | null>>;
}

// Create Context with a default null value
const UserContext = createContext<UserContextType | null>(null);

interface UserProviderProps {
  children: ReactNode;
}

// UserProvider component
export function UserProvider({ children }: UserProviderProps) {
  const [userId, setUserId] = useState<string | null>(null);
  const [username, setUsername] = useState<string | null>(null);
  const [profilePicture, setProfilePicture] = useState<string | null>(null);

  const supabase = createClient();

  useEffect(() => {
    async function fetchUserProfile() {
      const { data: userData } = await supabase.auth.getUser();
      if (userData?.user) {
        setUserId(userData.user.id);

        const profile = await getUserProfile(userData.user.id);
        if (profile) {
          setUsername(profile.username);
          setProfilePicture(profile.profile_picture);
        }
      }
    }

    fetchUserProfile();
  }, []);

  return (
    <UserContext.Provider value={{ userId, username, setUsername, profilePicture, setProfilePicture }}>
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
