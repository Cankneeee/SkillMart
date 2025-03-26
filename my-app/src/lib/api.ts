// lib/api.ts
import { wrapApiCall, ApiResponse, cacheUtils } from '@/utils/apiUtils';
import * as db from '@/lib/database';

/**
 * User API functions
 */
export const userApi = {
  getProfile: async (userId: string): Promise<ApiResponse<Record<string, any> | null>> => {
    return wrapApiCall(() => db.getUserProfile(userId));
  },
  
  updateProfile: async (
    userId: string,
    profileData: {
      email?: string;
      username?: string;
      profile_picture?: string;
    }
  ): Promise<ApiResponse<Record<string, any> | null>> => {
    return wrapApiCall(() => db.updateUserProfile(userId, profileData));
  },
  
  updateProfileField: async (
    userId: string,
    field: string,
    value: any
  ): Promise<ApiResponse<any>> => {
    const result = await db.updateProfileField(userId, field, value);
    return {
      data: result.data || null,
      error: result.error ? result.error.message : null,
      status: result.error ? 400 : 200
    };
  }
};

/**
 * Listings API functions
 */
export const listingApi = {
  getListingById: async (
    listingId: string,
    useCache = true
  ): Promise<ApiResponse<db.Listing | null>> => {
    // Try to get from cache first if useCache is true
    if (useCache) {
      const cacheKey = `listing_${listingId}`;
      const cachedData = cacheUtils.get<db.Listing>(cacheKey);
      if (cachedData) {
        return {
          data: cachedData,
          error: null,
          status: 200
        };
      }
    }
    
    const response = await wrapApiCall(() => db.getListingById(listingId));
    
    // Cache the result if successful
    if (response.data && useCache) {
      cacheUtils.set(`listing_${listingId}`, response.data);
    }
    
    return response;
  },
  
  getListings: async (
    listingType?: string,
    category?: string
  ): Promise<ApiResponse<db.Listing[]>> => {
    return wrapApiCall(() => db.getListings(listingType, category));
  },
  
  getUserListings: async (
    userId: string,
    listingType?: string,
    category?: string
  ): Promise<ApiResponse<db.Listing[]>> => {
    return wrapApiCall(() => db.getUserListings(userId, listingType, category));
  },
  
  searchListings: async (
    searchQuery: string,
    listingType?: string,
    category?: string
  ): Promise<ApiResponse<db.Listing[]>> => {
    return wrapApiCall(() => db.searchListings(searchQuery, listingType, category));
  },
  
  createListing: async (
    listingData: db.CreateListingData
  ): Promise<ApiResponse<db.Listing>> => {
    const response = await wrapApiCall(() => db.createListing(listingData));
    
    // Generate embedding for the new listing
    if (response.data && response.status === 200) {
      try {
        // Prepare text for embedding
        const listingText = `
          Title: ${response.data.title}
          Description: ${response.data.description || ''}
          Category: ${response.data.category || ''}
          Type: ${response.data.listing_type || ''}
          Price: ${response.data.price}
        `.trim();
        
        // Call embedding API asynchronously (don't await)
        fetch('/api/generate-embedding', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            type: 'listing',
            id: response.data.id,
            text: listingText
          }),
        }).catch(err => console.error('Error generating listing embedding:', err));
      } catch (err) {
        // Don't fail the creation if embedding fails
        console.error('Error requesting listing embedding:', err);
      }
    }
    
    return response;
  },
  
  updateListing: async (
    listingId: string,
    userId: string,
    updateData: db.UpdateListingData
  ): Promise<ApiResponse<db.Listing | null>> => {
    // Clear cache for this listing when updating
    cacheUtils.clear(`listing_${listingId}`);
    
    const response = await wrapApiCall(() => db.updateListing(listingId, userId, updateData));
    
    // Update embedding if listing content changed
    if (response.data && (updateData.title || updateData.description || updateData.category || updateData.listing_type || updateData.price !== undefined)) {
      try {
        // Prepare text for embedding
        const listingText = `
          Title: ${response.data.title}
          Description: ${response.data.description || ''}
          Category: ${response.data.category || ''}
          Type: ${response.data.listing_type || ''}
          Price: ${response.data.price}
        `.trim();
        
        // Call embedding API asynchronously (don't await)
        fetch('/api/generate-embedding', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            type: 'listing',
            id: listingId,
            text: listingText
          }),
        }).catch(err => console.error('Error updating listing embedding:', err));
      } catch (err) {
        // Don't fail the update if embedding fails
        console.error('Error requesting listing embedding update:', err);
      }
    }
    
    return response;
  },
  
  deleteListing: async (
    listingId: string,
    userId: string
  ): Promise<ApiResponse<boolean>> => {
    // Clear cache for this listing when deleting
    cacheUtils.clear(`listing_${listingId}`);
    
    return wrapApiCall(() => db.deleteListing(listingId, userId));
  }
};

/**
 * Reviews API functions
 */
export const reviewApi = {
  getListingReviews: async (
    listingId: string
  ): Promise<ApiResponse<(db.Review & { user_profile?: any })[]>> => {
    return wrapApiCall(() => db.getListingReviews(listingId));
  },
  
  getListingRating: async (
    listingId: string
  ): Promise<ApiResponse<{ average: number; count: number }>> => {
    return wrapApiCall(() => db.getListingRating(listingId));
  },
  
  createReview: async (
    reviewData: db.CreateReviewData
  ): Promise<ApiResponse<db.Review>> => {
    const response = await wrapApiCall(() => db.createReview(reviewData));
    
    // Generate embedding for the new review
    if (response.data && response.data.comment && response.status === 200) {
      try {
        // Call embedding API asynchronously (don't await)
        fetch('/api/generate-embedding', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            type: 'review',
            id: response.data.id,
            text: response.data.comment
          }),
        }).catch(err => console.error('Error generating review embedding:', err));
      } catch (err) {
        // Don't fail the creation if embedding fails
        console.error('Error requesting review embedding:', err);
      }
    }
    
    return response;
  },
  
  updateReview: async (
    reviewId: string,
    userId: string,
    updateData: db.UpdateReviewData
  ): Promise<ApiResponse<db.Review | null>> => {
    const response = await wrapApiCall(() => db.updateReview(reviewId, userId, updateData));
    
    // Update embedding if comment changed
    if (response.data && updateData.comment) {
      try {
        // Call embedding API asynchronously (don't await)
        fetch('/api/generate-embedding', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            type: 'review',
            id: reviewId,
            text: updateData.comment
          }),
        }).catch(err => console.error('Error updating review embedding:', err));
      } catch (err) {
        // Don't fail the update if embedding fails
        console.error('Error requesting review embedding update:', err);
      }
    }
    
    return response;
  },
  
  deleteReview: async (
    reviewId: string,
    userId: string
  ): Promise<ApiResponse<boolean>> => {
    return wrapApiCall(() => db.deleteReview(reviewId, userId));
  }
};

/**
 * Saved Listings API functions
 */
export const savedListingApi = {
  getUserSavedListings: async (
    userId: string,
    listingType?: string,
    category?: string
  ): Promise<ApiResponse<(db.SavedListing & { listing: db.Listing })[]>> => {
    return wrapApiCall(() => db.getUserSavedListings(userId, listingType, category));
  },
  
  saveListing: async (
    userId: string,
    listingId: string
  ): Promise<ApiResponse<db.SavedListing>> => {
    return wrapApiCall(() => db.saveListing(userId, listingId));
  },
  
  unsaveListing: async (
    userId: string,
    listingId: string
  ): Promise<ApiResponse<boolean>> => {
    return wrapApiCall(() => db.unsaveListing(userId, listingId));
  },
  
  isListingSaved: async (
    userId: string,
    listingId: string
  ): Promise<ApiResponse<boolean>> => {
    return wrapApiCall(() => db.isListingSaved(userId, listingId));
  }
};