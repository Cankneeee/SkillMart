import SavedCategoryListings from '@/components/SavedCategoryListings';
import type { Metadata } from 'next';
import { decodeCategoryFromSlug, getCategories } from '@/lib/database';

export async function generateMetadata({ 
  params 
}: { 
  params: Promise<{ category: string }> | { category: string } 
}): Promise<Metadata> {
  // Await the params before using them
  const resolvedParams = await params;
  
  // Decode the category from the URL slug
  const categoryName = decodeCategoryFromSlug(resolvedParams.category) || resolvedParams.category;
  
  // Get all available categories for validation
  const allCategories = getCategories();
  
  // Check if the category is valid
  const isValidCategory = allCategories.some(
    cat => cat.toLowerCase() === categoryName.toLowerCase()
  );
  
  if (!isValidCategory) {
    return {
      title: 'Category Not Found | SkillMart',
      description: 'The requested saved category could not be found',
      robots: {
        index: false,
        follow: false
      }
    };
  }
  
  return {
    title: `Saved ${categoryName} Listings | SkillMart`,
    description: `Browse your saved skill listings in the ${categoryName} category`,
    keywords: [
      'saved listings',
      'bookmarked skills', 
      'category filters', 
      'saved skills',
      categoryName.toLowerCase(),
      'skill category'
    ],
    openGraph: {
      title: `Saved ${categoryName} Listings | SkillMart`,
      description: `Browse your saved skill listings in the ${categoryName} category`,
      type: 'website'
    },
    twitter: {
      card: 'summary',
      title: `Saved ${categoryName} Listings | SkillMart`,
      description: `Browse your saved skill listings in the ${categoryName} category`
    }
  };
}

export default function SavedCategoryListingsPage() {
  return <SavedCategoryListings />;
}