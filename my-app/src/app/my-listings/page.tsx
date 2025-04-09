// File: /app/my-listings/page.tsx
import MyListings from '@/components/MyListings';
import type { Metadata } from 'next';
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
            title: 'My Listings | SkillMart',
            description: 'Manage your skill listings on SkillMart',
        };
    }

    if (!user) {
      return {
        title: 'My Listings | SkillMart',
        description: 'Sign in to view and manage your listings',
      };
    }

    // Get user profile and listings data
    const [profileResult, listingsResult] = await Promise.all([
      supabase.from('profiles').select('username').eq('id', user.id).single(),
      supabase.from('listings').select('id', { count: 'exact', head: true }).eq('user_id', user.id) // Optimized count
    ]);

    const username = profileResult.data?.username;
    const listingCount = listingsResult.count || 0;

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
