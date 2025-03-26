import { Metadata } from 'next';
import Listing from "@/components/Listing";
import { listingApi } from "@/lib/api";

// Generate dynamic metadata based on the listing
export async function generateMetadata({ 
  params 
}: { 
  params: Promise<{ 'listing-id': string }> | { 'listing-id': string } 
}): Promise<Metadata> {
  // Await the params before using them
  const resolvedParams = await params;
  const listingId = resolvedParams['listing-id'];
  
  try {
    // Fetch the listing data server-side
    const { data: listing } = await listingApi.getListingById(listingId);
    
    if (!listing) {
      return {
        title: 'Listing Not Found | SkillMart',
        description: 'The requested listing could not be found',
      };
    }
    
    // Create description from listing content
    const description = listing.description 
      ? (listing.description.length > 160 
          ? `${listing.description.substring(0, 157)}...` 
          : listing.description)
      : 'View detailed information about this skill listing on SkillMart';
    
    // Return dynamic metadata based on the listing
    return {
      title: `${listing.title} | SkillMart`,
      description,
      keywords: ['skill listing', listing.category, listing.listing_type, 'skill marketplace'],
      openGraph: {
        title: `${listing.title} | SkillMart`,
        description,
        images: [listing.image_url || '/default-social-image.jpg']
      },
      twitter: {
        card: 'summary_large_image',
        title: `${listing.title} | SkillMart`,
        description,
        images: [listing.image_url || '/default-social-image.jpg']
      }
    };
  } catch (error) {
    // Fallback metadata if we can't fetch the listing
    return {
      title: 'Listing Details | SkillMart',
      description: 'View detailed information about a skill listing on SkillMart',
    };
  }
}

export default async function ListingPage({ 
  params 
}: { 
  params: Promise<{ 'listing-id': string }> | { 'listing-id': string } 
}) {
  // Await the params before using them
  const resolvedParams = await params;
  const listingId = resolvedParams['listing-id'];
  
  return (
    <div>
      {listingId ? (
        <Listing listingId={listingId} />
      ) : (
        <div className="container text-center py-5">
          <h2 className="text-danger mb-4">Error: No listing ID found in URL</h2>
          <p>The URL structure should include a listing-id parameter.</p>
          <p className="text-muted">Make sure your folder structure is: /app/listing/[listing-id]/page.tsx</p>
          <a href="/" className="btn btn-primary mt-3">Return to Home</a>
        </div>
      )}
    </div>
  );
}