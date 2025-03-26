import { MetadataRoute } from 'next'
import { createClient } from '@/utils/supabase/server'
import { getCategories } from '@/lib/database'

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const supabase = await createClient();
  const baseUrl = 'https://skillmart.com'; // Replace with your actual domain

  // Base static routes
  const baseRoutes: MetadataRoute.Sitemap = [
    {
      url: `${baseUrl}`,
      lastModified: new Date(),
      changeFrequency: 'daily',
      priority: 1,
    },
    {
      url: `${baseUrl}/browse`,
      lastModified: new Date(),
      changeFrequency: 'daily',
      priority: 0.9,
    },
    {
      url: `${baseUrl}/create-listing`,
      lastModified: new Date(),
      changeFrequency: 'weekly',
      priority: 0.8,
    },
    {
      url: `${baseUrl}/login`,
      lastModified: new Date(),
      changeFrequency: 'monthly',
      priority: 0.5,
    },
    {
      url: `${baseUrl}/signup`,
      lastModified: new Date(),
      changeFrequency: 'monthly',
      priority: 0.5,
    },
    {
      url: `${baseUrl}/profile`,
      lastModified: new Date(),
      changeFrequency: 'weekly',
      priority: 0.6,
    },
    {
      url: `${baseUrl}/forget-password`,
      lastModified: new Date(),
      changeFrequency: 'monthly',
      priority: 0.4,
    },
    {
      url: `${baseUrl}/reset-password`,
      lastModified: new Date(),
      changeFrequency: 'monthly',
      priority: 0.4,
    },
    {
      url: `${baseUrl}/my-listings`,
      lastModified: new Date(),
      changeFrequency: 'daily',
      priority: 0.7,
    },
    {
      url: `${baseUrl}/saved-listings`,
      lastModified: new Date(),
      changeFrequency: 'daily',
      priority: 0.7,
    }
  ];

  // Dynamic routes for categories
  const categories = getCategories();
  const categoryRoutes: MetadataRoute.Sitemap = categories.map(category => ({
    url: `${baseUrl}/browse/category/${category.toLowerCase().replace(/\s+/g, '-').replace(/&/g, '-')}`,
    lastModified: new Date(),
    changeFrequency: 'daily',
    priority: 0.7,
  }));

  // Dynamic routes for my listings categories
  const myListingsCategoryRoutes: MetadataRoute.Sitemap = categories.map(category => ({
    url: `${baseUrl}/my-listings/category/${category.toLowerCase().replace(/\s+/g, '-').replace(/&/g, '-')}`,
    lastModified: new Date(),
    changeFrequency: 'daily',
    priority: 0.6,
  }));

  // Dynamic routes for saved listings categories
  const savedListingsCategoryRoutes: MetadataRoute.Sitemap = categories.map(category => ({
    url: `${baseUrl}/saved-listings/category/${category.toLowerCase().replace(/\s+/g, '-').replace(/&/g, '-')}`,
    lastModified: new Date(),
    changeFrequency: 'daily',
    priority: 0.6,
  }));

  // Fetch individual listing routes
  let listingRoutes: MetadataRoute.Sitemap = [];
  try {
    const { data, error } = await supabase
      .from('listings')
      .select('id, updated_at')
      .order('updated_at', { ascending: false })
      .limit(1000); // Limit to 1000 most recent listings

    if (data) {
      listingRoutes = data.map((listing: { id: string, updated_at: string }) => ({
        url: `${baseUrl}/listing/${listing.id}`,
        lastModified: new Date(listing.updated_at),
        changeFrequency: 'weekly',
        priority: 0.5,
      }));
    }

    if (error) {
      console.error('Error fetching listings for sitemap:', error);
    }
  } catch (err) {
    console.error('Unexpected error generating sitemap:', err);
  }

  // Combine all routes
  return [
    ...baseRoutes,
    ...categoryRoutes,
    ...myListingsCategoryRoutes,
    ...savedListingsCategoryRoutes,
    ...listingRoutes
  ];
}