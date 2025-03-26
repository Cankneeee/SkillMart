import BrowseListings from "@/components/BrowseListings";
import type { Metadata } from 'next';

// Generate dynamic metadata based on search parameters
export async function generateMetadata({ 
  searchParams 
}: { 
  searchParams: Promise<{ q?: string }> | { q?: string } 
}): Promise<Metadata> {
  // Get search query from URL params - await the searchParams
  const resolvedParams = await searchParams;
  const query = resolvedParams.q;
  
  if (query) {
    // If there's a search query, create search-specific metadata
    return {
      title: `Search: ${query} | SkillMart`,
      description: `Browse search results for "${query}" on SkillMart's skill marketplace`,
      keywords: [
        'skill listings', 
        'search results',
        'skill marketplace', 
        query,
        'find skills'
      ],
      openGraph: {
        title: `Search Results: ${query} | SkillMart`,
        description: `Browse search results for "${query}" on SkillMart's skill marketplace`,
        type: 'website',
      },
      twitter: {
        card: 'summary',
        title: `Search: ${query} | SkillMart`,
        description: `Browse search results for "${query}" on SkillMart's skill marketplace`,
      }
    };
  }
  
  // Default metadata when no search is being performed
  return {
    title: 'Browse Listings | SkillMart',
    description: 'Explore a wide range of skill listings across various categories and types',
    keywords: [
      'skill listings', 
      'browse skills', 
      'skill marketplace', 
      'skill exchange', 
      'service listings'
    ],
    openGraph: {
      title: 'Browse Listings | SkillMart',
      description: 'Explore a wide range of skill listings across various categories and types',
      type: 'website',
    },
    twitter: {
      card: 'summary',
      title: 'Browse Listings | SkillMart',
      description: 'Explore a wide range of skill listings across various categories and types',
    }
  };
}

export default function BrowseListingsPage() {
  return (
    <>
      <BrowseListings />
    </>
  );
}