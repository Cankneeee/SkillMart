import SavedListings from '@/components/SavedListings';
import type { Metadata } from 'next';
import { getCurrentUser } from '@/utils/auth';

export async function generateMetadata(): Promise<Metadata> {
  // Get current user to personalize metadata if possible
  const { userId } = await getCurrentUser(false);
  
  return {
    title: 'Saved Listings | SkillMart',
    description: 'View and manage all your bookmarked skill listings',
    keywords: [
      'saved listings', 
      'bookmarked skills', 
      'favorite listings', 
      'skill collection',
      ...(userId ? ['personal bookmarks'] : [])
    ],
    openGraph: {
      title: 'Saved Listings | SkillMart',
      description: 'View and manage all your bookmarked skill listings',
      type: 'website'
    },
    twitter: {
      card: 'summary',
      title: 'Saved Listings | SkillMart',
      description: 'View and manage all your bookmarked skill listings'
    }
  };
}

export default function SavedListingsPage() {
  return <SavedListings />;
}