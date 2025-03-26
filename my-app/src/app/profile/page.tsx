// File: /app/profile/page.tsx
import Profile from '@/components/Profile';
import type { Metadata } from 'next';
import { cookies } from 'next/headers';
import { createClient } from '@/utils/supabase/server';

// Generate dynamic metadata based on the authenticated user
export async function generateMetadata(): Promise<Metadata> {
  try {
    // Get the session server-side using your createClient utility
    const supabase = await createClient();
    const { data: { session } } = await supabase.auth.getSession();
    
    if (!session || !session.user) {
      return {
        title: 'Profile | SkillMart',
        description: 'Sign in to view and manage your SkillMart profile',
      };
    }
    
    // Get user profile data using server-side Supabase client
    const { data: profile } = await supabase
      .from('profiles')
      .select('username')
      .eq('id', session.user.id)
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