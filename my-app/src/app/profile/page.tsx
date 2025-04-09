// File: /app/profile/page.tsx
import Profile from '@/components/Profile';
import type { Metadata } from 'next';
import { cookies } from 'next/headers';
import { createClient } from '@/utils/supabase/server';

// *** ADD THIS LINE ***
export const dynamic = 'force-dynamic'; // Force dynamic rendering at request time

// Generate dynamic metadata based on the authenticated user
export async function generateMetadata(): Promise<Metadata> {
  try {
    // Get the user server-side using getUser for verification
    const supabase = await createClient();
    const { data: { user }, error: userError } = await supabase.auth.getUser();

    // Handle potential error during getUser call
    if (userError) {
        console.error("Error fetching user for metadata:", userError.message);
        // Return generic metadata if user fetch fails
        return {
            title: 'Profile | SkillMart',
            description: 'Manage your SkillMart profile settings',
        };
    }

    if (!user) {
      return {
        title: 'Profile | SkillMart',
        description: 'Sign in to view and manage your SkillMart profile',
      };
    }

    // Get user profile data using server-side Supabase client
    const { data: profile } = await supabase
      .from('profiles')
      .select('username')
      .eq('id', user.id)
      .single();

    if (profile?.username) {
      return {
        title: `${profile.username}'s Profile | SkillMart`,
        description: 'Manage your SkillMart profile settings and preferences',
        keywords: ['user profile', 'account settings', profile.username, 'profile management'],
        openGraph: {
          title: `${profile.username}'s Profile | SkillMart`,
          description: 'Manage your SkillMart profile settings and preferences',
          type: 'profile',
        }
      };
    }

    // Default metadata if we have a user but no username
    return {
      title: 'My Profile | SkillMart',
      description: 'View and manage your SkillMart profile settings',
      keywords: ['user profile', 'account settings', 'profile management']
    };

  } catch (error) {
    console.error('Error generating profile metadata:', error);

    // Fallback metadata if error occurs
    return {
      title: 'Profile | SkillMart',
      description: 'View and manage your SkillMart profile settings',
      keywords: ['user profile', 'account settings', 'profile management']
    };
  }
}

export default function ProfilePage() {
  return (
    <main>
      <Profile />
    </main>
  );
}
