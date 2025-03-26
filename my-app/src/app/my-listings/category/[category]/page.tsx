// File: /app/my-listings/category/[category]/page.tsx
import MyCategoryListings from '@/components/MyCategoryListings';
import type { Metadata } from 'next';
import { createClient } from '@/utils/supabase/server';
import { getCategoryMapping, getCategories, encodeCategory } from '@/lib/database';

// Helper function to decode category slug
const getCategoryNameFromSlug = (slug: string): string | null => {
  // Method 1: Try direct mapping first
  const categoryMapping = getCategoryMapping();
  if (categoryMapping[slug]) {
    return categoryMapping[slug];
  }
  
  // Method 2: Try case-insensitive lookup
  const lowerSlug = slug.toLowerCase();
  const lowerCaseMapping: Record<string, string> = {};
  Object.entries(categoryMapping).forEach(([key, value]) => {
    lowerCaseMapping[key.toLowerCase()] = value;
  });
  
  if (lowerCaseMapping[lowerSlug]) {
    return lowerCaseMapping[lowerSlug];
  }
  
  // Method 3: Try manual encoding of all categories to find a match
  const allCategories = getCategories();
  
  for (const category of allCategories) {
    const encoded = category.toLowerCase().replace(/\s+/g, '-').replace(/&/g, '-');
    if (encoded === slug || encoded === lowerSlug) {
      return category;
    }
  }
  
  return null;
};

// Generate dynamic metadata based on category and user data
export async function generateMetadata({ 
  params 
}: { 
  params: Promise<{ category: string }> | { category: string }
}): Promise<Metadata> {
  try {
    // Await the params before using them
    const resolvedParams = await params;
    const encodedCategory = resolvedParams.category;
    
    // Decode the category name from the slug
    const categoryName = getCategoryNameFromSlug(encodedCategory);
    
    if (!categoryName) {
      return {
        title: 'My Listings | SkillMart',
        description: 'View and manage your listings on SkillMart',
      };
    }

    // Get the user's session
    const supabase = await createClient();
    const { data: { session } } = await supabase.auth.getSession();
    
    if (!session || !session.user) {
      return {
        title: `${categoryName} Listings | SkillMart`,
        description: `Sign in to manage your ${categoryName} listings on SkillMart`,
      };
    }
    
    // Get user profile and category listings count
    const [profileResult, listingsResult] = await Promise.all([
      supabase.from('profiles').select('username').eq('id', session.user.id).single(),
      supabase.from('listings')
        .select('id')
        .eq('user_id', session.user.id)
        .eq('category', categoryName)
    ]);
    
    const username = profileResult.data?.username;
    const listingCount = listingsResult.data?.length || 0;
    
    // Create personalized and category-specific metadata
    return {
      title: username 
        ? `${username}'s ${categoryName} Listings | SkillMart` 
        : `My ${categoryName} Listings | SkillMart`,
      description: listingCount > 0 
        ? `Manage your ${listingCount} ${categoryName} ${listingCount === 1 ? 'listing' : 'listings'} on SkillMart` 
        : `Create and manage your ${categoryName} listings on SkillMart`,
      keywords: [
        categoryName,
        'category listings', 
        'skill category', 
        'personal listings', 
        'listing filter',
        username || ''
      ].filter(Boolean),
      openGraph: {
        title: `${categoryName} Listings | SkillMart`,
        description: `Manage your ${categoryName} listings on SkillMart`,
        type: 'website'
      }
    };
    
  } catch (error) {
    console.error('Error generating category listings metadata:', error);
    
    // Fallback metadata if error occurs
    return {
      title: 'My Category Listings | SkillMart',
      description: 'View and manage your listings within a specific category',
      keywords: [
        'category listings', 
        'skill category', 
        'personal listings', 
        'listing filter'
      ]
    };
  }
}

export default function MyCategoryListingsPage() {
  return <MyCategoryListings />;
}