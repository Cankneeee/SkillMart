import { wrapApiCall, ApiResponse, cacheUtils } from '@/utils/apiUtils';
import * as db from '@/lib/database';

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

// --- Listings API (keep as is, including its own embedding calls) ---
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
    // Generate embedding for the new listing (original logic remains)
    if (response.data && response.status === 200) {
      try {
        const listingText = `
          Title: ${response.data.title}
          Description: ${response.data.description || ''}
          Category: ${response.data.category || ''}
          Type: ${response.data.listing_type || ''}
          Price: ${response.data.price}
        `.trim();
        // Call embedding API asynchronously (don't await) - ORIGINAL LOGIC FOR LISTINGS
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
        }).catch(err => console.error('[api.ts] Error generating listing embedding (async):', err));
      } catch (err) {
        console.error('[api.ts] Error requesting listing embedding (async):', err);
      }
    }
    return response;
  },

  updateListing: async (
    listingId: string,
    userId: string,
    updateData: db.UpdateListingData
  ): Promise<ApiResponse<db.Listing | null>> => {
    cacheUtils.clear(`listing_${listingId}`);
    const response = await wrapApiCall(() => db.updateListing(listingId, userId, updateData));

    // Update listing embedding if content changed (original logic remains)
    if (response.data && (updateData.title || updateData.description || updateData.category || updateData.listing_type || updateData.price !== undefined)) {
      try {
        const listingText = `
          Title: ${response.data.title}
          Description: ${response.data.description || ''}
          Category: ${response.data.category || ''}
          Type: ${response.data.listing_type || ''}
          Price: ${response.data.price}
        `.trim();
        // Call embedding API asynchronously (don't await) - ORIGINAL LOGIC FOR LISTINGS
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
        }).catch(err => console.error('[api.ts] Error updating listing embedding (async):', err));
      } catch (err) {
        console.error('[api.ts] Error requesting listing embedding update (async):', err);
      }
    }
    return response;
  },

  deleteListing: async (
    listingId: string,
    userId: string
  ): Promise<ApiResponse<boolean>> => {
    cacheUtils.clear(`listing_${listingId}`);
    return wrapApiCall(() => db.deleteListing(listingId, userId));
  }
};

// --- Reviews API (MODIFIED createReview and updateReview) ---
export const reviewApi = {
  getListingReviews: async (
    listingId: string
  ): Promise<ApiResponse<db.Review[]>> => {
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
    // First, create the review using the existing wrapper
    const response = await wrapApiCall(() => db.createReview(reviewData));

    // If review creation was successful, THEN call the embedding API synchronously
    if (response.data && response.data.comment && response.status === 200) {
      const reviewId = response.data.id;
      const reviewText = response.data.comment;
      console.log(`[api.ts] Review ${reviewId} created successfully. Attempting to generate embedding synchronously...`);
      try {
        // *** MODIFIED: Added await ***
        const embeddingResponse = await fetch('/api/generate-embedding', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            type: 'review',
            id: reviewId,
            text: reviewText
          }),
        });

        // *** MODIFIED: Added check and detailed logging ***
        if (!embeddingResponse.ok) {
          const errorBody = await embeddingResponse.json().catch(() => ({ details: 'Could not parse error body' }));
          console.error(`[api.ts] Embedding API call failed for review ${reviewId}. Status: ${embeddingResponse.status}. Body:`, errorBody);
          // Log error, but allow review creation to proceed
        } else {
          const successBody = await embeddingResponse.json().catch(() => ({}));
          console.log(`[api.ts] Embedding API call finished for review ${reviewId}. Status: ${embeddingResponse.status}. Body:`, successBody);
        }

      } catch (err) {
        // Catch network errors or other issues with the fetch itself
        console.error(`[api.ts] Error during synchronous fetch to embedding API for review ${reviewId}:`, err);
        // Log error but don't fail the whole review creation
      }
    } else if (response.error) {
         console.error(`[api.ts] Failed to create review, skipping embedding call. Error: ${response.error}`);
    } else {
         console.log(`[api.ts] Review created for listing ${reviewData.listing_id}, but no comment found, skipping embedding call.`);
    }
    // Return the original review creation response regardless of embedding success/failure
    return response;
  },

  updateReview: async (
    reviewId: string,
    userId: string,
    updateData: db.UpdateReviewData
  ): Promise<ApiResponse<db.Review | null>> => {
    // First, update the review
    const response = await wrapApiCall(() => db.updateReview(reviewId, userId, updateData));

    // If review update was successful AND the comment was part of the update, call embedding API
    if (response.data && updateData.comment && response.status === 200) {
      const reviewText = updateData.comment;
      console.log(`[api.ts] Review ${reviewId} updated successfully. Attempting to update embedding synchronously...`);
      try {
         // *** MODIFIED: Added await ***
        const embeddingResponse = await fetch('/api/generate-embedding', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            type: 'review',
            id: reviewId,
            text: reviewText
          }),
        });

        // *** MODIFIED: Added check and detailed logging ***
        if (!embeddingResponse.ok) {
          const errorBody = await embeddingResponse.json().catch(() => ({ details: 'Could not parse error body' }));
          console.error(`[api.ts] Embedding API call failed for updated review ${reviewId}. Status: ${embeddingResponse.status}. Body:`, errorBody);
          // Log error, allow review update to proceed
        } else {
           const successBody = await embeddingResponse.json().catch(() => ({}));
           console.log(`[api.ts] Embedding API call finished for updated review ${reviewId}. Status: ${embeddingResponse.status}. Body:`, successBody);
        }

      } catch (err) {
        // Catch network errors or other issues with the fetch itself
        console.error(`[api.ts] Error during synchronous fetch to embedding API for updated review ${reviewId}:`, err);
        // Log error
      }
    } else if (response.error) {
         console.error(`[api.ts] Failed to update review ${reviewId}, skipping embedding call. Error: ${response.error}`);
    } else if (response.data && !updateData.comment) {
         console.log(`[api.ts] Review ${reviewId} updated, but comment did not change, skipping embedding call.`);
    }
     // Return the original review update response regardless of embedding success/failure
    return response;
  },

  deleteReview: async (
    reviewId: string,
    userId: string
  ): Promise<ApiResponse<boolean>> => {
     // If using DB triggers, deletion is handled there. If not, consider if deletion should *also* trigger summary update.
     // For now, just log.
     console.log(`[api.ts] Deleting review ${reviewId} by user ${userId}. Summary update relies on DB trigger (if enabled) or manual refresh.`);
     return wrapApiCall(() => db.deleteReview(reviewId, userId));
  }
};

// --- Saved Listings API (keep as is) ---
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