import BrowseCategoryListings from '@/components/BrowseCategoryListings'; 
import type { Metadata } from 'next';
import { decodeCategoryFromSlug, getCategories } from '@/lib/database';

export async function generateMetadata({
  params
}: {
  params: Promise<{ category: string }> | { category: string }
}): Promise<Metadata> {
  const resolvedParams = await params;
  const categoryName = decodeCategoryFromSlug(resolvedParams.category) || resolvedParams.category; 
  const allCategories = getCategories(); 
  const isValidCategory = allCategories.some(
    cat => cat.toLowerCase() === categoryName.toLowerCase()
  ); 

  if (!isValidCategory) {
    return {
      title: 'Category Not Found | SkillMart', 
      description: 'The requested skill category could not be found', 
      robots: {
        index: false,
        follow: false
      } 
    };
  }

  return {
    title: `Browse ${categoryName} Listings | SkillMart`, 
    description: `Explore skill listings in the ${categoryName} category on SkillMart`, 
    keywords: [
      'skill listings',
      'browse skills',
      'skill category',
      categoryName.toLowerCase(),
      'skill marketplace',
      'find skills' 
    ], 
    openGraph: {
      title: `Browse ${categoryName} Listings | SkillMart`, 
      description: `Explore skill listings in the ${categoryName} category on SkillMart`, 
      type: 'website' 
    },
    twitter: {
      card: 'summary', 
      title: `Browse ${categoryName} Listings | SkillMart`, 
      description: `Explore skill listings in the ${categoryName} category on SkillMart` 
    }
  };
}

export default function BrowseCategoryListingsPage() {
  return <BrowseCategoryListings />; 
}
