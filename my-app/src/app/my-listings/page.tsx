// File: /app/my-listings/page.tsx
import MyListings from '@/components/MyListings';
import type { Metadata } from 'next';
import { createClient } from '@/utils/supabase/server';

// Generate dynamic metadata based on the authenticated user
export async function generateMetadata(): Promise<Metadata> {
  try {
    // Get the session server-side
    const supabase = await createClient();
    const { data: { session } } = await supabase.auth.getSession();
    
    if (!session || !session.user) {
      return {
        title: 'My Listings | SkillMart',
        description: 'Sign in to view and manage your listings',
      };
    }
    
    // Get user profile and listings data
    const [profileResult, listingsResult] = await Promise.all([
      supabase.from('profiles').select('username').eq('id', session.user.id).single(),
      supabase.from('listings').select('id').eq('user_id', session.user.id)
    ]);
    
    const username = profileResult.data?.username;
    const listingCount = listingsResult.data?.length || 0;
    
    // Create personalized metadata based on the user's data
    return {
      title: username ? `${username}'s Listings | SkillMart` : 'My Listings | SkillMart',
      description: listingCount > 0 
        ? `Manage your ${listingCount} skill ${listingCount === 1 ? 'listing' : 'listings'} on SkillMart` 
        : 'Create and manage your skill listings on SkillMart',
      keywords: [
        'my listings', 
        'personal listings', 
        'skill management', 
        'listing overview',
        username || ''
      ].filter(Boolean),
      openGraph: {
        title: username ? `${username}'s Listings | SkillMart` : 'My Listings | SkillMart',
        description: `Manage your skill listings on SkillMart`,
        type: 'website'
      }
    };
    
  } catch (error) {
    console.error('Error generating my listings metadata:', error);
    
    // Fallback metadata if error occurs
    return {
      title: 'My Listings | SkillMart',
      description: 'Manage and view all your skill listings in one place',
      keywords: [
        'my listings', 
        'personal listings', 
        'skill management', 
        'listing overview'
      ]
    };
  }
}

export default function MyListingsPage() {
  return <MyListings />;
}